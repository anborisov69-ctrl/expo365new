'use client';

/**
 * LeasingRatesModal — быстрый просмотр ставок банков-партнёров
 * ──────────────────────────────────────────────────────────────
 * Показывает список банков с базовыми лизинговыми ставками для товара.
 * Лёгкая альтернатива полной заявке LoanApplicationModal.
 *
 * Props:
 *   product  — товар, для которого запрашивается расчёт
 *   isOpen   — управление видимостью
 *   onClose  — колбэк закрытия
 *
 * UI:
 *   • Карточки банков в сетке 2×2
 *   • Для каждого банка: ставка от X%, срок, сумма, рейтинг
 *   • CTA «Подать заявку» → /horeca/finance/[slug]
 */

import { useEffect, useRef } from 'react';
import Link                  from 'next/link';
import type { Product }      from '@/data/productsData';
import { formatPrice }       from '@/data/productsData';
import { BANKS }             from '@/data/banksData';

// ── Типы ──────────────────────────────────────────────────────────────────────

export interface LeasingRatesModalProps {
  product: Product;
  isOpen:  boolean;
  onClose: () => void;
}

// ── Утилита: форматирование суммы ─────────────────────────────────────────────

function formatAmount(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(0)} млн ₽`;
  if (n >= 1_000)     return `${(n / 1_000).toFixed(0)} тыс. ₽`;
  return `${n} ₽`;
}

// ── Основной компонент ────────────────────────────────────────────────────────

export default function LeasingRatesModal({ product, isOpen, onClose }: LeasingRatesModalProps) {
  const overlayRef = useRef<HTMLDivElement>(null);
  const dialogRef  = useRef<HTMLDivElement>(null);

  /* Закрытие по Escape */
  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [isOpen, onClose]);

  /* Блокировка скролла body */
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  if (!isOpen) return null;

  /* Фильтруем банки с лизинговыми продуктами */
  const banksWithLeasing = BANKS.map((bank) => {
    const leasingService = bank.services.find((s) => s.type === 'leasing');
    return { bank, leasingService };
  }).filter(({ leasingService }) => !!leasingService);

  return (
    /* ── Overlay ── */
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(11,43,94,0.55)', backdropFilter: 'blur(4px)' }}
      onClick={(e) => { if (e.target === overlayRef.current) onClose(); }}
      role="dialog"
      aria-modal="true"
      aria-label="Рассчитать лизинг"
    >
      {/* ── Диалог ── */}
      <div
        ref={dialogRef}
        className="relative w-full max-w-xl bg-white rounded-2xl overflow-hidden"
        style={{ boxShadow: '0 24px 64px rgba(11,43,94,0.20)' }}
      >

        {/* ── Шапка ── */}
        <div
          className="px-5 py-4 flex items-start justify-between gap-3"
          style={{
            borderBottom: '1px solid rgba(11,43,94,0.08)',
            background: 'linear-gradient(135deg, #0B2B5E 0%, #1a407a 100%)',
          }}
        >
          <div className="min-w-0">
            {/* Зелёный значок */}
            <div className="flex items-center gap-2 mb-1.5">
              <span
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold leading-none"
                style={{ backgroundColor: 'rgba(39,174,96,0.25)', color: '#27AE60', border: '1px solid rgba(39,174,96,0.4)' }}
              >
                {/* Иконка лизинга */}
                <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M12 2L2 7l10 5 10-5-10-5z" />
                  <path d="M2 17l10 5 10-5" />
                  <path d="M2 12l10 5 10-5" />
                </svg>
                ЛИЗИНГОВЫЙ РАСЧЁТ
              </span>
            </div>

            <h2
              className="text-sm font-black text-white leading-tight line-clamp-2"
              title={product.name}
            >
              {product.name}
            </h2>
            <p className="text-[10px] font-semibold mt-0.5" style={{ color: 'rgba(255,255,255,0.6)' }}>
              {product.brand} · Стоимость: {formatPrice(product.price)}
            </p>
          </div>

          {/* Кнопка закрытия */}
          <button
            type="button"
            onClick={onClose}
            aria-label="Закрыть"
            className="flex-shrink-0 w-7 h-7 rounded-lg flex items-center justify-center text-white/60 hover:text-white hover:bg-white/10 transition-colors"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true">
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* ── Тело: карточки банков ── */}
        <div className="px-4 py-4 overflow-y-auto" style={{ maxHeight: '60vh' }}>

          {/* Подзаголовок */}
          <p className="text-[9px] font-semibold uppercase tracking-widest text-slate-400 mb-3">
            Банки-партнёры · базовые ставки лизинга
          </p>

          {/* Сетка карточек */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {banksWithLeasing.map(({ bank, leasingService }) => (
              <div
                key={bank.id}
                className="relative flex flex-col rounded-2xl border p-3 gap-2 transition-all duration-200"
                style={{ borderColor: 'rgba(11,43,94,0.20)' }}
              >
                {/* Аккентовая полоска сверху */}
                <div
                  className="absolute top-0 inset-x-0 h-[3px] rounded-t-xl"
                  style={{ backgroundColor: bank.accentColor }}
                  aria-hidden="true"
                />

                {/* Имя банка */}
                <div className="flex items-center gap-2 mt-1">
                  <div
                    className="w-7 h-7 rounded-lg flex-shrink-0 flex items-center justify-center text-[9px] font-black"
                    style={{ backgroundColor: bank.accentColor, color: '#fff' }}
                    aria-hidden="true"
                  >
                    {bank.shortName.slice(0, 2).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="text-[11px] font-black leading-none truncate" style={{ color: '#0B2B5E' }}>
                      {bank.shortName}
                    </p>
                    {/* Рейтинг */}
                    <div className="flex items-center gap-0.5 mt-0.5">
                      <svg width="7" height="7" viewBox="0 0 24 24" fill="#F26522" aria-hidden="true">
                        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                      </svg>
                      <span className="text-[8px] font-semibold" style={{ color: '#64748b' }}>
                        {bank.rating.toFixed(1)}
                      </span>
                    </div>
                  </div>
                  {/* HoReCa-фокус метка */}
                  {bank.horecaFocus && (
                    <span
                      className="ml-auto inline-flex items-center px-1 py-0.5 rounded text-[6px] font-bold leading-none uppercase flex-shrink-0"
                      style={{ backgroundColor: 'rgba(39,174,96,0.12)', color: '#27AE60' }}
                    >
                      HoReCa
                    </span>
                  )}
                </div>

                {/* Ставки */}
                {leasingService && (
                  <div
                    className="rounded-lg px-2 py-1.5 flex flex-col gap-0.5"
                    style={{ backgroundColor: 'rgba(11,43,94,0.03)', border: '1px solid rgba(11,43,94,0.06)' }}
                  >
                    {/* Ставка */}
                    <div className="flex items-center justify-between">
                      <span className="text-[8px] text-slate-400">Ставка от</span>
                      <span className="text-[12px] font-black" style={{ color: '#0B2B5E' }}>
                        {leasingService.rateFrom}%
                        <span className="text-[8px] font-semibold text-slate-400"> / год</span>
                      </span>
                    </div>
                    {/* Срок */}
                    <div className="flex items-center justify-between">
                      <span className="text-[8px] text-slate-400">Срок</span>
                      <span className="text-[9px] font-bold" style={{ color: '#0B2B5E' }}>
                        до {leasingService.termMonths} мес.
                      </span>
                    </div>
                    {/* Сумма */}
                    {leasingService.maxAmount && (
                      <div className="flex items-center justify-between">
                        <span className="text-[8px] text-slate-400">Сумма</span>
                        <span className="text-[9px] font-bold" style={{ color: '#0B2B5E' }}>
                          до {formatAmount(leasingService.maxAmount)}
                        </span>
                      </div>
                    )}
                  </div>
                )}

                {/* Одобрено / срок рассмотрения */}
                <p className="text-[8px] text-slate-400 leading-tight">
                  Одобрено: <span className="font-semibold text-slate-500">{bank.approvedCount.toLocaleString('ru-RU')}</span>
                  {' · '}
                  Ответ за <span className="font-semibold text-slate-500">{bank.avgDaysReview} дн.</span>
                </p>

                {/* CTA */}
                <Link
                  href={`/horeca/finance/${bank.slug}`}
                  onClick={onClose}
                  className="mt-auto w-full flex items-center justify-center gap-1 px-2 py-1.5 rounded-lg text-[9px] font-bold text-white transition-all duration-150 hover:opacity-90 active:scale-95"
                  style={{ backgroundColor: bank.accentColor !== '#FFD000' ? bank.accentColor : '#0B2B5E' }}
                  aria-label={`Подать заявку в ${bank.name}`}
                >
                  Подать заявку
                  <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M5 12h14M12 5l7 7-7 7" />
                  </svg>
                </Link>
              </div>
            ))}
          </div>

          {/* Дисклеймер */}
          <p className="mt-4 text-[8px] text-slate-400 leading-relaxed text-center">
            Указанные ставки являются базовыми и могут изменяться в зависимости от суммы и срока финансирования.
            Итоговые условия определяются банком при рассмотрении заявки.
          </p>
        </div>

        {/* ── Подвал ── */}
        <div
          className="px-5 py-3 flex items-center justify-between gap-3"
          style={{ borderTop: '1px solid rgba(11,43,94,0.08)', backgroundColor: 'rgba(11,43,94,0.02)' }}
        >
          <span className="text-[9px] text-slate-400">
            {banksWithLeasing.length} банка-партнёра доступны для лизинга
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1.5 rounded-lg text-[9px] font-semibold border border-slate-200 text-slate-500 hover:border-slate-300 hover:text-slate-700 transition-colors"
          >
            Закрыть
          </button>
        </div>

      </div>
    </div>
  );
}
