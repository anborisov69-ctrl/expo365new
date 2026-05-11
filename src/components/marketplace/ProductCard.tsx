'use client';

/**
 * ProductCard — карточка товара для 8-колоночной сетки Витрины ЭКСПО 365
 * ──────────────────────────────────────────────────────────────────
 * Квадратная карточка (aspect-square) с двумя режимами:
 *
 *   isAdmin = false  → публичная витрина
 *     • isAuthorized = true  → цена + кнопка «В корзину»
 *     • isAuthorized = false → «Цена после авторизации» + замок
 *
 *   isAdmin = true  → admin-панель (режим редактора)
 *     • «Стерильная» карточка в обычном состоянии
 *     • При hover: полупрозрачный Control Bar сверху с тремя действиями:
 *         Редактировать  — открывает Side Drawer (синий, #0B2B5E)
 *         В архив        — меняет status → 'archived' (нейтральный серый)
 *         Удалить        — confirm modal → полное удаление (красный при hover)
 *
 * UX: иконки Архива и Удаления используют e.stopPropagation(),
 *     чтобы клик по ним НЕ открывал Side Drawer.
 *
 * UI-структура:
 *   ┌─────────────────────┐
 *   │ [CONTROL BAR hover] │  ← admin only, плавное появление
 *   │ [NEW]        [ОПТ]   │
 *   │                      │
 *   │   brandLogo / init   │
 *   │                      │
 *   └─────────────────────┘
 *   │ [КАТЕГОРИЯ]          │
 *   │ Название товара      │
 *   │ Бренд                │
 *   │ ₽ 320 000            │ ← admin (no CTA button)
 *   │ ₽ 320 000   [+]      │ ← публичная, авторизован
 *   │ Цена после авторизации│ ← публичная, неавторизован
 *   └─────────────────────┘
 */

import Link from 'next/link';
import type { Product } from '@/data/productsData';
import {
  computeIsBulk,
  formatPrice,
  getCategoryAccentColor,
  getDefaultUnit,
  PRODUCT_CATEGORY_LABELS,
  SUBCATEGORY_LABELS,
} from '@/data/productsData';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface ProductCardProps {
  product:      Product;
  isAuthorized: boolean;
  /**
   * Включает режим admin-панели:
   *   • «Стерильная» карточка в обычном состоянии
   *   • hover: Control Bar с кнопками Редактировать / В архив / Удалить
   *   • Нижняя строка: только цена, без кнопок CTA
   */
  isAdmin?:     boolean;
  /** Вызывается при добавлении в корзину (только для авторизованных, !isAdmin) */
  onAddToCart?: (product: Product) => void;
  /**
   * Вызывается при нажатии «Удалить» в admin-режиме (Control Bar или кнопка в drawer).
   * Родитель должен показать confirm-модал до фактического удаления.
   */
  onDelete?:    (product: Product) => void;
  /**
   * Вызывается при нажатии «В архив» в Control Bar.
   * Родитель меняет product.status → 'archived'.
   * Использует e.stopPropagation() — НЕ открывает drawer.
   */
  onArchive?:   (product: Product) => void;
  /** Вызывается при клике на карточку или кнопку «Редактировать» — открывает Side Drawer */
  onSelect?:    (productId: string) => void;
  /**
   * Вызывается при нажатии «Нужна фин. поддержка».
   * Активна ТОЛЬКО для авторизованных байеров (!isAdmin)
   * когда product.price > 50 000 ₽.
   */
  onFinanceRequest?: (product: Product) => void;
}

// ─────────────────────────────────────────────────────────────────────────────
// КОМПОНЕНТ
// ─────────────────────────────────────────────────────────────────────────────

export default function ProductCard({
  product,
  isAuthorized,
  isAdmin = false,
  onAddToCart,
  onDelete,
  onArchive,
  onSelect,
  onFinanceRequest,
}: ProductCardProps) {
  const accent        = getCategoryAccentColor(product.category);
  const categoryLabel = PRODUCT_CATEGORY_LABELS[product.category];
  const isBulk        = computeIsBulk(product);
  const unit          = getDefaultUnit(product);

  return (
    <article
      className={[
        'group relative flex flex-col overflow-hidden',
        'aspect-square',
        'bg-white border border-[#0B2B5E]/10 rounded-xl',
        'transition-all duration-200 select-none cursor-pointer',
        isAdmin
          ? 'hover:border-[#0B2B5E]/40 hover:shadow-sm'
          : 'hover:border-[#F26522]/60 hover:shadow-[0_6px_24px_rgba(242,101,34,0.13)]',
      ].join(' ')}
      onClick={() => onSelect?.(product.id)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onSelect?.(product.id);
        }
      }}
      aria-label={`Товар: ${product.name}, ${product.brand}`}
    >

      {/* ── Оранжевая полоска сверху (hover, только публичная витрина) ───────── */}
      {!isAdmin && (
        <div
          className="absolute inset-x-0 top-0 h-[3px] rounded-t-xl opacity-0 group-hover:opacity-100 transition-opacity duration-200"
          style={{ backgroundColor: '#F26522' }}
          aria-hidden="true"
        />
      )}

      {/* ── ADMIN CONTROL BAR — появляется при hover поверх карточки ──────────
       *
       * Дизайн: полупрозрачная белая полоса с лёгким blur.
       * Три элемента слева направо:
       *   1. [Ред.] — кнопка с иконкой + текстом, синяя (#0B2B5E), flex-1
       *   2. [Архив] — квадратная иконка, нейтральный серый
       *   3. [Удалить] — квадратная иконка, серый → красный при hover
       *
       * z-20 — выше бейджей ОПТ/NEW, ниже глобальных модалов (z-50+)
       * ───────────────────────────────────────────────────────────────────── */}
      {isAdmin && (
        <div
          className={[
            'absolute top-0 inset-x-0 z-20 h-8',
            'flex items-center px-1.5 gap-1',
            'rounded-t-xl',
            'opacity-0 group-hover:opacity-100',
            'transition-all duration-200',
          ].join(' ')}
          style={{
            backgroundColor: 'rgba(255,255,255,0.94)',
            backdropFilter:  'blur(4px)',
            borderBottom:    '1px solid rgba(11,43,94,0.09)',
          }}
          aria-label="Управление товаром"
          // Не глушим клик здесь — отдельные кнопки решают сами
        >

          {/* ── Редактировать ──────────────────────────────────────────────────
           *  Клик НЕ глушится → всплывает до article.onClick → открывает
           *  Side Drawer (onSelect). Используем собственный обработчик
           *  для явности и доступности (aria-label).
           * ────────────────────────────────────────────────────────────────── */}
          <button
            type="button"
            className={[
              'flex-1 flex items-center justify-center gap-1',
              'h-6 px-1.5 rounded-md',
              'text-[8px] font-bold text-white',
              'transition-all duration-150',
              'hover:opacity-90 active:scale-95',
            ].join(' ')}
            style={{ backgroundColor: '#0B2B5E' }}
            onClick={(e) => {
              e.stopPropagation();
              onSelect?.(product.id);
            }}
            aria-label={`Редактировать товар: ${product.name}`}
          >
            {/* Карандаш */}
            <svg
              width="9" height="9"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
            </svg>
            Ред.
          </button>

          {/* ── В архив ────────────────────────────────────────────────────────
           *  stopPropagation: клик НЕ открывает drawer.
           * ────────────────────────────────────────────────────────────────── */}
          <button
            type="button"
            className={[
              'flex-shrink-0 w-6 h-6',
              'flex items-center justify-center rounded-md',
              'text-slate-400',
              'hover:text-slate-600 hover:bg-slate-100',
              'transition-all duration-150 active:scale-95',
            ].join(' ')}
            onClick={(e) => {
              e.stopPropagation();
              onArchive?.(product);
            }}
            aria-label={`Архивировать товар: ${product.name}`}
          >
            {/* Archive box */}
            <svg
              width="10" height="10"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <polyline points="21 8 21 21 3 21 3 8" />
              <rect x="1" y="3" width="22" height="5" />
              <line x1="10" y1="12" x2="14" y2="12" />
            </svg>
          </button>

          {/* ── Удалить ────────────────────────────────────────────────────────
           *  stopPropagation: клик НЕ открывает drawer.
           *  Цвет: slate-400 → red-500 при hover.
           * ────────────────────────────────────────────────────────────────── */}
          <button
            type="button"
            className={[
              'flex-shrink-0 w-6 h-6',
              'flex items-center justify-center rounded-md',
              'text-slate-400',
              'hover:text-red-500 hover:bg-red-50',
              'transition-all duration-150 active:scale-95',
            ].join(' ')}
            onClick={(e) => {
              e.stopPropagation();
              onDelete?.(product);
            }}
            aria-label={`Удалить товар: ${product.name}`}
          >
            {/* Мусорная корзина */}
            <svg
              width="10" height="10"
              viewBox="0 0 14 14"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M2 3.5h10M5.5 3.5V2.5a.5.5 0 0 1 .5-.5h2a.5.5 0 0 1 .5.5v1M4 3.5l.7 7.1a.5.5 0 0 0 .5.4h3.6a.5.5 0 0 0 .5-.4L10 3.5" />
            </svg>
          </button>

        </div>
      )}

      {/* ── ОПТ / СЫРЬЁ бейдж (верхний левый угол) ──────────────────────────── */}
      {isBulk && (
        <div className="absolute top-2 left-2 z-10" aria-label="Оптовая / сырьевая позиция">
          <span
            className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[6px] font-bold tracking-wider uppercase leading-none"
            style={{
              backgroundColor: '#0B2B5E',
              color:           '#FFFFFF',
            }}
            title={isAdmin ? undefined : 'Только для промышленного использования / Крупный опт'}
          >
            {/* Куб-иконка сырья */}
            <svg width="7" height="7" viewBox="0 0 12 12" fill="none" aria-hidden="true">
              <path d="M6 1L11 3.5V8.5L6 11L1 8.5V3.5L6 1Z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round"/>
              <path d="M6 1V11M1 3.5L6 6L11 3.5" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round"/>
            </svg>
            ОПТ / СЫРЬЁ
          </span>
        </div>
      )}

      {/* ── NEW бейдж ───────────────────────────────────────────────────────── */}
      {product.isNew && (
        <div className="absolute top-2 right-2 z-10" aria-label="Новинка">
          <span
            className="inline-flex items-center px-1.5 py-0.5 rounded text-[7px] font-black tracking-wider uppercase leading-none"
            style={{ backgroundColor: '#F26522', color: '#fff' }}
          >
            NEW
          </span>
        </div>
      )}

      {/* ── «Нет в наличии» оверлей ─────────────────────────────────────────── */}
      {!product.inStock && (
        <div
          className="absolute inset-0 z-20 flex items-end justify-center pb-3 rounded-xl"
          style={{ backgroundColor: 'rgba(255,255,255,0.72)', backdropFilter: 'blur(2px)' }}
          aria-label="Нет в наличии"
        >
          <span
            className="text-[7px] font-black uppercase tracking-widest bg-white px-2 py-1 rounded-lg border"
            style={{ color: '#94a3b8', borderColor: 'rgba(148,163,184,0.3)' }}
          >
            Нет в наличии
          </span>
        </div>
      )}

      {/* ── Верхняя зона (55%): логотип / инициал бренда ────────────────────── */}
      <div
        className="relative flex-shrink-0 flex items-center justify-center"
        style={{
          height:          '55%',
          backgroundColor: `${accent}09`,
          borderBottom:    '1px solid rgba(11,43,94,0.06)',
        }}
      >
        {product.brandLogoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={product.brandLogoUrl}
            alt={`Логотип ${product.brand}`}
            width={40}
            height={40}
            loading="lazy"
            className="w-10 h-10 object-contain transition-transform duration-200 group-hover:scale-110 opacity-75 group-hover:opacity-100"
            onError={(e) => { e.currentTarget.style.display = 'none'; }}
          />
        ) : (
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center transition-transform duration-200 group-hover:scale-110"
            style={{ backgroundColor: accent }}
          >
            <span className="text-sm font-black text-white leading-none">
              {product.brand.charAt(0)}
            </span>
          </div>
        )}
      </div>

      {/* ── Нижняя зона (45%): мета + цена ──────────────────────────────────── */}
      <div className="flex flex-col flex-1 min-h-0 px-2 pt-1.5 pb-2">

        {/* Бейдж категории */}
        <span
          className="inline-flex items-center self-start px-1 py-0.5 rounded text-[6px] font-black tracking-wide uppercase leading-none mb-1 flex-shrink-0 whitespace-nowrap"
          style={{ backgroundColor: `${accent}14`, color: accent }}
        >
          {categoryLabel}
        </span>

        {/* Название товара */}
        <p
          className="text-[8px] font-bold leading-tight line-clamp-2 flex-1 min-h-0"
          style={{ color: '#0B2B5E' }}
          title={product.name}
        >
          {product.name}
        </p>

        {/* Бренд */}
        <p className="text-[7px] font-medium truncate mt-0.5 leading-none" style={{ color: '#94a3b8' }}>
          {product.brand}
        </p>

        {/* Тег подкатегории — нейтральный серый */}
        {product.subCategory && (
          <span
            className="inline-flex items-center self-start px-1 py-0.5 rounded text-[6px] font-semibold tracking-wide uppercase leading-none mt-0.5 flex-shrink-0 whitespace-nowrap"
            style={{
              backgroundColor: '#f1f5f9',
              color:           '#94a3b8',
              border:          '1px solid #e2e8f0',
            }}
            aria-label={`Подкатегория: ${SUBCATEGORY_LABELS[product.subCategory]}`}
          >
            {SUBCATEGORY_LABELS[product.subCategory]}
          </span>
        )}

        {/* ── Цена / авторизация ────────────────────────────────────────────── */}
        <div className="mt-1 flex items-center justify-between gap-1 min-w-0">

          {isAuthorized ? (
            <>
              {/* ✅ Авторизован: цена + единица измерения */}
              <span
                className="text-[9px] font-black leading-none tabular-nums truncate"
                style={{ color: '#0B2B5E' }}
                aria-label={`Цена: ${formatPrice(product.price)} / ${unit}`}
              >
                {formatPrice(product.price)}
                <span className="ml-0.5 text-[6px] font-semibold" style={{ color: '#94a3b8' }}>
                  /{unit}
                </span>
              </span>

              {/* Admin: кнопок CTA нет — действия в Control Bar (hover) */}
              {!isAdmin && (
                /* Публичная витрина: кнопка «В корзину» */
                <button
                  type="button"
                  aria-label={`Добавить в корзину: ${product.name}`}
                  disabled={!product.inStock}
                  className={[
                    'flex-shrink-0 inline-flex items-center justify-center',
                    'w-5 h-5 rounded-md text-white text-[10px] font-black leading-none',
                    'transition-all duration-150',
                    product.inStock
                      ? 'hover:opacity-90 active:scale-95 cursor-pointer'
                      : 'opacity-30 cursor-not-allowed',
                  ].join(' ')}
                  style={{ backgroundColor: '#F26522' }}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (product.inStock) onAddToCart?.(product);
                  }}
                >
                  +
                </button>
              )}
            </>
          ) : (
            <>
              {/* 🔒 Не авторизован: нейтральный серый текст */}
              <Link
                href="/auth/login"
                className={[
                  'text-[7px] font-medium leading-tight truncate flex-1 min-w-0',
                  'transition-colors duration-150',
                ].join(' ')}
                style={{ color: '#94a3b8' }}
                title="Войдите для просмотра цены"
                onClick={(e) => e.stopPropagation()}
              >
                Цена после авторизации
              </Link>

              {/* Иконка замка */}
              <svg
                width="10"
                height="10"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#cbd5e1"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="flex-shrink-0"
                aria-hidden="true"
              >
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
            </>
          )}
        </div>

        {/* ── Кнопка «Нужна фин. поддержка» ───────────────────────────────────
         *  Условия активации:
         *    • isAuthorized = true   (байер авторизован)
         *    • !isAdmin              (публичная витрина)
         *    • product.price >= 50 000 ₽
         *    • onFinanceRequest задан родителем
         * ─────────────────────────────────────────────────────────────────── */}
        {isAuthorized && !isAdmin && product.price >= 50_000 && onFinanceRequest && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onFinanceRequest(product);
            }}
            className={[
              'mt-1 w-full flex items-center justify-center gap-1 px-1.5 py-0.5 rounded-lg',
              'text-[6px] font-bold leading-none',
              'transition-all duration-150 hover:opacity-90 active:scale-95',
            ].join(' ')}
            style={{ backgroundColor: 'rgba(39,174,96,0.10)', color: '#27AE60', border: '1px solid rgba(39,174,96,0.20)' }}
            aria-label={`Рассчитать лизинг для: ${product.name}`}
          >
            {/* Иконка лизинга — стопка слоёв */}
            <svg
              width="7" height="7"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M12 2L2 7l10 5 10-5-10-5z" />
              <path d="M2 17l10 5 10-5" />
              <path d="M2 12l10 5 10-5" />
            </svg>
            Рассчитать лизинг
          </button>
        )}
      </div>
    </article>
  );
}
