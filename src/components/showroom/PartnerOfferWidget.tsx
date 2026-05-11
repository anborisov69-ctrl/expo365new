'use client';

/**
 * PartnerOfferWidget — Индивидуальные предложения для проверенных покупателей
 * ────────────────────────────────────────────────────────────────────────────
 * УСЛОВНАЯ ЛОГИКА:
 * 
 * IF (user.isPartnerOf === 'ooo-test'):
 *   ✅ Показать персональные условия с финансовыми расчётами
 * 
 * ELSE:
 *   ❌ Показать заглушку "Закрытый блок для партнёров"
 * 
 * ФИНАНСОВЫЕ РАСЧЁТЫ:
 *   - Сумма скидки = BasicPrice * Discount / 100
 *   - Первый взнос = FinalPrice * InitialPercent / 100  
 *   - Платёж рассрочки = (FinalPrice - FirstPayment) / PaymentsCount
 * 
 * UI ТРЕБОВАНИЯ:
 *   - Термин: только "Приглашённый клиент" 
 *   - Цвета: #0B2B5E (основной) и #F26522 (акцент)
 */

import { Lock, Shield, CreditCard, Calendar, Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useEcosystemStore } from '@/store/ecosystemStore';
import type { PartnerOfferComputed } from '@/types/partner-offer';

// ═══════════════════════════════════════════════════════════════════════════════
// ТИПЫ КОМПОНЕНТА
// ═══════════════════════════════════════════════════════════════════════════════

interface PartnerOfferWidgetProps {
  /** Slug экспонента для получения персональных условий */
  exhibitorSlug: string;
  /** Базовое название предложения */
  offerTitle?: string;
  /** Дата истечения (ISO) */
  validUntil?: string;
  /** ID покупателя для режима предпросмотра (параметр test_as из URL) */
  testAsBuyerId?: string | null;
}

interface FinancialDetails {
  /** Базовая цена без скидки */
  basicPrice: number;
  /** Процент скидки */
  discountPercent: number;
  /** Процент первого взноса */
  initialPercent: number;
  /** Количество платежей рассрочки */
  paymentsCount: number;
  /** Интервал между платежами (дни) */
  paymentInterval: number;
}

// ═══════════════════════════════════════════════════════════════════════════════
// MOCK DATA — временные данные до подключения Supabase
// ═══════════════════════════════════════════════════════════════════════════════

const MOCK_FINANCIAL_CONFIG: FinancialDetails = {
  basicPrice: 1000000,     // 1,000,000₽ базовая цена (кофемашина)
  discountPercent: 15,     // 15% скидка для приглашённого клиента (150,000₽)
  initialPercent: 30,      // 30% первый взнос (255,000₽)
  paymentsCount: 3,        // 3 платежа рассрочки
  paymentInterval: 30,     // каждые 30 дней
};

// ═══════════════════════════════════════════════════════════════════════════════
// УТИЛИТЫ ФОРМАТИРОВАНИЯ
// ═══════════════════════════════════════════════════════════════════════════════

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('ru-RU', {
    style: 'currency',
    currency: 'RUB',
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatDate(isoDate: string): string {
  return new Date(isoDate).toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// ФИНАНСОВЫЙ КАЛЬКУЛЯТОР
// ═══════════════════════════════════════════════════════════════════════════════

function calculateFinancials(config: FinancialDetails): PartnerOfferComputed {
  const { basicPrice, discountPercent, initialPercent, paymentsCount } = config;
  
  // Сумма скидки = BasicPrice * Discount / 100
  const discountAmount = Math.round(basicPrice * discountPercent / 100);
  
  // Итоговая цена = BasicPrice - DiscountAmount
  const finalPrice = basicPrice - discountAmount;
  
  // Первый взнос = FinalPrice * InitialPercent / 100
  const initialPayment = Math.round(finalPrice * initialPercent / 100);
  
  // Остаток для рассрочки
  const remainingAfterDown = finalPrice - initialPayment;
  
  // Платёж рассрочки = Остаток / Количество платежей
  const paymentPerInstallment = Math.round(remainingAfterDown / paymentsCount);

  return {
    totalPrice: basicPrice,
    discountPercent,
    discountAmount,
    finalPrice,
    paymentTerms: {
      type: 'installment',
      downPaymentPercent: initialPercent,
      paymentsCount,
      periodDays: config.paymentInterval,
    },
    initialPayment,
    remainingAfterDown,
    paymentPerInstallment,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// КОМПОНЕНТ: ЗАГЛУШКА ДЛЯ НЕ-ПАРТНЁРОВ
// ═══════════════════════════════════════════════════════════════════════════════

function PartnerBlockFallback() {
  const router = useRouter();

  const handleLearnPartnership = () => {
    // Переход на страницу верификации или модальное окно инструкций
    // В текущей архитектуре можно перенаправить на главную или показать алерт
    router.push('/horeca?action=partnership-inquiry');
  };

  return (
    <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-slate-50 to-slate-100 border border-slate-200">
      {/* Размытый фон */}
      <div className="absolute inset-0 bg-slate-100/60 backdrop-blur-sm" />
      
      <div className="relative z-10 flex flex-col items-center justify-center px-8 py-12 text-center">
        <div
          className="flex items-center justify-center w-16 h-16 rounded-full mb-4"
          style={{ backgroundColor: 'rgba(11,43,94,0.1)' }}
        >
          <Lock className="w-8 h-8" style={{ color: '#0B2B5E' }} />
        </div>
        
        <h3
          className="text-lg font-bold mb-2"
          style={{ color: '#0B2B5E' }}
        >
          Закрытый блок для партнёров
        </h3>
        
        <p className="text-sm text-slate-600 mb-6 max-w-sm leading-relaxed">
          Персональные условия доступны только приглашённым клиентам с подтверждённым партнёрским статусом.
        </p>
        
        <button
          onClick={handleLearnPartnership}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg font-medium text-sm transition-all hover:shadow-md hover:scale-105 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#F26522]/50"
          style={{
            backgroundColor: '#F26522',
            color: 'white',
          }}
        >
          <Shield className="w-4 h-4" />
          Узнать условия партнёрства
        </button>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// КОМПОНЕНТ: ПЕРСОНАЛЬНОЕ ПРЕДЛОЖЕНИЕ
// ═══════════════════════════════════════════════════════════════════════════════

interface PartnerOfferCardProps {
  computed: PartnerOfferComputed;
  validUntil?: string;
  offerTitle?: string;
  exhibitorSlug: string;
}

function PartnerOfferCard({ computed, validUntil, offerTitle, exhibitorSlug }: PartnerOfferCardProps) {
  const router = useRouter();
  const { user } = useAuth();
  const [isProcessing, setIsProcessing] = useState(false);

  const {
    totalPrice,
    discountPercent,
    discountAmount,
    finalPrice,
    initialPayment,
    paymentPerInstallment,
    paymentTerms,
  } = computed;

  // Функция инициации Умного Контракта (по примеру из задания)
  const handleAcceptTerms = async () => {
    setIsProcessing(true);

    try {
      // 1. Формируем "слепок" финансовых условий
      const contractDraft = {
        buyerId: user?.id || 'anonymous-buyer',
        exhibitorId: exhibitorSlug,
        financials: {
          discountPercent: discountPercent,
          discountAmount: discountAmount,
          paymentType: (paymentTerms?.type === 'installment' ? 'installment' : 'deferred') as 'deferred' | 'installment',
          initialPayment: initialPayment || 0,
          installmentsCount: paymentTerms?.paymentsCount || 3
        },
        status: 'DRAFT_PENDING_DOCS'
      };

      // 2. Отправляем в глобальный Стор (эмуляция сохранения)
      await useEcosystemStore.getState().initializeSmartContract(contractDraft);

      // 3. Показываем Toast-уведомление (псевдокод)
      // toast.success("Ваши условия зафиксированы. Переходим к оформлению контракта");

      // 4. Перенаправляем в интерфейс Умного Контракта
      router.push(`/horeca/contracts/draft/${exhibitorSlug}`);

    } catch (error) {
      console.error("Ошибка при создании контракта", error);
      // toast.error("Не удалось зафиксировать условия");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="rounded-xl border-2 overflow-hidden" style={{ borderColor: '#0B2B5E' }}>
      {/* Header */}
      <div 
        className="px-6 py-4 flex items-center justify-between text-white"
        style={{ backgroundColor: '#0B2B5E' }}
      >
        <div className="flex items-center gap-3">
          <Lock className="w-5 h-5" />
          <span className="font-bold text-sm uppercase tracking-wide">
            {offerTitle || 'Закрытое предложение'}
          </span>
        </div>
        
        <div className="flex items-center gap-3">
          <span 
            className="px-2.5 py-1 rounded-full text-xs font-bold bg-white/20"
          >
            ПРИГЛАШЁННЫЙ КЛИЕНТ
          </span>
          {validUntil && (
            <span className="text-xs">
              до {formatDate(validUntil)}
            </span>
          )}
        </div>
      </div>

      {/* Financial Breakdown */}
      <div className="px-6 py-5 bg-white">
        {/* Базовая цена */}
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-slate-600">
            Базовая стоимость
          </span>
          <span className="text-sm font-bold" style={{ color: '#0B2B5E' }}>
            {formatCurrency(totalPrice)}
          </span>
        </div>

        {/* Скидка */}
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-medium text-slate-600">
            Скидка {discountPercent}%
          </span>
          <span className="text-sm font-bold text-green-600">
            − {formatCurrency(discountAmount)}
          </span>
        </div>

        {/* Разделитель */}
        <div className="border-t-2 border-dashed my-4" style={{ borderColor: 'rgba(11,43,94,0.15)' }} />

        {/* Итоговая цена */}
        <div className="flex items-center justify-between mb-5 pt-1">
          <span className="text-base font-black uppercase tracking-wide" style={{ color: '#0B2B5E' }}>
            Итоговая цена
          </span>
          <span className="text-lg font-black" style={{ color: '#F26522' }}>
            {formatCurrency(finalPrice)}
          </span>
        </div>

        {/* Условия оплаты */}
        {paymentTerms?.type === 'installment' && (
          <div className="bg-slate-50 rounded-lg p-4 mb-5">
            <h4 className="text-sm font-bold mb-3" style={{ color: '#0B2B5E' }}>
              Условия рассрочки:
            </h4>
            
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-600">Первый взнос</span>
                <span className="text-sm font-bold" style={{ color: '#0B2B5E' }}>
                  {formatCurrency(initialPayment || 0)}
                </span>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-600">
                  {paymentTerms.paymentsCount} платежа по
                </span>
                <span className="text-sm font-bold" style={{ color: '#0B2B5E' }}>
                  {formatCurrency(paymentPerInstallment || 0)}
                </span>
              </div>
              
              <div className="flex items-center gap-2 text-xs text-slate-500 mt-2">
                <Calendar className="w-3 h-3" />
                <span>каждые {paymentTerms.periodDays} дней</span>
              </div>
            </div>
          </div>
        )}

        {/* CTA Button */}
        <button
          onClick={handleAcceptTerms}
          disabled={isProcessing}
          className={`w-full flex items-center justify-center gap-3 px-6 py-4 rounded-lg font-bold text-base text-white transition-all ${
            isProcessing
              ? 'cursor-not-allowed opacity-80'
              : 'hover:shadow-lg hover:scale-105'
          }`}
          style={{ backgroundColor: '#F26522' }}
        >
          {isProcessing ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Формируем контракт...
            </>
          ) : (
            <>
              <CreditCard className="w-5 h-5" />
              Принять предложение
            </>
          )}
        </button>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// ОСНОВНОЙ КОМПОНЕНТ
// ═══════════════════════════════════════════════════════════════════════════════

export default function PartnerOfferWidget({
  exhibitorSlug,
  offerTitle,
  validUntil = '2026-12-31T23:59:59.999Z',
  testAsBuyerId,
}: PartnerOfferWidgetProps) {
  const { user } = useAuth();

  // УСЛОВНАЯ ЛОГИКА: проверяем связку с ООО "ТЕСТ" ИЛИ режим предпросмотра
  const isPartnerClient = user?.isPartnerOf === 'ooo-test';
  const isPreviewMode = Boolean(testAsBuyerId);

  // Если НЕ приглашённый клиент И НЕ режим предпросмотра — показываем заглушку
  if (!isPartnerClient && !isPreviewMode) {
    return <PartnerBlockFallback />;
  }

  // Если приглашённый клиент ИЛИ режим предпросмотра — показываем персональные условия
  const financialData = calculateFinancials(MOCK_FINANCIAL_CONFIG);

  return (
    <PartnerOfferCard
      computed={financialData}
      validUntil={validUntil}
      offerTitle={offerTitle}
      exhibitorSlug={exhibitorSlug}
    />
  );
}