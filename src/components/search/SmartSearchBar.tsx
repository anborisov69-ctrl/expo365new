'use client';

/**
 * SmartSearchBar.tsx — Кросс-язычная умная поисковая строка EXPO 365
 * ─────────────────────────────────────────────────────────────────────
 *
 * Архитектура:
 *   - Полностью клиентский компонент ('use client')
 *   - Поиск выполняется синхронно через `searchBrands()` (js, без сети)
 *   - Товары фильтруются по найденным брендам + обычный текстовый поиск
 *   - Компании — через `searchCompanies()` из companiesData
 *
 * Манифест UI/UX:
 *   - Текст в поле: #0B2B5E (brand-blue)
 *   - Акцент совпадения: #F26522 (brand-orange)
 *   - Dropdown: border-radius 16px (rounded-2xl)
 *   - Подсказки: text-[#1A3F7A] (темнее brand-blue), НЕ #999
 *   - Только текст и SVG-иконки — никаких эмодзи
 *   - Бренды — первый блок в дропдауне
 *   - Клик по результату → НЕт автоперехода, только отображение
 *     (финальный переход остаётся за пользователем — через Link)
 */

import React, {
  useState,
  useRef,
  useEffect,
  useCallback,
  useMemo,
} from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  Search,
  X,
  Tag,
  Package,
  Building2,
  ChevronRight,
  ArrowRight,
  Keyboard,
  Volume2,
  Shuffle,
  Fingerprint,
} from 'lucide-react';

import { searchBrands } from '@/lib/brandSearch';
import { getBrandCategoryLabels } from '@/data/brandsData';
import { PRODUCTS, PRODUCT_CATEGORY_LABELS } from '@/data/productsData';
import type { Product } from '@/data/productsData';
import {
  COMPANIES,
  searchCompanies,
  getCompanyInitials,
  getFullCompanyName,
} from '@/data/companiesData';
import type { Company } from '@/data/companiesData';
import type { BrandSearchResult, SearchMatchReason } from '@/types/search';
import { MATCH_REASON_LABELS } from '@/types/search';

// ═══════════════════════════════════════════════════════════════════════════════
// КОНСТАНТЫ
// ═══════════════════════════════════════════════════════════════════════════════

const MAX_BRAND_RESULTS   = 3;
const MAX_PRODUCT_RESULTS = 4;
const MAX_COMPANY_RESULTS = 2;

// ═══════════════════════════════════════════════════════════════════════════════
// УТИЛИТЫ
// ═══════════════════════════════════════════════════════════════════════════════

/** Иконка для причины совпадения */
function MatchReasonIcon({
  reason,
  className = 'h-3 w-3',
}: {
  reason: SearchMatchReason;
  className?: string;
}) {
  switch (reason) {
    case 'exact':           return <Fingerprint className={className} />;
    case 'alias':           return <Tag         className={className} />;
    case 'transliteration': return <ChevronRight className={className} />;
    case 'layout':          return <Keyboard     className={className} />;
    case 'phonetic':        return <Volume2      className={className} />;
    case 'fuzzy':           return <Shuffle      className={className} />;
  }
}

/**
 * Подсвечивает вхождение `query` в `text`, обёртывая в `<mark>`.
 *
 * Ищет по нескольким вариантам: прямое, без пробелов, первые символы.
 */
function HighlightedText({
  text,
  query,
}: {
  text: string;
  query: string;
}) {
  if (!query || query.length < 2) return <>{text}</>;

  const idx = text.toLowerCase().indexOf(query.toLowerCase());
  if (idx === -1) return <>{text}</>;

  return (
    <>
      {text.slice(0, idx)}
      <mark className="bg-transparent text-[#F26522] font-semibold not-italic">
        {text.slice(idx, idx + query.length)}
      </mark>
      {text.slice(idx + query.length)}
    </>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// ВСПОМОГАТЕЛЬНЫЕ КОМПОНЕНТЫ
// ═══════════════════════════════════════════════════════════════════════════════

/** Разделитель секции с меткой и счётчиком */
function SectionHeader({
  icon: Icon,
  label,
  count,
}: {
  icon: React.ElementType;
  label: string;
  count: number;
}) {
  return (
    <div className="flex items-center gap-2 px-3 pt-3 pb-1.5">
      <Icon className="h-3 w-3 text-[#1A3F7A]/60 flex-shrink-0" />
      <span className="text-[10px] font-bold tracking-widest uppercase text-[#1A3F7A]/60 select-none">
        {label}
      </span>
      <span className="text-[10px] font-semibold text-[#1A3F7A]/40 select-none">
        ({count})
      </span>
    </div>
  );
}

/** Тонкий разделитель между секциями */
function Divider() {
  return <div className="mx-3 my-1.5 border-t border-slate-100" />;
}

// ── Карточка бренда ───────────────────────────────────────────────────────────

function BrandSuggestion({
  result,
  query,
  onSelect,
}: {
  result: BrandSearchResult;
  query: string;
  onSelect: () => void;
}) {
  const { brand, matchReason, normalizedQuery } = result;
  const categories = getBrandCategoryLabels(brand);
  const hasLogo    = Boolean(brand.logoUrl);

  return (
    <Link
      href={`/horeca/marketplace?brand=${encodeURIComponent(brand.name)}`}
      onClick={onSelect}
      className="group flex items-center gap-3 px-3 py-2.5 hover:bg-[#0B2B5E]/[0.04] rounded-xl transition-colors"
      aria-label={`Бренд ${brand.name}`}
    >
      {/* Логотип бренда */}
      <div className="w-9 h-9 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-center flex-shrink-0 overflow-hidden">
        {hasLogo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={brand.logoUrl}
            alt={brand.name}
            className="w-7 h-7 object-contain"
          />
        ) : (
          <span className="text-[10px] font-bold text-[#0B2B5E]/70 select-none leading-none">
            {brand.name.substring(0, 2).toUpperCase()}
          </span>
        )}
      </div>

      {/* Основной контент */}
      <div className="flex-1 min-w-0">
        {/* Имя бренда с подсветкой */}
        <p className="text-sm font-semibold text-[#0B2B5E] truncate leading-tight group-hover:text-[#F26522] transition-colors">
          <HighlightedText text={brand.name} query={query} />
        </p>

        {/* Категории + причина совпадения */}
        <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
          {categories.slice(0, 2).map((cat) => (
            <span
              key={cat}
              className="text-[9px] font-medium text-[#1A3F7A]/60 bg-[#0B2B5E]/[0.06] px-1.5 py-0.5 rounded-full leading-none"
            >
              {cat}
            </span>
          ))}
          {brand.country && (
            <span className="text-[9px] text-[#1A3F7A]/40 leading-none">
              {brand.country}
            </span>
          )}
        </div>
      </div>

      {/* Правая часть: причина матча + CTA */}
      <div className="flex flex-col items-end gap-1 flex-shrink-0">
        <div className="flex items-center gap-1 text-[9px] text-[#1A3F7A]/50">
          <MatchReasonIcon reason={matchReason} className="h-2.5 w-2.5" />
          <span className="hidden sm:inline">
            {MATCH_REASON_LABELS[matchReason]}
          </span>
        </div>
        {matchReason !== 'exact' && normalizedQuery !== brand.name.toLowerCase() && (
          <span className="text-[9px] text-[#1A3F7A]/40 font-mono truncate max-w-[72px]">
            «{normalizedQuery}»
          </span>
        )}
        <ArrowRight className="h-3 w-3 text-slate-300 group-hover:text-[#F26522] transition-colors mt-0.5" />
      </div>
    </Link>
  );
}

// ── Карточка товара ───────────────────────────────────────────────────────────

function ProductSuggestion({
  product,
  query,
  onSelect,
}: {
  product: Product;
  query: string;
  onSelect: () => void;
}) {
  return (
    <Link
      href={`/horeca/marketplace?q=${encodeURIComponent(product.name)}`}
      onClick={onSelect}
      className="group flex items-center gap-3 px-3 py-2 hover:bg-slate-50 rounded-xl transition-colors"
    >
      <div className="w-8 h-8 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center flex-shrink-0 overflow-hidden">
        {product.brandLogoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={product.brandLogoUrl} alt={product.brand} className="w-6 h-6 object-contain" />
        ) : (
          <span className="text-[9px] font-bold text-slate-500 select-none">
            {product.brand.substring(0, 2).toUpperCase()}
          </span>
        )}
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-slate-700 truncate group-hover:text-[#0B2B5E] transition-colors">
          <HighlightedText text={product.name} query={query} />
        </p>
        <p className="text-[11px] text-[#1A3F7A]/50 truncate">
          {PRODUCT_CATEGORY_LABELS[product.category]} · {product.brand}
        </p>
      </div>

      <div className="flex flex-col items-end flex-shrink-0 gap-0.5">
        <span className="text-xs font-semibold text-[#F26522] tabular-nums">
          {new Intl.NumberFormat('ru-RU', {
            style: 'currency',
            currency: 'RUB',
            maximumFractionDigits: 0,
          }).format(product.price)}
        </span>
        <ArrowRight className="h-3 w-3 text-slate-300 group-hover:text-[#F26522] transition-colors" />
      </div>
    </Link>
  );
}

// ── Карточка компании ─────────────────────────────────────────────────────────

function CompanySuggestion({
  company,
  query,
  onSelect,
}: {
  company: Company;
  query: string;
  onSelect: () => void;
}) {
  const fullName = getFullCompanyName(company);

  return (
    <Link
      href={`/horeca/exhibitors/${company.slug}`}
      onClick={onSelect}
      className="group flex items-center gap-3 px-3 py-2 hover:bg-[#0B2B5E]/[0.04] rounded-xl transition-colors"
    >
      <div className="w-8 h-8 rounded-lg bg-[#0B2B5E]/[0.06] border border-[#0B2B5E]/10 flex items-center justify-center flex-shrink-0 overflow-hidden">
        {company.logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={company.logoUrl} alt={company.companyName} className="w-6 h-6 object-contain" />
        ) : (
          <span className="text-[10px] font-bold text-[#0B2B5E] select-none">
            {getCompanyInitials(company.companyName)}
          </span>
        )}
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-slate-700 truncate group-hover:text-[#0B2B5E] transition-colors">
          <HighlightedText text={fullName} query={query} />
        </p>
        {company.industry && (
          <p className="text-[11px] text-[#1A3F7A]/50 truncate">
            {company.industry}{company.city ? ` · ${company.city}` : ''}
          </p>
        )}
      </div>

      <span className="text-[9px] font-semibold text-[#1A3F7A]/40 group-hover:text-[#F26522] transition-colors flex-shrink-0 whitespace-nowrap">
        Перейти в павильон
      </span>
    </Link>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// ПУСТОЕ СОСТОЯНИЕ
// ═══════════════════════════════════════════════════════════════════════════════

function EmptyState({ query, onClose }: { query: string; onClose: () => void }) {
  return (
    <div className="py-8 px-4 text-center">
      <Search className="mx-auto h-8 w-8 text-[#0B2B5E]/10 mb-3" />
      <p className="text-sm font-semibold text-[#0B2B5E]">
        Ничего не найдено
      </p>
      <p className="text-[11px] text-[#1A3F7A]/60 mt-1 leading-relaxed">
        По запросу <span className="font-medium text-[#0B2B5E]">«{query}»</span> не найдено
        брендов, товаров или компаний.
      </p>
      <p className="text-[11px] text-[#1A3F7A]/50 mt-2">
        Попробуйте другое написание или&nbsp;
        <Link
          href="/horeca/discovery"
          onClick={onClose}
          className="text-[#0B2B5E] font-medium underline decoration-[#0B2B5E]/30 hover:decoration-[#F26522] hover:text-[#F26522] transition-colors"
        >
          перейдите во Витрину
        </Link>
      </p>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// ГЛАВНЫЙ КОМПОНЕНТ
// ═══════════════════════════════════════════════════════════════════════════════

export function SmartSearchBar() {
  const router   = useRouter();
  const pathname = usePathname();

  const [query,     setQuery]     = useState('');
  const [isOpen,    setIsOpen]    = useState(false);
  const [isFocused, setIsFocused] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef     = useRef<HTMLInputElement>(null);

  // ── Вычисление результатов через useMemo ─────────────────────────────────
  const brandResults = useMemo(() => {
    if (query.trim().length < 2) return [];
    return searchBrands(query, MAX_BRAND_RESULTS);
  }, [query]);

  const productResults = useMemo((): Product[] => {
    if (query.trim().length < 2) return [];

    const q = query.toLowerCase().trim();

    // Если найдены бренды — фильтруем товары по ним + по запросу
    const brandNames = brandResults.map((r) => r.brand.name.toLowerCase());
    if (brandNames.length > 0) {
      return PRODUCTS
        .filter((p) => brandNames.some((bn) => p.brand.toLowerCase().includes(bn)))
        .slice(0, MAX_PRODUCT_RESULTS);
    }

    // Иначе — обычный текстовый поиск
    return PRODUCTS
      .filter((p) =>
        p.name.toLowerCase().includes(q) ||
        p.brand.toLowerCase().includes(q) ||
        p.description?.toLowerCase().includes(q) ||
        p.keywords?.some((kw) => kw.toLowerCase().includes(q)) ||
        PRODUCT_CATEGORY_LABELS[p.category].toLowerCase().includes(q),
      )
      .slice(0, MAX_PRODUCT_RESULTS);
  }, [query, brandResults]);

  const companyResults = useMemo(() => {
    if (query.trim().length < 2) return [];
    return searchCompanies(query.toLowerCase().trim(), MAX_COMPANY_RESULTS);
  }, [query]);

  const hasResults =
    brandResults.length > 0 ||
    productResults.length > 0 ||
    companyResults.length > 0;

  // ── Открытие/закрытие дропдауна ──────────────────────────────────────────
  useEffect(() => {
    setIsOpen(query.trim().length >= 2);
  }, [query]);

  // ── Закрытие по клику вне компонента ─────────────────────────────────────
  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        setIsFocused(false);
      }
    }
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  // ── Закрытие по Escape ────────────────────────────────────────────────────
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        setIsOpen(false);
        inputRef.current?.blur();
      }
    }
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, []);

  // ── Коллбэк при выборе результата ────────────────────────────────────────
  const handleSelect = useCallback(() => {
    setQuery('');
    setIsOpen(false);
    setIsFocused(false);
    inputRef.current?.blur();
  }, []);

  // ── Переход по Enter ──────────────────────────────────────────────────────
  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const q = query.trim();
    if (!q) return;

    if (pathname.startsWith('/horeca/discovery')) {
      router.push(`/horeca/discovery?search=${encodeURIComponent(q)}`);
    } else {
      router.push(`/horeca/marketplace?q=${encodeURIComponent(q)}`);
    }
    handleSelect();
  }

  // ── Ссылка «Все результаты» ───────────────────────────────────────────────
  const allResultsHref = pathname.startsWith('/horeca/discovery')
    ? `/horeca/discovery?search=${encodeURIComponent(query)}`
    : `/horeca/marketplace?q=${encodeURIComponent(query)}`;

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div ref={containerRef} className="relative w-full max-w-sm lg:max-w-md">

      {/* ── Поисковый инпут ─────────────────────────────────────────────── */}
      <form onSubmit={handleSubmit} role="search" aria-label="Поиск брендов, товаров, компаний">
        <div
          className={[
            'flex items-center gap-2 h-9 px-3 rounded-xl border transition-all duration-200',
            isFocused
              ? 'border-[#0B2B5E]/30 bg-white shadow-sm shadow-[#0B2B5E]/10 ring-1 ring-[#0B2B5E]/15'
              : 'border-slate-200 bg-slate-50 hover:border-slate-300',
          ].join(' ')}
        >
          <Search
            className={[
              'h-3.5 w-3.5 flex-shrink-0 transition-colors',
              isFocused ? 'text-[#0B2B5E]/50' : 'text-slate-400',
            ].join(' ')}
          />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => {
              setIsFocused(true);
              if (query.trim().length >= 2) setIsOpen(true);
            }}
            placeholder="Бренды, товары, компании…"
            aria-label="Глобальный поиск"
            aria-expanded={isOpen}
            aria-haspopup="listbox"
            autoComplete="off"
            spellCheck={false}
            className="flex-1 bg-transparent text-sm text-[#0B2B5E] placeholder:text-[#1A3F7A]/40 outline-none min-w-0 font-medium"
          />
          {query && (
            <button
              type="button"
              onClick={() => { setQuery(''); setIsOpen(false); inputRef.current?.focus(); }}
              aria-label="Очистить поиск"
              className="flex-shrink-0 text-[#1A3F7A]/30 hover:text-[#0B2B5E] transition-colors"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </form>

      {/* ── Дропдаун с результатами ─────────────────────────────────────── */}
      {isOpen && (
        <div
          role="listbox"
          aria-label="Результаты поиска"
          className="absolute top-full left-0 right-0 mt-2 bg-white border border-slate-200/80 rounded-2xl shadow-xl shadow-[#0B2B5E]/10 z-50 overflow-hidden"
        >
          {hasResults ? (
            <div className="pb-2">

              {/* ── Блок «Бренды» (приоритет 1) ───────────────────────── */}
              {brandResults.length > 0 && (
                <div>
                  <SectionHeader icon={Tag} label="Бренды" count={brandResults.length} />
                  <div className="px-1 space-y-0.5">
                    {brandResults.map((result) => (
                      <BrandSuggestion
                        key={result.brand.id}
                        result={result}
                        query={query}
                        onSelect={handleSelect}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* ── Блок «Товары» (приоритет 2) ───────────────────────── */}
              {productResults.length > 0 && (
                <>
                  {brandResults.length > 0 && <Divider />}
                  <div>
                    <SectionHeader icon={Package} label="Товары" count={productResults.length} />
                    <div className="px-1 space-y-0.5">
                      {productResults.map((product) => (
                        <ProductSuggestion
                          key={product.id}
                          product={product}
                          query={query}
                          onSelect={handleSelect}
                        />
                      ))}
                    </div>
                  </div>
                </>
              )}

              {/* ── Блок «Компании» (приоритет 3) ─────────────────────── */}
              {companyResults.length > 0 && (
                <>
                  {(brandResults.length > 0 || productResults.length > 0) && <Divider />}
                  <div>
                    <SectionHeader icon={Building2} label="Компании" count={companyResults.length} />
                    <div className="px-1 space-y-0.5">
                      {companyResults.map((company) => (
                        <CompanySuggestion
                          key={company.id}
                          company={company}
                          query={query}
                          onSelect={handleSelect}
                        />
                      ))}
                    </div>
                  </div>
                </>
              )}

              {/* ── Футер: подсказка Enter + ссылка «Все результаты» ──── */}
              <div className="mx-3 mt-2 pt-2 border-t border-slate-100 flex items-center justify-between">
                <p className="text-[11px] text-[#1A3F7A]/50">
                  Нажмите{' '}
                  <kbd className="px-1 py-0.5 text-[10px] font-mono bg-slate-100 text-[#0B2B5E] rounded border border-slate-200">
                    Enter
                  </kbd>{' '}
                  для поиска
                </p>
                <Link
                  href={allResultsHref}
                  onClick={handleSelect}
                  className="flex items-center gap-1 text-[11px] font-semibold text-[#0B2B5E] hover:text-[#F26522] transition-colors"
                >
                  Все результаты
                  <ArrowRight className="h-3 w-3" />
                </Link>
              </div>
            </div>
          ) : (
            <EmptyState query={query} onClose={handleSelect} />
          )}
        </div>
      )}
    </div>
  );
}

export default SmartSearchBar;
