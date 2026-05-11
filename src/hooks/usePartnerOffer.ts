'use client';

/**
 * usePartnerOffer — хук загрузки персональных партнёрских условий
 * ──────────────────────────────────────────────────────────────────
 * Логика:
 *   1. Читает `ecoState.isReferralBuyer` и `ecoState.referralSource` из EcosystemStore
 *   2. Если buyer.invitedBy === exhibitorSlug → ищет SpecialTerms в EXHIBITOR_TERMS_MAP
 *   3. Вычисляет финансовые параметры (DiscountAmount, FinalPrice, InitialPayment)
 *   4. Возвращает { isPartner, specialTerms, computed }
 *
 * TODO (Supabase migration):
 *   const { data } = await supabase
 *     .from('exhibitor_special_terms')
 *     .select('*')
 *     .eq('exhibitor_slug', exhibitorSlug)
 *     .eq('buyer_referral_slug', referralSource)
 *     .gte('valid_until', new Date().toISOString())
 *     .maybeSingle()
 *   RLS обеспечивает: buyer видит только свои условия.
 */

import { useMemo } from 'react';
import { useEcosystem } from '@/store/ecosystemStore';
import type {
  SpecialTerms,
  PartnerOfferComputed,
} from '@/types/partner-offer';

// ═══════════════════════════════════════════════════════════════════════════════
// MOCK DATA — EXHIBITOR SPECIAL TERMS MAP
// TODO: заменить на Supabase-запрос с RLS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Карта персональных условий: exhibitorSlug → SpecialTerms.
 *
 * Ключ = slug экспонента на витрине.
 * Условие применяется к байерам с invitedBy === ключа.
 *
 * Пример конфигурации ООО «ТЕСТ»:
 *   - Скидка 12% на сумму ₽ 200 000
 *   - Отсрочка платежа 30 дней
 *   Итог: ₽ 176 000 с оплатой через 30 дней после поставки
 */
const EXHIBITOR_TERMS_MAP: Record<string, SpecialTerms> = {
  'ooo-test': {
    id:                'terms-ooo-test-2026',
    exhibitorId:       'ooo-test',
    buyerReferralSlug: 'ooo-test',
    discountPercent:   12,
    totalPriceRub:     200_000,
    paymentTerms: {
      type:         'deferred',
      deferralDays: 30,
    },
    validUntil:  '2026-12-31',
    offerLabel:  'VIP-условия для партнёров B2B',
  },

  // Пример с рассрочкой (для другого экспонента):
  // 'espresso-italia': {
  //   id:                'terms-espresso-2026',
  //   exhibitorId:       'espresso-italia',
  //   buyerReferralSlug: 'espresso-italia',
  //   discountPercent:   8,
  //   totalPriceRub:     500_000,
  //   paymentTerms: {
  //     type:               'installment',
  //     downPaymentPercent: 30,
  //     paymentsCount:      3,
  //     periodDays:         30,
  //   },
  //   validUntil: '2026-12-31',
  // },
};

// ═══════════════════════════════════════════════════════════════════════════════
// ФИНАНСОВЫЙ КАЛЬКУЛЯТОР
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Вычисляет финансовые параметры из `SpecialTerms`.
 *
 * Формулы (строго по ТЗ):
 *   DiscountAmount        = TotalPrice × (DiscountPercent / 100)
 *   FinalPrice            = TotalPrice − DiscountAmount
 *   InitialPayment        = FinalPrice × (InstallmentPercent / 100)   [installment]
 *   RemainingAfterDown    = FinalPrice − InitialPayment               [installment]
 *   PaymentPerInstallment = RemainingAfterDown / PaymentsCount         [installment]
 */
function computePartnerOffer(terms: SpecialTerms): PartnerOfferComputed {
  const { totalPriceRub, discountPercent, paymentTerms } = terms;

  const discountAmount = Math.round(totalPriceRub * (discountPercent / 100));
  const finalPrice     = totalPriceRub - discountAmount;

  let initialPayment:        number | null    = null;
  let remainingAfterDown:    number | undefined;
  let paymentPerInstallment: number | undefined;

  if (paymentTerms?.type === 'installment') {
    const pct            = paymentTerms.downPaymentPercent;
    initialPayment       = Math.round(finalPrice * (pct / 100));
    remainingAfterDown   = finalPrice - initialPayment;
    paymentPerInstallment = Math.round(remainingAfterDown / paymentTerms.paymentsCount);
  }

  return {
    totalPrice:            totalPriceRub,
    discountPercent,
    discountAmount,
    finalPrice,
    paymentTerms,
    initialPayment,
    remainingAfterDown,
    paymentPerInstallment,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// ХУК
// ═══════════════════════════════════════════════════════════════════════════════

export interface UsePartnerOfferResult {
  /** true → байер пришёл по ссылке этого экспонента */
  isPartner:    boolean;
  /** Сырые условия из БД / мока (null если не партнёр или нет условий) */
  specialTerms: SpecialTerms | null;
  /** Вычисленные финансовые параметры (null если не партнёр) */
  computed:     PartnerOfferComputed | null;
}

/**
 * `usePartnerOffer` — хук персональных условий на витрине экспонента.
 *
 * @param exhibitorSlug — URL-слаг страницы экспонента (напр. 'ooo-test')
 *
 * @example
 * ```tsx
 * const { isPartner, computed } = usePartnerOffer('ooo-test');
 * // isPartner = true, если buyer.invitedBy == 'ooo-test'
 * // computed.finalPrice = 176_000
 * ```
 *
 * Правило идентификации партнёра:
 *   isPartner = ecoState.isReferralBuyer AND ecoState.referralSource === exhibitorSlug
 */
export function usePartnerOffer(exhibitorSlug: string): UsePartnerOfferResult {
  const { state } = useEcosystem();

  /**
   * Байер считается партнёром этого экспонента если:
   *   1. Он вообще пришёл по реферальной ссылке (isReferralBuyer)
   *   2. Источник ссылки совпадает со slug'ом текущего экспонента (referralSource === exhibitorSlug)
   */
  const isPartner = Boolean(
    state.isReferralBuyer && state.referralSource === exhibitorSlug,
  );

  const specialTerms = useMemo<SpecialTerms | null>(
    () => (isPartner ? (EXHIBITOR_TERMS_MAP[exhibitorSlug] ?? null) : null),
    [isPartner, exhibitorSlug],
  );

  const computed = useMemo<PartnerOfferComputed | null>(
    () => (specialTerms ? computePartnerOffer(specialTerms) : null),
    [specialTerms],
  );

  return { isPartner, specialTerms, computed };
}
