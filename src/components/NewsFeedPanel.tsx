'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  NEWS_ITEMS,
  type IndustryTag,
  type PromoType,
  type NewsItem,
} from '@/constants/newsData';

// Re-export для обратной совместимости с внешними импортами
export type { IndustryTag, PromoType, NewsItem };
export { NEWS_ITEMS };

// ═══════════════════════════════════════════════════════════════════════════════
// КОНФИГУРАЦИЯ ЦВЕТОВ ДЛЯ ТИПОВ ПРЕДЛОЖЕНИЙ
// Единственный источник истины: используется в фильтре-баре И в бейджах карточек.
// ═══════════════════════════════════════════════════════════════════════════════

const PROMO_CONFIG: Record<
  Exclude<PromoType, 'all'>,
  { label: string; badgeLabel: string; color: string; activeBg: string; glow: string }
> = {
  new: {
    label:      'Новинки',
    badgeLabel: 'NEW',
    color:      '#F26522',
    activeBg:   'rgba(242,101,34,0.18)',
    glow:       'rgba(242,101,34,0.35)',
  },
  sale: {
    label:      'Распродажи',
    badgeLabel: 'SALE',
    color:      '#DC2626',
    activeBg:   'rgba(220,38,38,0.18)',
    glow:       'rgba(220,38,38,0.35)',
  },
  special: {
    label:      'Спецпредложения',
    badgeLabel: 'PROMO',
    color:      '#2563EB',
    activeBg:   'rgba(37,99,235,0.18)',
    glow:       'rgba(37,99,235,0.35)',
  },
};

// ═══════════════════════════════════════════════════════════════════════════════
// ФИЛЬТРЫ РЯДА 1 — ВИД ПРОДУКЦИИ (IndustryTag)
// ═══════════════════════════════════════════════════════════════════════════════

const INDUSTRY_FILTERS: { id: IndustryTag; label: string; icon: string }[] = [
  { id: 'all',             label: 'Все',           icon: '' },
  { id: 'coffee',          label: 'Кофе',          icon: '' },
  { id: 'tea',             label: 'Чай',           icon: '' },
  { id: 'equipment',       label: 'Оборудование',  icon: '' },
  { id: 'dishes',          label: 'Посуда',        icon: '' },
  { id: 'textile',         label: 'Текстиль',      icon: '' },
  { id: 'food',            label: 'Продукты',      icon: '' },
  { id: 'cold-beverages',  label: 'Хол. напитки',  icon: '' },
];

// ═══════════════════════════════════════════════════════════════════════════════
// ФИЛЬТРЫ РЯДА 2 — ТИП ПРЕДЛОЖЕНИЯ (PromoType)
// ═══════════════════════════════════════════════════════════════════════════════

const PROMO_FILTERS: { id: PromoType; label: string; color: string; activeBg: string }[] = [
  { id: 'all',     label: 'Все типы',             color: 'rgba(255,255,255,0.6)',  activeBg: 'rgba(255,255,255,0.15)' },
  { id: 'new',     label: PROMO_CONFIG.new.label,     color: PROMO_CONFIG.new.color,     activeBg: PROMO_CONFIG.new.activeBg },
  { id: 'sale',    label: PROMO_CONFIG.sale.label,    color: PROMO_CONFIG.sale.color,    activeBg: PROMO_CONFIG.sale.activeBg },
  { id: 'special', label: PROMO_CONFIG.special.label, color: PROMO_CONFIG.special.color, activeBg: PROMO_CONFIG.special.activeBg },
];

// ═══════════════════════════════════════════════════════════════════════════════
// КОМПОНЕНТ — КАРТОЧКА НОВОСТИ
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Квадратная карточка новости с двухтэговой системой.
 *
 * Визуальная структура:
 *   • Тёмный фон (rgba(255,255,255,0.06) на #0B2B5E).
 *   • Left-accent бордер 3px — цвет соответствует promoType.
 *   • Верхняя зона (40%): mini-logo + цветной бейдж promoType.
 *   • Нижняя зона (60%): имя экспонента, заголовок, таймер.
 */
function NewsCardSquare({ item }: { item: NewsItem }) {
  const router = useRouter();

  const handleNavigate = () => {
    // Если к новости привязан экспонент — переходим на его витрину
    if (item.exhibitorSlug) {
      router.push(`/horeca/exhibitors/${item.exhibitorSlug}`);
    } else {
      router.push(`/horeca/discovery?exhibitor=${item.exhibitorId}`);
    }
  };

  const promoConf = PROMO_CONFIG[item.promoType];

  return (
    <article
      role="button"
      tabIndex={0}
      aria-label={item.title}
      onClick={handleNavigate}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') handleNavigate();
      }}
      className={[
        'group relative aspect-square flex flex-col overflow-hidden rounded-lg',
        'border border-white/10 cursor-pointer',
        'transition-all duration-200',
        'hover:border-white/25 hover:shadow-[0_4px_20px_rgba(0,0,0,0.30)]',
        'focus:outline-none focus-visible:ring-2 focus-visible:ring-white/30',
      ].join(' ')}
      style={{ backgroundColor: 'rgba(255,255,255,0.06)' }}
    >
      {/* Accent-бордер слева (3px) — цвет promoType */}
      <div
        className="absolute inset-y-0 left-0 w-[3px] rounded-l-lg"
        style={{ backgroundColor: promoConf.color }}
        aria-hidden="true"
      />

      {/* Верхняя медиа-зона (40% высоты) */}
      <div
        className="relative flex-shrink-0 flex items-center justify-center overflow-hidden"
        style={{
          height:          '40%',
          backgroundColor: 'rgba(255,255,255,0.04)',
          borderBottom:    '1px solid rgba(255,255,255,0.08)',
        }}
      >
        {/* Mini-лого экспонента или превью-изображение */}
        <div className="w-8 h-8 rounded-lg border border-white/20 bg-white/10 overflow-hidden flex items-center justify-center flex-shrink-0">
          {(item.image ?? item.exhibitorLogo) ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={item.image ?? item.exhibitorLogo ?? ''}
              alt={`Лого ${item.exhibitorName}`}
              width={32}
              height={32}
              loading="lazy"
              className="w-full h-full object-contain"
              onError={(e) => {
                e.currentTarget.style.display = 'none';
              }}
            />
          ) : (
            <span className="text-[10px] font-bold text-white/80 leading-none">
              {item.exhibitorName.charAt(0).toUpperCase()}
            </span>
          )}
        </div>

        {/* Бейдж NEW / SALE / PROMO — цвет из PROMO_CONFIG */}
        <span
          className="absolute top-1.5 right-1.5 inline-flex items-center px-1.5 py-0.5 rounded-md text-[8px] font-black tracking-wider leading-none uppercase select-none"
          style={{ backgroundColor: promoConf.color, color: '#FFFFFF' }}
        >
          {promoConf.badgeLabel}
        </span>
      </div>

      {/* Текстовая зона (60% высоты) */}
      <div className="flex flex-col flex-1 min-h-0 px-2.5 py-2 pl-4">
        {/* Имя экспонента */}
        <p className="text-[9px] font-semibold text-white/55 leading-none mb-1 truncate">
          {item.exhibitorName}
        </p>

        {/* Заголовок */}
        <h3 className="text-[10px] font-bold leading-snug line-clamp-3 flex-1 text-white">
          {item.title}
        </h3>

        {/* Таймер */}
        <div className="flex items-center gap-1 mt-1.5 flex-shrink-0">
          <svg
            width="8"
            height="8"
            viewBox="0 0 24 24"
            fill="none"
            stroke="rgba(255,255,255,0.35)"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <circle cx="12" cy="12" r="10" />
            <polyline points="12 6 12 12 16 14" />
          </svg>
          <span className="text-[9px] font-medium text-white/40 whitespace-nowrap">
            {item.timerLabel}
          </span>
        </div>
      </div>
    </article>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// КОМПОНЕНТ — РЯД 1: ФИЛЬТРЫ ПО ВИДУ ПРОДУКЦИИ (IndustryTag)
// Стиль: компактные теги с иконками
// ═══════════════════════════════════════════════════════════════════════════════

function IndustryFilterBar({
  active,
  onChange,
}: {
  active: IndustryTag;
  onChange: (v: IndustryTag) => void;
}) {
  return (
    <nav aria-label="Фильтр по виду продукции" className="flex flex-wrap gap-1">
      {INDUSTRY_FILTERS.map((f) => {
        const isActive = f.id === active;
        return (
          <button
            key={f.id}
            type="button"
            onClick={() => onChange(f.id)}
            aria-current={isActive ? 'true' : undefined}
            title={f.label}
            className={[
              'inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-semibold whitespace-nowrap',
              'border transition-all duration-150 select-none focus:outline-none',
              'focus-visible:ring-1 focus-visible:ring-white/20',
              isActive
                ? 'bg-white/15 text-white border-white/35'
                : 'bg-transparent text-white/45 border-white/12 hover:text-white/70 hover:border-white/25',
            ].join(' ')}
          >
            <span aria-hidden="true">{f.icon}</span>
            {f.label}
          </button>
        );
      })}
    </nav>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// КОМПОНЕНТ — РЯД 2: ФИЛЬТРЫ ПО ТИПУ ПРЕДЛОЖЕНИЯ (PromoType)
// Стиль: акцентные кнопки с цветовым кодированием
// ═══════════════════════════════════════════════════════════════════════════════

function PromoFilterBar({
  active,
  onChange,
}: {
  active: PromoType;
  onChange: (v: PromoType) => void;
}) {
  return (
    <nav aria-label="Фильтр по типу предложения" className="flex flex-wrap gap-1.5">
      {PROMO_FILTERS.map((f) => {
        const isActive = f.id === active;
        return (
          <button
            key={f.id}
            type="button"
            onClick={() => onChange(f.id)}
            aria-current={isActive ? 'true' : undefined}
            className={[
              'inline-flex items-center px-2.5 py-1 rounded-md text-[10px] font-bold whitespace-nowrap',
              'border transition-all duration-150 select-none focus:outline-none',
              'focus-visible:ring-1',
            ].join(' ')}
            style={
              isActive
                ? {
                    backgroundColor: f.activeBg,
                    color:           f.color,
                    borderColor:     f.color,
                    boxShadow:       `0 0 0 1px ${f.color}`,
                  }
                : {
                    backgroundColor: 'transparent',
                    color:           'rgba(255,255,255,0.45)',
                    borderColor:     'rgba(255,255,255,0.12)',
                  }
            }
          >
            {f.label}
          </button>
        );
      })}
    </nav>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// ГЛАВНЫЙ ЭКСПОРТИРУЕМЫЙ КОМПОНЕНТ
// ═══════════════════════════════════════════════════════════════════════════════

export interface NewsFeedPanelProps {
  /**
   * 'sidebar' — внутри полноэкранной flex-колонки (Discovery дашборд).
   *             Занимает всю доступную высоту, прокрутка внутри.
   * 'sticky'  — sticky-панель в скролируемой странице (Industry Catalog).
   *             Ограничена по высоте через max-h.
   */
  variant?: 'sidebar' | 'sticky';
  /** Дополнительный CSS-класс для внешнего контейнера */
  className?: string;
}

/**
 * `NewsFeedPanel` — «НОВИНКИ И СОБЫТИЯ».
 *
 * Переиспользуемый тёмно-синий (#0B2B5E) блок двухуровневой новостной ленты.
 * Данные поступают из `src/constants/newsData.ts` — единственного источника истины.
 *
 * Используется на двух дашбордах:
 *   1. `/horeca/discovery` (DiscoveryClient) — правый сайдбар, `variant='sidebar'`
 *   2. `/horeca`           (HorecaCatalogPage) — sticky-колонка, `variant='sticky'`
 *
 * Фильтрация (AND-логика):
 *   Ряд 1 (industryTag): Все | Кофе | Чай | Оборудование | Посуда | Текстиль | Продукты | Хол. напитки
 *   Ряд 2 (promoType):   Все типы | Новинки | Распродажи | Спецпредложения
 *
 * Клик по карточке:
 *   Если у новости задан `exhibitorSlug` — переход на витрину экспонента.
 *   Иначе — переход в Discovery с фильтром по exhibitorId.
 */
export default function NewsFeedPanel({
  variant = 'sidebar',
  className = '',
}: NewsFeedPanelProps) {
  // Два независимых фильтра — AND-логика
  const [activeIndustry, setActiveIndustry] = useState<IndustryTag>('all');
  const [activePromo,    setActivePromo]    = useState<PromoType>('all');

  /** AND-фильтрация: оба условия должны выполняться одновременно */
  const filteredNews = NEWS_ITEMS.filter((item) => {
    const industryMatch = activeIndustry === 'all' || item.industryTag === activeIndustry;
    const promoMatch    = activePromo    === 'all' || item.promoType   === activePromo;
    return industryMatch && promoMatch;
  });

  const isSticky = variant === 'sticky';

  return (
    <div
      className={[
        'flex flex-col overflow-hidden',
        isSticky ? 'rounded-xl' : '',
        className,
      ].join(' ')}
      style={{ backgroundColor: '#0B2B5E' }}
    >
      {/* ── Шапка: заголовок + два ряда фильтров ── */}
      <div
        className="flex-shrink-0 px-4 pt-5 pb-3 space-y-2.5"
        style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}
      >
        {/* Заголовок + счётчик */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span
              className="w-2 h-2 rounded-full flex-shrink-0"
              style={{ backgroundColor: '#F26522' }}
              aria-hidden="true"
            />
            <h2 className="text-[10px] font-black uppercase tracking-widest text-white leading-none">
              Новинки и события
            </h2>
          </div>
          <span
            className="inline-flex items-center justify-center min-w-[18px] h-4 px-1 rounded-full text-[8px] font-bold text-white leading-none"
            style={{ backgroundColor: 'rgba(242,101,34,0.80)' }}
            aria-live="polite"
            aria-label={`Найдено: ${filteredNews.length}`}
          >
            {filteredNews.length}
          </span>
        </div>

        {/* ─── РЯД 1: Вид продукции ─── */}
        <div>
          <p className="text-[8px] font-semibold uppercase tracking-widest text-white/30 mb-1.5 leading-none">
            Продукция
          </p>
          <IndustryFilterBar active={activeIndustry} onChange={setActiveIndustry} />
        </div>

        {/* ─── РЯД 2: Тип предложения ─── */}
        <div>
          <p className="text-[8px] font-semibold uppercase tracking-widest text-white/30 mb-1.5 leading-none">
            Тип предложения
          </p>
          <PromoFilterBar active={activePromo} onChange={setActivePromo} />
        </div>
      </div>

      {/* ── Прокручиваемая лента карточек ── */}
      <div
        className={[
          'overflow-y-auto px-3 py-3 space-y-2.5',
          /*
           * sidebar: занимает flex-1 (вся оставшаяся высота колонки).
           * sticky:  ограничена по высоте → не выходит за viewport.
           */
          isSticky ? 'max-h-[calc(100vh-260px)]' : 'flex-1',
        ].join(' ')}
        style={{
          scrollbarWidth: 'thin',
          scrollbarColor: 'rgba(255,255,255,0.12) transparent',
        }}
      >
        {filteredNews.length > 0 ? (
          filteredNews.map((item) => <NewsCardSquare key={item.id} item={item} />)
        ) : (
          /* Пустое состояние */
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center mb-3"
              style={{ backgroundColor: 'rgba(255,255,255,0.06)' }}
            >
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="rgba(255,255,255,0.35)"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
                <line x1="16" y1="13" x2="8" y2="13" />
                <line x1="16" y1="17" x2="8" y2="17" />
              </svg>
            </div>
            <p className="text-xs font-medium text-white/50">Новостей не найдено</p>
            <p className="text-[10px] mt-1 text-white/30">
              {activeIndustry !== 'all' && activePromo !== 'all'
                ? 'Нет совпадений по обоим фильтрам'
                : 'Попробуйте изменить фильтры'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
