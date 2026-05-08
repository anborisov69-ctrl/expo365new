'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import NewsFeedPanel from '@/components/NewsFeedPanel';

// ═══════════════════════════════════════════════════════════════════════════════
// ТИПЫ — ЭКСПОНЕНТЫ (Pavilion cards)
// ═══════════════════════════════════════════════════════════════════════════════

export type ExponentCategory = 'manufacturer' | 'distributor';

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
}

// ═══════════════════════════════════════════════════════════════════════════════
// ТИПЫ — ФИЛЬТРЫ
// ═══════════════════════════════════════════════════════════════════════════════

/** Фильтр-группа отраслей (левый сайдбар) */
export type IndustryGroupFilter = 'all' | 'beverages' | 'food' | 'equipment' | 'services';

/** Фильтр поставщиков (левый сайдбар) */
export type SupplierTypeFilter = 'all' | 'online' | 'manufacturer' | 'distributor';

// ═══════════════════════════════════════════════════════════════════════════════
// ДАННЫЕ — ФИЛЬТРЫ
// ═══════════════════════════════════════════════════════════════════════════════

const INDUSTRY_GROUP_FILTERS: { id: IndustryGroupFilter; label: string; emoji: string }[] = [
  { id: 'all',       label: 'Все отрасли',  emoji: '🌐' },
  { id: 'beverages', label: 'Напитки',      emoji: '☕' },
  { id: 'food',      label: 'Продукты',     emoji: '🥩' },
  { id: 'equipment', label: 'Оборудование', emoji: '⚙️' },
  { id: 'services',  label: 'Услуги',       emoji: '✨' },
];

const SUPPLIER_TYPE_FILTERS: { id: SupplierTypeFilter; label: string; withDot?: boolean }[] = [
  { id: 'all',          label: 'Все' },
  { id: 'online',       label: 'Онлайн',          withDot: true },
  { id: 'manufacturer', label: 'Производители' },
  { id: 'distributor',  label: 'Дистрибьюторы' },
];

// ═══════════════════════════════════════════════════════════════════════════════
// ДАННЫЕ — ПОДСКАЗКИ ПОИСКА (Search Autocomplete Suggestions)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Статический список подсказок для autocomplete.
 * Составлен из трёх источников:
 *   1. Названия компаний-экспонентов
 *   2. Названия брендов, представленных на выставке
 *   3. Товарные категории HoReCa-отрасли
 *
 * TODO: при подключении Supabase — генерировать динамически из БД.
 */
const SEARCH_SUGGESTIONS: readonly string[] = [
  // ── Компании ─────────────────────────────────────────────────────────────
  'Espresso Italia',
  'Юлиус Майнл',
  'Франко',
  'Алеф Трейд',
  'Монтана Кофе',
  'Спешиалти Гарден',
  'Кофе-Брейк',
  'Бариста Про',
  'RATIONAL Russia',
  'ПроКухня',
  // ── Бренды ───────────────────────────────────────────────────────────────
  'Rancilio',
  'La Marzocco',
  'Anfim',
  'Julius Meinl',
  'Tasty Coffee',
  'Lebo',
  'Gourmix',
  'Dalla Corte',
  'Nuova Simonelli',
  'WBC',
  'Montana Coffee',
  'Cimbali',
  'Baratza',
  'AeroPress',
  'Acaia',
  'Jura',
  'Saeco',
  'Marco',
  'Victoria Arduino',
  'Mahlkoenig',
  'Rational',
  'Electrolux',
  'Meiko',
  'Convotherm',
  'Alto-Shaam',
  'Unox',
  'Ecolab',
  'Winterhalter',
  'Parmalat',
  // ── Товарные категории ────────────────────────────────────────────────────
  'Кофе',
  'Чай',
  'Шоколад',
  'Молоко',
  'Кофемашины',
  'Кофемолки',
  'Обжарка',
  'Капсульный кофе',
  'Зерновой кофе',
  'Молотый кофе',
  'Посуда',
  'Инвентарь',
  'Оборудование',
  'Пароконвектоматы',
  'Пищевое оборудование',
  'Моечное оборудование',
  'Уборочное оборудование',
  'Барное оборудование',
  'Холодильное оборудование',
  'Напитки',
  'Продукты',
  'Услуги',
  'Автоматизация',
  'HoReCa',
];

// ═══════════════════════════════════════════════════════════════════════════════
// КОМПОНЕНТ — ПОДСВЕТКА СОВПАДЕНИЙ (HighlightMatch)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Рендерит строку `text`, подсвечивая фрагмент, совпадающий с `query`.
 * Совпадение обёртывается в `<strong>` с оранжевым цветом (#F26522).
 *
 * @example
 * <HighlightMatch text="Кофемашины" query="коф" />
 * // → <span>...<strong style="color:#F26522">Коф</strong>емашины</span>
 */
function HighlightMatch({ text, query }: { text: string; query: string }) {
  if (!query) return <span>{text}</span>;

  const idx = text.toLowerCase().indexOf(query.toLowerCase());
  if (idx === -1) return <span>{text}</span>;

  return (
    <span>
      {text.slice(0, idx)}
      <strong style={{ color: '#F26522', fontWeight: 800 }}>
        {text.slice(idx, idx + query.length)}
      </strong>
      {text.slice(idx + query.length)}
    </span>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// УТИЛИТЫ
// ═══════════════════════════════════════════════════════════════════════════════

/** Возвращает 1–2 инициала из названия компании */
function getInitials(name: string): string {
  const words = name.trim().split(/\s+/);
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (words[0].charAt(0) + words[1].charAt(0)).toUpperCase();
}

// ═══════════════════════════════════════════════════════════════════════════════
// КОМПОНЕНТ — КАРТОЧКА ПАВИЛЬОНА (PavilionCard)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Белая квадратная карточка экспонента (павильона выставки).
 *
 * Визуальная структура:
 *   • Верхняя зона (50%): главный логотип компании ИЛИ инициалы.
 *                          Оранжевая полоска сверху при hover.
 *                          Бейдж «ONLINE» (зелёный) если isOnline.
 *   • Нижняя зона (50%): название компании + бейдж категории.
 *                          Мини-логотипы брендов с тегами стран.
 */
interface PavilionCardProps {
  exponent: Exponent;
  onClick: (slug: string) => void;
}

function PavilionCard({ exponent, onClick }: PavilionCardProps) {
  const categoryLabel = exponent.category === 'manufacturer' ? 'ПРОИЗВ.' : 'ДИСТРИБ.';
  const categoryColor = exponent.category === 'manufacturer' ? '#0B2B5E' : '#7c3aed';

  return (
    <article
      role="button"
      tabIndex={0}
      aria-label={`Павильон: ${exponent.name}`}
      onClick={() => onClick(exponent.slug ?? exponent.id)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') onClick(exponent.slug ?? exponent.id);
      }}
      className={[
        'group relative aspect-square flex flex-col overflow-hidden',
        'col-span-1 sm:col-span-2',
        'bg-white border border-[#0B2B5E]/10 rounded-xl',
        'cursor-pointer select-none',
        'transition-all duration-200',
        'hover:border-[#F26522]/60 hover:shadow-[0_8px_32px_rgba(242,101,34,0.14)]',
        'focus:outline-none focus-visible:ring-2 focus-visible:ring-[#F26522]/50',
      ].join(' ')}
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
        {/* Имя компании + бейдж категории */}
        <div className="flex items-start justify-between gap-1 mb-1.5">
          <p
            className="text-[9px] font-black uppercase tracking-wide leading-tight line-clamp-2 flex-1"
            style={{ color: '#0B2B5E' }}
          >
            {exponent.name}
          </p>
          <span
            className="inline-flex items-center px-1 py-0.5 rounded text-[7px] font-black tracking-wide leading-none uppercase select-none flex-shrink-0"
            style={{ backgroundColor: `${categoryColor}18`, color: categoryColor }}
          >
            {categoryLabel}
          </span>
        </div>

        {/* Бренды с тегами стран */}
        <div className="flex flex-col gap-0.5 flex-1 min-h-0 overflow-hidden">
          {exponent.brands.slice(0, 3).map((brand) => (
            <div
              key={brand.name}
              className="flex items-center gap-1.5 min-w-0"
            >
              {/* Mini-логотип бренда */}
              <div
                className="w-4 h-4 rounded-md border border-[#0B2B5E]/10 bg-white flex items-center justify-center flex-shrink-0 overflow-hidden"
              >
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
                  <span className="text-[6px] font-bold text-slate-500 leading-none">
                    {brand.name.charAt(0)}
                  </span>
                )}
              </div>

              {/* Название бренда */}
              <span className="text-[8px] text-slate-600 font-medium truncate flex-1 min-w-0 leading-none">
                {brand.name}
              </span>

              {/* Тег страны */}
              {brand.country && (
                <span
                  className="inline-flex items-center px-1 py-0.5 rounded text-[6px] font-semibold leading-none whitespace-nowrap flex-shrink-0"
                  style={{
                    backgroundColor: 'rgba(11,43,94,0.06)',
                    color: '#0B2B5E',
                  }}
                >
                  {brand.country}
                </span>
              )}
            </div>
          ))}

          {/* +N брендов */}
          {exponent.brands.length > 3 && (
            <p className="text-[7px] font-medium text-slate-400 leading-none mt-0.5">
              +{exponent.brands.length - 3} бренда
            </p>
          )}
        </div>
      </div>
    </article>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// КОМПОНЕНТ — ЛЕВЫЙ САЙДБАР: ФИЛЬТРЫ
// ═══════════════════════════════════════════════════════════════════════════════

interface LeftFiltersProps {
  industryFilter: IndustryGroupFilter;
  onIndustryChange: (v: IndustryGroupFilter) => void;
  supplierFilter: SupplierTypeFilter;
  onSupplierChange: (v: SupplierTypeFilter) => void;
  counts: Record<SupplierTypeFilter, number>;
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
                    : 'bg-white/70 text-slate-500 border-slate-200 hover:border-[#0B2B5E]/40 hover:text-[#0B2B5E]',
                ].join(' ')}
              >
                <span className="text-xs leading-none flex-shrink-0" aria-hidden="true">
                  {f.emoji}
                </span>
                <span className="truncate">{f.label}</span>
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

      {/* ── Тип поставщика ── */}
      <div>
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
                    ? 'bg-white text-[#0B2B5E] border-[#0B2B5E] shadow-sm'
                    : 'bg-white/70 text-slate-500 border-slate-200 hover:border-[#0B2B5E]/40 hover:text-[#0B2B5E]',
                ].join(' ')}
              >
                <span className="flex items-center gap-2 min-w-0">
                  {f.withDot && (
                    <span
                      className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                      style={{ backgroundColor: '#22c55e' }}
                      aria-hidden="true"
                    />
                  )}
                  <span className="truncate">{f.label}</span>
                </span>
                <span
                  className={[
                    'inline-flex items-center justify-center min-w-[18px] h-4 px-1 rounded-full text-[8px] font-bold leading-none flex-shrink-0',
                    isActive ? 'bg-[#F26522] text-white' : 'bg-slate-100 text-slate-500',
                  ].join(' ')}
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

      {/* ── Разделитель ── */}
      <div
        className="mt-5 mx-1 border-t"
        style={{ borderColor: 'rgba(11,43,94,0.08)' }}
        aria-hidden="true"
      />

      {/* ── CTA: перейти в каталог отраслей ── */}
      <a
        href="/horeca"
        className={[
          'mt-4 flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg',
          'text-[10px] font-semibold',
          'border border-[#0B2B5E]/20 text-[#0B2B5E]',
          'bg-white hover:border-[#F26522]/60 hover:text-[#F26522]',
          'transition-all duration-150',
        ].join(' ')}
      >
        <span aria-hidden="true">🏭</span>
        Каталог отраслей
      </a>
    </nav>
  );
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
 *   • LEFT FILTERS  (w-[200px]): Фильтры отраслей и типов участников.
 *                                  Sticky, прокручиваемый.
 *   • CENTER AREA   (flex-1):    8-col плотная сетка павильонов (PavilionCard).
 *                                  Белые карточки: логотип, названия брендов, теги стран.
 *                                  Sticky-шапка с заголовком и счётчиком.
 *   • RIGHT NEWS    (w-[380px]): «Новинки и события» — NewsFeedPanel, тёмный bg #0B2B5E.
 *
 * Геометрия (mobile < lg):
 *   • LEFT и RIGHT сайдбары скрыты.
 *   • CENTER занимает всю ширину.
 */
export default function DiscoveryClient({ exponents, contextLabel }: DiscoveryClientProps) {
  const router = useRouter();

  // ── Стейт фильтров ─────────────────────────────────────────────────────────
  const [industryFilter, setIndustryFilter] = useState<IndustryGroupFilter>('all');
  const [supplierFilter, setSupplierFilter] = useState<SupplierTypeFilter>('all');
  const [searchQuery,    setSearchQuery]    = useState('');

  // ── Стейт autocomplete ─────────────────────────────────────────────────────
  /** Список отфильтрованных подсказок (max 8) */
  const [suggestions,     setSuggestions]     = useState<string[]>([]);
  /** Индекс активной подсказки при навигации клавишами (-1 = нет активной) */
  const [activeIdx,       setActiveIdx]       = useState(-1);
  /** Видим ли дропдаун */
  const [showDropdown,    setShowDropdown]    = useState(false);

  /** Ref на контейнер инпут+дропдаун — для click-outside */
  const searchContainerRef = useRef<HTMLDivElement>(null);
  /** Ref на инпут — для программного фокуса после выбора */
  const inputRef = useRef<HTMLInputElement>(null);

  // ── Фильтрация экспонентов ─────────────────────────────────────────────────
  const filteredExponents = exponents.filter((e) => {
    // Фильтр по отраслевой группе (левый сайдбар — Отрасли)
    const matchesIndustry =
      industryFilter === 'all' || e.industry === industryFilter;

    // Фильтр по типу поставщика (левый сайдбар — Тип участника)
    const matchesType =
      supplierFilter === 'all'
        ? true
        : supplierFilter === 'online'
          ? e.isOnline
          : e.category === supplierFilter;

    // Поиск по имени компании и брендам
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

  // ── Счётчики для фильтра типа поставщика ──────────────────────────────────
  const supplierCounts: Record<SupplierTypeFilter, number> = {
    all:          exponents.length,
    online:       exponents.filter((e) => e.isOnline).length,
    manufacturer: exponents.filter((e) => e.category === 'manufacturer').length,
    distributor:  exponents.filter((e) => e.category === 'distributor').length,
  };

  // ── Фильтрация подсказок ───────────────────────────────────────────────────
  const computeSuggestions = useCallback((query: string): string[] => {
    const q = query.trim().toLowerCase();
    if (q.length < 2) return [];
    return SEARCH_SUGGESTIONS
      .filter((s) => s.toLowerCase().includes(q))
      .slice(0, 8);
  }, []);

  // ── Click-outside: закрываем дропдаун ─────────────────────────────────────
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        searchContainerRef.current &&
        !searchContainerRef.current.contains(e.target as Node)
      ) {
        setShowDropdown(false);
        setActiveIdx(-1);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // ── Обработчик изменения инпута ────────────────────────────────────────────
  const handleSearchChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value;
      setSearchQuery(value);
      setActiveIdx(-1);
      const computed = computeSuggestions(value);
      setSuggestions(computed);
      setShowDropdown(computed.length > 0);
    },
    [computeSuggestions],
  );

  // ── Клик по подсказке ──────────────────────────────────────────────────────
  const handleSuggestionClick = useCallback((suggestion: string) => {
    setSearchQuery(suggestion);
    setSuggestions([]);
    setShowDropdown(false);
    setActiveIdx(-1);
    // Возвращаем фокус на инпут
    requestAnimationFrame(() => inputRef.current?.focus());
  }, []);

  // ── Keyboard navigation ────────────────────────────────────────────────────
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (!showDropdown || suggestions.length === 0) return;

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setActiveIdx((prev) => (prev < suggestions.length - 1 ? prev + 1 : 0));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setActiveIdx((prev) => (prev > 0 ? prev - 1 : suggestions.length - 1));
      } else if (e.key === 'Enter') {
        if (activeIdx >= 0 && activeIdx < suggestions.length) {
          e.preventDefault();
          handleSuggestionClick(suggestions[activeIdx]);
        }
      } else if (e.key === 'Escape') {
        setShowDropdown(false);
        setActiveIdx(-1);
      }
    },
    [showDropdown, suggestions, activeIdx, handleSuggestionClick],
  );

  // ── Переход на страницу экспонента ────────────────────────────────────────
  const handlePavilionClick = (slug: string) => {
    router.push(`/horeca/exhibitors/${slug}`);
  };

  // ── Blueprint-фон центральной зоны ────────────────────────────────────────
  const blueprintBg: React.CSSProperties = {
    backgroundColor: '#ffffff',
    backgroundImage:
      'repeating-linear-gradient(0deg,rgba(11,43,94,0.04) 0px,rgba(11,43,94,0.04) 1px,transparent 1px,transparent 24px),' +
      'repeating-linear-gradient(90deg,rgba(11,43,94,0.04) 0px,rgba(11,43,94,0.04) 1px,transparent 1px,transparent 24px)',
  };

  return (
    <>
      {/*
       * Корневой контейнер трёх-колоночного дашборда:
       *   mt-16               — отступ под фиксированный Header (h-16 = 64px)
       *   h-[calc(100vh-64px)]— заполняет остаток viewport
       *   overflow-hidden     — скролл управляется внутри каждой панели
       */}
      <div className="mt-16 flex h-[calc(100vh-64px)] overflow-hidden">

        {/* ══════════════════════════════════════════════════════════════════════
            LEFT SIDEBAR (w-[200px]) — ФИЛЬТРЫ КАТЕГОРИЙ И ТИПОВ
            Скрыт на мобиле (lg+). Тонкая правая граница.
            ══════════════════════════════════════════════════════════════════════ */}
        <aside
          className="hidden lg:flex flex-col w-[200px] flex-shrink-0 bg-white overflow-hidden"
          style={{ borderRight: '1px solid rgba(11,43,94,0.08)' }}
          aria-label="Фильтры экспонентов"
        >
          {/* Шапка левого сайдбара */}
          <div
            className="flex-shrink-0 px-3 pt-4 pb-2"
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
            Blueprint bg. Sticky-шапка с поиском. PavilionCard × N.
            ══════════════════════════════════════════════════════════════════════ */}
        <section
          className="flex-1 flex flex-col min-w-0 overflow-hidden"
          style={blueprintBg}
          aria-label={`Витрина экспонентов — ${contextLabel}`}
        >
          {/* ─── Sticky-шапка: заголовок + поиск + счётчик ──────────────────── */}
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
                  <p className="text-[8px] font-semibold uppercase tracking-widest text-slate-400 leading-none mb-0.5">
                    {contextLabel}
                  </p>
                  <h1 className="text-sm font-black leading-none" style={{ color: '#0B2B5E' }}>
                    Витрина EXPO 365
                  </h1>
                </div>
              </div>
              <span className="text-[10px] text-slate-400 font-medium tabular-nums">
                {filteredExponents.length} / {exponents.length} павильонов
              </span>
            </div>

            {/* Строка поиска + Autocomplete Dropdown */}
            <div ref={searchContainerRef} className="relative">
              {/* Обёртка инпута */}
              <div className="relative flex items-center">
                <svg
                  className="absolute left-3 pointer-events-none flex-shrink-0"
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#94a3b8"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <circle cx="11" cy="11" r="8" />
                  <path d="m21 21-4.35-4.35" />
                </svg>
                <input
                  ref={inputRef}
                  type="search"
                  role="combobox"
                  aria-autocomplete="list"
                  aria-expanded={showDropdown}
                  aria-controls="search-suggestions-list"
                  aria-activedescendant={
                    activeIdx >= 0 ? `suggestion-${activeIdx}` : undefined
                  }
                  autoComplete="off"
                  placeholder="Поиск по компании, бренду, категории..."
                  value={searchQuery}
                  onChange={handleSearchChange}
                  onKeyDown={handleKeyDown}
                  onFocus={() => {
                    const computed = computeSuggestions(searchQuery);
                    setSuggestions(computed);
                    setShowDropdown(computed.length > 0);
                  }}
                  className={[
                    'w-full h-8 pl-8 pr-8',
                    'bg-white border border-[#0B2B5E]/15 rounded-lg',
                    'text-[11px] text-[#0B2B5E] placeholder:text-slate-400',
                    'focus:outline-none focus:border-[#F26522]/60',
                    'transition-colors duration-150',
                  ].join(' ')}
                />
                {/* Кнопка очистки поиска */}
                {searchQuery && (
                  <button
                    type="button"
                    aria-label="Очистить поиск"
                    onClick={() => {
                      setSearchQuery('');
                      setSuggestions([]);
                      setShowDropdown(false);
                      setActiveIdx(-1);
                      requestAnimationFrame(() => inputRef.current?.focus());
                    }}
                    className="absolute right-2.5 flex items-center justify-center w-4 h-4 rounded-full text-slate-400 hover:text-[#F26522] transition-colors duration-150"
                  >
                    <svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor" aria-hidden="true">
                      <path d="M1.41 0 0 1.41 3.59 5 0 8.59 1.41 10 5 6.41 8.59 10 10 8.59 6.41 5 10 1.41 8.59 0 5 3.59z"/>
                    </svg>
                  </button>
                )}
              </div>

              {/* ── Autocomplete Dropdown ─────────────────────────────────── */}
              {showDropdown && suggestions.length > 0 && (
                <ul
                  id="search-suggestions-list"
                  role="listbox"
                  aria-label="Подсказки поиска"
                  className={[
                    'absolute left-0 right-0 top-[calc(100%+4px)]',
                    'bg-white rounded-xl border border-[#0B2B5E]/10',
                    'shadow-[0_8px_32px_rgba(11,43,94,0.12)]',
                    'overflow-hidden',
                    'z-50',
                    'py-1',
                  ].join(' ')}
                >
                  {/* Мета-заголовок дропдауна */}
                  <li
                    className="px-3 pt-1 pb-1.5 flex items-center justify-between"
                    aria-hidden="true"
                  >
                    <span className="text-[8px] font-black uppercase tracking-widest" style={{ color: 'rgba(11,43,94,0.35)' }}>
                      Подсказки
                    </span>
                    <span className="text-[8px] font-semibold tabular-nums" style={{ color: 'rgba(11,43,94,0.3)' }}>
                      {suggestions.length}
                    </span>
                  </li>

                  {/* Разделитель */}
                  <li aria-hidden="true" className="mx-3 mb-1 border-t border-[#0B2B5E]/06" />

                  {/* Список подсказок */}
                  {suggestions.map((suggestion, i) => {
                    const isActive = i === activeIdx;
                    return (
                      <li
                        key={suggestion}
                        id={`suggestion-${i}`}
                        role="option"
                        aria-selected={isActive}
                        onMouseDown={(e) => {
                          // preventDefault предотвращает потерю фокуса инпутом
                          e.preventDefault();
                          handleSuggestionClick(suggestion);
                        }}
                        onMouseEnter={() => setActiveIdx(i)}
                        className={[
                          'flex items-center gap-2.5 mx-1 px-2.5 py-2 rounded-lg',
                          'cursor-pointer select-none',
                          'transition-colors duration-100',
                          isActive
                            ? 'bg-[#F26522]/08'
                            : 'hover:bg-[#0B2B5E]/04',
                        ].join(' ')}
                      >
                        {/* Иконка поиска */}
                        <svg
                          width="11"
                          height="11"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke={isActive ? '#F26522' : '#94a3b8'}
                          strokeWidth="2.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          className="flex-shrink-0 transition-colors duration-100"
                          aria-hidden="true"
                        >
                          <circle cx="11" cy="11" r="8" />
                          <path d="m21 21-4.35-4.35" />
                        </svg>

                        {/* Текст с подсветкой совпадения */}
                        <span
                          className={[
                            'text-[11px] font-medium leading-none flex-1 min-w-0 truncate',
                            'transition-colors duration-100',
                            isActive ? 'text-[#F26522]' : 'text-[#0B2B5E]',
                          ].join(' ')}
                        >
                          <HighlightMatch text={suggestion} query={searchQuery} />
                        </span>

                        {/* Стрелка "применить" при активном */}
                        {isActive && (
                          <svg
                            width="10"
                            height="10"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="#F26522"
                            strokeWidth="2.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            className="flex-shrink-0"
                            aria-hidden="true"
                          >
                            <path d="M5 12h14M12 5l7 7-7 7" />
                          </svg>
                        )}
                      </li>
                    );
                  })}

                  {/* Подсказка по клавиатуре */}
                  <li aria-hidden="true" className="mx-3 mt-1 mb-1.5 pt-1 border-t border-[#0B2B5E]/06">
                    <p className="text-[8px] text-slate-400 font-medium">
                      <kbd className="font-mono bg-slate-100 px-0.5 rounded text-[7px]">↑↓</kbd>
                      {' '}навигация·{' '}
                      <kbd className="font-mono bg-slate-100 px-0.5 rounded text-[7px]">Enter</kbd>
                      {' '}выбрать·{' '}
                      <kbd className="font-mono bg-slate-100 px-0.5 rounded text-[7px]">Esc</kbd>
                      {' '}закрыть
                    </p>
                  </li>
                </ul>
              )}
            </div>
          </div>

          {/* ─── Прокручиваемая 8-колоночная сетка павильонов ───────────────── */}
          <div className="flex-1 overflow-y-auto px-4 py-4" style={{ scrollbarWidth: 'thin' }}>
            {filteredExponents.length > 0 ? (
              /*
               * 8-КОЛОНОЧНАЯ СЕТКА ПАВИЛЬОНОВ:
               *   grid-cols-4    — мобильные (< sm): 4 в строке
               *   sm:grid-cols-8 — десктоп: строго 8 колонок
               * Каждая карточка: col-span-1 | sm:col-span-2 → 4 карточки в строке.
               */
              <div
                className="grid grid-cols-4 sm:grid-cols-8 gap-3 auto-rows-fr"
                aria-label="Сетка павильонов"
              >
                {filteredExponents.map((exponent) => (
                  <PavilionCard
                    key={exponent.id}
                    exponent={exponent}
                    onClick={handlePavilionClick}
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
                    width="24"
                    height="24"
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
                <p className="font-bold text-sm" style={{ color: '#0B2B5E' }}>
                  Павильоны не найдены
                </p>
                <p className="text-slate-400 text-xs mt-1">
                  Измените фильтры или поисковый запрос
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setSupplierFilter('all');
                    setIndustryFilter('all');
                    setSearchQuery('');
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
            Видна на lg+. Темный фон #0B2B5E, отраслевые фильтры.
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
