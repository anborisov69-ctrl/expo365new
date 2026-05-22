'use client';

// Кабинет банка располагается внутри HoReCa layout (src/app/horeca/layout.tsx),
// который рендерит фиксированный Header (h-16, z-50).
// • Обёртка страницы имеет `mt-16` для компенсации высоты глобального хедера.
// • Собственный заголовок дашборда: `sticky top-16 z-40` (ниже z-50 глобального).

/**
 * /horeca/bank/dashboard — Кабинет банка-партнёра EXPO 365
 * ──────────────────────────────────────────────────────────
 * Функциональность:
 *   1. Входящие заявки — группировка по компаниям и товарам
 *   2. Статус «Предварительно одобрено» — банк меняет статус прямо из кабинета
 *   3. BI-панель — список «горячих» клиентов, активно ищущих оборудование HoReCa
 *   4. Статистика — сводные метрики по заявкам
 *
 * TODO (production):
 *   - Получать данные из Supabase с RLS:
 *     supabase.from('loan_applications').select('*').eq('bank_id', bankProfile.bankId)
 *   - Подписка на real-time обновления:
 *     supabase.channel('bank-apps').on('postgres_changes', ...).subscribe()
 */

import { useState, useMemo } from 'react';
import Link                  from 'next/link';
import {
  MOCK_LOAN_APPLICATIONS,
  MOCK_BI_STATS,
  MOCK_TENDERS_FOR_BANK,
  BANKS,
} from '@/data/banksData';
import type {
  LoanApplication,
  LoanApplicationStatus,
  TenderSummaryForBank,
  TenderFinancingOffer,
} from '@/types/finance';
import {
  LOAN_STATUS_LABELS,
  LOAN_STATUS_COLORS,
} from '@/types/finance';

// ═══════════════════════════════════════════════════════════════════════════════
// УТИЛИТЫ
// ═══════════════════════════════════════════════════════════════════════════════

function formatMoney(v: number): string {
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)} млн ₽`;
  if (v >= 1_000)     return `${Math.round(v / 1_000)} тыс. ₽`;
  return `${v.toLocaleString('ru-RU')} ₽`;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const h    = Math.floor(diff / 3_600_000);
  const d    = Math.floor(h / 24);
  if (d > 0) return `${d} дн. назад`;
  if (h > 0) return `${h} ч. назад`;
  return 'только что';
}

// ═══════════════════════════════════════════════════════════════════════════════
// КОМПОНЕНТ: Бейдж статуса — крупный, контрастный
// ═══════════════════════════════════════════════════════════════════════════════

function StatusBadge({ status }: { status: LoanApplicationStatus }) {
  const colors = LOAN_STATUS_COLORS[status];
  return (
    <span
      className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-black leading-none tracking-wide shadow-sm"
      style={{
        backgroundColor: colors.bg,
        color:           colors.text,
        border:          `1.5px solid ${colors.border}`,
      }}
    >
      {status === 'pre_approved' && (
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <polyline points="20 6 9 17 4 12" />
        </svg>
      )}
      {status === 'approved' && (
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" />
        </svg>
      )}
      {status === 'rejected' && (
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      )}
      {LOAN_STATUS_LABELS[status]}
    </span>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// КОМПОНЕНТ: Карточка заявки — переработана для читаемости
// ═══════════════════════════════════════════════════════════════════════════════

interface AppCardProps {
  app:        LoanApplication;
  onSetStatus: (id: string, status: LoanApplicationStatus, comment?: string) => void;
}

function ApplicationCard({ app, onSetStatus }: AppCardProps) {
  const [showCommentBox, setShowCommentBox] = useState(false);
  const [comment,        setComment]        = useState('');
  const [pendingStatus,  setPendingStatus]  = useState<LoanApplicationStatus | null>(null);

  const canChangeStatus = !['approved', 'rejected', 'cancelled'].includes(app.status);

  function handleStatusAction(status: LoanApplicationStatus) {
    if (status === 'pre_approved' || status === 'rejected') {
      setPendingStatus(status);
      setShowCommentBox(true);
    } else {
      onSetStatus(app.id, status);
    }
  }

  function confirmWithComment() {
    if (!pendingStatus) return;
    onSetStatus(app.id, pendingStatus, comment.trim() || undefined);
    setShowCommentBox(false);
    setComment('');
    setPendingStatus(null);
  }

  return (
    <div
      className="bg-white rounded-2xl border overflow-hidden transition-all duration-200"
      style={{ borderColor: 'rgba(11,43,94,0.20)' }}
    >
      {/* Полоска статуса — утолщена для заметности */}
      <div
        className="h-1.5 w-full"
        style={{ backgroundColor: LOAN_STATUS_COLORS[app.status].border }}
        aria-hidden="true"
      />

      {/* ── Тело карточки с увеличенными отступами ── */}
      <div className="p-6">

        {/* Шапка: компания + статус + дата */}
        <div className="flex items-start justify-between gap-3 mb-4">
          <div className="flex-1 min-w-0">
            {/* Название компании — 20px, Bold */}
            <p className="text-xl font-black leading-tight truncate" style={{ color: '#0B2B5E' }}>
              {app.buyerCompany}
            </p>
            <p className="text-sm text-slate-500 mt-1">{app.buyerName}</p>
          </div>
          <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
            <StatusBadge status={app.status} />
            <span className="text-xs text-slate-400">{timeAgo(app.createdAt)}</span>
          </div>
        </div>

        {/* Блок товара */}
        <div
          className="flex items-center gap-3 p-4 rounded-xl mb-4"
          style={{ backgroundColor: 'rgba(11,43,94,0.04)' }}
        >
          <div
            className="w-10 h-10 rounded-xl flex-shrink-0 flex items-center justify-center text-base font-black text-white"
            style={{ backgroundColor: '#0B2B5E' }}
            aria-hidden="true"
          >
            {app.productBrand.charAt(0)}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-base font-bold leading-tight truncate" style={{ color: '#0B2B5E' }}>
              {app.productName}
            </p>
            <p className="text-sm text-slate-500 mt-0.5">{app.productBrand}</p>
          </div>
          {/* Сумма заявки — 24px крупный кегль */}
          <div className="text-right flex-shrink-0">
            <p className="text-2xl font-black tabular-nums" style={{ color: '#0B2B5E' }}>
              {formatMoney(app.amount)}
            </p>
            <span
              className="text-xs font-black px-2 py-0.5 rounded-full"
              style={{ backgroundColor: 'rgba(242,101,34,0.12)', color: '#F26522' }}
            >
              {app.purposeTag}
            </span>
          </div>
        </div>

        {/* Комментарий байера — выделен в читаемый блок с фоном */}
        {app.comment && (
          <div
            className="p-4 rounded-xl mb-4 text-sm text-slate-700 leading-relaxed"
            style={{
              backgroundColor: '#f0f6ff',
              border:          '1.5px solid rgba(11,43,94,0.12)',
              borderLeft:      '4px solid #0B2B5E',
            }}
          >
            <p className="text-xs font-black text-slate-500 uppercase tracking-wider mb-1.5">
              Комментарий байера
            </p>
            {app.comment}
          </div>
        )}

        {/* Ответ банка */}
        {app.bankComment && (
          <div
            className="p-4 rounded-xl mb-4 text-sm leading-relaxed"
            style={{
              backgroundColor: LOAN_STATUS_COLORS[app.status].bg,
              border:          `1.5px solid ${LOAN_STATUS_COLORS[app.status].border}`,
              color:           LOAN_STATUS_COLORS[app.status].text,
              borderLeft:      `4px solid ${LOAN_STATUS_COLORS[app.status].border}`,
            }}
          >
            <p className="text-xs font-black uppercase tracking-wider mb-1.5 opacity-70">
              Ответ банка
            </p>
            {app.bankComment}
          </div>
        )}

        {/* Форма с комментарием при смене статуса */}
        {showCommentBox && (
          <div className="mb-4 p-4 rounded-xl border" style={{ borderColor: 'rgba(11,43,94,0.14)', backgroundColor: '#fafafa' }}>
            <p className="text-sm font-black mb-3" style={{ color: '#0B2B5E' }}>
              {pendingStatus === 'pre_approved' ? 'Предварительно одобрено' : 'Отказ'} — добавить комментарий:
            </p>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={3}
              placeholder="Укажите условия одобрения или причину отказа..."
              className="w-full px-3 py-2.5 rounded-lg border text-sm text-slate-700 resize-none outline-none"
              style={{ borderColor: 'rgba(11,43,94,0.15)' }}
            />
            <div className="flex gap-3 mt-3">
              <button
                type="button"
                onClick={() => { setShowCommentBox(false); setPendingStatus(null); }}
                className="flex-1 min-h-[48px] rounded-xl text-sm font-bold text-slate-500 bg-slate-100 hover:bg-slate-200 transition-colors"
              >
                Отмена
              </button>
              <button
                type="button"
                onClick={confirmWithComment}
                className="flex-[2] min-h-[48px] rounded-xl text-sm font-black text-white transition-all hover:opacity-90 flex items-center justify-center gap-2"
                style={{ backgroundColor: pendingStatus === 'pre_approved' ? '#10b981' : '#ef4444' }}
              >
                {pendingStatus === 'pre_approved' ? (
                  <>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                    Подтвердить одобрение
                  </>
                ) : (
                  <>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                    Подтвердить отказ
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* Кнопки действий — min-h 48px, с иконками */}
        {canChangeStatus && !showCommentBox && (
          <div className="flex gap-3 mt-2">
            {app.status !== 'under_review' && (
              <button
                type="button"
                onClick={() => handleStatusAction('under_review')}
                className="flex-1 min-h-[48px] px-3 rounded-xl text-sm font-bold transition-all hover:opacity-80 flex items-center justify-center gap-2"
                style={{ backgroundColor: '#fffbeb', color: '#92400e', border: '1.5px solid #fde68a' }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <circle cx="12" cy="12" r="10" />
                  <polyline points="12 6 12 12 16 14" />
                </svg>
                На рассмотрение
              </button>
            )}
            {/* Кнопка «Предварительно одобрить» */}
            <button
              type="button"
              onClick={() => handleStatusAction('pre_approved')}
              className="flex-[2] min-h-[48px] px-4 rounded-xl text-sm font-black text-white transition-all hover:opacity-90 hover:shadow-md flex items-center justify-center gap-2"
              style={{ backgroundColor: '#10b981' }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <polyline points="20 6 9 17 4 12" />
              </svg>
              Предварительно одобрить
            </button>
            {/* Кнопка «Отказ» */}
            <button
              type="button"
              onClick={() => handleStatusAction('rejected')}
              className="flex-1 min-h-[48px] px-3 rounded-xl text-sm font-bold transition-all hover:opacity-80 flex items-center justify-center gap-2"
              style={{ backgroundColor: '#fff1f2', color: '#9f1239', border: '1.5px solid #fda4af' }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
              </svg>
              Отказ
            </button>
          </div>
        )}

        {/* Мета */}
        <div className="flex items-center justify-between mt-4 pt-3 border-t" style={{ borderColor: 'rgba(11,43,94,0.07)' }}>
          <span className="text-xs text-slate-400 font-mono">{app.id}</span>
          <span className="text-xs text-slate-400">{formatDate(app.createdAt)}</span>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// КОМПОНЕНТ: Модальное окно — предложить кредит/лизинг банку
// ═══════════════════════════════════════════════════════════════════════════════

interface OfferFormState {
  serviceType:         'leasing' | 'credit';
  ratePercent:         string;
  termMonths:          string;
  maxAmount:           string;
  downPaymentPercent:  string;
  comment:             string;
}

interface TenderOfferModalProps {
  tender:  TenderSummaryForBank;
  bank:    { name: string; shortName: string; accentColor: string; id: string };
  onClose: () => void;
  onSubmit: (tender: TenderSummaryForBank, offer: Omit<TenderFinancingOffer, 'id' | 'createdAt' | 'status'>) => void;
}

function TenderOfferModal({ tender, bank, onClose, onSubmit }: TenderOfferModalProps) {
  const [form, setForm] = useState<OfferFormState>({
    serviceType:        'leasing',
    ratePercent:        '',
    termMonths:         '36',
    maxAmount:          '',
    downPaymentPercent: '10',
    comment:            '',
  });
  const [submitting, setSubmitting] = useState(false);

  // Предварительный расчёт при заполненных полях
  const preview = useMemo(() => {
    const rate   = parseFloat(form.ratePercent.replace(',', '.'));
    const months = parseInt(form.termMonths);
    const down   = parseFloat(form.downPaymentPercent) || 0;
    const amt    = tender.budgetAmount;
    if (!rate || !months || rate <= 0 || months <= 0) return null;
    const principal = amt - Math.round(amt * (down / 100));
    const r = rate / 100 / 12;
    const monthly = Math.round(
      principal * (r * Math.pow(1 + r, months)) / (Math.pow(1 + r, months) - 1)
    );
    return { monthly, principal };
  }, [form.ratePercent, form.termMonths, form.downPaymentPercent, tender.budgetAmount]);

  function handleChange(field: keyof OfferFormState, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    const rate  = parseFloat(form.ratePercent.replace(',', '.'));
    const months = parseInt(form.termMonths);
    const maxAmt = parseFloat(form.maxAmount.replace(/\s/g, ''));
    const down   = parseFloat(form.downPaymentPercent) || 0;

    if (!rate || !months || !maxAmt) {
      alert('Заполните все обязательные поля');
      setSubmitting(false);
      return;
    }

    const offerData: Omit<TenderFinancingOffer, 'id' | 'createdAt' | 'status'> = {
      tenderId:          tender.id,
      tenderTitle:       tender.title,
      bankId:            bank.id,
      bankName:          bank.name,
      bankShortName:     bank.shortName,
      bankAccentColor:   bank.accentColor,
      serviceType:       form.serviceType,
      ratePercent:       rate,
      maxAmount:         maxAmt,
      termMonths:        months,
      downPaymentPercent: down > 0 ? down : undefined,
      comment:           form.comment.trim() || undefined,
      validUntil:        new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    };

    // Имитация асинхронной отправки (в production — Supabase INSERT)
    await new Promise((r) => setTimeout(r, 600));
    onSubmit(tender, offerData);
    setSubmitting(false);
  }

  return (
    /* backdrop */
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(11,43,94,0.55)', backdropFilter: 'blur(4px)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="offer-modal-title"
    >
      <div
        className="w-full max-w-lg bg-white rounded-3xl overflow-hidden shadow-2xl"
        style={{ border: '1px solid rgba(11,43,94,0.12)' }}
      >
        {/* ── Шапка модала ── */}
        <div
          className="px-6 py-5 flex items-center justify-between"
          style={{ backgroundColor: '#0B2B5E' }}
        >
          <div>
            <h3
              id="offer-modal-title"
              className="text-lg font-black text-white"
            >
              Предложить кредит / лизинг
            </h3>
            <p className="text-sm text-white/50 mt-0.5 truncate max-w-xs">{tender.title}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-white/60 hover:text-white hover:bg-white/10 transition-all"
            aria-label="Закрыть"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* ── Форма ── */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">

          {/* Тип услуги */}
          <div>
            <label className="block text-xs font-black text-slate-500 uppercase tracking-wider mb-2.5">
              Тип финансирования *
            </label>
            <div className="flex gap-3">
              {(['leasing', 'credit'] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => handleChange('serviceType', t)}
                  className={[
                    'flex-1 min-h-[48px] rounded-xl text-sm font-black transition-all',
                    form.serviceType === t
                      ? 'text-white'
                      : 'text-slate-500 bg-slate-100 hover:bg-slate-200',
                  ].join(' ')}
                  style={form.serviceType === t ? { backgroundColor: '#0B2B5E' } : {}}
                >
                  {t === 'leasing' ? 'Лизинг' : 'Кредит'}
                </button>
              ))}
            </div>
          </div>

          {/* Ставка + срок */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-black text-slate-500 uppercase tracking-wider mb-2">
                Ставка, % годовых *
              </label>
              <input
                type="text"
                inputMode="decimal"
                value={form.ratePercent}
                onChange={(e) => handleChange('ratePercent', e.target.value)}
                placeholder="Напр. 6.5"
                required
                className="w-full px-4 py-3 rounded-xl border text-base font-bold outline-none transition-all"
                style={{ borderColor: 'rgba(11,43,94,0.15)', color: '#0B2B5E' }}
                onFocus={(e) => { e.currentTarget.style.borderColor = '#F26522'; }}
                onBlur={(e)  => { e.currentTarget.style.borderColor = 'rgba(11,43,94,0.15)'; }}
              />
            </div>
            <div>
              <label className="block text-xs font-black text-slate-500 uppercase tracking-wider mb-2">
                Срок, месяцев *
              </label>
              <input
                type="number"
                min={3}
                max={120}
                value={form.termMonths}
                onChange={(e) => handleChange('termMonths', e.target.value)}
                required
                className="w-full px-4 py-3 rounded-xl border text-base font-bold outline-none transition-all"
                style={{ borderColor: 'rgba(11,43,94,0.15)', color: '#0B2B5E' }}
                onFocus={(e) => { e.currentTarget.style.borderColor = '#F26522'; }}
                onBlur={(e)  => { e.currentTarget.style.borderColor = 'rgba(11,43,94,0.15)'; }}
              />
            </div>
          </div>

          {/* Макс. сумма + первый взнос */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-black text-slate-500 uppercase tracking-wider mb-2">
                Макс. сумма, ₽ *
              </label>
              <input
                type="number"
                min={0}
                value={form.maxAmount}
                onChange={(e) => handleChange('maxAmount', e.target.value)}
                placeholder="5000000"
                required
                className="w-full px-4 py-3 rounded-xl border text-base font-bold outline-none transition-all"
                style={{ borderColor: 'rgba(11,43,94,0.15)', color: '#0B2B5E' }}
                onFocus={(e) => { e.currentTarget.style.borderColor = '#F26522'; }}
                onBlur={(e)  => { e.currentTarget.style.borderColor = 'rgba(11,43,94,0.15)'; }}
              />
            </div>
            <div>
              <label className="block text-xs font-black text-slate-500 uppercase tracking-wider mb-2">
                Первый взнос, %
              </label>
              <input
                type="number"
                min={0}
                max={80}
                value={form.downPaymentPercent}
                onChange={(e) => handleChange('downPaymentPercent', e.target.value)}
                placeholder="0 — без взноса"
                className="w-full px-4 py-3 rounded-xl border text-base font-bold outline-none transition-all"
                style={{ borderColor: 'rgba(11,43,94,0.15)', color: '#0B2B5E' }}
                onFocus={(e) => { e.currentTarget.style.borderColor = '#F26522'; }}
                onBlur={(e)  => { e.currentTarget.style.borderColor = 'rgba(11,43,94,0.15)'; }}
              />
            </div>
          </div>

          {/* Предварительный расчёт */}
          {preview && (
            <div
              className="flex items-center justify-between p-4 rounded-xl"
              style={{ backgroundColor: 'rgba(242,101,34,0.07)', border: '1.5px solid rgba(242,101,34,0.22)' }}
            >
              <span className="text-sm font-bold text-slate-600">
                Расчётный ежемес. платёж байера:
              </span>
              <span className="text-2xl font-black tabular-nums" style={{ color: '#F26522' }}>
                {formatMoney(preview.monthly)}
              </span>
            </div>
          )}

          {/* Комментарий */}
          <div>
            <label className="block text-xs font-black text-slate-500 uppercase tracking-wider mb-2">
              Комментарий для байера
            </label>
            <textarea
              value={form.comment}
              onChange={(e) => handleChange('comment', e.target.value)}
              rows={3}
              placeholder="Укажите особые условия, преимущества вашего предложения..."
              className="w-full px-4 py-3 rounded-xl border text-sm text-slate-700 resize-none outline-none transition-all leading-relaxed"
              style={{ borderColor: 'rgba(11,43,94,0.15)' }}
              onFocus={(e) => { e.currentTarget.style.borderColor = '#F26522'; }}
              onBlur={(e)  => { e.currentTarget.style.borderColor = 'rgba(11,43,94,0.15)'; }}
            />
          </div>

          {/* Кнопки */}
          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 min-h-[48px] rounded-xl text-sm font-bold text-slate-500 bg-slate-100 hover:bg-slate-200 transition-all"
            >
              Отмена
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex-[2] min-h-[48px] rounded-xl text-sm font-black text-white transition-all hover:opacity-90 disabled:opacity-60 flex items-center justify-center gap-2"
              style={{ backgroundColor: '#F26522' }}
            >
              {submitting ? (
                <>
                  <svg className="animate-spin" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
                    <circle cx="12" cy="12" r="10" strokeOpacity="0.25" />
                    <path d="M12 2a10 10 0 0 1 10 10" />
                  </svg>
                  Отправляем...
                </>
              ) : (
                <>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <line x1="22" y1="2" x2="11" y2="13" />
                    <polygon points="22 2 15 22 11 13 2 9 22 2" />
                  </svg>
                  Отправить предложение
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// КОМПОНЕНТ: Карточка тендера (для банка)
// ═══════════════════════════════════════════════════════════════════════════════

interface TenderCardProps {
  tender:  TenderSummaryForBank;
  onOffer: (tender: TenderSummaryForBank) => void;
}

function BankTenderCard({ tender, onOffer }: TenderCardProps) {
  const daysLeft = tender.deadline
    ? Math.max(0, Math.ceil((new Date(tender.deadline).getTime() - Date.now()) / 86_400_000))
    : null;

  return (
    <div
      className="bg-white rounded-2xl overflow-hidden transition-all duration-200"
      style={{ border: '1px solid rgba(11,43,94,0.20)' }}
    >
      {/* Полоска срочности */}
      <div
        className="h-1.5 w-full"
        style={{
          backgroundColor: daysLeft !== null
            ? daysLeft <= 7
              ? '#ef4444'
              : daysLeft <= 14
                ? '#f59e0b'
                : '#10b981'
            : '#94a3b8',
        }}
        aria-hidden="true"
      />

      <div className="p-6">
        {/* Шапка */}
        <div className="flex items-start justify-between gap-3 mb-4">
          <div className="flex-1 min-w-0">
            {/* Название тендера — 20px, Bold */}
            <p className="text-xl font-black leading-snug" style={{ color: '#0B2B5E' }}>
              {tender.title}
            </p>
            <p className="text-sm text-slate-500 mt-1">{tender.buyerCompany}</p>
          </div>
          <div className="flex flex-col items-end gap-2 flex-shrink-0">
            {tender.hasOffer && (
              <span
                className="text-sm font-black px-3 py-1 rounded-full"
                style={{ backgroundColor: '#ecfdf5', color: '#065f46' }}
              >
                ✓ Оффер отправлен
              </span>
            )}
            {daysLeft !== null && (
              <span
                className="text-sm font-bold px-3 py-1 rounded-full"
                style={{
                  backgroundColor: daysLeft <= 7  ? '#fff1f2' : daysLeft <= 14 ? '#fffbeb' : '#f0fdf4',
                  color:           daysLeft <= 7  ? '#9f1239' : daysLeft <= 14 ? '#92400e' : '#166534',
                }}
              >
                {daysLeft === 0 ? 'Истекает сегодня' : `${daysLeft} дн.`}
              </span>
            )}
          </div>
        </div>

        {/* Сумма + категория */}
        <div
          className="flex items-center gap-4 p-4 rounded-xl mb-4"
          style={{ backgroundColor: 'rgba(11,43,94,0.04)' }}
        >
          <div
            className="w-10 h-10 rounded-xl flex-shrink-0 flex items-center justify-center"
            style={{ backgroundColor: 'rgba(11,43,94,0.10)' }}
            aria-hidden="true"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#0B2B5E" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
              <line x1="3" y1="6" x2="21" y2="6" />
              <path d="M16 10a4 4 0 0 1-8 0" />
            </svg>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm text-slate-600 font-medium truncate">{tender.category}</p>
            {tender.buyerRegion && (
              <p className="text-sm text-slate-400 mt-0.5">{tender.buyerRegion}</p>
            )}
          </div>
          <div className="text-right flex-shrink-0">
            {/* Бюджет тендера — 24px */}
            <p className="text-2xl font-black tabular-nums" style={{ color: '#0B2B5E' }}>
              {formatMoney(tender.budgetAmount)}
            </p>
            <p className="text-xs text-slate-400 mt-0.5">бюджет тендера</p>
          </div>
        </div>

        {/* Описание */}
        {tender.description && (
          <p className="text-sm text-slate-600 leading-relaxed mb-4 line-clamp-2">
            {tender.description}
          </p>
        )}

        {/* Meta */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <span
              className="text-sm font-bold px-3 py-1 rounded-full"
              style={{
                backgroundColor: tender.paymentType === 'installment' ? 'rgba(242,101,34,0.10)' : 'rgba(11,43,94,0.07)',
                color:           tender.paymentType === 'installment' ? '#F26522' : '#0B2B5E',
              }}
            >
              {tender.paymentType === 'installment' ? 'Рассрочка' : tender.paymentType === 'prepayment' ? 'Предоплата' : 'Постоплата'}
            </span>
            <span className="text-sm text-slate-500">
              {tender.bidsCount} откликов
            </span>
          </div>
          <span className="text-sm text-slate-400">
            {new Date(tender.createdAt).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })}
          </span>
        </div>

        {/* CTA — min-h 48px */}
        <button
          type="button"
          onClick={() => onOffer(tender)}
          disabled={tender.hasOffer}
          className={[
            'w-full min-h-[48px] px-4 rounded-xl text-sm font-black transition-all duration-200',
            'flex items-center justify-center gap-2',
            tender.hasOffer
              ? 'text-slate-400 cursor-default'
              : 'text-white hover:opacity-90 hover:shadow-md active:scale-[0.99]',
          ].join(' ')}
          style={{
            backgroundColor: tender.hasOffer ? '#f1f5f9' : '#F26522',
          }}
        >
          {tender.hasOffer ? (
            <>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <polyline points="20 6 9 17 4 12" />
              </svg>
              Предложение отправлено
            </>
          ) : (
            <>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <rect x="1" y="4" width="22" height="16" rx="2" ry="2" />
                <line x1="1" y1="10" x2="23" y2="10" />
              </svg>
              Предложить кредит / лизинг
            </>
          )}
        </button>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// КОМПОНЕНТ: Панель тендеров (вкладка «Тендеры»)
// ═══════════════════════════════════════════════════════════════════════════════

interface TendersPanelProps {
  bank: { id: string; name: string; shortName: string; accentColor: string };
}

function TendersPanel({ bank }: TendersPanelProps) {
  const [tenders, setTenders]   = useState<TenderSummaryForBank[]>(MOCK_TENDERS_FOR_BANK);
  const [offerTarget, setOfferTarget] = useState<TenderSummaryForBank | null>(null);
  const [successMsg,  setSuccessMsg]  = useState<string | null>(null);

  // Фильтр: без отправленных / только с отправленными
  const [showOnlyWithOffer, setShowOnlyWithOffer] = useState(false);
  const filtered = useMemo(
    () => showOnlyWithOffer ? tenders.filter((t) => t.hasOffer) : tenders,
    [tenders, showOnlyWithOffer],
  );

  function handleOfferSubmit(
    tender: TenderSummaryForBank,
    _offer: Omit<TenderFinancingOffer, 'id' | 'createdAt' | 'status'>,
  ) {
    // TODO (production): POST /api/tender-financing/offer + Supabase INSERT
    setTenders((prev) =>
      prev.map((t) => t.id === tender.id ? { ...t, hasOffer: true } : t)
    );
    setOfferTarget(null);
    setSuccessMsg(`Предложение для «${tender.title}» отправлено байеру!`);
    setTimeout(() => setSuccessMsg(null), 4_000);
  }

  const withOfferCount    = tenders.filter((t) => t.hasOffer).length;
  const withoutOfferCount = tenders.length - withOfferCount;

  return (
    <div>
      {/* Тулбар */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div>
          {/* Заголовок раздела — 22px */}
          <h2 className="text-[22px] font-black" style={{ color: '#0B2B5E' }}>
            Активные тендеры HoReCa
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            {withoutOfferCount} без вашего предложения · {withOfferCount} уже с оффером
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setShowOnlyWithOffer((v) => !v)}
            className={[
              'min-h-[40px] px-4 rounded-full text-sm font-bold transition-all',
              showOnlyWithOffer
                ? 'text-white'
                : 'bg-white border text-slate-500 hover:border-[#0B2B5E]/40',
            ].join(' ')}
            style={showOnlyWithOffer
              ? { backgroundColor: '#0B2B5E' }
              : { borderColor: 'rgba(11,43,94,0.15)' }
            }
          >
            {showOnlyWithOffer ? '✓ Только с оффером' : 'Только с оффером'}
          </button>
        </div>
      </div>

      {/* Уведомление об успехе */}
      {successMsg && (
        <div
          className="flex items-center gap-3 p-4 rounded-xl mb-5 text-sm font-semibold"
          style={{ backgroundColor: '#ecfdf5', border: '1px solid #6ee7b7', color: '#065f46' }}
          role="status"
        >
          {successMsg}
        </div>
      )}

      {/* Сетка карточек — max 2 в ряд для читаемости */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-5" style={{ backgroundColor: 'rgba(11,43,94,0.06)' }}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#0B2B5E" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
              <line x1="3" y1="6" x2="21" y2="6" />
            </svg>
          </div>
          <p className="font-black text-lg" style={{ color: '#0B2B5E' }}>Тендеры не найдены</p>
          <p className="text-slate-400 text-base mt-2">Попробуйте сбросить фильтры</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {filtered.map((tender) => (
            <BankTenderCard
              key={tender.id}
              tender={tender}
              onOffer={setOfferTarget}
            />
          ))}
        </div>
      )}

      {/* Модальное окно оффера */}
      {offerTarget && (
        <TenderOfferModal
          tender={offerTarget}
          bank={bank}
          onClose={() => setOfferTarget(null)}
          onSubmit={handleOfferSubmit}
        />
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// КОМПОНЕНТ: BI-панель «Горячие» клиенты
// ═══════════════════════════════════════════════════════════════════════════════

function BIPanel() {
  const stats   = MOCK_BI_STATS;
  const hotBuyers = stats.hotBuyers;

  return (
    <div className="flex flex-col gap-6">

      {/* Метрики */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Всего заявок',       value: stats.totalApplications,              color: '#0B2B5E' },
          { label: 'На рассмотрении',    value: stats.pendingCount,                   color: '#92400e' },
          { label: 'Одобрено',           value: stats.approvedCount,                  color: '#065f46' },
          { label: 'Сумма запросов',     value: formatMoney(stats.totalAmountRequested), color: '#F26522' },
        ].map((m, i) => (
          <div
            key={i}
            className="flex flex-col p-5 bg-white rounded-2xl border"
            style={{ borderColor: 'rgba(11,43,94,0.20)' }}
          >
            <span className="text-3xl font-black leading-none" style={{ color: m.color }}>
              {m.value}
            </span>
            <span className="text-sm text-slate-500 mt-2">{m.label}</span>
          </div>
        ))}
      </div>

      {/* Топ категории */}
      <div
        className="p-6 bg-white rounded-2xl border"
        style={{ borderColor: 'rgba(11,43,94,0.20)' }}
      >
        <h3 className="text-[22px] font-black mb-5" style={{ color: '#0B2B5E' }}>
          Топ категорий оборудования в заявках
        </h3>
        <div className="flex flex-col gap-3">
          {stats.topCategories.map((cat, i) => {
            const maxCount = Math.max(...stats.topCategories.map((c) => c.count));
            const pct = Math.round((cat.count / maxCount) * 100);
            return (
              <div key={i} className="flex items-center gap-4">
                <span className="text-sm font-semibold text-slate-600 w-40 flex-shrink-0 truncate">
                  {cat.category}
                </span>
                <div className="flex-1 flex items-center gap-3">
                  <div className="flex-1 h-2.5 rounded-full bg-slate-100 overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{ width: `${pct}%`, backgroundColor: '#F26522' }}
                    />
                  </div>
                  <span className="text-base font-black tabular-nums w-5" style={{ color: '#0B2B5E' }}>
                    {cat.count}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Горячие клиенты */}
      <div>
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-[22px] font-black" style={{ color: '#0B2B5E' }}>
            Горячие клиенты
          </h3>
          <span
            className="inline-flex items-center px-3 py-1 rounded-full text-sm font-black"
            style={{ backgroundColor: 'rgba(242,101,34,0.12)', color: '#F26522' }}
          >
            AI-сигнал
          </span>
        </div>

        <p className="text-base text-slate-500 mb-5 leading-relaxed">
          Байеры, которые активно просматривают оборудование HoReCa от 50 000 ₽ за последние 7 дней.
          Высокий шанс подачи заявки на финансирование.
        </p>

        <div className="flex flex-col gap-4">
          {hotBuyers.map((buyer, i) => (
            <div
              key={buyer.buyerId}
              className="flex items-center gap-5 p-5 bg-white rounded-2xl border transition-all"
              style={{ borderColor: 'rgba(11,43,94,0.20)' }}
            >
              {/* Ранг */}
              <div
                className="w-10 h-10 rounded-xl flex-shrink-0 flex items-center justify-center text-base font-black text-white"
                style={{ backgroundColor: i === 0 ? '#F26522' : i === 1 ? '#0B2B5E' : '#94a3b8' }}
                aria-label={`Место ${i + 1}`}
              >
                {i + 1}
              </div>

              {/* Компания */}
              <div className="flex-1 min-w-0">
                <p className="text-lg font-black truncate" style={{ color: '#0B2B5E' }}>
                  {buyer.buyerCompany}
                </p>
                <p className="text-sm text-slate-500">{buyer.buyerName}</p>
                <p className="text-sm text-slate-600 mt-1">
                  Ищет: <span className="font-semibold">{buyer.searchCategory}</span>
                </p>
              </div>

              {/* Бюджет */}
              <div className="text-right flex-shrink-0">
                <p className="text-2xl font-black tabular-nums" style={{ color: '#0B2B5E' }}>
                  {formatMoney(buyer.estimatedBudget)}
                </p>
                <p className="text-xs text-slate-400 mt-0.5">расч. бюджет</p>
              </div>

              {/* Activity score */}
              <div className="flex-shrink-0">
                <div className="relative w-12 h-12">
                  <svg viewBox="0 0 36 36" className="w-12 h-12 -rotate-90">
                    <circle cx="18" cy="18" r="15" fill="none" stroke="#f1f5f9" strokeWidth="3" />
                    <circle
                      cx="18" cy="18" r="15" fill="none"
                      stroke={buyer.activityScore >= 80 ? '#F26522' : buyer.activityScore >= 60 ? '#f59e0b' : '#94a3b8'}
                      strokeWidth="3"
                      strokeDasharray={`${(buyer.activityScore / 100) * 94.2} 94.2`}
                      strokeLinecap="round"
                    />
                  </svg>
                  <span
                    className="absolute inset-0 flex items-center justify-center text-sm font-black"
                    style={{ color: '#0B2B5E' }}
                  >
                    {buyer.activityScore}
                  </span>
                </div>
                <p className="text-xs text-slate-400 text-center mt-1">score</p>
              </div>

              {/* Индикатор: уже есть заявка? */}
              {buyer.hasExistingApplication && (
                <span
                  className="flex-shrink-0 text-sm font-black px-3 py-1 rounded-full"
                  style={{ backgroundColor: '#ecfdf5', color: '#065f46' }}
                >
                  есть заявка
                </span>
              )}
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// ГЛАВНЫЙ КОМПОНЕНТ — Кабинет банка
// ═══════════════════════════════════════════════════════════════════════════════

type Tab = 'incoming' | 'tenders' | 'bi' | 'stats';
type GroupBy = 'company' | 'product' | 'status';

export default function BankDashboardPage() {
  const [activeTab,       setActiveTab]      = useState<Tab>('incoming');
  const [groupBy,         setGroupBy]        = useState<GroupBy>('company');
  const [statusFilter,    setStatusFilter]   = useState<LoanApplicationStatus | 'all'>('all');
  // Для демо используем данные Аренза (bank-arenza)
  const currentBank = BANKS.find((b) => b.slug === 'arenza')!;

  // ── Мутируемый список заявок (mock state — в prodмощи, это Supabase realtime) ──
  const [applications, setApplications] = useState(MOCK_LOAN_APPLICATIONS);

  function handleSetStatus(id: string, status: LoanApplicationStatus, comment?: string) {
    setApplications((prev) =>
      prev.map((a) =>
        a.id === id
          ? {
              ...a,
              status,
              bankComment: comment ?? a.bankComment,
              updatedAt:   new Date().toISOString(),
            }
          : a
      )
    );
  }

  // ── Фильтрация ────────────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    if (statusFilter === 'all') return applications;
    return applications.filter((a) => a.status === statusFilter);
  }, [applications, statusFilter]);

  // ── Группировка ───────────────────────────────────────────────────────────
  const grouped = useMemo(() => {
    if (groupBy === 'company') {
      const map = new Map<string, LoanApplication[]>();
      filtered.forEach((a) => {
        const key = a.buyerCompany;
        if (!map.has(key)) map.set(key, []);
        map.get(key)!.push(a);
      });
      return Array.from(map.entries()).map(([key, apps]) => ({ key, apps }));
    }
    if (groupBy === 'product') {
      const map = new Map<string, LoanApplication[]>();
      filtered.forEach((a) => {
        const key = a.productBrand;
        if (!map.has(key)) map.set(key, []);
        map.get(key)!.push(a);
      });
      return Array.from(map.entries()).map(([key, apps]) => ({ key, apps }));
    }
    // by status
    const map = new Map<string, LoanApplication[]>();
    filtered.forEach((a) => {
      const key = LOAN_STATUS_LABELS[a.status];
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(a);
    });
    return Array.from(map.entries()).map(([key, apps]) => ({ key, apps }));
  }, [filtered, groupBy]);

  const pendingCount   = applications.filter((a) => a.status === 'pending').length;
  const totalAmount    = applications.reduce((sum, a) => sum + a.amount, 0);

  return (
    /*
     * mt-16 — сдвиг под фиксированный глобальный Header.
     * Фон страницы (blueprint-grid) наследуется от HoReCaLayout (.ds-page).
     */
    <div className="mt-16 min-h-screen">

      {/*
       * ── Подшапка кабинета банка ──────────────────────────────────────────
       * ds-subheader = bg-white + border-bottom #E2E8F0 + shadow.
       * sticky top-16 z-40 — прилипает под глобальным хедером (z-50).
       * Активная вкладка: оранжевая нижняя линия + тёмно-синий текст.
       */}
      <header className="ds-subheader sticky top-16 z-40">
        <div className="max-w-7xl mx-auto px-6 py-3.5 flex items-center justify-between">
          {/* Лого + название */}
          <div className="flex items-center gap-4">
            <Link href="/horeca" className="text-slate-400 hover:text-[#0B2B5E] transition-colors text-sm flex items-center gap-1.5">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <polyline points="15 18 9 12 15 6" />
              </svg>
              EXPO 365
            </Link>
            <span className="text-slate-200" aria-hidden="true">/</span>
            <div className="flex items-center gap-3">
              {/* Цветная плашка банка — единый размер 36×36, скругление 10px */}
              <div
                className="w-9 h-9 rounded-[10px] flex items-center justify-center text-sm font-black text-white flex-shrink-0"
                style={{ backgroundColor: currentBank.accentColor }}
                aria-hidden="true"
              >
                {currentBank.shortName.slice(0, 2)}
              </div>
              <div>
                <p className="text-base font-black text-[#0B2B5E] leading-tight">{currentBank.name}</p>
                <p className="text-xs text-slate-500">Кабинет заявок EXPO 365</p>
              </div>
            </div>
          </div>

          {/* Счётчик новых заявок & общий объём */}
          <div className="flex items-center gap-4">
            {pendingCount > 0 && (
              <div
                className="flex items-center gap-2 px-3 py-1.5 rounded-xl"
                style={{ backgroundColor: 'rgba(242,101,34,0.08)', border: '1px solid rgba(242,101,34,0.3)' }}
              >
                <span className="w-2 h-2 rounded-full bg-[#F26522] animate-pulse" aria-hidden="true" />
                <span className="text-sm font-black text-[#F26522]">
                  {pendingCount} новых заявок
                </span>
              </div>
            )}
            <div className="text-right hidden sm:block">
              <p className="text-base font-black text-[#0B2B5E]">{formatMoney(totalAmount)}</p>
              <p className="text-xs text-slate-400">всего запрошено</p>
            </div>
          </div>
        </div>

        {/* Вкладки — единый стиль: белый фон, оранжевый активный индикатор */}
        <div className="max-w-7xl mx-auto px-6 flex gap-0 overflow-x-auto">
          {(
            [
              { id: 'incoming', label: 'Входящие',       count: applications.length },
              { id: 'tenders',  label: 'Тендеры',         count: MOCK_TENDERS_FOR_BANK.length },
              { id: 'bi',       label: 'Горячие клиенты', count: MOCK_BI_STATS.hotBuyers.length },
              { id: 'stats',    label: 'Статистика',      count: null },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={[
                'flex items-center gap-2 px-5 py-3 text-sm font-semibold border-b-2 transition-all duration-150 whitespace-nowrap',
                activeTab === tab.id
                  ? 'border-[#F26522] text-[#0B2B5E] font-black'
                  : 'border-transparent text-slate-400 hover:text-slate-700',
              ].join(' ')}
              aria-current={activeTab === tab.id ? 'page' : undefined}
            >
              {tab.label}
              {tab.count !== null && (
                <span
                  className={[
                    'min-w-[20px] h-5 flex items-center justify-center px-1.5 rounded-full text-xs font-black',
                    activeTab === tab.id
                      ? 'bg-[#F26522] text-white'
                      : 'bg-slate-100 text-slate-500',
                  ].join(' ')}
                >
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>
      </header>

      {/* ── Основной контент ── */}
      <main className="max-w-7xl mx-auto px-6 py-8">

        {/* ══ ВКЛАДКА: Входящие заявки ══ */}
        {activeTab === 'incoming' && (
          <div>
            {/* Тулбар */}
            <div className="flex flex-wrap items-center gap-4 mb-7">
              {/* Группировка */}
              <div className="flex items-center gap-1 p-1 rounded-xl bg-white border" style={{ borderColor: 'rgba(11,43,94,0.10)' }}>
                <span className="text-xs text-slate-400 font-semibold px-3">Группировка:</span>
                {(
                  [
                    { id: 'company', label: 'По компаниям' },
                    { id: 'product', label: 'По товарам' },
                    { id: 'status',  label: 'По статусу' },
                  ] as const
                ).map((g) => (
                  <button
                    key={g.id}
                    type="button"
                    onClick={() => setGroupBy(g.id)}
                    className={[
                      'px-4 py-2 rounded-lg text-sm font-bold transition-all',
                      groupBy === g.id
                        ? 'bg-[#0B2B5E] text-white'
                        : 'text-slate-500 hover:bg-slate-100',
                    ].join(' ')}
                  >
                    {g.label}
                  </button>
                ))}
              </div>

              {/* Фильтр по статусу */}
              <div className="flex items-center gap-2 flex-wrap">
                {(
                  [
                    { id: 'all',          label: 'Все' },
                    { id: 'pending',      label: 'Новые' },
                    { id: 'under_review', label: 'На рассмотрении' },
                    { id: 'pre_approved', label: 'Пред. одобрено' },
                    { id: 'approved',     label: 'Одобрено' },
                  ] as const
                ).map((f) => (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => setStatusFilter(f.id)}
                    className={[
                      'px-3 py-1.5 rounded-full text-sm font-bold transition-all',
                      statusFilter === f.id
                        ? 'bg-[#F26522] text-white'
                        : 'bg-white border text-slate-500 hover:border-[#F26522]/40',
                    ].join(' ')}
                    style={statusFilter !== f.id ? { borderColor: 'rgba(11,43,94,0.12)' } : {}}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Группы заявок */}
            {grouped.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-24 text-center">
                <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-5" style={{ backgroundColor: 'rgba(11,43,94,0.06)' }}>
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#0B2B5E" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                    <polyline points="14 2 14 8 20 8" />
                  </svg>
                </div>
                <p className="font-black text-lg" style={{ color: '#0B2B5E' }}>Заявок нет</p>
                <p className="text-slate-400 text-base mt-2">Сбросьте фильтры или подождите новых заявок</p>
              </div>
            ) : (
              <div className="flex flex-col gap-10">
                {grouped.map(({ key, apps }) => (
                  <section key={key} aria-labelledby={`group-${key}`}>
                    {/* Заголовок группы — 22px, Bold */}
                    <div className="flex items-center gap-4 mb-4">
                      <h2
                        id={`group-${key}`}
                        className="text-[22px] font-black"
                        style={{ color: '#0B2B5E' }}
                      >
                        {key}
                      </h2>
                      <span
                        className="inline-flex items-center justify-center w-7 h-7 rounded-full text-sm font-black text-white"
                        style={{ backgroundColor: '#F26522' }}
                        aria-label={`${apps.length} заявок`}
                      >
                        {apps.length}
                      </span>
                      <div className="flex-1 h-px" style={{ backgroundColor: 'rgba(11,43,94,0.08)' }} aria-hidden="true" />
                      {/* Итого по группе */}
                      <span className="text-base font-black text-slate-500">
                        {formatMoney(apps.reduce((s, a) => s + a.amount, 0))}
                      </span>
                    </div>

                    {/* Карточки заявок — grid max 2 col */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                      {apps.map((app) => (
                        <ApplicationCard
                          key={app.id}
                          app={app}
                          onSetStatus={handleSetStatus}
                        />
                      ))}
                    </div>
                  </section>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ══ ВКЛАДКА: Тендеры ══ */}
        {activeTab === 'tenders' && (
          <TendersPanel
            bank={{
              id:          currentBank.id,
              name:        currentBank.name,
              shortName:   currentBank.shortName,
              accentColor: currentBank.accentColor,
            }}
          />
        )}

        {/* ══ ВКЛАДКА: BI-панель ══ */}
        {activeTab === 'bi' && <BIPanel />}

        {/* ══ ВКЛАДКА: Статистика ══ */}
        {activeTab === 'stats' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

            {/* Сводка */}
            <div className="p-6 bg-white rounded-2xl border col-span-full" style={{ borderColor: 'rgba(11,43,94,0.20)' }}>
              <h2 className="text-[22px] font-black mb-6" style={{ color: '#0B2B5E' }}>
                Сводная статистика по заявкам
              </h2>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                {(
                  [
                    { label: 'Всего',            value: applications.length,                                            color: '#0B2B5E' },
                    { label: 'Ожидают',          value: applications.filter((a) => a.status === 'pending').length,      color: '#94a3b8' },
                    { label: 'На рассмотрении',  value: applications.filter((a) => a.status === 'under_review').length, color: '#f59e0b' },
                    { label: 'Пред. одобрено',   value: applications.filter((a) => a.status === 'pre_approved').length, color: '#10b981' },
                    { label: 'Одобрено',         value: applications.filter((a) => a.status === 'approved').length,     color: '#166534' },
                  ]
                ).map((m, i) => (
                  <div key={i} className="flex flex-col p-5 rounded-2xl" style={{ backgroundColor: `${m.color}0A` }}>
                    <span className="text-4xl font-black leading-none" style={{ color: m.color }}>{m.value}</span>
                    <span className="text-sm text-slate-500 mt-2">{m.label}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Средняя сумма */}
            <div className="p-6 bg-white rounded-2xl border" style={{ borderColor: 'rgba(11,43,94,0.20)' }}>
              <p className="text-sm font-black text-slate-400 mb-3">Средняя сумма заявки</p>
              <p className="text-4xl font-black" style={{ color: '#F26522' }}>
                {formatMoney(MOCK_BI_STATS.avgAmountRequested)}
              </p>
            </div>

            {/* Общий объём */}
            <div className="p-6 bg-white rounded-2xl border" style={{ borderColor: 'rgba(11,43,94,0.20)' }}>
              <p className="text-sm font-black text-slate-400 mb-3">Общий объём запросов</p>
              <p className="text-4xl font-black" style={{ color: '#0B2B5E' }}>
                {formatMoney(MOCK_BI_STATS.totalAmountRequested)}
              </p>
            </div>

          </div>
        )}

      </main>
    </div>
  );
}
