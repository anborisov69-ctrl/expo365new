'use client';

import { useState, useMemo, useRef, useCallback } from 'react';
import Link                  from 'next/link';
import ProductCard            from '@/components/marketplace/ProductCard';
import LeasingRatesModal      from '@/components/finance/LeasingRatesModal';
import {
  PRODUCTS,
  PRODUCT_CATEGORY_LABELS,
  UNIQUE_PRODUCT_BRANDS,
  SUBCATEGORY_SEARCH_ALIASES,
  BULK_SEARCH_KEYWORDS,
  computeIsBulk,
  type Product,
  type ProductCategory,
} from '@/data/productsData';

// ═══════════════════════════════════════════════════════════════════════════════
// ТИПЫ
// ═══════════════════════════════════════════════════════════════════════════════

/** Фильтр «Тип поставки» — два независимых чекбокса */
interface DeliveryTypeFilter {
  /** Только сырьё / Опт — computeIsBulk() === true */
  bulk:   boolean;
  /** Фасованный продукт — computeIsBulk() === false */
  retail: boolean;
}

// ═══════════════════════════════════════════════════════════════════════════════
// УТИЛИТЫ — ПОИСК
// ═══════════════════════════════════════════════════════════════════════════════

/** Разбивает запрос на нормализованные токены */
function tokenize(query: string): string[] {
  return query.trim().toLowerCase().split(/\s+/).filter(Boolean);
}

/**
 * Возвращает true, если токен является bulk-ключевым словом.
 * Поддерживает частичное совпадение (prefix): «балк» → «балковый».
 */
function isBulkToken(token: string): boolean {
  return BULK_SEARCH_KEYWORDS.some(
    (kw) => token === kw || token.startsWith(kw) || kw.startsWith(token),
  );
}

/**
 * Проверяет совпадение одного (не-bulk) токена с полями товара.
 * Порядок приоритетов: name → brand → description → keywords → subCategory aliases.
 */
function productMatchesToken(p: Product, token: string): boolean {
  if (p.name.toLowerCase().includes(token))        return true;
  if (p.brand.toLowerCase().includes(token))       return true;
  if (p.description?.toLowerCase().includes(token)) return true;
  if (p.keywords?.some((kw) => kw.toLowerCase().includes(token))) return true;
  if (p.subCategory) {
    const aliases = SUBCATEGORY_SEARCH_ALIASES[p.subCategory] ?? [];
    if (aliases.some((a) => a.toLowerCase().includes(token) || token.includes(a.toLowerCase()))) {
      return true;
    }
  }
  return false;
}

// ═══════════════════════════════════════════════════════════════════════════════
// ВСПОМОГАТЕЛЬНЫЕ UI-КОМПОНЕНТЫ
// ═══════════════════════════════════════════════════════════════════════════════

/** Иконка куба для bulk-индикатора (повторяет стиль из ProductCard) */
function BulkCubeIcon({ size = 12, color = 'currentColor' }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 12 12" fill="none" aria-hidden="true">
      <path d="M6 1L11 3.5V8.5L6 11L1 8.5V3.5L6 1Z" stroke={color} strokeWidth="1.3" strokeLinejoin="round" />
      <path d="M6 1V11M1 3.5L6 6L11 3.5"            stroke={color} strokeWidth="1.3" strokeLinejoin="round" />
    </svg>
  );
}

interface CheckboxRowProps {
  checked:  boolean;
  onChange: () => void;
  label:    string;
  ariaLabel?: string;
}

/** Переиспользуемый checkbox-ряд в стиле DiscoveryClient */
function CheckboxRow({ checked, onChange, label, ariaLabel }: CheckboxRowProps) {
  return (
    <label
      className={[
        'flex items-center gap-2 px-2 py-1.5 rounded-lg cursor-pointer select-none',
        'transition-colors duration-100',
        checked ? 'bg-[#0B2B5E]/[0.06]' : 'hover:bg-[#0B2B5E]/[0.04]',
      ].join(' ')}
    >
      {/* Custom checkbox */}
      <span
        className={[
          'flex-shrink-0 w-3.5 h-3.5 rounded-[4px] border flex items-center justify-center',
          'transition-all duration-150',
          checked ? 'border-[#0B2B5E]' : 'border-slate-300 group-hover:border-[#0B2B5E]/50',
        ].join(' ')}
        style={checked ? { backgroundColor: '#0B2B5E' } : {}}
        aria-hidden="true"
      >
        {checked && (
          <svg width="8" height="6" viewBox="0 0 8 6" fill="none">
            <path d="M1 3L3 5L7 1" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </span>

      <input
        type="checkbox"
        className="sr-only"
        checked={checked}
        onChange={onChange}
        aria-label={ariaLabel ?? label}
      />

      <span
        className={[
          'flex-1 text-[10px] font-medium leading-tight',
          checked ? 'text-[#0B2B5E] font-semibold' : 'text-slate-500',
        ].join(' ')}
      >
        {label}
      </span>
    </label>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// ЛЕВЫЙ САЙДБАР
// ═══════════════════════════════════════════════════════════════════════════════

interface LeftSidebarProps {
  deliveryFilter:    DeliveryTypeFilter;
  onDeliveryToggle:  (key: 'bulk' | 'retail') => void;
  selectedCategories: ProductCategory[];
  onCategoryToggle:  (cat: ProductCategory) => void;
  selectedBrands:    string[];
  onBrandToggle:     (brand: string) => void;
  categoryCounts:    Partial<Record<ProductCategory, number>>;
  activeFilterCount: number;
  onReset:           () => void;
}

function LeftSidebar({
  deliveryFilter,
  onDeliveryToggle,
  selectedCategories,
  onCategoryToggle,
  selectedBrands,
  onBrandToggle,
  categoryCounts,
  activeFilterCount,
  onReset,
}: LeftSidebarProps) {
  // Категории, в которых есть хотя бы один товар
  const availableCategories = Object.keys(categoryCounts) as ProductCategory[];

  return (
    <aside
      className="hidden lg:flex flex-col w-[220px] flex-shrink-0 bg-white overflow-hidden"
      style={{ borderRight: '1px solid rgba(11,43,94,0.08)' }}
      aria-label="Фильтры каталога"
    >
      {/* ── Шапка ── */}
      <div
        className="flex-shrink-0 flex items-center justify-between px-3 pt-4 pb-3"
        style={{ borderBottom: '1px solid rgba(11,43,94,0.06)' }}
      >
        <div className="flex items-center gap-1.5">
          <span
            className="w-1.5 h-1.5 rounded-full flex-shrink-0"
            style={{ backgroundColor: '#0B2B5E' }}
            aria-hidden="true"
          />
          <p className="text-[8px] font-black uppercase tracking-widest leading-none" style={{ color: '#0B2B5E' }}>
            Фильтры
          </p>
        </div>

        {activeFilterCount > 0 && (
          <button
            type="button"
            onClick={onReset}
            className="text-[7px] font-semibold text-slate-400 hover:text-[#F26522] transition-colors duration-150"
            aria-label={`Сбросить все фильтры (${activeFilterCount})`}
          >
            Сброс · {activeFilterCount}
          </button>
        )}
      </div>

      <nav
        className="flex flex-col flex-1 overflow-y-auto px-3 py-3 gap-4"
        aria-label="Фильтры каталога товаров"
        style={{ scrollbarWidth: 'thin' }}
      >

        {/* ══ 1. ТИП ПОСТАВКИ (ВЫШЕ категорий!) ═══════════════════════════════ */}
        <div>
          <p
            className="text-[8px] font-black uppercase tracking-widest mb-2 px-1 leading-none"
            style={{ color: '#0B2B5E' }}
          >
            Тип поставки
          </p>

          <div
            className="flex flex-col gap-0.5 p-1.5 rounded-xl"
            role="group"
            aria-label="Фильтр по типу поставки"
            style={{ backgroundColor: 'rgba(11,43,94,0.03)', border: '1px solid rgba(11,43,94,0.07)' }}
          >
            {/* Только сырьё / Опт */}
            <label
              className={[
                'flex items-start gap-2 px-2 py-2 rounded-lg cursor-pointer select-none',
                'transition-colors duration-100',
                deliveryFilter.bulk ? 'bg-white shadow-sm' : 'hover:bg-white/60',
              ].join(' ')}
            >
              <span
                className={[
                  'flex-shrink-0 w-3.5 h-3.5 mt-0.5 rounded-[4px] border flex items-center justify-center',
                  'transition-all duration-150',
                  deliveryFilter.bulk ? 'border-[#0B2B5E]' : 'border-slate-300',
                ].join(' ')}
                style={deliveryFilter.bulk ? { backgroundColor: '#0B2B5E' } : {}}
                aria-hidden="true"
              >
                {deliveryFilter.bulk && (
                  <svg width="8" height="6" viewBox="0 0 8 6" fill="none">
                    <path d="M1 3L3 5L7 1" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
              </span>
              <input
                type="checkbox"
                className="sr-only"
                checked={deliveryFilter.bulk}
                onChange={() => onDeliveryToggle('bulk')}
                aria-label="Только сырьё и опт (Bulk)"
              />
              <div className="flex flex-col gap-0.5 min-w-0">
                <span
                  className={[
                    'text-[10px] font-semibold leading-tight',
                    deliveryFilter.bulk ? 'text-[#0B2B5E]' : 'text-slate-600',
                  ].join(' ')}
                >
                  Только сырьё / Опт
                </span>
                <span className="text-[8px] leading-tight" style={{ color: '#94a3b8' }}>
                  Bulk · зерно · мешок
                </span>
              </div>
              {/* Иконка куба — маркировка bulk */}
              <span className="flex-shrink-0 mt-0.5 ml-auto opacity-50">
                <BulkCubeIcon size={10} color="#475569" />
              </span>
            </label>

            {/* Фасованный продукт */}
            <label
              className={[
                'flex items-start gap-2 px-2 py-2 rounded-lg cursor-pointer select-none',
                'transition-colors duration-100',
                deliveryFilter.retail ? 'bg-white shadow-sm' : 'hover:bg-white/60',
              ].join(' ')}
            >
              <span
                className={[
                  'flex-shrink-0 w-3.5 h-3.5 mt-0.5 rounded-[4px] border flex items-center justify-center',
                  'transition-all duration-150',
                  deliveryFilter.retail ? 'border-[#0B2B5E]' : 'border-slate-300',
                ].join(' ')}
                style={deliveryFilter.retail ? { backgroundColor: '#0B2B5E' } : {}}
                aria-hidden="true"
              >
                {deliveryFilter.retail && (
                  <svg width="8" height="6" viewBox="0 0 8 6" fill="none">
                    <path d="M1 3L3 5L7 1" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
              </span>
              <input
                type="checkbox"
                className="sr-only"
                checked={deliveryFilter.retail}
                onChange={() => onDeliveryToggle('retail')}
                aria-label="Фасованный продукт (Retail-ready)"
              />
              <div className="flex flex-col gap-0.5 min-w-0">
                <span
                  className={[
                    'text-[10px] font-semibold leading-tight',
                    deliveryFilter.retail ? 'text-[#0B2B5E]' : 'text-slate-600',
                  ].join(' ')}
                >
                  Фасованный продукт
                </span>
                <span className="text-[8px] leading-tight" style={{ color: '#94a3b8' }}>
                  Retail-ready · упаковка
                </span>
              </div>
            </label>
          </div>
        </div>

        {/* ── Разделитель ── */}
        <div className="border-t" style={{ borderColor: 'rgba(11,43,94,0.07)' }} aria-hidden="true" />

        {/* ══ 2. КАТЕГОРИИ ══════════════════════════════════════════════════════ */}
        <div>
          <div className="flex items-center justify-between mb-2 px-1">
            <p
              className="text-[8px] font-black uppercase tracking-widest leading-none"
              style={{ color: '#0B2B5E' }}
            >
              Категории
            </p>
            {selectedCategories.length > 0 && (
              <span
                className="inline-flex items-center justify-center min-w-[16px] h-3.5 px-1 rounded-full text-[7px] font-bold leading-none text-white"
                style={{ backgroundColor: '#F26522' }}
                aria-label={`Выбрано категорий: ${selectedCategories.length}`}
              >
                {selectedCategories.length}
              </span>
            )}
          </div>

          <div className="flex flex-col gap-0.5" role="group" aria-label="Фильтр по категориям">
            {availableCategories.map((cat) => {
              const isChecked = selectedCategories.includes(cat);
              const count = categoryCounts[cat] ?? 0;
              return (
                <label
                  key={cat}
                  className={[
                    'flex items-center gap-2 px-2 py-1 rounded-lg cursor-pointer select-none',
                    'transition-colors duration-100',
                    isChecked ? 'bg-[#0B2B5E]/[0.06]' : 'hover:bg-[#0B2B5E]/[0.04]',
                  ].join(' ')}
                >
                  <span
                    className={[
                      'flex-shrink-0 w-3.5 h-3.5 rounded-[4px] border flex items-center justify-center',
                      'transition-all duration-150',
                      isChecked ? 'border-[#0B2B5E]' : 'border-slate-300',
                    ].join(' ')}
                    style={isChecked ? { backgroundColor: '#0B2B5E' } : {}}
                    aria-hidden="true"
                  >
                    {isChecked && (
                      <svg width="8" height="6" viewBox="0 0 8 6" fill="none">
                        <path d="M1 3L3 5L7 1" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    )}
                  </span>
                  <input
                    type="checkbox"
                    className="sr-only"
                    checked={isChecked}
                    onChange={() => onCategoryToggle(cat)}
                    aria-label={`Категория: ${PRODUCT_CATEGORY_LABELS[cat]}`}
                  />
                  <span
                    className={[
                      'flex-1 text-[10px] font-medium truncate leading-none',
                      isChecked ? 'text-[#0B2B5E] font-semibold' : 'text-slate-500',
                    ].join(' ')}
                  >
                    {PRODUCT_CATEGORY_LABELS[cat]}
                  </span>
                  <span className="text-[8px] tabular-nums text-slate-400 flex-shrink-0">
                    {count}
                  </span>
                </label>
              );
            })}
          </div>
        </div>

        {/* ── Разделитель ── */}
        <div className="border-t" style={{ borderColor: 'rgba(11,43,94,0.07)' }} aria-hidden="true" />

        {/* ══ 3. БРЕНДЫ ═════════════════════════════════════════════════════════ */}
        <div className="pb-2">
          <div className="flex items-center justify-between mb-2 px-1">
            <p
              className="text-[8px] font-black uppercase tracking-widest leading-none"
              style={{ color: '#0B2B5E' }}
            >
              Бренды
            </p>
            {selectedBrands.length > 0 && (
              <span
                className="inline-flex items-center justify-center min-w-[16px] h-3.5 px-1 rounded-full text-[7px] font-bold leading-none text-white"
                style={{ backgroundColor: '#F26522' }}
                aria-label={`Выбрано брендов: ${selectedBrands.length}`}
              >
                {selectedBrands.length}
              </span>
            )}
          </div>

          <div className="flex flex-col gap-0.5" role="group" aria-label="Фильтр по брендам">
            {UNIQUE_PRODUCT_BRANDS.map((brand) => {
              const isChecked = selectedBrands.includes(brand);
              return (
                <CheckboxRow
                  key={brand}
                  checked={isChecked}
                  onChange={() => onBrandToggle(brand)}
                  label={brand}
                  ariaLabel={`Бренд: ${brand}`}
                />
              );
            })}
          </div>
        </div>

        {/* ── Разделитель ── */}
        <div className="border-t" style={{ borderColor: 'rgba(11,43,94,0.07)' }} aria-hidden="true" />

        {/* ══ 4. ФИНАНСЫ И ЛИЗИНГ ══════════════════════════════════════════════
         *  CTA-блок в сайдбаре — ведёт на витрину банков-партнёров
         * ════════════════════════════════════════════════════════════════════ */}
        <div className="pb-3">
          <p
            className="text-[8px] font-black uppercase tracking-widest mb-2 px-1 leading-none"
            style={{ color: '#0B2B5E' }}
          >
            Финансы и лизинг
          </p>

          <Link
            href="/horeca/finance"
            className="flex flex-col gap-1.5 p-3 rounded-xl transition-all duration-150 hover:opacity-90 active:scale-[0.98]"
            style={{ background: 'linear-gradient(135deg, #F26522 0%, #e55510 100%)' }}
            aria-label="Перейти к витрине банков-партнёров"
          >
            {/* Иконка */}
            <div className="flex items-center gap-1.5">
              <svg
                width="11" height="11" viewBox="0 0 24 24"
                fill="none" stroke="rgba(255,255,255,0.9)" strokeWidth="2"
                strokeLinecap="round" strokeLinejoin="round"
                aria-hidden="true"
              >
                <rect x="1" y="4" width="22" height="16" rx="2" ry="2" />
                <line x1="1" y1="10" x2="23" y2="10" />
              </svg>
              <span className="text-[9px] font-black text-white uppercase tracking-wider leading-none">
                Банки-партнёры
              </span>
            </div>

            <p className="text-[8px] text-white/80 leading-tight">
              Лизинг от 5,9% · Кредит · РКО
            </p>

            <div className="flex items-center gap-1 mt-0.5">
              <span className="text-[7px] text-white/70 font-semibold">ВТБ · Точка · Аренза · Альфа</span>
              <svg
                className="ml-auto"
                width="10" height="10" viewBox="0 0 24 24"
                fill="none" stroke="rgba(255,255,255,0.7)" strokeWidth="2.5"
                strokeLinecap="round" strokeLinejoin="round"
                aria-hidden="true"
              >
                <line x1="5" y1="12" x2="19" y2="12" />
                <polyline points="12 5 19 12 12 19" />
              </svg>
            </div>
          </Link>

          {/* Подсказка — кнопка активна на карточке при цене от 50 000 ₽ */}
          <p
            className="text-[7px] leading-tight px-1 mt-1.5"
            style={{ color: '#94a3b8' }}
          >
            На карточке товара от 50 000 ₽ — кнопка «Нужна фин. поддержка»
          </p>
        </div>

      </nav>
    </aside>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// ГЛАВНЫЙ КОМПОНЕНТ
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * `MarketplaceClient` — страница B2B-каталога товаров EXPO 365.
 *
 * Геометрия (desktop lg+):
 *   • LEFT SIDEBAR  (w-[220px]) — ТИП ПОСТАВКИ → КАТЕГОРИИ → БРЕНДЫ (sticky, scrollable)
 *   • CENTER AREA   (flex-1)   — Поиск + 8-col сетка ProductCard
 *
 * Логика поиска (многотокенная):
 *   1. Детект bulk-токенов (сырье/балк/bulk/…) → фильтр isBulk
 *   2. Остальные токены — AND-матчинг по name/brand/description/keywords/aliases
 *   3. Bulk-бейдж «ОПТ / СЫРЬЁ» на ProductCard подсвечивается автоматически
 *      (computeIsBulk() вызывается внутри ProductCard)
 *
 * При поиске «сырье» → showBulkIndicator = true → все card с isBulk видны с бейджем.
 */
export default function MarketplaceClient() {
  // ── Стейт ──────────────────────────────────────────────────────────────────
  const [searchQuery,        setSearchQuery]        = useState('');
  const [deliveryFilter,     setDeliveryFilter]     = useState<DeliveryTypeFilter>({ bulk: false, retail: false });
  const [selectedCategories, setSelectedCategories] = useState<ProductCategory[]>([]);
  const [selectedBrands,     setSelectedBrands]     = useState<string[]>([]);
  /** Товар, для которого открыт LeasingRatesModal; null — модал закрыт */
  const [financeProduct,     setFinanceProduct]     = useState<Product | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);

  // ── Счётчики категорий (по всему каталогу, не зависят от фильтров) ─────────
  const categoryCounts = useMemo<Partial<Record<ProductCategory, number>>>(() => {
    const counts: Partial<Record<ProductCategory, number>> = {};
    PRODUCTS.forEach((p) => { counts[p.category] = (counts[p.category] ?? 0) + 1; });
    return counts;
  }, []);

  // ── Toggles ────────────────────────────────────────────────────────────────
  const toggleDelivery = useCallback((key: 'bulk' | 'retail') => {
    setDeliveryFilter((prev) => ({ ...prev, [key]: !prev[key] }));
  }, []);

  const toggleCategory = useCallback((cat: ProductCategory) => {
    setSelectedCategories((prev) =>
      prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat],
    );
  }, []);

  const toggleBrand = useCallback((brand: string) => {
    setSelectedBrands((prev) =>
      prev.includes(brand) ? prev.filter((b) => b !== brand) : [...prev, brand],
    );
  }, []);

  const resetAll = useCallback(() => {
    setSearchQuery('');
    setDeliveryFilter({ bulk: false, retail: false });
    setSelectedCategories([]);
    setSelectedBrands([]);
  }, []);

  // ── Количество активных фильтров (для кнопки «Сброс») ─────────────────────
  const activeFilterCount =
    (deliveryFilter.bulk   ? 1 : 0) +
    (deliveryFilter.retail ? 1 : 0) +
    selectedCategories.length +
    selectedBrands.length;

  // ── Основная фильтрация ────────────────────────────────────────────────────
  const { filteredProducts, isBulkSearchActive } = useMemo(() => {
    let result = [...PRODUCTS];

    // ── 1. Фильтр «Тип поставки» (сайдбар) ──────────────────────────────────
    const fb = deliveryFilter.bulk;
    const fr = deliveryFilter.retail;
    if (fb && !fr) {
      result = result.filter((p) => computeIsBulk(p));
    } else if (fr && !fb) {
      result = result.filter((p) => !computeIsBulk(p));
    }
    // Оба выбраны или оба сброшены → без фильтрации по типу поставки

    // ── 2. Фильтр по категориям ──────────────────────────────────────────────
    if (selectedCategories.length > 0) {
      result = result.filter((p) => selectedCategories.includes(p.category));
    }

    // ── 3. Фильтр по брендам ─────────────────────────────────────────────────
    if (selectedBrands.length > 0) {
      result = result.filter((p) => selectedBrands.includes(p.brand));
    }

    // ── 4. Поисковый запрос (многотокенный) ──────────────────────────────────
    const tokens      = tokenize(searchQuery);
    const bulkTokens  = tokens.filter(isBulkToken);
    const textTokens  = tokens.filter((t) => !isBulkToken(t));
    const hasBulkWord = bulkTokens.length > 0;

    if (tokens.length > 0) {
      result = result.filter((p) => {
        const pIsBulk = computeIsBulk(p);

        // Если в запросе есть bulk-слово и товар не bulk → исключить
        if (hasBulkWord && !pIsBulk) return false;

        // Если текстовых токенов нет → все оставшиеся (bulk-)товары подходят
        if (textTokens.length === 0) return true;

        // Все текстовые токены должны совпасть (AND-логика)
        return textTokens.every((token) => productMatchesToken(p, token));
      });
    }

    return { filteredProducts: result, isBulkSearchActive: hasBulkWord };
  }, [searchQuery, deliveryFilter, selectedCategories, selectedBrands]);

  // ── Blueprint-фон центральной зоны ────────────────────────────────────────
  const blueprintBg: React.CSSProperties = {
    backgroundColor: '#ffffff',
    backgroundImage:
      'repeating-linear-gradient(0deg,rgba(11,43,94,0.04) 0px,rgba(11,43,94,0.04) 1px,transparent 1px,transparent 24px),' +
      'repeating-linear-gradient(90deg,rgba(11,43,94,0.04) 0px,rgba(11,43,94,0.04) 1px,transparent 1px,transparent 24px)',
  };

  return (
    <div className="mt-16 flex h-[calc(100vh-64px)] overflow-hidden">

      {/* ══════════════════════════════════════════════════════════════════════
          LEFT SIDEBAR — ТИП ПОСТАВКИ → КАТЕГОРИИ → БРЕНДЫ
          ══════════════════════════════════════════════════════════════════════ */}
      <LeftSidebar
        deliveryFilter={deliveryFilter}
        onDeliveryToggle={toggleDelivery}
        selectedCategories={selectedCategories}
        onCategoryToggle={toggleCategory}
        selectedBrands={selectedBrands}
        onBrandToggle={toggleBrand}
        categoryCounts={categoryCounts}
        activeFilterCount={activeFilterCount}
        onReset={resetAll}
      />

      {/* ══════════════════════════════════════════════════════════════════════
          CENTER — ПОИСК + 8-КОЛОНОЧНАЯ СЕТКА ProductCard
          ══════════════════════════════════════════════════════════════════════ */}
      <section
        className="flex-1 flex flex-col min-w-0 overflow-hidden"
        style={blueprintBg}
        aria-label="Каталог товаров EXPO 365 Marketplace"
      >
        {/* ─── Sticky-шапка ──────────────────────────────────────────────────── */}
        <div
          className="flex-shrink-0 px-5 pt-4 pb-3 z-20"
          style={{
            backgroundColor: 'rgba(255,255,255,0.95)',
            backdropFilter:  'blur(8px)',
            WebkitBackdropFilter: 'blur(8px)',
            borderBottom:    '1px solid rgba(11,43,94,0.08)',
          }}
        >
          {/* Строка: заголовок + счётчик */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2.5">
              <span
                className="w-2 h-2 rounded-full flex-shrink-0"
                style={{ backgroundColor: '#0B2B5E' }}
                aria-hidden="true"
              />
              <div>
                <p className="text-[8px] font-semibold uppercase tracking-widest text-slate-400 leading-none mb-0.5">
                  HoReCa B2B · EXPO 365
                </p>
                <h1 className="text-sm font-black leading-none" style={{ color: '#0B2B5E' }}>
                  Маркетплейс товаров
                </h1>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {/* Активные теги фильтров */}
              {(deliveryFilter.bulk || deliveryFilter.retail) && (
                <div className="flex items-center gap-1">
                  {deliveryFilter.bulk && (
                    <button
                      type="button"
                      onClick={() => toggleDelivery('bulk')}
                      className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[7px] font-semibold leading-none hover:opacity-80 transition-opacity"
                      style={{ backgroundColor: 'rgba(71,85,105,0.10)', color: '#475569' }}
                      aria-label="Убрать фильтр: Только сырьё"
                    >
                      <BulkCubeIcon size={7} color="#475569" />
                      Сырьё
                      <span aria-hidden="true">×</span>
                    </button>
                  )}
                  {deliveryFilter.retail && (
                    <button
                      type="button"
                      onClick={() => toggleDelivery('retail')}
                      className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[7px] font-semibold leading-none hover:opacity-80 transition-opacity"
                      style={{ backgroundColor: 'rgba(11,43,94,0.08)', color: '#0B2B5E' }}
                      aria-label="Убрать фильтр: Фасованный"
                    >
                      Фасован.
                      <span aria-hidden="true">×</span>
                    </button>
                  )}
                </div>
              )}

              <span className="text-[10px] text-slate-400 font-medium tabular-nums whitespace-nowrap">
                {filteredProducts.length} / {PRODUCTS.length} товаров
              </span>
            </div>
          </div>

          {/* ── Индикатор режима bulk-поиска ─────────────────────────────────── */}
          {isBulkSearchActive && (
            <div
              className="flex items-center gap-2 px-3 py-2 rounded-lg mb-2"
              style={{ backgroundColor: 'rgba(71,85,105,0.08)', border: '1px solid rgba(71,85,105,0.18)' }}
              role="status"
              aria-live="polite"
            >
              <BulkCubeIcon size={11} color="#475569" />
              <span className="text-[10px] font-bold" style={{ color: '#475569' }}>
                Режим «Сырьё»: показаны только оптовые / сырьевые позиции
              </span>
              <span
                className="ml-auto inline-flex items-center px-1.5 py-px rounded text-[7px] font-black tracking-wider uppercase leading-none"
                style={{ backgroundColor: 'rgba(71,85,105,0.15)', color: '#475569' }}
              >
                ОПТ / СЫРЬЁ
              </span>
            </div>
          )}

          {/* ── Строка поиска ─────────────────────────────────────────────────── */}
          <div className="relative flex items-center">
            <svg
              className="absolute left-3 pointer-events-none flex-shrink-0"
              width="14" height="14" viewBox="0 0 24 24"
              fill="none" stroke="#94a3b8" strokeWidth="2"
              strokeLinecap="round" strokeLinejoin="round"
              aria-hidden="true"
            >
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.35-4.35" />
            </svg>
            <input
              ref={inputRef}
              type="search"
              autoComplete="off"
              placeholder='Поиск: "чай балк", "сырье", "зелёное зерно"…'
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={[
                'w-full h-8 pl-8 pr-8',
                'bg-white border border-[#0B2B5E]/15 rounded-lg',
                'text-[11px] text-[#0B2B5E] placeholder:text-slate-400',
                'focus:outline-none focus:border-[#F26522]/60',
                'transition-colors duration-150',
              ].join(' ')}
              aria-label="Поиск товаров в каталоге"
            />
            {searchQuery && (
              <button
                type="button"
                aria-label="Очистить поиск"
                onClick={() => { setSearchQuery(''); inputRef.current?.focus(); }}
                className="absolute right-2.5 flex items-center justify-center w-4 h-4 rounded-full text-slate-400 hover:text-[#F26522] transition-colors duration-150"
              >
                <svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor" aria-hidden="true">
                  <path d="M1.41 0 0 1.41 3.59 5 0 8.59 1.41 10 5 6.41 8.59 10 10 8.59 6.41 5 10 1.41 8.59 0 5 3.59z" />
                </svg>
              </button>
            )}
          </div>

          {/* ── Подсказки поиска bulk-ключевых слов ─────────────────────────── */}
          {!searchQuery && !isBulkSearchActive && (
            <div className="flex flex-wrap gap-1.5 mt-2">
              <span className="text-[8px] font-semibold uppercase tracking-widest text-slate-400 mr-1 leading-none self-center">
                Быстрый поиск:
              </span>
              {['сырье', 'балк', 'bulk', 'зерно', 'чай балк'].map((hint) => (
                <button
                  key={hint}
                  type="button"
                  onClick={() => setSearchQuery(hint)}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[8px] font-semibold leading-none transition-all duration-150 hover:opacity-80"
                  style={{ backgroundColor: 'rgba(11,43,94,0.07)', color: '#0B2B5E' }}
                >
                  {['сырье', 'балк', 'bulk'].includes(hint) && (
                    <BulkCubeIcon size={7} color="#0B2B5E" />
                  )}
                  {hint}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* ─── Прокручиваемая сетка Products ─────────────────────────────────── */}
        <div
          className="flex-1 overflow-y-auto px-4 py-4"
          style={{ scrollbarWidth: 'thin' }}
        >
          {filteredProducts.length > 0 ? (
            /*
             * 8-КОЛОНОЧНАЯ СЕТКА:
             *   grid-cols-4       — мобильный fallback
             *   sm:grid-cols-8    — строго 8 колонок на десктопе
             * ProductCard: col-span-1 (4 в строке на desktop через aspect-square)
             *
             * ProductCard автоматически рендерит бейдж «ОПТ / СЫРЬЁ»
             * через computeIsBulk() — no extra props needed.
             */
            <div
              className="grid grid-cols-4 sm:grid-cols-8 gap-3"
              aria-label="Сетка товаров каталога"
            >
              {filteredProducts.map((product) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  isAuthorized={true}
                  onFinanceRequest={setFinanceProduct}
                />
              ))}
            </div>
          ) : (
            /* ── Пустое состояние ── */
            <div className="flex flex-col items-center justify-center py-24 text-center">
              <div
                className="w-14 h-14 rounded-full flex items-center justify-center mb-4"
                style={{ backgroundColor: 'rgba(11,43,94,0.05)' }}
              >
                {searchQuery && isBulkSearchActive ? (
                  <BulkCubeIcon size={24} color="#0B2B5E" />
                ) : (
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none"
                    stroke="#0B2B5E" strokeWidth="1.5"
                    strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"
                  >
                    <circle cx="11" cy="11" r="8" />
                    <path d="m21 21-4.35-4.35" />
                  </svg>
                )}
              </div>
              <p className="font-bold text-sm" style={{ color: '#0B2B5E' }}>
                {isBulkSearchActive
                  ? 'Bulk / сырьевые позиции не найдены'
                  : 'Товары не найдены'}
              </p>
              <p className="text-slate-400 text-xs mt-1">
                {isBulkSearchActive
                  ? 'Попробуйте убрать дополнительные условия поиска'
                  : 'Измените фильтры или поисковый запрос'}
              </p>
              <button
                type="button"
                onClick={resetAll}
                className="mt-4 px-4 py-2 rounded-lg text-xs font-semibold text-white transition-all duration-150 hover:shadow-md"
                style={{ backgroundColor: '#F26522' }}
              >
                Сбросить фильтры
              </button>
            </div>
          )}
        </div>
      </section>

      {/* ── Модальное окно расчёта лизинга ──────────────────────────────────── */}
      {financeProduct && (
        <LeasingRatesModal
          product={financeProduct}
          isOpen={!!financeProduct}
          onClose={() => setFinanceProduct(null)}
        />
      )}
    </div>
  );
}
