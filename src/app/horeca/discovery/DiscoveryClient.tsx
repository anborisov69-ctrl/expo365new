'use client';

import { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  Star,
  Search,
  Globe,
  Coffee,
  ShoppingBasket,
  Settings2,
  Wrench,
  Landmark,
} from 'lucide-react';
import NewsFeedPanel from '@/components/NewsFeedPanel';

// ═══════════════════════════════════════════════════════════════════════════════
// ТИПЫ — ЭКСПОНЕНТЫ (Pavilion cards)
// ═══════════════════════════════════════════════════════════════════════════════

export type ExponentCategory = 'manufacturer' | 'distributor' | 'financial_institution';

export interface Brand {
  name: string;
  logoUrl?: string;
  domain?: string;
  country?: string;
}

export interface Exponent {
  id: string;
  name: string;
  slug?: string;
  mainLogo: string | null;
  brands: Brand[];
  isOnline: boolean;
  category: ExponentCategory;
  /** Отраслевая группа для фильтрации в левом сайдбаре */
  industry?: IndustryGroupFilter;
  /** Страна присутствия компании (для бейджа на карточке) */
  country?: string;
  /**
   * Флаг «Партнёр платформы» — устанавливается автоматически для экспонентов,
   * активно использующих B2B-рефералы (b2bReferrals.filter(active).length > 0).
   * Показывает специальный бейдж при наведении на карточку в Discovery.
   */
  isB2BPartner?: boolean;
}

// ═══════════════════════════════════════════════════════════════════════════════
// ТИПЫ — ФИЛЬТРЫ
// ═══════════════════════════════════════════════════════════════════════════════

/** Фильтр-группа отраслей (левый сайдбар) */
export type IndustryGroupFilter = 'all' | 'beverages' | 'food' | 'equipment' | 'services' | 'finance';

/** Фильтр типа участника (левый сайдбар) */
export type SupplierTypeFilter = 'all' | 'online' | 'manufacturer' | 'distributor' | 'financial_institution';

// ═══════════════════════════════════════════════════════════════════════════════
// ДАННЫЕ — ФИЛЬТРЫ
// Эмодзи ЗАПРЕЩЕНЫ: используем строгие монохромные Lucide-иконки
// ═══════════════════════════════════════════════════════════════════════════════

const INDUSTRY_GROUP_FILTERS: {
  id: IndustryGroupFilter;
  label: string;
  Icon: React.FC<{ size?: number; strokeWidth?: number; color?: string }>;
}[] = [
  { id: 'all',       label: 'Все отрасли',      Icon: Globe },
  { id: 'beverages', label: 'Напитки',           Icon: Coffee },
  { id: 'food',      label: 'Продукты',          Icon: ShoppingBasket },
  { id: 'equipment', label: 'Оборудование',      Icon: Settings2 },
  { id: 'services',  label: 'Услуги',            Icon: Wrench },
  { id: 'finance',   label: 'Финансы и лизинг',  Icon: Landmark },
];

const SUPPLIER_TYPE_FILTERS: {
  id: SupplierTypeFilter;
  label: string;
  withDot?: boolean;
  dotColor?: string;
}[] = [
  { id: 'all',                   label: 'Все' },
  { id: 'online',                label: 'Онлайн',               withDot: true, dotColor: '#22c55e' },
  { id: 'manufacturer',          label: 'Производители' },
  { id: 'distributor',           label: 'Дистрибьюторы' },
  { id: 'financial_institution', label: 'Финансовые партнёры',  withDot: true, dotColor: '#27AE60' },
];

// ═══════════════════════════════════════════════════════════════════════════════
// УТИЛИТЫ
// ═══════════════════════════════════════════════════════════════════════════════

function getInitials(name: string): string {
  const words = name.trim().split(/\s+/);
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (words[0].charAt(0) + words[1].charAt(0)).toUpperCase();
}

// ═══════════════════════════════════════════════════════════════════════════════
// КОМПОНЕНТ — КАРТОЧКА ПАВИЛЬОНА (PavilionCard)
// ═══════════════════════════════════════════════════════════════════════════════

interface PavilionCardProps {
  exponent: Exponent;
}

function PavilionCard({ exponent }: PavilionCardProps) {
  const categoryLabel =
    exponent.category === 'manufacturer'          ? 'ПРОИЗВ.'      :
    exponent.category === 'financial_institution'  ? 'ФИН. ПАРТНЁР' :
    'ДИСТРИБ.';
  const categoryColor =
    exponent.category === 'manufacturer'          ? '#0B2B5E'  :
    exponent.category === 'financial_institution'  ? '#27AE60'  :
    '#7c3aed';
  const href = `/horeca/exhibitors/${exponent.slug ?? exponent.id}`;

  return (
    <Link
      href={href}
      aria-label={`Перейти в павильон: ${exponent.name}`}
      className={[
        'group relative aspect-square flex flex-col overflow-hidden',
        'col-span-1 sm:col-span-2',
        'bg-white border rounded-2xl',
        'cursor-pointer select-none no-underline',
        'transition-all duration-200',
        'hover:border-[#F26522]/60 hover:-translate-y-1',
        'focus:outline-none focus-visible:ring-2 focus-visible:ring-[#F26522]/50',
      ].join(' ')}
      style={{ borderColor: 'rgba(11,43,94,0.2)' }}
    >
      {/* Оранжевая полоска сверху (hover) */}
      <div
        className="absolute inset-x-0 top-0 h-[3px] rounded-t-xl opacity-0 group-hover:opacity-100 transition-opacity duration-200"
        style={{ backgroundColor: '#F26522' }}
        aria-hidden="true"
      />

      {/* ONLINE бейдж */}
      {exponent.isOnline && (
        <div className="absolute top-2.5 right-2.5 z-10 flex items-center gap-1">
          <span
            className="w-1.5 h-1.5 rounded-full flex-shrink-0"
            style={{ backgroundColor: '#22c55e' }}
            aria-hidden="true"
          />
          <span
            className="text-[7px] font-black tracking-widest uppercase leading-none select-none"
            style={{ color: '#15803d' }}
          >
            ONLINE
          </span>
        </div>
      )}

      {/* ── «Партнёр платформы» — появляется при hover для B2B-активных экспонентов ── */}
      {exponent.isB2BPartner && (
        <div
          className={[
            'absolute bottom-0 inset-x-0 z-10',
            'flex items-center justify-center gap-1.5 px-2 py-1.5',
            'opacity-0 group-hover:opacity-100',
            'translate-y-1 group-hover:translate-y-0',
            'transition-all duration-250 ease-out',
          ].join(' ')}
          style={{
            background: 'linear-gradient(135deg, rgba(11,43,94,0.92) 0%, rgba(26,64,128,0.96) 100%)',
            backdropFilter: 'blur(4px)',
          }}
          role="status"
          aria-label="Партнёр платформы EXPO 365"
        >
          <Star
            size={9}
            strokeWidth={2.5}
            style={{ color: '#F26522', flexShrink: 0 }}
            aria-hidden="true"
          />
          <span
            className="text-[7px] font-black tracking-[0.12em] uppercase leading-none select-none"
            style={{ color: '#fbbf24' }}
          >
            Партнёр платформы
          </span>
          <Star
            size={9}
            strokeWidth={2.5}
            style={{ color: '#F26522', flexShrink: 0 }}
            aria-hidden="true"
          />
        </div>
      )}

      {/* ── Верхняя зона: Логотип компании ── */}
      <div
        className="relative flex-shrink-0 flex items-center justify-center overflow-hidden"
        style={{
          height: '52%',
          backgroundColor: 'rgba(11,43,94,0.025)',
          borderBottom: '1px solid rgba(11,43,94,0.06)',
        }}
      >
        {exponent.mainLogo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={exponent.mainLogo}
            alt={`Логотип ${exponent.name}`}
            width={64}
            height={64}
            loading="lazy"
            className="w-12 h-12 object-contain transition-transform duration-200 group-hover:scale-110"
            onError={(e) => {
              e.currentTarget.style.display = 'none';
            }}
          />
        ) : (
          <div
            className="w-12 h-12 rounded-xl flex items-center justify-center shadow-sm transition-transform duration-200 group-hover:scale-110"
            style={{ backgroundColor: '#0B2B5E' }}
            aria-hidden="true"
          >
            <span className="text-base font-black text-white leading-none">
              {getInitials(exponent.name)}
            </span>
          </div>
        )}
      </div>

      {/* ── Нижняя зона: Имя + категория + бренды ── */}
      <div className="flex flex-col flex-1 min-h-0 px-2.5 pt-2 pb-2">
        <div className="flex items-start justify-between gap-1 mb-1">
          <p
            className="text-[9px] font-black uppercase tracking-wide leading-tight line-clamp-2 flex-1"
            style={{ color: '#0B2B5E' }}
          >
            {exponent.name}
          </p>
          <div className="flex flex-col items-end gap-0.5 flex-shrink-0">
            <span
              className="inline-flex items-center px-1 py-0.5 rounded text-[7px] font-black tracking-wide leading-none uppercase select-none"
              style={{ backgroundColor: `${categoryColor}18`, color: categoryColor }}
            >
              {categoryLabel}
            </span>
            {exponent.country && (
              <span
                className="inline-flex items-center px-1 py-0.5 rounded text-[6px] font-semibold leading-none uppercase select-none whitespace-nowrap"
                style={{ backgroundColor: 'rgba(11,43,94,0.06)', color: '#0B2B5E' }}
              >
                {exponent.country}
              </span>
            )}
          </div>
        </div>

        {/* Бренды с тегами стран */}
        <div className="flex flex-col gap-0.5 flex-1 min-h-0 overflow-hidden">
          {exponent.brands.slice(0, 3).map((brand) => (
            <div
              key={brand.name}
              className="flex items-center gap-1.5 min-w-0"
            >
              <div className="w-4 h-4 rounded-md border border-[#0B2B5E]/10 bg-white flex items-center justify-center flex-shrink-0 overflow-hidden">
                {brand.logoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={brand.logoUrl}
                    alt={brand.name}
                    width={16}
                    height={16}
                    loading="lazy"
                    className="w-full h-full object-contain"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                    }}
                  />
                ) : (
                  <span
                    className="text-[6px] font-bold leading-none"
                    style={{ color: '#0B2B5E' }}
                  >
                    {brand.name.charAt(0)}
                  </span>
                )}
              </div>
              {/* Readability: #0B2B5E вместо slate-600 */}
              <span
                className="text-[8px] font-medium truncate flex-1 min-w-0 leading-none"
                style={{ color: '#0B2B5E' }}
              >
                {brand.name}
              </span>
              {brand.country && (
                <span
                  className="inline-flex items-center px-1 py-0.5 rounded text-[6px] font-semibold leading-none whitespace-nowrap flex-shrink-0"
                  style={{ backgroundColor: 'rgba(11,43,94,0.06)', color: '#0B2B5E' }}
                >
                  {brand.country}
                </span>
              )}
            </div>
          ))}

          {exponent.brands.length > 3 && (
            <p
              className="text-[7px] font-medium leading-none mt-0.5"
              style={{ color: 'rgba(11,43,94,0.55)' }}
            >
              +{exponent.brands.length - 3} бренда
            </p>
          )}
        </div>
      </div>
    </Link>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// КОМПОНЕНТ — ЛЕВЫЙ САЙДБАР: ФИЛЬТРЫ
// ─ Бренды УДАЛЕНЫ из сайдбара (перенесены в поиск)
// ─ Эмодзи УДАЛЕНЫ, заменены монохромными Lucide-иконками
// ─ Читаемость: все серые тексты → #0B2B5E
// ═══════════════════════════════════════════════════════════════════════════════

interface LeftFiltersProps {
  industryFilter:   IndustryGroupFilter;
  onIndustryChange: (v: IndustryGroupFilter) => void;
  supplierFilter:   SupplierTypeFilter;
  onSupplierChange: (v: SupplierTypeFilter) => void;
  counts:           Record<SupplierTypeFilter, number>;
}

function LeftFilters({
  industryFilter,
  onIndustryChange,
  supplierFilter,
  onSupplierChange,
  counts,
}: LeftFiltersProps) {
  return (
    <nav
      aria-label="Фильтры экспонентов"
      className="flex flex-col h-full overflow-y-auto px-3 py-4"
      style={{ scrollbarWidth: 'thin' }}
    >
      {/* ── Отраслевые группы ── */}
      <div className="mb-5">
        <p
          className="text-[8px] font-black uppercase tracking-widest mb-2 px-1"
          style={{ color: '#0B2B5E' }}
        >
          Отрасли
        </p>
        <div className="flex flex-col gap-1">
          {INDUSTRY_GROUP_FILTERS.map((f) => {
            const isActive = f.id === industryFilter;
            return (
              <button
                key={f.id}
                type="button"
                onClick={() => onIndustryChange(f.id)}
                aria-current={isActive ? 'true' : undefined}
                className={[
                  'relative flex items-center gap-2 px-2.5 py-2 rounded-lg text-[10px] font-semibold w-full text-left',
                  'border transition-all duration-150 select-none focus:outline-none',
                  'focus-visible:ring-2 focus-visible:ring-[#F26522]/50',
                  isActive
                    ? 'bg-[#0B2B5E] text-white border-[#0B2B5E] shadow-sm'
                    : 'bg-white/70 border-[#0B2B5E]/15 hover:border-[#0B2B5E]/40 hover:bg-[#0B2B5E]/4',
                ].join(' ')}
              >
                {/* Монохромная иконка — без эмодзи */}
                <f.Icon
                  size={12}
                  strokeWidth={2}
                  color={isActive ? '#ffffff' : '#0B2B5E'}
                  aria-hidden="true"
                />
                <span
                  className="truncate font-semibold"
                  style={{ color: isActive ? '#ffffff' : '#0B2B5E' }}
                >
                  {f.label}
                </span>
                {isActive && (
                  <span
                    className="absolute left-0 inset-y-2 w-[3px] rounded-full"
                    style={{ backgroundColor: '#F26522' }}
                    aria-hidden="true"
                  />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Тип участника ── */}
      <div className="mb-5">
        <p
          className="text-[8px] font-black uppercase tracking-widest mb-2 px-1"
          style={{ color: '#0B2B5E' }}
        >
          Тип участника
        </p>
        <div className="flex flex-col gap-1">
          {SUPPLIER_TYPE_FILTERS.map((f) => {
            const isActive = f.id === supplierFilter;
            return (
              <button
                key={f.id}
                type="button"
                onClick={() => onSupplierChange(f.id)}
                aria-current={isActive ? 'true' : undefined}
                className={[
                  'relative flex items-center justify-between gap-2 px-2.5 py-2 rounded-lg text-[10px] font-semibold w-full text-left',
                  'border transition-all duration-150 select-none focus:outline-none',
                  'focus-visible:ring-2 focus-visible:ring-[#F26522]/50',
                  isActive
                    ? 'bg-white border-[#0B2B5E] shadow-sm'
                    : 'bg-white/70 border-[#0B2B5E]/15 hover:border-[#0B2B5E]/40 hover:bg-[#0B2B5E]/4',
                ].join(' ')}
              >
                <span className="flex items-center gap-2 min-w-0">
                  {f.withDot && (
                    <span
                      className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                      style={{ backgroundColor: f.dotColor ?? '#22c55e' }}
                      aria-hidden="true"
                    />
                  )}
                  <span
                    className="truncate font-semibold"
                    style={{ color: isActive ? '#0B2B5E' : 'rgba(11,43,94,0.75)' }}
                  >
                    {f.label}
                  </span>
                </span>
                <span
                  className={[
                    'inline-flex items-center justify-center min-w-[18px] h-4 px-1 rounded-full text-[8px] font-bold leading-none flex-shrink-0',
                    isActive ? 'text-white' : 'text-[#0B2B5E]',
                  ].join(' ')}
                  style={{
                    backgroundColor: isActive
                      ? '#F26522'
                      : 'rgba(11,43,94,0.08)',
                  }}
                >
                  {counts[f.id]}
                </span>
                {isActive && (
                  <span
                    className="absolute left-0 inset-y-2 w-[3px] rounded-full"
                    style={{ backgroundColor: '#F26522' }}
                    aria-hidden="true"
                  />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Примечание: фильтрация по брендам доступна через строку поиска ↑ */}
      <div
        className="mx-1 px-2 py-2 rounded-lg"
        style={{ backgroundColor: 'rgba(11,43,94,0.04)', border: '1px dashed rgba(11,43,94,0.12)' }}
      >
        <p
          className="text-[8px] font-medium leading-tight"
          style={{ color: 'rgba(11,43,94,0.6)' }}
        >
          Поиск по брендам — введите название бренда в строку поиска выше
        </p>
      </div>

      {/* ── Разделитель ── */}
      <div
        className="mt-auto mb-0 mx-1 border-t"
        style={{ borderColor: 'rgba(11,43,94,0.08)' }}
        aria-hidden="true"
      />

      {/* ── CTA: перейти в каталог отраслей ── */}
      <a
        href="/horeca"
        className={[
          'mt-4 flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg',
          'text-[10px] font-semibold',
          'border border-[#0B2B5E]/20',
          'bg-white hover:border-[#F26522]/60 hover:text-[#F26522]',
          'transition-all duration-150',
        ].join(' ')}
        style={{ color: '#0B2B5E' }}
      >
        <svg
          width="12" height="12" viewBox="0 0 24 24"
          fill="none" stroke="currentColor" strokeWidth="2"
          strokeLinecap="round" strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
          <polyline points="9 22 9 12 15 12 15 22" />
        </svg>
        Каталог отраслей
      </a>
    </nav>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// TIP: Autocomplete suggestion type
// ═══════════════════════════════════════════════════════════════════════════════

interface Suggestion {
  type: 'brand' | 'company';
  value: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// ГЛАВНЫЙ CLIENT COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

export interface DiscoveryClientProps {
  exponents: Exponent[];
  contextLabel: string;
}

/**
 * `DiscoveryClient` — трёхпанельный Discovery Dashboard.
 *
 * Геометрия (desktop lg+):
 *   • LEFT FILTERS  (w-[200px]): Фильтры отраслей и типов участников (без брендов).
 *                                  Бренды перенесены в строку поиска с autocomplete.
 *   • CENTER AREA   (flex-1):    8-col плотная сетка павильонов (PavilionCard).
 *                                  Sticky-шапка: поиск с autocomplete (бренды + компании).
 *   • RIGHT NEWS    (w-[380px]): «Новинки и события» — NewsFeedPanel.
 */
export default function DiscoveryClient({ exponents, contextLabel }: DiscoveryClientProps) {
  // ── Стейт фильтров ─────────────────────────────────────────────────────────
  const searchParams = useSearchParams();
  const [industryFilter,  setIndustryFilter]  = useState<IndustryGroupFilter>('all');
  const [supplierFilter,  setSupplierFilter]  = useState<SupplierTypeFilter>('all');
  /** Инициализируется из URL-параметра ?search= */
  const [searchQuery,     setSearchQuery]     = useState(() => searchParams.get('search') ?? '');
  const [showSuggestions, setShowSuggestions] = useState(false);

  // ── Refs для управления autocomplete dropdown ──────────────────────────────
  const searchInputRef   = useRef<HTMLInputElement>(null);
  const suggestionsRef   = useRef<HTMLDivElement>(null);

  // ── Уникальные бренды из всех экспонентов (для autocomplete) ───────────────
  const availableBrands = useMemo<string[]>(() => {
    const brands = new Set<string>();
    exponents.forEach((e) => e.brands.forEach((b) => brands.add(b.name)));
    return Array.from(brands).sort();
  }, [exponents]);

  // ── Autocomplete suggestions (бренды + компании) ───────────────────────────
  const suggestions = useMemo<Suggestion[]>(() => {
    const query = searchQuery.trim().toLowerCase();
    if (query.length < 2) return [];

    const brandSuggestions: Suggestion[] = availableBrands
      .filter((b) => b.toLowerCase().includes(query))
      .slice(0, 5)
      .map((b) => ({ type: 'brand' as const, value: b }));

    const companySuggestions: Suggestion[] = exponents
      .filter((e) => e.name.toLowerCase().includes(query))
      .slice(0, 3)
      .map((e) => ({ type: 'company' as const, value: e.name }));

    return [...brandSuggestions, ...companySuggestions];
  }, [searchQuery, availableBrands, exponents]);

  // ── Закрыть autocomplete при клике вне ────────────────────────────────────
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        suggestionsRef.current && !suggestionsRef.current.contains(e.target as Node) &&
        searchInputRef.current && !searchInputRef.current.contains(e.target as Node)
      ) {
        setShowSuggestions(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // ── Фильтрация экспонентов ─────────────────────────────────────────────────
  const filteredExponents = exponents.filter((e) => {
    // 1. Отраслевая группа
    const matchesIndustry = industryFilter === 'all' || e.industry === industryFilter;

    // 2. Тип участника (включая финансовые организации)
    const matchesType =
      supplierFilter === 'all'
        ? true
        : supplierFilter === 'online'
          ? e.isOnline
          : supplierFilter === 'financial_institution'
            ? e.category === 'financial_institution'
            : e.category === supplierFilter;

    // 3. Полнотекстовый поиск (имя компании + бренды)
    const query = searchQuery.trim().toLowerCase();
    const matchesSearch =
      !query ||
      e.name.toLowerCase().includes(query) ||
      e.brands.some(
        (b) =>
          b.name.toLowerCase().includes(query) ||
          (b.country?.toLowerCase().includes(query) ?? false),
      );

    return matchesIndustry && matchesType && matchesSearch;
  });

  // ── Счётчики для фильтра типа участника ───────────────────────────────────
  const supplierCounts: Record<SupplierTypeFilter, number> = {
    all:                   exponents.length,
    online:                exponents.filter((e) => e.isOnline).length,
    manufacturer:          exponents.filter((e) => e.category === 'manufacturer').length,
    distributor:           exponents.filter((e) => e.category === 'distributor').length,
    financial_institution: exponents.filter((e) => e.category === 'financial_institution').length,
  };

  // ── Blueprint-фон центральной зоны ────────────────────────────────────────
  const blueprintBg: React.CSSProperties = {
    backgroundColor: '#ffffff',
    backgroundImage:
      'repeating-linear-gradient(0deg,rgba(11,43,94,0.04) 0px,rgba(11,43,94,0.04) 1px,transparent 1px,transparent 24px),' +
      'repeating-linear-gradient(90deg,rgba(11,43,94,0.04) 0px,rgba(11,43,94,0.04) 1px,transparent 1px,transparent 24px)',
  };

  const brandSuggestions   = suggestions.filter((s) => s.type === 'brand');
  const companySuggestions = suggestions.filter((s) => s.type === 'company');

  return (
    <>
      <div className="mt-16 flex h-[calc(100vh-64px)] overflow-hidden">

        {/* ══════════════════════════════════════════════════════════════════════
            LEFT SIDEBAR (w-[200px]) — ФИЛЬТРЫ
            Отрасли + Тип участника (включает "Финансовые партнёры")
            Бренды перенесены в строку поиска с autocomplete
            ══════════════════════════════════════════════════════════════════════ */}
        <aside
          className="hidden lg:flex flex-col w-[200px] flex-shrink-0 bg-white overflow-hidden"
          style={{ borderRight: '1px solid rgba(11,43,94,0.08)' }}
          aria-label="Фильтры экспонентов"
        >
          {/* Шапка сайдбара */}
          <div
            className="flex-shrink-0 flex items-center justify-between px-3 pt-4 pb-2"
            style={{ borderBottom: '1px solid rgba(11,43,94,0.06)' }}
          >
            <div className="flex items-center gap-1.5">
              <span
                className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                style={{ backgroundColor: '#0B2B5E' }}
                aria-hidden="true"
              />
              <p
                className="text-[8px] font-black uppercase tracking-widest leading-none"
                style={{ color: '#0B2B5E' }}
              >
                Фильтры
              </p>
            </div>
          </div>

          <LeftFilters
            industryFilter={industryFilter}
            onIndustryChange={setIndustryFilter}
            supplierFilter={supplierFilter}
            onSupplierChange={setSupplierFilter}
            counts={supplierCounts}
          />
        </aside>

        {/* ══════════════════════════════════════════════════════════════════════
            CENTER AREA (flex-1) — 8-КОЛОНОЧНАЯ СЕТКА ПАВИЛЬОНОВ
            ══════════════════════════════════════════════════════════════════════ */}
        <section
          className="flex-1 flex flex-col min-w-0 overflow-hidden"
          style={blueprintBg}
          aria-label={`Витрина экспонентов — ${contextLabel}`}
        >
          {/* ─── Sticky-шапка: заголовок + поиск с autocomplete ──────────── */}
          <div
            className="flex-shrink-0 px-5 pt-4 pb-3 z-20"
            style={{
              backgroundColor: 'rgba(255,255,255,0.95)',
              backdropFilter: 'blur(8px)',
              WebkitBackdropFilter: 'blur(8px)',
              borderBottom: '1px solid rgba(11,43,94,0.08)',
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
                  <p
                    className="text-[8px] font-semibold uppercase tracking-widest leading-none mb-0.5"
                    style={{ color: 'rgba(11,43,94,0.55)' }}
                  >
                    {contextLabel}
                  </p>
                  <h1
                    className="text-sm font-black leading-none"
                    style={{ color: '#0B2B5E' }}
                  >
                    Витрина EXPO 365
                  </h1>
                </div>
              </div>
              <span
                className="text-[10px] font-medium tabular-nums whitespace-nowrap"
                style={{ color: 'rgba(11,43,94,0.55)' }}
              >
                {filteredExponents.length} / {exponents.length} павильонов
              </span>
            </div>

            {/* ── Поиск с autocomplete (бренды + компании) ── */}
            <div className="relative">
              <Search
                className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none z-10"
                size={14}
                strokeWidth={2}
                color="#0B2B5E"
                aria-hidden="true"
              />
              <input
                ref={searchInputRef}
                type="text"
                placeholder="Поиск по экспонентам и брендам..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setShowSuggestions(true);
                }}
                onFocus={() => setShowSuggestions(true)}
                onKeyDown={(e) => {
                  if (e.key === 'Escape') setShowSuggestions(false);
                }}
                className={[
                  'w-full h-8 pl-9 pr-4',
                  'rounded-lg border text-[11px] font-medium',
                  'focus:outline-none transition-colors duration-150',
                ].join(' ')}
                style={{
                  backgroundColor: '#ffffff',
                  border: showSuggestions && suggestions.length > 0
                    ? '1.5px solid #F26522'
                    : '1.5px solid rgba(11,43,94,0.2)',
                  color: '#0B2B5E',
                }}
                aria-label="Поиск по экспонентам и брендам"
                aria-expanded={showSuggestions && suggestions.length > 0}
                aria-autocomplete="list"
                role="combobox"
              />

              {/* ── Autocomplete dropdown ── */}
              {showSuggestions && suggestions.length > 0 && (
                <div
                  ref={suggestionsRef}
                  className="absolute top-full mt-1 left-0 right-0 bg-white rounded-lg shadow-xl z-50 py-1.5 overflow-hidden"
                  style={{
                    border: '1px solid rgba(11,43,94,0.12)',
                    boxShadow: '0 8px 32px rgba(11,43,94,0.14)',
                  }}
                  role="listbox"
                  aria-label="Подсказки поиска"
                >
                  {/* Секция: Бренды */}
                  {brandSuggestions.length > 0 && (
                    <>
                      <div
                        className="px-3 pt-1 pb-0.5 text-[7px] font-black uppercase tracking-widest"
                        style={{ color: 'rgba(11,43,94,0.45)' }}
                      >
                        Бренды
                      </div>
                      {brandSuggestions.map((s) => (
                        <button
                          key={`brand-${s.value}`}
                          type="button"
                          role="option"
                          aria-selected={false}
                          onMouseDown={(e) => {
                            e.preventDefault();
                            setSearchQuery(s.value);
                            setShowSuggestions(false);
                          }}
                          className="flex items-center gap-2.5 w-full text-left px-3 py-1.5 transition-colors duration-100"
                          style={{ outline: 'none' }}
                          onMouseEnter={(e) => {
                            (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'rgba(11,43,94,0.04)';
                          }}
                          onMouseLeave={(e) => {
                            (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'transparent';
                          }}
                        >
                          <span
                            className="inline-flex items-center px-1.5 py-0.5 rounded text-[7px] font-black uppercase tracking-wide leading-none flex-shrink-0"
                            style={{ backgroundColor: 'rgba(242,101,34,0.10)', color: '#F26522' }}
                          >
                            Бренд
                          </span>
                          <span
                            className="text-[11px] font-semibold truncate"
                            style={{ color: '#0B2B5E' }}
                          >
                            {s.value}
                          </span>
                        </button>
                      ))}
                    </>
                  )}

                  {/* Секция: Компании */}
                  {companySuggestions.length > 0 && (
                    <>
                      <div
                        className={[
                          'px-3 pt-1 pb-0.5 text-[7px] font-black uppercase tracking-widest',
                          brandSuggestions.length > 0 ? 'mt-1 border-t' : '',
                        ].join(' ')}
                        style={{
                          color: 'rgba(11,43,94,0.45)',
                          borderColor: 'rgba(11,43,94,0.07)',
                        }}
                      >
                        Компании
                      </div>
                      {companySuggestions.map((s) => (
                        <button
                          key={`company-${s.value}`}
                          type="button"
                          role="option"
                          aria-selected={false}
                          onMouseDown={(e) => {
                            e.preventDefault();
                            setSearchQuery(s.value);
                            setShowSuggestions(false);
                          }}
                          className="flex items-center gap-2.5 w-full text-left px-3 py-1.5 transition-colors duration-100"
                          style={{ outline: 'none' }}
                          onMouseEnter={(e) => {
                            (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'rgba(11,43,94,0.04)';
                          }}
                          onMouseLeave={(e) => {
                            (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'transparent';
                          }}
                        >
                          <span
                            className="inline-flex items-center px-1.5 py-0.5 rounded text-[7px] font-black uppercase tracking-wide leading-none flex-shrink-0"
                            style={{ backgroundColor: 'rgba(11,43,94,0.08)', color: '#0B2B5E' }}
                          >
                            Компания
                          </span>
                          <span
                            className="text-[11px] font-semibold truncate"
                            style={{ color: '#0B2B5E' }}
                          >
                            {s.value}
                          </span>
                        </button>
                      ))}
                    </>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* ─── Прокручиваемая 8-колоночная сетка павильонов ───────────────── */}
          <div className="flex-1 overflow-y-auto px-4 py-4" style={{ scrollbarWidth: 'thin' }}>
            {filteredExponents.length > 0 ? (
              /*
               * 8-КОЛОНОЧНАЯ СЕТКА:
               *   grid-cols-4    — мобильный fallback
               *   sm:grid-cols-8 — строго 8 колонок на десктопе
               * Каждая PavilionCard: col-span-1 sm:col-span-2 → 4 в строке.
               */
              <div
                className="grid grid-cols-4 sm:grid-cols-8 gap-3 auto-rows-fr"
                aria-label="Сетка павильонов"
              >
                {filteredExponents.map((exponent) => (
                  <PavilionCard
                    key={exponent.id}
                    exponent={exponent}
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
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="24" height="24"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="#0B2B5E"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <circle cx="11" cy="11" r="8" />
                    <path d="m21 21-4.35-4.35" />
                  </svg>
                </div>
                <p
                  className="font-bold text-sm"
                  style={{ color: '#0B2B5E' }}
                >
                  Павильоны не найдены
                </p>
                <p
                  className="text-xs mt-1 font-medium"
                  style={{ color: 'rgba(11,43,94,0.55)' }}
                >
                  Измените фильтры или поисковый запрос
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setSupplierFilter('all');
                    setIndustryFilter('all');
                    setSearchQuery('');
                    setShowSuggestions(false);
                  }}
                  className="mt-4 px-4 py-2 rounded-lg text-xs font-semibold text-white transition-all duration-150 hover:shadow-md"
                  style={{ backgroundColor: '#F26522' }}
                >
                  Сбросить фильтры
                </button>
              </div>
            )}
          </div>
        </section>

        {/* ══════════════════════════════════════════════════════════════════════
            RIGHT SIDEBAR (w-[380px]) — НОВИНКИ И СОБЫТИЯ
            ══════════════════════════════════════════════════════════════════════ */}
        <aside
          className="hidden lg:flex flex-col w-[380px] flex-shrink-0 overflow-hidden"
          style={{ borderLeft: '1px solid rgba(11,43,94,0.10)' }}
          aria-label="Новинки и события HoReCa"
        >
          <NewsFeedPanel variant="sidebar" className="h-full" />
        </aside>

      </div>
    </>
  );
}
