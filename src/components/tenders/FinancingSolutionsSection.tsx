'use client';

/**
 * FinancingSolutionsSection — Секция «Финансовые решения» на странице тендера
 * ─────────────────────────────────────────────────────────────────────────────
 * Отображается байеру на `/horeca/buyer/dashboard/tenders/[tenderId]`.
 *
 * Функциональность:
 *   1. Список офферов от банков (ВТБ, Точка, Аренза и др.)
 *   2. Автоматический расчёт ежемесячного платежа по аннуитетной формуле
 *   3. Кнопка «Принять финансирование» (акцентный Orange #F26522)
 *   4. POST /api/tender-financing/accept → генерация трёхстороннего контракта
 *   5. Редирект на страницу предпросмотра договора
 *
 * Design tokens:
 *   Primary   : #0B2B5E
 *   Action    : #F26522
 *   Success   : #10b981
 */

import { useState, useMemo } from 'react';
import { useRouter }         from 'next/navigation';
import type { TenderFinancingOffer } from '@/types/finance';
import { calcMonthlyPayment }        from '@/types/finance';

// ── Утилиты ───────────────────────────────────────────────────────────────────

function fmt(v: number): string {
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(2)} млн ₽`;
  if (v >= 1_000)     return `${Math.round(v / 1_000)} тыс. ₽`;
  return `${v.toLocaleString('ru-RU')} ₽`;
}

function fmtRate(r: number): string {
  return `${r.toString().replace('.', ',')}% год.`;
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString('ru-RU', {
    day:   'numeric',
    month: 'long',
    year:  'numeric',
  });
}

function serviceLabel(t: TenderFinancingOffer['serviceType']): string {
  const map: Record<TenderFinancingOffer['serviceType'], string> = {
    leasing:   'Лизинг',
    credit:    'Кредит',
    rko:       'РКО',
    overdraft: 'Овердрафт',
    factoring: 'Факторинг',
  };
  return map[t] ?? t;
}

// ── Пропсы ────────────────────────────────────────────────────────────────────

interface FinancingSolutionsSectionProps {
  tenderId:     string;
  tenderTitle:  string;
  /** Победивший поставщик (если уже выбран) — нужен для трёхстороннего договора */
  supplierId?:  string;
  supplierName?: string;
  buyerId:      string;
  buyerCompany: string;
  /** Сумма тендера — для расчёта платежей */
  dealAmount:   number;
  /** Офферы от банков на данный тендер */
  offers:       TenderFinancingOffer[];
}

// ── Подкомпонент: карточка оффера ─────────────────────────────────────────────

interface OfferCardProps {
  offer:        TenderFinancingOffer;
  dealAmount:   number;
  isAccepting:  boolean;
  onAccept:     (offer: TenderFinancingOffer) => void;
}

function OfferCard({ offer, dealAmount, isAccepting, onAccept }: OfferCardProps) {
  const downAmt  = offer.downPaymentPercent
    ? Math.round(dealAmount * (offer.downPaymentPercent / 100))
    : 0;
  const principal   = dealAmount - downAmt;
  const monthly     = calcMonthlyPayment(principal, offer.ratePercent, offer.termMonths);
  const totalPayout = monthly * offer.termMonths + downAmt;
  const overpayment = totalPayout - dealAmount;

  return (
    <div
      className="relative bg-white rounded-2xl overflow-hidden transition-all duration-200"
      style={{ border: '1px solid rgba(11,43,94,0.20)' }}
    >
      {/* Акцентная полоска цвета банка */}
      <div
        className="h-1 w-full"
        style={{ backgroundColor: offer.bankAccentColor }}
        aria-hidden="true"
      />

      <div className="p-5">
        {/* Шапка: банк + тип услуги */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center text-[11px] font-black text-white flex-shrink-0"
              style={{ backgroundColor: offer.bankAccentColor }}
              aria-hidden="true"
            >
              {offer.bankShortName.slice(0, 2)}
            </div>
            <div>
              <p className="text-[13px] font-black leading-tight" style={{ color: '#0B2B5E' }}>
                {offer.bankName}
              </p>
              <span
                className="inline-block text-[9px] font-bold px-2 py-0.5 rounded-full mt-0.5"
                style={{ backgroundColor: 'rgba(11,43,94,0.07)', color: '#0B2B5E' }}
              >
                {serviceLabel(offer.serviceType)}
              </span>
            </div>
          </div>

          {/* Ставка — главная метрика */}
          <div className="text-right">
            <p className="text-[22px] font-black leading-none tabular-nums" style={{ color: '#F26522' }}>
              {fmtRate(offer.ratePercent)}
            </p>
            <p className="text-[8px] text-slate-400 mt-0.5">процентная ставка</p>
          </div>
        </div>

        {/* Параметры */}
        <div
          className="grid grid-cols-3 gap-3 p-3 rounded-xl mb-4"
          style={{ backgroundColor: 'rgba(11,43,94,0.03)' }}
        >
          <div className="text-center">
            <p className="text-[12px] font-black tabular-nums" style={{ color: '#0B2B5E' }}>
              {offer.termMonths} мес.
            </p>
            <p className="text-[8px] text-slate-400">срок</p>
          </div>
          <div className="text-center border-x" style={{ borderColor: 'rgba(11,43,94,0.08)' }}>
            <p className="text-[12px] font-black tabular-nums" style={{ color: '#0B2B5E' }}>
              {offer.downPaymentPercent ? `${offer.downPaymentPercent}%` : 'Без взноса'}
            </p>
            <p className="text-[8px] text-slate-400">первый взнос</p>
          </div>
          <div className="text-center">
            <p className="text-[12px] font-black tabular-nums" style={{ color: '#0B2B5E' }}>
              {fmt(offer.maxAmount)}
            </p>
            <p className="text-[8px] text-slate-400">макс. сумма</p>
          </div>
        </div>

        {/* ── АВТОМАТИЧЕСКИЙ РАСЧЁТ ПЛАТЕЖЕЙ ── */}
        <div
          className="p-4 rounded-2xl mb-4"
          style={{
            background:  'linear-gradient(135deg, rgba(242,101,34,0.06) 0%, rgba(11,43,94,0.06) 100%)',
            border:      '1px solid rgba(242,101,34,0.18)',
          }}
        >
          <div className="flex items-center gap-1.5 mb-3">
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#F26522" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8"  x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            <span className="text-[9px] font-black text-[#F26522]">РАСЧЁТ ДЛЯ ВАШЕГО ТЕНДЕРА</span>
          </div>

          <div className="grid grid-cols-2 gap-2">
            {/* Ежемесячный платёж — главный показатель */}
            <div
              className="col-span-2 flex items-center justify-between p-3 rounded-xl"
              style={{ backgroundColor: 'rgba(242,101,34,0.08)' }}
            >
              <span className="text-[10px] font-bold text-slate-600">
                Ежемесячный платёж составит:
              </span>
              <span className="text-[18px] font-black tabular-nums" style={{ color: '#F26522' }}>
                {fmt(monthly)}
              </span>
            </div>
            {/* Детали */}
            {downAmt > 0 && (
              <div className="flex flex-col p-2 rounded-lg bg-white/60">
                <span className="text-[8px] text-slate-400">Первый взнос</span>
                <span className="text-[10px] font-black tabular-nums" style={{ color: '#0B2B5E' }}>
                  {fmt(downAmt)}
                </span>
              </div>
            )}
            <div className="flex flex-col p-2 rounded-lg bg-white/60">
              <span className="text-[8px] text-slate-400">Сумма кредита</span>
              <span className="text-[10px] font-black tabular-nums" style={{ color: '#0B2B5E' }}>
                {fmt(principal)}
              </span>
            </div>
            <div className="flex flex-col p-2 rounded-lg bg-white/60">
              <span className="text-[8px] text-slate-400">Переплата</span>
              <span className="text-[10px] font-black tabular-nums" style={{ color: overpayment > dealAmount * 0.2 ? '#ef4444' : '#64748b' }}>
                {fmt(overpayment)}
              </span>
            </div>
          </div>
        </div>

        {/* Комментарий банка */}
        {offer.comment && (
          <div
            className="p-3 rounded-xl mb-4 text-[9px] text-slate-600 leading-relaxed"
            style={{ backgroundColor: '#f8fafc', border: '1px solid #e2e8f0' }}
          >
            <span className="font-black text-[#0B2B5E]">{offer.bankShortName}: </span>
            {offer.comment}
          </div>
        )}

        {/* Срок действия */}
        {offer.validUntil && (
          <p className="text-[8px] text-slate-400 mb-3">
            Предложение действует до: <span className="font-semibold">{fmtDate(offer.validUntil)}</span>
          </p>
        )}

        {/* CTA — Принять финансирование */}
        <button
          type="button"
          onClick={() => onAccept(offer)}
          disabled={isAccepting || offer.status !== 'active'}
          className={[
            'w-full py-3 px-4 rounded-xl text-[11px] font-black text-white',
            'transition-all duration-200 flex items-center justify-center gap-2',
            offer.status !== 'active'
              ? 'opacity-50 cursor-not-allowed'
              : isAccepting
                ? 'opacity-70 cursor-wait'
                : 'hover:opacity-90 hover:shadow-lg active:scale-[0.99]',
          ].join(' ')}
          style={{ backgroundColor: '#F26522' }}
          aria-label={`Принять финансирование от ${offer.bankName}`}
        >
          {isAccepting ? (
            <>
              <svg className="animate-spin" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
                <circle cx="12" cy="12" r="10" strokeOpacity="0.25" />
                <path d="M12 2a10 10 0 0 1 10 10" />
              </svg>
              Формируем договор...
            </>
          ) : (
            <>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <polyline points="20 6 9 17 4 12" />
              </svg>
              Принять финансирование
            </>
          )}
        </button>
      </div>
    </div>
  );
}

// ── ГЛАВНЫЙ КОМПОНЕНТ ─────────────────────────────────────────────────────────

export default function FinancingSolutionsSection({
  tenderId,
  tenderTitle,
  supplierId,
  supplierName,
  buyerId,
  buyerCompany,
  dealAmount,
  offers,
}: FinancingSolutionsSectionProps) {
  const router              = useRouter();
  const [acceptingId, setAcceptingId] = useState<string | null>(null);
  const [error,        setError]       = useState<string | null>(null);

  // Только активные офферы — expired/withdrawn показываем как недоступные
  const activeOffers  = useMemo(() => offers.filter((o) => o.status === 'active'), [offers]);
  const inactiveCount = offers.length - activeOffers.length;

  // Пустое состояние
  if (offers.length === 0) {
    return (
      <section
        className="rounded-2xl border p-6 text-center"
        style={{ borderColor: 'rgba(11,43,94,0.20)', backgroundColor: '#fafbfd' }}
        aria-labelledby="financing-section-title"
      >
        <div
          className="w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-3"
          style={{ backgroundColor: 'rgba(11,43,94,0.06)' }}
          aria-hidden="true"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#0B2B5E" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <rect x="1" y="4" width="22" height="16" rx="2" ry="2" />
            <line x1="1" y1="10" x2="23" y2="10" />
          </svg>
        </div>
        <h3 id="financing-section-title" className="font-black text-sm mb-1" style={{ color: '#0B2B5E' }}>
          Финансовые решения
        </h3>
        <p className="text-[10px] text-slate-400">
          Банки ещё не предложили финансирование для этого тендера.
        </p>
      </section>
    );
  }

  async function handleAccept(offer: TenderFinancingOffer) {
    if (!supplierId || !supplierName) {
      setError('Сначала выберите победителя тендера, затем принимайте финансирование.');
      return;
    }

    setAcceptingId(offer.id);
    setError(null);

    try {
      const res = await fetch('/api/tender-financing/accept', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          tenderId,
          tenderTitle,
          offerId:      offer.id,
          supplierId,
          supplierName,
          buyerId,
          buyerCompany,
          dealAmount,
          offer,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error ?? 'Ошибка при принятии финансирования');
      }

      // Сохраняем черновик в sessionStorage — preview-страница читает оттуда
      if (typeof window !== 'undefined' && data.contractDraft) {
        sessionStorage.setItem(
          `tripartite_${data.draftId}`,
          JSON.stringify(data.contractDraft),
        );
      }

      // Редирект на предпросмотр трёхстороннего договора
      router.push(data.previewUrl);

    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Неизвестная ошибка');
      setAcceptingId(null);
    }
  }

  return (
    <section aria-labelledby="financing-solutions-title">

      {/* Заголовок секции */}
      <div className="flex items-center gap-3 mb-5">
        <div
          className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ backgroundColor: 'rgba(242,101,34,0.12)' }}
          aria-hidden="true"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#F26522" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="1" y="4" width="22" height="16" rx="2" ry="2" />
            <line x1="1" y1="10" x2="23" y2="10" />
          </svg>
        </div>
        <div>
          <h2
            id="financing-solutions-title"
            className="text-[15px] font-black leading-tight"
            style={{ color: '#0B2B5E' }}
          >
            Финансовые решения для этого тендера
          </h2>
          <p className="text-[9px] text-slate-400 mt-0.5">
            {activeOffers.length} предложени{activeOffers.length === 1 ? 'е' : 'я'} от банков-партнёров EXPO 365
            {!supplierId && (
              <span className="ml-2 text-amber-500 font-semibold">
                · Выберите победителя для принятия финансирования
              </span>
            )}
          </p>
        </div>
      </div>

      {/* Ошибка */}
      {error && (
        <div
          className="flex items-center gap-2 p-3 rounded-xl mb-4 text-[10px]"
          style={{ backgroundColor: '#fff1f2', border: '1px solid #fda4af', color: '#9f1239' }}
          role="alert"
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8"  x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          {error}
        </div>
      )}

      {/* Карточки офферов */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {offers.map((offer) => (
          <OfferCard
            key={offer.id}
            offer={offer}
            dealAmount={dealAmount}
            isAccepting={acceptingId === offer.id}
            onAccept={handleAccept}
          />
        ))}
      </div>

      {/* Уведомление об истёкших офферах */}
      {inactiveCount > 0 && (
        <p className="text-[9px] text-slate-400 mt-3 text-center">
          + {inactiveCount} предложени{inactiveCount > 1 ? 'я' : 'е'} недоступны (истёкли или отозваны)
        </p>
      )}

      {/* Дисклеймер */}
      <p className="text-[8px] text-slate-300 mt-4 text-center leading-relaxed">
        Расчёты носят ориентировочный характер. Точные условия финансирования согласовываются
        при подписании трёхстороннего договора. EXPO 365 не является финансовым посредником.
      </p>
    </section>
  );
}
