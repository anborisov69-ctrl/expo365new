/**
 * partner-offer.ts — TypeScript типы для модуля «Закрытое предложение»
 * ──────────────────────────────────────────────────────────────────────
 * Схема данных для персонализированных партнёрских условий:
 *   ExhibitorSettings  — настройки экспонента (link: ExhibitorID ↔ BuyerID)
 *   SpecialTerms       — персональные условия сделки (скидки, отсрочка, рассрочка)
 *   PartnerOfferComputed — вычисленные финансовые значения
 *
 * TODO (Supabase migration):
 *   Таблица `exhibitor_special_terms`:
 *     id                  uuid PK DEFAULT gen_random_uuid()
 *     exhibitor_id        uuid REFERENCES exhibitor_profiles(id)
 *     buyer_referral_slug text NOT NULL           -- slug реферальной ссылки
 *     discount_percent    numeric(5,2) DEFAULT 0  -- % скидки
 *     total_price_rub     numeric(14,2) NOT NULL  -- базовая сумма расчёта
 *     payment_type        text CHECK (payment_type IN ('deferred','installment'))
 *     deferred_days       int                     -- дней отсрочки
 *     installment_down_percent numeric(5,2)       -- % первого взноса
 *     installment_count   int                     -- кол-во платежей
 *     installment_period_days int                 -- дней между платежами
 *     valid_until         date
 *     created_at          timestamptz DEFAULT now()
 *   RLS: exhibitor_id = auth.uid()
 *        OR buyer_referral_slug = (SELECT referral_slug FROM user_referrals WHERE user_id = auth.uid())
 */

// ═══════════════════════════════════════════════════════════════════════════════
// ТИПЫ УСЛОВИЙ ПЛАТЕЖА
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Условие отсрочки платежа.
 * Байер оплачивает всю сумму через X дней после получения товара.
 */
export interface DeferredPaymentTerms {
  type: 'deferred';
  /** Количество дней отсрочки (от 7 до 120) */
  deferralDays: number;
}

/**
 * Условие рассрочки платежа.
 * Байер вносит первоначальный взнос, остаток разбивается на N платежей.
 */
export interface InstallmentPaymentTerms {
  type: 'installment';
  /**
   * % первого взноса от итоговой цены (после скидки).
   * Например: 30 → InitialPayment = FinalPrice * 0.30
   */
  downPaymentPercent: number;
  /** Количество равных платежей после первого взноса */
  paymentsCount: number;
  /** Интервал между платежами в днях (обычно 30) */
  periodDays: number;
}

/** Дискриминированный union условий оплаты */
export type PaymentTerms = DeferredPaymentTerms | InstallmentPaymentTerms;

// ═══════════════════════════════════════════════════════════════════════════════
// СПЕЦИАЛЬНЫЕ УСЛОВИЯ — СЫРЫЕ ДАННЫЕ (из БД / мок)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * `SpecialTerms` — персональные условия экспонента для конкретного байера.
 *
 * Идентификация байера:
 *   buyerReferralSlug === Buyer.invitedBy
 *   Если buyer.invitedBy == 'ooo-test' — применяются условия этого объекта.
 *
 * Финансовые поля — ИСТОЧНИК для финансового калькулятора:
 *   DiscountAmount  = totalPriceRub * (discountPercent / 100)
 *   FinalPrice      = totalPriceRub - DiscountAmount
 *   InitialPayment  = FinalPrice * (downPaymentPercent / 100) — только для installment
 */
export interface SpecialTerms {
  /** UUID объекта условий (Supabase PK) */
  id: string;
  /** Slug экспонента (FK exhibitor_profiles.slug) */
  exhibitorId: string;
  /** Reферальный slug байера (buyer.invitedBy значение) */
  buyerReferralSlug: string;
  /** Процент скидки (0–100) */
  discountPercent: number;
  /**
   * Базовая сумма расчёта в рублях.
   * Обычно — средний размер сделки с этим байером, или начальная ставка.
   */
  totalPriceRub: number;
  /** Условия оплаты (null → предоплата 100%) */
  paymentTerms: PaymentTerms | null;
  /** Дата истечения предложения (ISO 8601) */
  validUntil?: string;
  /** Краткое описание предложения (выводится в карточке) */
  offerLabel?: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// ВЫЧИСЛЕННЫЕ ФИНАНСОВЫЕ ЗНАЧЕНИЯ
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * `PartnerOfferComputed` — результат финансового калькулятора.
 * Вычисляется хуком `usePartnerOffer` из `SpecialTerms`.
 *
 * Формулы:
 *   discountAmount        = totalPrice * (discountPercent / 100)
 *   finalPrice            = totalPrice - discountAmount
 *   initialPayment        = finalPrice * (downPaymentPercent / 100)   [только installment]
 *   remainingAfterDown    = finalPrice - initialPayment               [только installment]
 *   paymentPerInstallment = remainingAfterDown / paymentsCount        [только installment]
 */
export interface PartnerOfferComputed {
  /** Базовая сумма (до скидки) */
  totalPrice: number;
  /** Процент скидки */
  discountPercent: number;
  /** Сумма скидки в рублях = totalPrice × discountPercent / 100 */
  discountAmount: number;
  /** Итоговая цена = totalPrice − discountAmount */
  finalPrice: number;
  /** Условия оплаты (null → 100% предоплата) */
  paymentTerms: PaymentTerms | null;
  /**
   * Первый взнос (только при installment).
   * null при deferred или prepayment.
   */
  initialPayment: number | null;
  /**
   * Сумма платежей после первого взноса (только при installment).
   * = finalPrice − initialPayment
   */
  remainingAfterDown?: number;
  /**
   * Размер одного платежа (только при installment).
   * = remainingAfterDown / paymentsCount
   */
  paymentPerInstallment?: number;
}

// ═══════════════════════════════════════════════════════════════════════════════
// НАСТРОЙКИ ЭКСПОНЕНТА — DB LINK
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * `ExhibitorSettings` — связь между экспонентом и персональными условиями.
 *
 * Используется для маппинга:
 *   ExhibitorID (slug) → SpecialTerms для конкретного buyerReferralSlug.
 *
 * В Supabase это будет реализовано как JOIN:
 *   SELECT est.* FROM exhibitor_special_terms est
 *   JOIN exhibitor_profiles ep ON ep.id = est.exhibitor_id
 *   WHERE ep.slug = :exhibitorSlug
 *     AND est.buyer_referral_slug = :buyerReferralSlug
 *     AND est.valid_until >= now()
 */
export interface ExhibitorSettings {
  /** Slug экспонента */
  exhibitorSlug: string;
  /** Slug реферальной ссылки байера */
  buyerReferralSlug: string;
  /** Персональные условия */
  specialTerms: SpecialTerms;
}

// ═══════════════════════════════════════════════════════════════════════════════
// SMART CONTRACT PARAMETERS — передача в модуль Умного Контракта
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * `SmartContractParams` — параметры, автоматически передаваемые в Smart Contract
 * при нажатии "Начать сделку".
 *
 * Объект сериализуется в deal.message (поле EcoDeal) до подключения Supabase.
 * После миграции — отдельная таблица `smart_contract_drafts` с RLS.
 */
export interface SmartContractParams {
  /** Данные байера */
  buyerName: string;
  buyerEmail: string;
  buyerCompany: string;
  /** Слаг экспонента */
  exhibitorSlug: string;
  /** Название экспонента */
  exhibitorName: string;
  /** Финансовые параметры */
  computed: PartnerOfferComputed;
  /** Дата подписания (ISO) */
  initiatedAt: string;
}
