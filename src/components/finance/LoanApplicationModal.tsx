'use client';

/**
 * LoanApplicationModal — модальное окно подачи заявки на финансирование
 * ──────────────────────────────────────────────────────────────────────
 * Байер выбирает банк из списка → заявка с пометкой "Целевой лизинг"
 * сохраняется в хранилище и отображается в кабинете банка.
 *
 * Props:
 *   product  — товар, для которого подаётся заявка
 *   isOpen   — управление видимостью
 *   onClose  — колбэк закрытия
 *
 * TODO (production): Заменить mock-сохранение на API route:
 *   POST /api/finance/loan-applications
 *   body: { bankId, productId, amount, serviceType }
 *   → Supabase INSERT с RLS проверкой buyer_id = auth.uid()
 */

import { useState, useEffect, useRef } from 'react';
import type { Product }               from '@/data/productsData';
import { formatPrice }                from '@/data/productsData';
import { BANKS }                      from '@/data/banksData';
import type { Bank, BankServiceType } from '@/types/finance';

// ── Константы ─────────────────────────────────────────────────────────────────

const SERVICE_LABELS: Record<BankServiceType, string> = {
  leasing:   'Целевой лизинг',
  credit:    'Кредит на оборудование',
  rko:       'РКО',
  overdraft: 'Овердрафт',
  factoring: 'Факторинг',
};

// ── Типы ──────────────────────────────────────────────────────────────────────

export interface LoanApplicationModalProps {
  product: Product;
  isOpen:  boolean;
  onClose: () => void;
}

/** Сохранённая заявка (mock — localStorage до Supabase) */
interface SavedApplication {
  id:          string;
  bankId:      string;
  bankName:    string;
  productId:   string;
  productName: string;
  amount:      number;
  serviceType: BankServiceType;
  purposeTag:  string;
  comment:     string;
  status:      string;
  createdAt:   string;
}

// ── Шаги ──────────────────────────────────────────────────────────────────────

type Step = 'select-bank' | 'configure' | 'success';

// ── Компонент карточки банка в выборе ─────────────────────────────────────────

function BankOption({
  bank,
  selected,
  onSelect,
}: {
  bank:     Bank;
  selected: boolean;
  onSelect: (b: Bank) => void;
}) {
  const initials = bank.shortName.slice(0, 2).toUpperCase();
  const serviceTypes = [...new Set(bank.services.map((s) => s.type))];
  const LABELS: Record<string, string> = {
    leasing: 'Лизинг', credit: 'Кредит', rko: 'РКО', overdraft: 'Овердрафт', factoring: 'Факторинг',
  };

  return (
    <button
      type="button"
      onClick={() => onSelect(bank)}
      className={[
        'w-full flex items-start gap-3 p-3 rounded-xl border text-left transition-all duration-150',
        selected
          ? 'border-[#F26522] bg-[#F26522]/[0.05]'
          : 'border-[#0B2B5E]/10 bg-white hover:border-[#F26522]/50 hover:bg-[#F26522]/[0.02]',
      ].join(' ')}
      aria-pressed={selected}
      aria-label={`Выбрать банк ${bank.name}`}
    >
      {/* Лого */}
      <div
        className="w-9 h-9 rounded-xl flex-shrink-0 flex items-center justify-center text-xs font-black text-white"
        style={{ backgroundColor: bank.accentColor }}
        aria-hidden="true"
      >
        {initials}
      </div>

      {/* Инфо */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <p className="text-[11px] font-black truncate" style={{ color: '#0B2B5E' }}>{bank.name}</p>
          {/* Рейтинг */}
          <span className="text-[9px] font-bold text-slate-400 flex-shrink-0">{bank.rating} ★</span>
        </div>
        <p className="text-[9px] text-slate-500 leading-tight mt-0.5 line-clamp-1">{bank.tagline}</p>

        {/* Теги услуг */}
        <div className="flex flex-wrap gap-1 mt-1.5">
          {serviceTypes.map((type) => (
            <span
              key={type}
              className="inline-flex px-1.5 py-0.5 rounded text-[7px] font-semibold"
              style={{ backgroundColor: `${bank.accentColor}14`, color: bank.accentColor }}
            >
              {LABELS[type]}
            </span>
          ))}
        </div>

        {/* Срок рассмотрения */}
        <p className="text-[8px] text-slate-400 mt-1">
          Решение за {bank.avgDaysReview} {bank.avgDaysReview === 1 ? 'день' : bank.avgDaysReview < 5 ? 'дня' : 'дней'}
        </p>
      </div>

      {/* Radio indicator */}
      <div
        className={[
          'flex-shrink-0 w-4 h-4 rounded-full border-2 flex items-center justify-center mt-0.5',
          selected ? 'border-[#F26522]' : 'border-slate-300',
        ].join(' ')}
        aria-hidden="true"
      >
        {selected && (
          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: '#F26522' }} />
        )}
      </div>
    </button>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// ОСНОВНОЙ КОМПОНЕНТ
// ═══════════════════════════════════════════════════════════════════════════════

export default function LoanApplicationModal({
  product,
  isOpen,
  onClose,
}: LoanApplicationModalProps) {
  const overlayRef = useRef<HTMLDivElement>(null);

  // ── Состояние формы ───────────────────────────────────────────────────────
  const [step,        setStep]        = useState<Step>('select-bank');
  const [selectedBank, setSelectedBank] = useState<Bank | null>(null);
  const [serviceType, setServiceType] = useState<BankServiceType>('leasing');
  const [comment,     setComment]     = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [savedApp,    setSavedApp]    = useState<SavedApplication | null>(null);

  // Сброс при открытии/закрытии
  useEffect(() => {
    if (isOpen) {
      setStep('select-bank');
      setSelectedBank(null);
      setServiceType('leasing');
      setComment('');
      setSavedApp(null);
    }
  }, [isOpen]);

  // Закрытие по Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isOpen, onClose]);

  // Блокировка прокрутки body
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  if (!isOpen) return null;

  // ── Доступные типы услуг в выбранном банке ────────────────────────────────
  const availableServiceTypes: BankServiceType[] = selectedBank
    ? [...new Set(selectedBank.services.map((s) => s.type))].filter(
        (t) => t === 'leasing' || t === 'credit'
      )
    : ['leasing', 'credit'];

  // ── Отправка заявки ───────────────────────────────────────────────────────
  async function handleSubmit() {
    if (!selectedBank) return;
    setIsSubmitting(true);

    // TODO (production): заменить на реальный API-вызов
    // const res = await fetch('/api/finance/loan-applications', {
    //   method: 'POST',
    //   headers: { 'Content-Type': 'application/json' },
    //   body: JSON.stringify({
    //     bankId: selectedBank.id,
    //     productId: product.id,
    //     amount: product.price,
    //     serviceType,
    //     comment: comment.trim(),
    //   }),
    // });

    await new Promise((r) => setTimeout(r, 900)); // Симуляция сетевого запроса

    const app: SavedApplication = {
      id:          `app-${Date.now()}`,
      bankId:      selectedBank.id,
      bankName:    selectedBank.name,
      productId:   product.id,
      productName: product.name,
      amount:      product.price,
      serviceType,
      purposeTag:  'Целевой лизинг',
      comment:     comment.trim(),
      status:      'pending',
      createdAt:   new Date().toISOString(),
    };

    // Сохраняем в localStorage (mock storage)
    try {
      const existing: SavedApplication[] = JSON.parse(
        localStorage.getItem('expo365_loan_applications') ?? '[]'
      );
      existing.push(app);
      localStorage.setItem('expo365_loan_applications', JSON.stringify(existing));
    } catch {
      // localStorage недоступен (SSR или private mode)
    }

    setSavedApp(app);
    setIsSubmitting(false);
    setStep('success');
  }

  // ── Клик по оверлею ───────────────────────────────────────────────────────
  function handleOverlayClick(e: React.MouseEvent<HTMLDivElement>) {
    if (e.target === overlayRef.current) onClose();
  }

  // ═════════════════════════════════════════════════════════════════════════
  // РЕНДЕР
  // ═════════════════════════════════════════════════════════════════════════

  return (
    <div
      ref={overlayRef}
      onClick={handleOverlayClick}
      className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-0 sm:p-4"
      style={{ backgroundColor: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)' }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="loan-modal-title"
    >
      <div
        className="relative w-full sm:max-w-lg bg-white rounded-t-2xl sm:rounded-2xl overflow-hidden flex flex-col"
        style={{ maxHeight: '92vh' }}
      >
        {/* ── Шапка ── */}
        <div
          className="flex items-center justify-between px-5 py-4 flex-shrink-0"
          style={{ borderBottom: '1px solid rgba(11,43,94,0.08)' }}
        >
          <div className="flex items-center gap-3">
            {/* Orange circle icon */}
            <div
              className="w-8 h-8 rounded-xl flex items-center justify-center text-white flex-shrink-0"
              style={{ backgroundColor: '#F26522' }}
              aria-hidden="true"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <rect x="1" y="4" width="22" height="16" rx="2" ry="2" /><line x1="1" y1="10" x2="23" y2="10" />
              </svg>
            </div>
            <div>
              <h2 id="loan-modal-title" className="text-[13px] font-black leading-tight" style={{ color: '#0B2B5E' }}>
                Финансовая поддержка
              </h2>
              <p className="text-[9px] text-slate-400">
                {step === 'select-bank' ? 'Выберите банк' : step === 'configure' ? 'Параметры заявки' : 'Заявка отправлена'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
            aria-label="Закрыть окно"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* ── Товар (всегда виден) ── */}
        <div
          className="flex items-center gap-3 px-5 py-3 flex-shrink-0"
          style={{ backgroundColor: 'rgba(11,43,94,0.03)', borderBottom: '1px solid rgba(11,43,94,0.07)' }}
        >
          <div
            className="w-10 h-10 rounded-xl flex-shrink-0 flex items-center justify-center font-black text-white text-xs"
            style={{ backgroundColor: '#0B2B5E' }}
            aria-hidden="true"
          >
            {product.brand.charAt(0)}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[11px] font-black truncate" style={{ color: '#0B2B5E' }}>{product.name}</p>
            <p className="text-[9px] text-slate-500">{product.brand}</p>
          </div>
          <div className="text-right flex-shrink-0">
            <p className="text-[13px] font-black tabular-nums" style={{ color: '#0B2B5E' }}>
              {formatPrice(product.price)}
            </p>
            <p className="text-[8px] text-slate-400">Стоимость</p>
          </div>
        </div>

        {/* ── Контент шагов ── */}
        <div className="flex-1 overflow-y-auto" style={{ scrollbarWidth: 'thin' }}>

          {/* ─ ШАГ 1: Выбор банка ─ */}
          {step === 'select-bank' && (
            <div className="p-5">
              <p className="text-[10px] font-semibold text-slate-500 mb-3">
                Банки-партнёры EXPO 365 — выберите, куда отправить заявку:
              </p>
              <div className="flex flex-col gap-2">
                {BANKS.map((bank) => (
                  <BankOption
                    key={bank.id}
                    bank={bank}
                    selected={selectedBank?.id === bank.id}
                    onSelect={setSelectedBank}
                  />
                ))}
              </div>
            </div>
          )}

          {/* ─ ШАГ 2: Параметры ─ */}
          {step === 'configure' && selectedBank && (
            <div className="p-5 flex flex-col gap-4">

              {/* Выбранный банк */}
              <div
                className="flex items-center gap-3 p-3 rounded-xl border"
                style={{ borderColor: `${selectedBank.accentColor}30`, backgroundColor: `${selectedBank.accentColor}08` }}
              >
                <div
                  className="w-8 h-8 rounded-xl flex-shrink-0 flex items-center justify-center text-xs font-black text-white"
                  style={{ backgroundColor: selectedBank.accentColor }}
                  aria-hidden="true"
                >
                  {selectedBank.shortName.slice(0, 2).toUpperCase()}
                </div>
                <div>
                  <p className="text-[11px] font-black" style={{ color: '#0B2B5E' }}>{selectedBank.name}</p>
                  <p className="text-[8px] text-slate-400">Решение за {selectedBank.avgDaysReview} {selectedBank.avgDaysReview === 1 ? 'день' : 'дня'}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setStep('select-bank')}
                  className="ml-auto text-[8px] font-semibold text-slate-400 hover:text-[#F26522] transition-colors"
                  aria-label="Изменить банк"
                >
                  Изменить
                </button>
              </div>

              {/* Тип услуги */}
              <div>
                <label className="text-[9px] font-black uppercase tracking-widest text-slate-500 mb-2 block">
                  Тип финансирования
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {availableServiceTypes.map((type) => (
                    <button
                      type="button"
                      key={type}
                      onClick={() => setServiceType(type)}
                      className={[
                        'px-3 py-2.5 rounded-xl text-[10px] font-bold border transition-all duration-150',
                        serviceType === type
                          ? 'border-[#F26522] bg-[#F26522]/[0.08] text-[#F26522]'
                          : 'border-[#0B2B5E]/10 text-slate-600 hover:border-[#F26522]/40',
                      ].join(' ')}
                      aria-pressed={serviceType === type}
                    >
                      {SERVICE_LABELS[type]}
                    </button>
                  ))}
                </div>
              </div>

              {/* Пометка */}
              <div
                className="flex items-center gap-2 p-3 rounded-xl"
                style={{ backgroundColor: 'rgba(242,101,34,0.07)', border: '1px solid rgba(242,101,34,0.2)' }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#F26522" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
                <p className="text-[9px] text-slate-600">
                  Заявка получит пометку <strong className="text-[#F26522]">«Целевой лизинг»</strong> — банк сразу видит, для какого товара запрашивается финансирование.
                </p>
              </div>

              {/* Комментарий */}
              <div>
                <label htmlFor="loan-comment" className="text-[9px] font-black uppercase tracking-widest text-slate-500 mb-2 block">
                  Комментарий к заявке (необязательно)
                </label>
                <textarea
                  id="loan-comment"
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  rows={3}
                  maxLength={500}
                  placeholder="Расскажите о вашем проекте, для чего нужно оборудование..."
                  className="w-full px-3 py-2.5 rounded-xl border text-[11px] text-slate-700 placeholder-slate-300 resize-none outline-none transition-colors"
                  style={{
                    borderColor: 'rgba(11,43,94,0.12)',
                    lineHeight:  '1.5',
                  }}
                  onFocus={(e) => { e.currentTarget.style.borderColor = '#F26522'; }}
                  onBlur={(e)  => { e.currentTarget.style.borderColor = 'rgba(11,43,94,0.12)'; }}
                />
                <p className="text-[8px] text-slate-300 text-right mt-0.5">{comment.length}/500</p>
              </div>
            </div>
          )}

          {/* ─ ШАГ 3: Успех ─ */}
          {step === 'success' && savedApp && (
            <div className="p-6 flex flex-col items-center text-center gap-4">
              {/* Иконка успеха */}
              <div
                className="w-16 h-16 rounded-2xl flex items-center justify-center mt-2"
                style={{ backgroundColor: '#ecfdf5' }}
                aria-hidden="true"
              >
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                  <polyline points="22 4 12 14.01 9 11.01" />
                </svg>
              </div>

              <div>
                <h3 className="text-[15px] font-black mb-1" style={{ color: '#0B2B5E' }}>
                  Заявка отправлена!
                </h3>
                <p className="text-[11px] text-slate-500 leading-snug max-w-xs">
                  Ваша заявка поступила в {savedApp.bankName}. Ожидайте ответа в течение{' '}
                  {selectedBank?.avgDaysReview} {selectedBank?.avgDaysReview === 1 ? 'рабочего дня' : 'рабочих дней'}.
                </p>
              </div>

              {/* Детали заявки */}
              <div
                className="w-full flex flex-col gap-2 p-4 rounded-2xl text-left"
                style={{ backgroundColor: 'rgba(11,43,94,0.04)' }}
              >
                <div className="flex justify-between">
                  <span className="text-[9px] text-slate-400">Банк</span>
                  <span className="text-[10px] font-bold" style={{ color: '#0B2B5E' }}>{savedApp.bankName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[9px] text-slate-400">Товар</span>
                  <span className="text-[10px] font-bold max-w-[60%] text-right truncate" style={{ color: '#0B2B5E' }}>{savedApp.productName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[9px] text-slate-400">Сумма</span>
                  <span className="text-[10px] font-bold" style={{ color: '#0B2B5E' }}>{formatPrice(savedApp.amount)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[9px] text-slate-400">Тип</span>
                  <span
                    className="text-[9px] font-black px-2 py-0.5 rounded-full"
                    style={{ backgroundColor: 'rgba(242,101,34,0.12)', color: '#F26522' }}
                  >
                    {savedApp.purposeTag}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[9px] text-slate-400">Статус</span>
                  <span
                    className="text-[9px] font-black px-2 py-0.5 rounded-full"
                    style={{ backgroundColor: '#f8fafc', color: '#64748b', border: '1px solid #e2e8f0' }}
                  >
                    Ожидает рассмотрения
                  </span>
                </div>
              </div>

              <p className="text-[9px] text-slate-400">
                ID заявки: <span className="font-mono">{savedApp.id}</span>
              </p>
            </div>
          )}
        </div>

        {/* ── Футер с кнопками ── */}
        <div
          className="px-5 py-4 flex gap-3 flex-shrink-0"
          style={{ borderTop: '1px solid rgba(11,43,94,0.08)' }}
        >
          {step === 'select-bank' && (
            <>
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-4 py-2.5 rounded-xl text-[11px] font-bold text-slate-500 bg-slate-100 hover:bg-slate-200 transition-colors"
              >
                Отмена
              </button>
              <button
                type="button"
                disabled={!selectedBank}
                onClick={() => setStep('configure')}
                className={[
                  'flex-1 px-4 py-2.5 rounded-xl text-[11px] font-black text-white transition-all duration-150 active:scale-95',
                  selectedBank
                    ? 'hover:opacity-90 cursor-pointer'
                    : 'opacity-30 cursor-not-allowed',
                ].join(' ')}
                style={{ backgroundColor: '#F26522' }}
                aria-disabled={!selectedBank}
              >
                Далее →
              </button>
            </>
          )}

          {step === 'configure' && (
            <>
              <button
                type="button"
                onClick={() => setStep('select-bank')}
                className="flex-1 px-4 py-2.5 rounded-xl text-[11px] font-bold text-slate-500 bg-slate-100 hover:bg-slate-200 transition-colors"
              >
                ← Назад
              </button>
              <button
                type="button"
                disabled={isSubmitting}
                onClick={handleSubmit}
                className={[
                  'flex-[2] px-4 py-2.5 rounded-xl text-[11px] font-black text-white transition-all duration-150 active:scale-95 flex items-center justify-center gap-2',
                  !isSubmitting
                    ? 'hover:opacity-90 cursor-pointer'
                    : 'opacity-70 cursor-not-allowed',
                ].join(' ')}
                style={{ backgroundColor: '#F26522' }}
              >
                {isSubmitting ? (
                  <>
                    <svg className="animate-spin" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                    </svg>
                    Отправляем...
                  </>
                ) : (
                  'Отправить заявку'
                )}
              </button>
            </>
          )}

          {step === 'success' && (
            <button
              type="button"
              onClick={onClose}
              className="w-full px-4 py-2.5 rounded-xl text-[11px] font-black text-white transition-all duration-150 active:scale-95 hover:opacity-90"
              style={{ backgroundColor: '#0B2B5E' }}
            >
              Закрыть
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
