'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEcosystem, type EcoProduct } from '@/store/ecosystemStore';
import { usePartnerOffer } from '@/hooks/usePartnerOffer';
import PartnerOfferWidget from '@/components/showroom/PartnerOfferWidget';
import B2BChatModal from '@/components/chat/B2BChatModal';
import type { PartnerOfferComputed, SmartContractParams } from '@/types/partner-offer';

// ═══════════════════════════════════════════════════════════════════════════════
// ТИПЫ — ПРОФИЛЬ ЭКСПОНЕНТА
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Тип позиции каталога.
 * Расширена в соответствии с товарными категориями HoReCa-экспонента.
 */
export type ProductCategory =
  | 'coffee'       // Кофе — зерно, молотый, капсулы, купажи
  | 'tea'          // Чай — листовой, пакетированный, травяной
  | 'equipment'    // Оборудование — машины, кофемолки, печи
  | 'service'      // Сервис и запчасти — ремонт, детали, комплекты
  | 'tableware'    // Посуда — чашки, тарелки, молочники, гастроёмкости
  | 'training'     // Обучение — курсы, мастер-классы, вебинары
  | 'consumables'; // Расходные материалы — фильтры, моющие, таблетки

/** Бейдж новостной карточки: 'new' = NEW (оранжевый), 'sale' = РАСПРОДАЖА (красный) */
export type NewsCardBadge = 'new' | 'sale';

/**
 * Новость / событие экспонента — для гибридной сетки витрины.
 *
 * Дискриминатор `type: 'news'` позволяет union-рендеру
 * в `ExhibitorGridItem` отличать новости от товаров.
 *
 * При подключении Supabase заменяется на fetch из таблицы `exhibitor_news`
 * с RLS-политикой: публичное чтение, запись только для verified_exhibitor.
 */
export interface ExhibitorNewsItem {
  /** UUID новости */
  id: string;
  /** Дискриминатор union-типа */
  type: 'news';
  /** Заголовок */
  title: string;
  /** Краткое описание для превью (2-3 строки) */
  description: string;
  /** Полный текст — рендерится в ArticleModal */
  content: string;
  /**
   * Читаемая категория новости, отображаемая на карточке.
   * Примеры: "Оборудование", "Кофе", "Расходные материалы".
   */
  category: string;
  /** Бейдж: 'new' → оранжевый "NEW", 'sale' → красный "РАСПРОДАЖА" */
  badge: NewsCardBadge;
  /** Опциональный URL превью-изображения */
  mediaUrl?: string;
  /** ISO-дата публикации */
  publishedAt: string;
  /**
   * Ширина ячейки в сетке:
   *   1 → col-span-2 (квадратная 1×1)
   *   2 → col-span-4 (широкая 2×1)
   * По умолчанию: 1.
   */
  span?: 1 | 2;
}

/** Вкладка навигации дашборда — соответствует товарным категориям + Новости + «О компании» */
type DashboardTab =
  | 'all'          // Всё: товары + новости
  | 'coffee'
  | 'tea'
  | 'equipment'
  | 'service'
  | 'tableware'
  | 'training'
  | 'consumables'
  | 'news'         // Только новости экспонента
  | 'about';

/**
 * Единица каталога экспонента.
 * Поле `imageGradient` используется как CSS-градиент для fallback-плейсхолдера
 * вместо реального фото — до подключения Supabase Storage.
 */
export interface ExhibitorProduct {
  /** UUID позиции */
  id: string;
  /** Отображаемое название */
  name: string;
  /** Тип позиции — определяет набор кнопок действия */
  category: ProductCategory;
  /** Базовая цена — строка с валютой (напр. «₽ 48 000») */
  basePrice: string;
  /** URL фото из Supabase Storage (null → показать gradient-плейсхолдер) */
  imageUrl: string | null;
  /** CSS-градиент для плейсхолдера (два цвета или три) */
  imageGradient: string;
  /** Флаг новинки — включает карточку в таб «Новинки» */
  isNew?: boolean;
  /** Краткое описание для модального окна (1-2 строки) */
  shortDescription?: string;
  /**
   * [Partner Logic] Партнёрская цена из EcosystemStore.
   * Отображается ТОЛЬКО байерам, пришедшим по /ref/ooo-test.
   */
  partnerPrice?: string;
  /** [Partner Logic] Товар входит в партнёрскую программу */
  forPartners?: boolean;
}

/**
 * Запись рекомендации в блоке «Экспонент рекомендует».
 * Отображается как круглая иконка в горизонтальном Stories-баре.
 *
 * При подключении Supabase: таблица `exhibitor_recommendations`
 * с RLS-политикой публичного чтения верифицированных записей.
 */
export interface Recommendation {
  /** UUID рекомендуемого партнёра (FK → exhibitor_profiles.id) */
  partnerId: string;
  /** URL-слаг для перехода на дашборд партнёра */
  slug: string;
  /** URL логотипа из Supabase Storage (null → аватар-инициалы) */
  logoUrl: string | null;
  /** Официальное название компании-партнёра */
  name: string;
  /** Краткое обоснование рекомендации (≤ 25 символов, напр. "Официальный сервис") */
  reason: string;
  /** Флаг: партнёр привлечён через реферальную ссылку — показывает иконку цепи */
  isReferral?: boolean;
}

/**
 * Полный профиль экспонента — основной DTO страницы.
 * При переходе на Supabase будет заменён на серверный fetch с RLS-политикой.
 */
export interface ExhibitorProfile {
  /** UUID экспонента */
  id: string;
  /** URL-слаг страницы (уникальный) */
  slug: string;
  /** Официальное название компании */
  name: string;
  /** Логотип (null → аватар-инициалы) */
  logoUrl: string | null;
  /** Признак верификации («Проверенный поставщик») */
  isVerified: boolean;
  /** Bio-текст компании (3-4 строки) */
  bio: string;
  /** Страна присутствия */
  country: string;
  /** Тип участника */
  category: 'manufacturer' | 'distributor';
  /** Каталог позиций */
  products: ExhibitorProduct[];
  /**
   * Новости / события экспонента.
   * Отображаются в гибридной сетке при вкладках «Все» и «Новости».
   * При Supabase — fetch из `exhibitor_news` с RLS.
   */
  news?: ExhibitorNewsItem[];
  /**
   * Агрегированная статистика для шапки.
   * Вычисляется из `products` при подготовке данных на сервере
   * или может передаваться отдельным полем из БД.
   */
  stats: {
    products: number;
    equipment: number;
    news: number;
  };
  /** Дата основания (строка в формате "YYYY") */
  foundedYear?: string;
  /** Регионы поставки */
  regions?: string[];
  /**
   * Партнёры в блоке «Экспонент рекомендует».
   * Порядок отображения соответствует порядку массива.
   */
  recommendations?: Recommendation[];
  /**
   * Контактные данные экспонента — отображаются в нижней панели шапки.
   * При Supabase хранятся как JSONB-поле в `exhibitor_profiles`.
   * Все поля опциональны — рендерится только при наличии значения.
   */
  contacts?: {
    phone?: string;
    email?: string;
    website?: string;
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// UNION-ТИП: ЭЛЕМЕНТ ГИБРИДНОЙ СЕТКИ
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Элемент гибридной сетки экспонента:
 *   - `product` — товар из каталога
 *   - `news`    — новость / событие бренда
 *
 * Дискриминатор `type` используется в рендере для выбора компонента карточки.
 */
type ExhibitorGridItem =
  | { type: 'product'; data: ExhibitorProduct }
  | { type: 'news';    data: ExhibitorNewsItem };

// ═══════════════════════════════════════════════════════════════════════════════
// КОНФИГУРАЦИЯ ТАБОВ
// ═══════════════════════════════════════════════════════════════════════════════

interface TabConfig {
  id: DashboardTab;
  label: string;
}

const DASHBOARD_TABS: TabConfig[] = [
  { id: 'all',         label: 'Все' },
  { id: 'coffee',      label: 'Кофе' },
  { id: 'tea',         label: 'Чай' },
  { id: 'equipment',   label: 'Оборудование' },
  { id: 'service',     label: 'Сервис и запчасти' },
  { id: 'tableware',   label: 'Посуда' },
  { id: 'training',    label: 'Обучение' },
  { id: 'consumables', label: 'Расходные материалы' },
  { id: 'news',        label: 'Новости' },
  { id: 'about',       label: 'О компании' },
];

// ═══════════════════════════════════════════════════════════════════════════════
// УТИЛИТЫ
// ═══════════════════════════════════════════════════════════════════════════════

function getInitials(name: string): string {
  const words = name.trim().split(/\s+/);
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (words[0].charAt(0) + words[1].charAt(0)).toUpperCase();
}

/**
 * Собирает элементы гибридной сетки:
 *   - 'all'  → товары + новости перемешаны: 1 новость каждые `interval` товаров
 *   - 'news' → только новости
 *   - прочие → только товары выбранной категории
 */
function buildExhibitorGrid(
  products: ExhibitorProduct[],
  news: ExhibitorNewsItem[],
  tab: DashboardTab,
  interval = 4,
): ExhibitorGridItem[] {
  if (tab === 'news') {
    return news.map((n) => ({ type: 'news', data: n }));
  }

  const filteredProducts =
    tab === 'all'
      ? products
      : tab === 'about'
      ? []
      : products.filter((p) => p.category === (tab as ProductCategory));

  if (tab !== 'all' || news.length === 0) {
    return filteredProducts.map((p) => ({ type: 'product', data: p }));
  }

  // Перемешиваем товары с новостями
  const result: ExhibitorGridItem[] = [];
  let newsIdx = 0;
  filteredProducts.forEach((product, idx) => {
    if (idx > 0 && idx % interval === 0 && newsIdx < news.length) {
      result.push({ type: 'news', data: news[newsIdx++] });
    }
    result.push({ type: 'product', data: product });
  });
  // Оставшиеся новости — в конец
  while (newsIdx < news.length) {
    result.push({ type: 'news', data: news[newsIdx++] });
  }
  return result;
}

// ═══════════════════════════════════════════════════════════════════════════════
// ВСПОМОГАТЕЛЬНЫЕ КОМПОНЕНТЫ — ШАПКА ПРОФИЛЯ
// ═══════════════════════════════════════════════════════════════════════════════

/** Круглый аватар компании 80px */
function ProfileAvatar({ name, src }: { name: string; src: string | null }) {
  if (src) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt={`Логотип ${name}`}
        width={80}
        height={80}
        className="w-20 h-20 rounded-full object-contain bg-white border-4 border-white shadow-lg ring-2 ring-[#0B2B5E]/20"
      />
    );
  }
  return (
    <div
      aria-hidden="true"
      className="w-20 h-20 rounded-full flex items-center justify-center flex-shrink-0 border-4 border-white shadow-lg ring-2 ring-[#0B2B5E]/20 select-none"
      style={{ backgroundColor: '#0B2B5E' }}
    >
      <span className="text-2xl font-bold leading-none tracking-tight text-white">
        {getInitials(name)}
      </span>
    </div>
  );
}

/** Бейдж «Проверенный поставщик» */
function VerifiedBadge() {
  return (
    <span
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide select-none"
      style={{ backgroundColor: 'rgba(242,101,34,0.12)', color: '#F26522' }}
    >
      <svg width="9" height="9" viewBox="0 0 16 16" fill="none" aria-hidden="true">
        <circle cx="8" cy="8" r="7" fill="#F26522" />
        <path d="M4.5 8l2.5 2.5 4.5-5" stroke="white" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      Проверенный поставщик
    </span>
  );
}

/**
 * Блок статистики шапки — цифра: белая (#FFFFFF) жирная, метка: полупрозрачная.
 * Blueprint 2.0: максимальный контраст чисел на тёмно-синем фоне.
 */
function StatBlock({ value, label }: { value: number; label: string }) {
  return (
    <div className="flex flex-col items-center min-w-[56px]">
      <span className="text-2xl font-bold leading-none text-white" style={{ color: '#FFFFFF' }}>
        {value}
      </span>
      <span className="text-[10px] font-medium mt-0.5 whitespace-nowrap" style={{ color: 'rgba(255,255,255,0.85)' }}>
        {label}
      </span>
    </div>
  );
}

/**
 * Кнопка «+ ПОДПИСАТЬСЯ» — верхний правый угол шапки.
 * Тёмно-синий фон (полупрозрачный), белый текст/иконка, лёгкая граница.
 */
function SubscribeButton() {
  return (
    <button
      type="button"
      className={[
        'self-start flex-shrink-0 inline-flex items-center gap-2',
        'px-5 py-2.5 rounded-xl text-sm font-bold uppercase tracking-wide',
        'transition-all duration-150 active:scale-95 hover:brightness-110',
        'focus:outline-none focus-visible:ring-2 focus-visible:ring-white/50',
        'shadow-lg',
      ].join(' ')}
      style={{
        backgroundColor: '#F26522',
        color: '#FFFFFF',
        border: '1px solid rgba(255,255,255,0.25)',
        boxShadow: '0 4px 16px rgba(242,101,34,0.45)',
      }}
      aria-label="Подписаться на обновления экспонента"
    >
      <svg
        width="13"
        height="13"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.8"
        strokeLinecap="round"
        aria-hidden="true"
      >
        <path d="M12 5v14M5 12h14" />
      </svg>
      Подписаться
    </button>
  );
}

/** Компонент шапки профиля экспонента — Blueprint 2.0 */
function ExhibitorHeader({
  profile,
  onOpenChat,
}: {
  profile: ExhibitorProfile;
  /** Коллбэк кнопки «Чат» — открывает ExpoChatSync */
  onOpenChat?: () => void;
}) {
  return (
    <div
      className="relative overflow-hidden"
      style={{
        background: 'linear-gradient(135deg, #0B2B5E 0%, #1a4080 60%, #0d3570 100%)',
      }}
    >
      {/* Blueprint-сетка-паттерн */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.06]"
        style={{
          backgroundImage:
            'repeating-linear-gradient(0deg,rgba(255,255,255,1) 0px,rgba(255,255,255,1) 1px,transparent 1px,transparent 28px),' +
            'repeating-linear-gradient(90deg,rgba(255,255,255,1) 0px,rgba(255,255,255,1) 1px,transparent 1px,transparent 28px)',
        }}
        aria-hidden="true"
      />

      {/* Декоративный оранжевый акцент сверху */}
      <div className="absolute inset-x-0 top-0 h-1 bg-[#F26522]" aria-hidden="true" />

      <div className="relative z-10 px-6 pt-8 pb-6">
        {/* ── Верхняя строка: аватар + имя + бейдж + кнопка ПОДПИСАТЬСЯ ── */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <ProfileAvatar name={profile.name} src={profile.logoUrl} />

          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-1.5">
              <h1 className="text-xl font-bold text-white leading-tight truncate">
                {profile.name}
              </h1>
              {profile.isVerified && <VerifiedBadge />}
            </div>

            {/* Meta: страна + тип */}
            <div className="flex flex-wrap items-center gap-2 mb-3">
              <span className="text-xs font-medium text-white/60">
                {profile.category === 'manufacturer' ? 'Производитель' : 'Дистрибьютор'}
              </span>
              <span className="text-white/30 text-xs">·</span>
              <span className="text-xs font-medium text-white/60">{profile.country}</span>
              {profile.foundedYear && (
                <>
                  <span className="text-white/30 text-xs">·</span>
                  <span className="text-xs font-medium text-white/60">с {profile.foundedYear}</span>
                </>
              )}
            </div>

            {/* Статистика — числа: белые, жирные (#FFFFFF + font-bold) */}
            <div className="flex items-center gap-5">
              <StatBlock value={profile.stats.products}   label="товаров" />
              <div className="w-px h-8 bg-white/15" aria-hidden="true" />
              <StatBlock value={profile.stats.equipment}  label="оборудования" />
              <div className="w-px h-8 bg-white/15" aria-hidden="true" />
              <StatBlock value={profile.news?.length ?? profile.stats.news} label="новостей" />
            </div>
          </div>

          {/* [+ ПОДПИСАТЬСЯ] — верхний правый угол */}
          <SubscribeButton />
        </div>

        {/* Bio */}
        <p className="mt-4 text-sm leading-relaxed text-white/70 max-w-2xl line-clamp-4">
          {profile.bio}
        </p>

        {/* Города присутствия */}
        {profile.regions && profile.regions.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5 mt-3">
            <span className="text-[10px] font-semibold uppercase tracking-widest text-white/40 mr-1">
              Города присутствия:
            </span>
            {profile.regions.map((region) => (
              <span
                key={region}
                className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium"
                style={{ backgroundColor: 'rgba(255,255,255,0.10)', color: 'rgba(255,255,255,0.70)' }}
              >
                {region}
              </span>
            ))}
          </div>
        )}

        {/* ── КОНТАКТНАЯ ПАНЕЛЬ + КНОПКА ЧАТА ────────────────────────────────────
         *
         * Отображается только при наличии хотя бы одного контакта ИЛИ коллбэка чата.
         * White-текст, opacity 80% для спокойного восприятия, hover → opacity 100%.
         * Кнопка «Чат» — #F26522, rounded-2xl, белый текст.
         */}
        {(profile.contacts?.phone || profile.contacts?.email || profile.contacts?.website || onOpenChat) && (
          <div
            className="flex flex-wrap items-center gap-x-6 gap-y-2 mt-4 pt-4"
            style={{ borderTop: '1px solid rgba(255,255,255,0.12)' }}
          >
            {/* Телефон */}
            {profile.contacts?.phone && (
              <a
                href={`tel:${profile.contacts.phone}`}
                className="flex items-center gap-2 text-sm text-white/75 hover:text-white transition-colors duration-150 rounded-xl"
                aria-label={`Позвонить: ${profile.contacts.phone}`}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 13.34a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.6 2.44h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 9.91a16 16 0 0 0 6.29 6.29l.95-.94a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/>
                </svg>
                <span>{profile.contacts.phone}</span>
              </a>
            )}

            {/* E-mail */}
            {profile.contacts?.email && (
              <a
                href={`mailto:${profile.contacts.email}`}
                className="flex items-center gap-2 text-sm text-white/75 hover:text-white transition-colors duration-150 rounded-xl"
                aria-label={`Написать на ${profile.contacts.email}`}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <rect x="2" y="4" width="20" height="16" rx="2"/>
                  <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>
                </svg>
                <span>{profile.contacts.email}</span>
              </a>
            )}

            {/* Сайт */}
            {profile.contacts?.website && (
              <a
                href={profile.contacts.website}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-sm text-white/75 hover:text-white transition-colors duration-150 rounded-xl"
                aria-label={`Сайт: ${profile.contacts.website}`}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <circle cx="12" cy="12" r="10"/>
                  <path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"/>
                  <path d="M2 12h20"/>
                </svg>
                <span>{profile.contacts.website.replace(/^https?:\/\//, '')}</span>
              </a>
            )}

            {/* Кнопка «Чат» — #F26522, ml-auto */}
            {onOpenChat && (
              <button
                type="button"
                onClick={onOpenChat}
                className="ml-auto flex items-center gap-2 px-5 py-2 rounded-2xl text-sm font-bold text-white transition-all duration-150 hover:brightness-110 active:scale-[0.97] focus:outline-none focus-visible:ring-2 focus-visible:ring-white/50"
                style={{ backgroundColor: '#F26522', boxShadow: '0 4px 14px rgba(242,101,34,0.40)' }}
                aria-label="Открыть чат с экспонентом"
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                </svg>
                Чат
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// КОМПОНЕНТ «ЭКСПОНЕНТ РЕКОМЕНДУЕТ» — INSTAGRAM STORIES BAR
// ═══════════════════════════════════════════════════════════════════════════════

/** Максимум видимых без кнопки «Все партнёры» */
const RECOMMENDATIONS_THRESHOLD = 5;

/**
 * Маленький бейдж реферального звена.
 * Появляется поверх аватара если `isReferral === true`.
 */
function ChainLinkBadge() {
  return (
    <span
      title="Реферальный партнёр"
      className="absolute -bottom-0.5 -right-0.5 z-10 flex h-4 w-4 items-center justify-center rounded-full border-2 border-white"
      style={{ backgroundColor: '#F26522' }}
      aria-label="Реферальный партнёр"
    >
      <svg
        width="8"
        height="8"
        viewBox="0 0 24 24"
        fill="none"
        stroke="white"
        strokeWidth="2.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
        <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
      </svg>
    </span>
  );
}

function RecommendationItem({ rec }: { rec: Recommendation }) {
  const [hovered, setHovered] = useState(false);

  return (
    <Link
      href={`/horeca/exhibitors/${rec.slug}`}
      className="flex flex-col items-center gap-1.5 flex-shrink-0 w-[76px] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#F26522]/50 rounded-xl"
      aria-label={`Перейти на витрину ${rec.name}`}
    >
      <div className="relative">
        <div
          className="flex items-center justify-center rounded-full overflow-hidden transition-all duration-200"
          style={{
            width:       72,
            height:      72,
            border:      `2px solid ${hovered ? '#F26522' : '#0B2B5E'}`,
            boxShadow:   hovered
              ? '0 0 0 3px rgba(242,101,34,0.18)'
              : '0 0 0 3px rgba(11,43,94,0.07)',
            transform:   hovered ? 'scale(1.07)' : 'scale(1)',
          }}
          onMouseEnter={() => setHovered(true)}
          onMouseLeave={() => setHovered(false)}
        >
          {rec.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={rec.logoUrl}
              alt={`Логотип ${rec.name}`}
              width={68}
              height={68}
              className="w-full h-full object-contain bg-white p-1.5"
            />
          ) : (
            <div
              className="w-full h-full flex items-center justify-center select-none"
              style={{ backgroundColor: '#0B2B5E' }}
            >
              <span className="text-base font-bold text-white leading-none">
                {getInitials(rec.name)}
              </span>
            </div>
          )}
        </div>
        {rec.isReferral && <ChainLinkBadge />}
      </div>

      <span
        className="text-[11px] font-semibold leading-tight text-center w-full truncate px-0.5"
        style={{ color: '#0B2B5E' }}
      >
        {rec.name}
      </span>
      <span className="text-[10px] font-medium text-center w-full truncate px-0.5 text-slate-400 leading-none -mt-0.5">
        {rec.reason}
      </span>
    </Link>
  );
}

/** Кнопка «Все партнёры» — появляется в конце ленты когда партнёров > 5 */
function ViewAllRecommendationsButton() {
  return (
    <Link
      href="/horeca/exhibitors"
      className="flex flex-col items-center gap-1.5 flex-shrink-0 w-[76px] group/viewall focus:outline-none focus-visible:ring-2 focus-visible:ring-[#F26522]/50 rounded-xl"
      aria-label="Смотреть всех рекомендуемых партнёров"
    >
      <div
        className="flex items-center justify-center rounded-full transition-all duration-200 group-hover/viewall:scale-105"
        style={{
          width:           72,
          height:          72,
          border:          '2px dashed rgba(11,43,94,0.25)',
          backgroundColor: 'rgba(11,43,94,0.04)',
        }}
      >
        <svg
          width="22"
          height="22"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#0B2B5E"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
          className="transition-transform duration-200 group-hover/viewall:translate-x-0.5"
        >
          <path d="M5 12h14M12 5l7 7-7 7" />
        </svg>
      </div>
      <span className="text-[11px] font-semibold leading-tight text-center" style={{ color: '#0B2B5E' }}>
        Все партнёры
      </span>
      <span className="text-[10px] font-medium text-center text-slate-400 leading-none -mt-0.5">
        Смотреть всех
      </span>
    </Link>
  );
}

function RecommendedPartnersBar({ recommendations }: { recommendations: Recommendation[] }) {
  if (!recommendations || recommendations.length === 0) return null;

  const showViewAll = recommendations.length > RECOMMENDATIONS_THRESHOLD;

  return (
    <section
      className="bg-white border-b border-slate-100"
      style={{ boxShadow: '0 2px 10px rgba(11,43,94,0.05)' }}
      aria-label="Рекомендации экспонента"
    >
      <div className="px-6 pt-3.5 pb-0 flex items-center gap-2">
        <span
          className="inline-block w-3 h-0.5 rounded-full flex-shrink-0"
          style={{ backgroundColor: '#F26522' }}
          aria-hidden="true"
        />
        <h2 className="text-[10px] font-bold uppercase tracking-widest" style={{ color: '#0B2B5E' }}>
          Экспонент рекомендует
        </h2>
        <span
          className="ml-auto inline-flex items-center justify-center min-w-[20px] h-4 px-1.5 rounded-full text-[9px] font-bold leading-none"
          style={{ backgroundColor: 'rgba(11,43,94,0.08)', color: '#0B2B5E' }}
        >
          {recommendations.length}
        </span>
      </div>

      <div
        className={[
          'flex items-start gap-5 px-6 py-4',
          'overflow-x-auto scroll-smooth',
          '[&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]',
        ].join(' ')}
        role="list"
        aria-label="Список рекомендуемых партнёров"
      >
        {recommendations.map((rec) => (
          <div key={rec.partnerId} role="listitem">
            <RecommendationItem rec={rec} />
          </div>
        ))}
        {showViewAll && <ViewAllRecommendationsButton />}
      </div>
    </section>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// БЛОК ПОСЛЕДНИХ НОВОСТЕЙ — 3 КАРТОЧКИ ПОД РЕКОМЕНДАЦИЯМИ
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * `ExhibitorNewsBlock` — секция «Последние новости» под рекомендациями.
 *
 * Показывает до 3 последних новостей экспонента в горизонтальной сетке.
 * На мобильных — одна колонка, на sm+ — три колонки.
 *
 * Каждая карточка:
 *   • Квадратный thumbnail 80×80 (rounded-2xl) слева
 *   • Заголовок новости справа (Deep Blue #0B2B5E)
 *   • Дата публикации под заголовком
 *
 * TODO: При интеграции с Supabase — fetch из таблицы `news` с фильтром по exhibitor_id,
 *       сортировка по `published_at DESC LIMIT 3`, RLS: публичное чтение published.
 */
function ExhibitorNewsBlock({
  news,
  onOpenNews,
}: {
  news: ExhibitorNewsItem[];
  onOpenNews: (n: ExhibitorNewsItem) => void;
}) {
  if (!news || news.length === 0) return null;

  const latest = news.slice(0, 3);

  /** Градиенты-плейсхолдеры для thumbnail без mediaUrl */
  const THUMB_GRADIENTS = [
    'linear-gradient(135deg, #0B2B5E 0%, #1a4a8a 100%)',
    'linear-gradient(135deg, #1a3060 0%, #2d5090 100%)',
    'linear-gradient(135deg, #0d2248 0%, #173878 100%)',
  ] as const;

  return (
    <section
      className="bg-white border-b border-slate-100"
      style={{ boxShadow: '0 2px 10px rgba(11,43,94,0.05)' }}
      aria-label="Последние новости экспонента"
    >
      {/* Заголовок секции */}
      <div className="px-6 pt-3.5 pb-0 flex items-center gap-2">
        <span
          className="inline-block w-3 h-0.5 rounded-full flex-shrink-0"
          style={{ backgroundColor: '#F26522' }}
          aria-hidden="true"
        />
        <h2 className="text-[10px] font-bold uppercase tracking-widest" style={{ color: '#0B2B5E' }}>
          Последние новости
        </h2>
        <span
          className="ml-auto inline-flex items-center justify-center min-w-[20px] h-4 px-1.5 rounded-full text-[9px] font-bold leading-none"
          style={{ backgroundColor: 'rgba(11,43,94,0.08)', color: '#0B2B5E' }}
        >
          {latest.length}
        </span>
      </div>

      {/* Сетка: 3 колонки на sm+, 1 на мобильных */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 px-6 py-4">
        {latest.map((item, idx) => (
          <button
            key={item.id}
            type="button"
            onClick={() => onOpenNews(item)}
            className="flex items-start gap-3 text-left group focus:outline-none focus-visible:ring-2 focus-visible:ring-[#F26522]/50 rounded-2xl transition-opacity duration-150 hover:opacity-80"
          >
            {/* Квадратный thumbnail (80×80, rounded-2xl) */}
            <div
              className="flex-shrink-0 w-20 h-20 rounded-2xl overflow-hidden"
              style={!item.mediaUrl ? { background: THUMB_GRADIENTS[idx % 3] } : undefined}
            >
              {item.mediaUrl ? (
                <img
                  src={item.mediaUrl}
                  alt=""
                  className="w-full h-full object-cover"
                  aria-hidden="true"
                />
              ) : (
                /* Иконка-плейсхолдер для новостей без изображения */
                <div className="w-full h-full flex items-center justify-center">
                  <svg
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="rgba(255,255,255,0.45)"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <path d="M4 22h14a2 2 0 0 0 2-2V7l-5-5H6a2 2 0 0 0-2 2v4"/>
                    <path d="M14 2v4a2 2 0 0 0 2 2h4"/>
                    <path d="M2 13h10M6 17h6"/>
                  </svg>
                </div>
              )}
            </div>

            {/* Заголовок + дата */}
            <div className="flex-1 min-w-0 pt-0.5">
              <p
                className="text-sm font-semibold leading-snug line-clamp-3"
                style={{ color: '#0B2B5E' }}
              >
                {item.title}
              </p>
              <p
                className="text-[10px] mt-1.5 font-medium"
                style={{ color: 'rgba(11,43,94,0.45)' }}
              >
                {(() => {
                  try {
                    return new Date(item.publishedAt).toLocaleDateString('ru-RU', {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric',
                    });
                  } catch {
                    return item.publishedAt;
                  }
                })()}
              </p>
            </div>
          </button>
        ))}
      </div>
    </section>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// КОМПОНЕНТ НАВИГАЦИОННЫХ ТАБОВ
// ═══════════════════════════════════════════════════════════════════════════════

interface ExhibitorTabsProps {
  activeTab: DashboardTab;
  onTabChange: (tab: DashboardTab) => void;
  counts: Record<DashboardTab, number>;
}

function ExhibitorTabs({ activeTab, onTabChange, counts }: ExhibitorTabsProps) {
  return (
    <nav
      aria-label="Разделы витрины экспонента"
      className="flex flex-wrap items-end gap-2 border-b border-slate-200 bg-white px-4 w-full"
    >
      {DASHBOARD_TABS.map((tab) => {
        const isActive = tab.id === activeTab;
        const count    = counts[tab.id];

        return (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => onTabChange(tab.id)}
            className={[
              'relative flex-shrink-0 inline-flex items-center gap-1.5 px-4 py-3.5',
              'text-xs font-semibold whitespace-nowrap transition-colors duration-150',
              'focus:outline-none focus-visible:ring-2 focus-visible:ring-[#F26522]/50 rounded-t-lg',
              isActive ? 'text-[#0B2B5E]' : 'text-slate-400 hover:text-[#0B2B5E]',
            ].join(' ')}
          >
            {/* Иконка пера для вкладки Новости */}
            {tab.id === 'news' && (
              <svg
                width="10"
                height="10"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
                className="flex-shrink-0"
              >
                <path d="M4 22h16a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v16a2 2 0 0 1-2 2Zm0 0a2 2 0 0 1-2-2v-9c0-1.1.9-2 2-2h2" />
                <path d="M18 14h-8M15 18h-5M10 6h8v4h-8V6Z" />
              </svg>
            )}
            {tab.label}
            {count > 0 && (
              <span
                className={[
                  'inline-flex items-center justify-center min-w-[18px] h-4 px-1 rounded-full',
                  'text-[9px] font-bold leading-none',
                  isActive ? 'bg-[#0B2B5E] text-white' : 'bg-slate-100 text-slate-400',
                ].join(' ')}
              >
                {count}
              </span>
            )}
            {isActive && (
              <span
                className="absolute inset-x-4 bottom-0 h-0.5 rounded-full"
                style={{ backgroundColor: '#F26522' }}
                aria-hidden="true"
              />
            )}
          </button>
        );
      })}
    </nav>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// КОМПОНЕНТ КАРТОЧКИ ТОВАРА (Instagram-стиль)
// ═══════════════════════════════════════════════════════════════════════════════

interface ProductCardProps {
  product: ExhibitorProduct;
  onOpen: (product: ExhibitorProduct) => void;
}

function ProductCard({ product, onOpen }: ProductCardProps) {
  return (
    <article
      className="group relative aspect-square rounded-2xl overflow-hidden cursor-pointer col-span-1 sm:col-span-2 border border-[#0B2B5E]/20"
      style={{ borderColor: 'rgba(11,43,94,0.2)' }}
      onClick={() => onOpen(product)}
      role="button"
      tabIndex={0}
      aria-label={`Открыть карточку: ${product.name}`}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onOpen(product); }}
    >
      {product.imageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={product.imageUrl}
          alt={product.name}
          className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
        />
      ) : (
        <div
          className="absolute inset-0 transition-transform duration-500 group-hover:scale-105"
          style={{ background: product.imageGradient }}
          aria-hidden="true"
        />
      )}

      {product.isNew && (
        <span
          className="absolute top-1 left-1 z-10 inline-flex items-center px-1.5 py-px rounded text-[8px] font-bold uppercase tracking-wide select-none"
          style={{ backgroundColor: '#F26522', color: '#FFFFFF' }}
        >
          NEW
        </span>
      )}

      {product.category === 'equipment' && (
        <span
          className="absolute top-1 right-1 z-10 inline-flex items-center px-1.5 py-px rounded text-[8px] font-bold uppercase tracking-wide select-none"
          style={{ backgroundColor: 'rgba(11,43,94,0.80)', color: '#FFFFFF' }}
        >
          ОБО
        </span>
      )}

      <div
        className="absolute inset-0 z-20 flex flex-col justify-end p-1.5 opacity-0 group-hover:opacity-100 transition-opacity duration-200"
        style={{
          background: 'linear-gradient(to top, rgba(11,43,94,0.94) 0%, rgba(11,43,94,0.40) 55%, transparent 100%)',
        }}
        aria-hidden="true"
      >
        <p className="text-white text-[10px] font-bold leading-snug line-clamp-2">{product.name}</p>
        <p className="text-[#F26522] text-[9px] font-semibold mt-0.5 leading-none">от {product.basePrice}</p>
      </div>
    </article>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// КОМПОНЕНТ НОВОСТНОЙ КАРТОЧКИ — 8-КОЛОНОЧНАЯ ГИБРИДНАЯ СЕТКА
// ═══════════════════════════════════════════════════════════════════════════════

interface ExhibitorNewsCardProps {
  item: ExhibitorNewsItem;
  onOpen: (item: ExhibitorNewsItem) => void;
}

/**
 * Новостная карточка экспонента для гибридной сетки.
 *
 * Визуальная структура:
 *   ┌──────────────────────────────────────────────────┐
 *   │  МЕДИА-ОБЛАСТЬ (синий фон + blueprint-паттерн)   │
 *   │  [NEW / РАСПРОДАЖА]     ["Оборудование"]         │
 *   ├──────────────────────────────────────────────────┤
 *   │  Заголовок (жирный, 2 строки max)                │
 *   │  Описание  (2 строки, slate-400)                 │
 *   │  Читать статью →                   27 мая        │
 *   └──────────────────────────────────────────────────┘
 *
 * span=1 → col-span-2 (занимает 2 из 8 колонок, квадратная)
 * span=2 → col-span-4 (широкая карточка)
 */
/**
 * Новостная карточка — UNIFORM GRID GEOMETRY.
 *
 * Enforces:
 *   • `aspect-square`          — идентичные размеры с ProductCard.
 *   • `overflow-hidden`        — карточка НИКОГДА не растягивается по контенту.
 *   • Media area  = 60% высоты квадрата (синий blueprint-фон).
 *   • Text area   = 40% высоты квадрата (overflow-hidden).
 *   • `line-clamp-2` на заголовке, `line-clamp-1` на мета-данных.
 */
function ExhibitorNewsCard({ item, onOpen }: ExhibitorNewsCardProps) {
  /*
   * UNIFORM GRID GEOMETRY — Rule 7 (strict).
   * Все карточки (ProductCard + ExhibitorNewsCard) ОБЯЗАНЫ быть одинакового размера.
   * span=2 БОЛЬШЕ НЕ РАСШИРЯЕТ карточку до col-span-4 — это нарушало бы единство сетки.
   * Все карточки: col-span-1 (mobile 2-col) → sm:col-span-2 (desktop 8-col).
   */
  const spanClass = 'col-span-1 sm:col-span-2';

  const badgeStyle: React.CSSProperties =
    item.badge === 'new'
      ? { backgroundColor: '#F26522', color: '#FFFFFF' }
      : { backgroundColor: '#DC2626', color: '#FFFFFF' };

  const badgeLabel = item.badge === 'new' ? 'NEW' : 'РАСПРОДАЖА';

  return (
    <article
      className={[
        spanClass,
        /* ── UNIFORM SQUARE GEOMETRY ── */
        'aspect-square w-full h-full overflow-hidden',
        'group relative bg-white rounded-lg',
        'border border-[#0B2B5E]/10',
        'shadow-[0_8px_30px_rgb(11,43,94,0.10)]',
        'flex flex-col',
        'cursor-pointer transition-all duration-200',
        'hover:border-[#F26522] hover:shadow-[0_12px_40px_rgba(242,101,34,0.20)]',
      ].join(' ')}
      onClick={() => onOpen(item)}
      role="button"
      tabIndex={0}
      aria-label={`Открыть новость: ${item.title}`}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onOpen(item); }}
    >
      {/* Оранжевая accent-полоска сверху при ховере */}
      <div
        className="absolute inset-x-0 top-0 h-0.5 bg-[#F26522] opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-10"
        aria-hidden="true"
      />

      {/* ── МЕДИА ОБЛАСТЬ: фиксированные 60% высоты квадрата ── */}
      <div
        className="relative flex-shrink-0 overflow-hidden"
        style={{
          height: '60%',
          backgroundColor: '#0B2B5E',
          backgroundImage:
            'repeating-linear-gradient(0deg,rgba(255,255,255,0.03) 0px,rgba(255,255,255,0.03) 1px,transparent 1px,transparent 16px),' +
            'repeating-linear-gradient(90deg,rgba(255,255,255,0.03) 0px,rgba(255,255,255,0.03) 1px,transparent 1px,transparent 16px)',
        }}
      >
        {/* Фоновое изображение (опционально) */}
        {item.mediaUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={item.mediaUrl}
            alt=""
            aria-hidden="true"
            className="absolute inset-0 w-full h-full object-contain opacity-20 group-hover:opacity-30 transition-opacity duration-300 p-4"
          />
        )}

        {/* Градиент поверх медиа */}
        <div
          className="absolute inset-0"
          style={{ background: 'linear-gradient(to bottom, rgba(11,43,94,0.2) 0%, rgba(11,43,94,0.5) 100%)' }}
          aria-hidden="true"
        />

        {/* ── БЕЙДЖ СЛЕВА: NEW оранжевый / РАСПРОДАЖА красный ── */}
        <span
          className="absolute top-2 left-2 z-10 inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-black tracking-wider leading-none uppercase select-none shadow-sm"
          style={badgeStyle}
        >
          {badgeLabel}
        </span>

        {/* ── КАТЕГОРИЯ СПРАВА: стеклянный тег ── */}
        <span
          className="absolute top-2 right-2 z-10 inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-semibold leading-none select-none shadow-sm overflow-hidden max-w-[45%] truncate"
          style={{ backgroundColor: 'rgba(255,255,255,0.18)', color: '#FFFFFF', backdropFilter: 'blur(4px)' }}
        >
          {item.category}
        </span>
      </div>

      {/* ── ТЕКСТОВАЯ ЧАСТЬ: фиксированные 40% высоты квадрата, NO OVERFLOW ── */}
      <div
        className="overflow-hidden p-2.5 bg-white flex flex-col justify-between"
        style={{ height: '40%' }}
      >
        <div className="overflow-hidden">
          <h3
            className="text-[10px] font-bold leading-snug line-clamp-2 mb-0.5"
            style={{ color: '#0B2B5E' }}
          >
            {item.title}
          </h3>
          <p className="text-[9px] leading-snug line-clamp-1 text-slate-400">
            {item.description}
          </p>
        </div>

        {/* CTA + дата */}
        <div className="flex items-center justify-between overflow-hidden">
          <span
            className={[
              'inline-flex items-center gap-0.5 text-[9px] font-semibold line-clamp-1 flex-shrink-0',
              'transition-colors duration-150',
              'group-hover:text-[#F26522] text-[#0B2B5E]/60',
            ].join(' ')}
          >
            Читать
            <svg
              width="7"
              height="7"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
              className="transition-transform duration-150 group-hover:translate-x-0.5 flex-shrink-0"
            >
              <path d="M5 12h14" /><path d="m12 5 7 7-7 7" />
            </svg>
          </span>

          <span className="text-[9px] text-slate-400 tabular-nums line-clamp-1 whitespace-nowrap ml-1 flex-shrink-0">
            {new Date(item.publishedAt).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })}
          </span>
        </div>
      </div>
    </article>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// КОМПОНЕНТ: МОДАЛЬНОЕ ОКНО ПОЛНОЙ СТАТЬИ НОВОСТИ
// ═══════════════════════════════════════════════════════════════════════════════

interface ArticleModalProps {
  item: ExhibitorNewsItem | null;
  onClose: () => void;
}

/**
 * `ExhibitorArticleModal` — полноэкранный оверлей для чтения новости.
 *
 * UX:
 *   • Закрытие: кнопка ×, клик по оверлею, клавиша Escape.
 *   • Скролл body блокируется пока модалка открыта.
 *   • Badge: NEW оранжевый / РАСПРОДАЖА красный.
 *   • Категория — стеклянный тег справа от бейджа.
 */
function ExhibitorArticleModal({ item, onClose }: ArticleModalProps) {
  // Блокируем скролл body пока открыта
  useEffect(() => {
    if (!item) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, [item]);

  // Escape → закрыть
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') onClose();
  }, [onClose]);

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  if (!item) return null;

  const badgeStyle: React.CSSProperties =
    item.badge === 'new'
      ? { backgroundColor: '#F26522', color: '#FFFFFF' }
      : { backgroundColor: '#DC2626', color: '#FFFFFF' };

  const badgeLabel = item.badge === 'new' ? 'NEW' : 'РАСПРОДАЖА';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-8"
      style={{ backgroundColor: 'rgba(11,43,94,0.75)', backdropFilter: 'blur(6px)' }}
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={item.title}
    >
      <div
        className={[
          'relative w-full max-w-2xl max-h-[90vh] flex flex-col',
          'bg-white rounded-2xl overflow-hidden',
          'shadow-[0_32px_80px_rgba(11,43,94,0.35)]',
        ].join(' ')}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Оранжевый акцент сверху */}
        <div className="absolute inset-x-0 top-0 h-1 bg-[#F26522] z-20" aria-hidden="true" />

        {/* ── МЕДИА ШАПКА ── */}
        <div
          className="relative flex-shrink-0 overflow-hidden"
          style={{
            height: '12rem',
            backgroundColor: '#0B2B5E',
            backgroundImage:
              'repeating-linear-gradient(0deg,rgba(255,255,255,0.03) 0px,rgba(255,255,255,0.03) 1px,transparent 1px,transparent 16px),' +
              'repeating-linear-gradient(90deg,rgba(255,255,255,0.03) 0px,rgba(255,255,255,0.03) 1px,transparent 1px,transparent 16px)',
          }}
        >
          {item.mediaUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={item.mediaUrl}
              alt=""
              aria-hidden="true"
              className="absolute inset-0 w-full h-full object-contain opacity-20 p-10"
            />
          )}
          <div
            className="absolute inset-0"
            style={{ background: 'linear-gradient(to bottom, rgba(11,43,94,0.1) 0%, rgba(11,43,94,0.6) 100%)' }}
            aria-hidden="true"
          />

          {/* Бейдж */}
          <span
            className="absolute top-5 left-5 z-10 inline-flex items-center px-2.5 py-1 rounded-lg text-[11px] font-black tracking-widest leading-none uppercase select-none shadow"
            style={badgeStyle}
          >
            {badgeLabel}
          </span>

          {/* Категория */}
          <span
            className="absolute top-5 right-12 z-10 inline-flex items-center px-2.5 py-1 rounded-lg text-[11px] font-semibold leading-none select-none"
            style={{ backgroundColor: 'rgba(255,255,255,0.18)', color: '#FFFFFF', backdropFilter: 'blur(4px)' }}
          >
            {item.category}
          </span>

          {/* Кнопка закрытия */}
          <button
            type="button"
            onClick={onClose}
            aria-label="Закрыть статью"
            className={[
              'absolute top-3 right-3 z-20',
              'w-8 h-8 flex items-center justify-center rounded-full',
              'bg-white/15 border border-white/30 text-white',
              'hover:bg-white/25 hover:border-white/50',
              'transition-all duration-150 focus:outline-none',
              'focus-visible:ring-2 focus-visible:ring-white/50',
            ].join(' ')}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* ── КОНТЕНТ ── */}
        <div className="flex-1 overflow-y-auto px-6 py-5" style={{ scrollbarWidth: 'thin' }}>
          <h2 className="text-lg font-bold leading-snug mb-2" style={{ color: '#0B2B5E' }}>
            {item.title}
          </h2>
          <p className="text-xs text-slate-400 mb-4">
            {new Date(item.publishedAt).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
          <div className="text-sm leading-relaxed text-slate-700 whitespace-pre-wrap font-[inherit]">
            {item.content}
          </div>
        </div>

        {/* ── FOOTER ── */}
        <div
          className="flex-shrink-0 flex items-center justify-between px-6 py-4"
          style={{ borderTop: '1px solid rgba(11,43,94,0.08)' }}
        >
          <span className="text-xs text-slate-400">
            Категория: <strong style={{ color: '#0B2B5E' }}>{item.category}</strong>
          </span>
          <button
            type="button"
            onClick={onClose}
            className={[
              'inline-flex items-center gap-2 px-4 py-2 rounded-xl',
              'text-xs font-semibold',
              'border-2 border-[#0B2B5E] text-[#0B2B5E]',
              'hover:bg-[#0B2B5E] hover:text-white',
              'transition-all duration-150 focus:outline-none',
              'focus-visible:ring-2 focus-visible:ring-[#F26522]/50',
            ].join(' ')}
          >
            Закрыть
          </button>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// КОМПОНЕНТ ГИБРИДНОЙ СЕТКИ ТОВАРОВ И НОВОСТЕЙ
// Blueprint 2.0: 8-колоночная сетка — товары (col-span-2) + карточки новостей
// ═══════════════════════════════════════════════════════════════════════════════

interface MixedGridProps {
  items: ExhibitorGridItem[];
  onOpenProduct: (product: ExhibitorProduct) => void;
  onOpenNews: (news: ExhibitorNewsItem) => void;
}

function MixedGrid({ items, onOpenProduct, onOpenNews }: MixedGridProps) {
  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div
          className="w-14 h-14 rounded-full flex items-center justify-center mb-4"
          style={{ backgroundColor: 'rgba(11,43,94,0.06)' }}
        >
          <svg
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
            <rect x="3" y="3" width="7" height="7" rx="1" />
            <rect x="14" y="3" width="7" height="7" rx="1" />
            <rect x="3" y="14" width="7" height="7" rx="1" />
            <rect x="14" y="14" width="7" height="7" rx="1" />
          </svg>
        </div>
        <p className="font-semibold text-sm" style={{ color: '#0B2B5E' }}>Позиции не найдены</p>
        <p className="text-slate-400 text-xs mt-1">Перейдите на другую вкладку</p>
      </div>
    );
  }

  return (
    /*
     * 8-КОЛОНОЧНАЯ ГИБРИДНАЯ СЕТКА:
     *   grid-cols-2       — мобильные (< sm): 2 колонки
     *   sm:grid-cols-8    — десктоп: 8 колонок
     *
     * Распределение:
     *   ProductCard (товар)         → col-span-1  |  sm:col-span-2
     *   ExhibitorNewsCard (1×1)     → col-span-1  |  sm:col-span-2
     *   ExhibitorNewsCard (2×1)     → col-span-2  |  sm:col-span-4
     */
    <div
      className="grid grid-cols-2 sm:grid-cols-8 gap-1 sm:gap-1.5"
      aria-label="Гибридная сетка товаров и новостей экспонента"
    >
      {items.map((item) =>
        item.type === 'news' ? (
          <ExhibitorNewsCard
            key={item.data.id}
            item={item.data}
            onOpen={onOpenNews}
          />
        ) : (
          <ProductCard
            key={item.data.id}
            product={item.data}
            onOpen={onOpenProduct}
          />
        )
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// КОМПОНЕНТ «О КОМПАНИИ» (вкладка about)
// ═══════════════════════════════════════════════════════════════════════════════

function AboutTab({ profile }: { profile: ExhibitorProfile }) {
  return (
    <div className="max-w-2xl space-y-6 py-2">
      <section>
        <h2
          className="text-xs font-bold uppercase tracking-widest mb-3 flex items-center gap-2"
          style={{ color: '#0B2B5E' }}
        >
          <span className="inline-block w-3 h-0.5 rounded-full flex-shrink-0" style={{ backgroundColor: '#F26522' }} aria-hidden="true" />
          О компании
        </h2>
        <p className="text-sm text-slate-600 leading-relaxed">{profile.bio}</p>
      </section>

      <section>
        <h2
          className="text-xs font-bold uppercase tracking-widest mb-3 flex items-center gap-2"
          style={{ color: '#0B2B5E' }}
        >
          <span className="inline-block w-3 h-0.5 rounded-full flex-shrink-0" style={{ backgroundColor: '#F26522' }} aria-hidden="true" />
          Ключевые данные
        </h2>
        <dl className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          {[
            { label: 'Тип участника', value: profile.category === 'manufacturer' ? 'Производитель' : 'Дистрибьютор' },
            { label: 'Страна',        value: profile.country },
            ...(profile.foundedYear ? [{ label: 'Год основания', value: profile.foundedYear }] : []),
            { label: 'Товаров',       value: String(profile.stats.products) },
            { label: 'Оборудования',  value: String(profile.stats.equipment) },
            { label: 'Новостей',      value: String(profile.news?.length ?? profile.stats.news) },
          ].map(({ label, value }) => (
            <div
              key={label}
              className="rounded-2xl border bg-white px-4 py-3"
              style={{ borderColor: 'rgba(11,43,94,0.2)' }}
            >
              <dt className="text-[10px] font-semibold uppercase tracking-widest text-slate-400 mb-1">{label}</dt>
              <dd className="text-sm font-bold" style={{ color: '#0B2B5E' }}>{value}</dd>
            </div>
          ))}
        </dl>
      </section>

      {profile.regions && profile.regions.length > 0 && (
        <section>
          <h2
            className="text-xs font-bold uppercase tracking-widest mb-3 flex items-center gap-2"
            style={{ color: '#0B2B5E' }}
          >
            <span className="inline-block w-3 h-0.5 rounded-full flex-shrink-0" style={{ backgroundColor: '#F26522' }} aria-hidden="true" />
            Регионы поставки
          </h2>
          <div className="flex flex-wrap gap-2">
            {profile.regions.map((region) => (
              <span
                key={region}
                className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium"
                style={{ backgroundColor: 'rgba(11,43,94,0.07)', color: '#0B2B5E' }}
              >
                {region}
              </span>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// ВИДЖЕТ «ГОРЯЧАЯ НОВОСТЬ» — КОМПОНЕНТ ДЛЯ ПРАВОГО САЙДБАРА
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * `HotNewsWidget` — компактный виджет горячей новости для правого сайдбара.
 *
 * Логика: берёт первую новость из массива (самую свежую).
 * Дизайн:
 *   • Тёмно-синий фон (rgba(11,43,94,0.05)) + белая граница.
 *   • Оранжевая иконка огня + заголовок «ГОРЯЧАЯ НОВОСТЬ».
 *   • Превью-заголовок статьи (2 строки) + дата.
 *   • Бейдж NEW / РАСПРОДАЖА.
 *   • CTA кнопка «Читать» — вызывает onOpen.
 */
interface HotNewsWidgetProps {
  news: ExhibitorNewsItem[];
  onOpen: (item: ExhibitorNewsItem) => void;
}

function HotNewsWidget({ news, onOpen }: HotNewsWidgetProps) {
  if (!news || news.length === 0) return null;

  // Берём самую свежую новость
  const hotItem = [...news].sort(
    (a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime(),
  )[0];

  const badgeStyle: React.CSSProperties =
    hotItem.badge === 'new'
      ? { backgroundColor: '#F26522', color: '#FFFFFF' }
      : { backgroundColor: '#DC2626', color: '#FFFFFF' };

  const badgeLabel = hotItem.badge === 'new' ? 'NEW' : 'SALE';

  return (
    <div
      className="w-full rounded-2xl overflow-hidden"
      style={{
        border: '1px solid rgba(11,43,94,0.20)',
      }}
    >
      {/* ── Шапка виджета: "ГОРЯЧАЯ НОВОСТЬ" ── */}
      <div
        className="flex items-center gap-2 px-4 py-2.5"
        style={{ backgroundColor: '#0B2B5E' }}
      >
        {/* Иконка огня */}
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#F26522"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
          className="flex-shrink-0"
        >
          <path d="M12 2c0 0-4 4-4 9a4 4 0 0 0 8 0 9 9 0 0 0-4-9z" />
          <path d="M12 12c0 0-2 2-2 4a2 2 0 0 0 4 0c0-2-2-4-2-4z" fill="#F26522" stroke="none" />
        </svg>
        <span className="text-[10px] font-black uppercase tracking-widest text-white flex-1">
          Горячая новость
        </span>
        <span
          className="inline-flex items-center px-1.5 py-px rounded text-[8px] font-black uppercase leading-none"
          style={badgeStyle}
        >
          {badgeLabel}
        </span>
      </div>

      {/* ── Превью медиа ── */}
      <div
        className="relative overflow-hidden"
        style={{
          height: '6rem',
          backgroundColor: '#0d3570',
          backgroundImage:
            'repeating-linear-gradient(0deg,rgba(255,255,255,0.03) 0px,rgba(255,255,255,0.03) 1px,transparent 1px,transparent 12px),' +
            'repeating-linear-gradient(90deg,rgba(255,255,255,0.03) 0px,rgba(255,255,255,0.03) 1px,transparent 1px,transparent 12px)',
        }}
      >
        {hotItem.mediaUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={hotItem.mediaUrl}
            alt=""
            aria-hidden="true"
            className="absolute inset-0 w-full h-full object-contain opacity-25 p-4"
          />
        )}
        {/* Категория-тег */}
        <span
          className="absolute bottom-2 right-2 z-10 inline-flex items-center px-1.5 py-px rounded text-[9px] font-semibold leading-none"
          style={{ backgroundColor: 'rgba(255,255,255,0.16)', color: '#fff', backdropFilter: 'blur(4px)' }}
        >
          {hotItem.category}
        </span>
      </div>

      {/* ── Текстовый контент ── */}
      <div className="px-4 py-3 bg-white">
        <h3
          className="text-xs font-bold leading-snug line-clamp-2 mb-1"
          style={{ color: '#0B2B5E' }}
        >
          {hotItem.title}
        </h3>
        <p className="text-[10px] text-slate-400 mb-3">
          {new Date(hotItem.publishedAt).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short', year: 'numeric' })}
        </p>

        <button
          type="button"
          onClick={() => onOpen(hotItem)}
          className={[
            'w-full flex items-center justify-center gap-1.5',
            'px-3 py-2 rounded-lg',
            'text-[11px] font-bold uppercase tracking-wide',
            'transition-all duration-150 active:scale-[0.98] hover:brightness-110',
            'focus:outline-none focus-visible:ring-2 focus-visible:ring-[#F26522]/50',
          ].join(' ')}
          style={{
            backgroundColor: '#F26522',
            color: '#FFFFFF',
            boxShadow: '0 3px 10px rgba(242,101,34,0.35)',
          }}
        >
          <svg
            width="11"
            height="11"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M5 12h14M12 5l7 7-7 7" />
          </svg>
          Читать статью
        </button>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// БОКОВАЯ ПАНЕЛЬ — BLUEPRINT 2.0 + ГОРЯЧАЯ НОВОСТЬ
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * `ExhibitorSidebar` — функциональная правая колонка (w-[380px]).
 * Прилипает к верху (sticky top-16) при прокрутке.
 *
 * Элементы:
 *   0. HotNewsWidget        — «ГОРЯЧАЯ НОВОСТЬ» (если есть новости)
 *   1. Акцент               — «СПЕЦИАЛЬНЫЕ ПРЕДЛОЖЕНИЯ ДЛЯ ПАРТНЁРОВ» — оранжевый
 *   2. Коммуникация         — «ЧАТ С ЭКСПОНЕНТОМ» — синий, время ответа
 *   3. Доверие              — «КОМАНДА ОНЛАЙН» — 4 аватара с зелёными точками
 *   4. Документы            — «СЕРТИФИКАТЫ» и «ДОГОВОРЫ» — синие плашки
 */
interface ExhibitorSidebarProps {
  news?: ExhibitorNewsItem[];
  onOpenNews: (item: ExhibitorNewsItem) => void;
  onUploadRequisites: () => void;
  /** Открыть ExpoChatSync — эмитит SessionStart → Vibrant Alert у экспонента */
  onOpenChat: () => void;
}

function ExhibitorSidebar({ news, onOpenNews, onUploadRequisites, onOpenChat }: ExhibitorSidebarProps) {
  return (
    <aside
      className="flex flex-col gap-3"
      aria-label="Панель управления экспонентом"
    >
      {/* ─── 0. ГОРЯЧАЯ НОВОСТЬ ─────────────────────────────────────────────── */}
      {news && news.length > 0 && (
        <HotNewsWidget news={news} onOpen={onOpenNews} />
      )}


      {/* ─── 2. ЧАТ С ЭКСПОНЕНТОМ ───────────────────────────────────────────── */}
      <button
        type="button"
        onClick={onOpenChat}
        className={[
          'w-full flex items-center gap-4 px-5 py-6 rounded-xl',
          'text-left transition-all duration-150 active:scale-[0.98] hover:brightness-110',
          'focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0B2B5E]/40',
        ].join(' ')}
        style={{ backgroundColor: '#0B2B5E' }}
        aria-label="Начать чат с экспонентом"
      >
        <span
          className="flex-shrink-0 w-11 h-11 rounded-xl flex items-center justify-center"
          style={{ backgroundColor: 'rgba(255,255,255,0.12)' }}
          aria-hidden="true"
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
        </span>

        <div className="flex-1 min-w-0">
          <p className="text-sm font-black uppercase tracking-wide text-white leading-tight">
            Чат с экспонентом
          </p>
          <p className="text-xs font-medium leading-tight mt-1" style={{ color: 'rgba(255,255,255,0.65)' }}>
            Обычно отвечает за 5 минут
          </p>
        </div>

        <span
          className="flex-shrink-0 w-3 h-3 rounded-full bg-emerald-400"
          style={{ boxShadow: '0 0 0 3px rgba(52,211,153,0.35)' }}
          aria-hidden="true"
        />
      </button>

      {/* ─── 3. КОМАНДА ЭКСПОНЕНТА ОНЛАЙН ───────────────────────────────────── */}
      <div
        className="w-full rounded-2xl px-4 py-4"
        style={{
          backgroundColor: '#ffffff',
          border: '1px solid rgba(11,43,94,0.20)',
        }}
      >
        <div className="flex items-center gap-2 mb-4">
          <span
            className="inline-block w-2.5 h-2.5 rounded-full bg-emerald-400 flex-shrink-0"
            style={{ boxShadow: '0 0 0 3px rgba(52,211,153,0.22)' }}
            aria-hidden="true"
          />
          <h3 className="text-xs font-black uppercase tracking-widest" style={{ color: '#0B2B5E' }}>
            Команда онлайн
          </h3>
          <span
            className="ml-auto text-[10px] font-bold px-2 py-0.5 rounded-full"
            style={{ backgroundColor: 'rgba(52,211,153,0.12)', color: '#059669' }}
          >
            4 из 4
          </span>
        </div>

        <div className="grid grid-cols-2 gap-4">
          {[
            { initials: 'АЛ', name: 'Алексей',  role: 'Продажи',          color: '#0B2B5E' },
            { initials: 'ИР', name: 'Ирина',    role: 'Техподдержка',     color: '#1a4080' },
            { initials: 'ДМ', name: 'Дмитрий',  role: 'Сервис',           color: '#0d3570' },
            { initials: 'ЕЛ', name: 'Елена',    role: 'Лизинг и Финансы', color: '#163a6e' },
          ].map(({ initials, name, role, color }) => (
            <button
              key={initials}
              type="button"
              className="flex flex-col items-center gap-2 group focus:outline-none"
              aria-label={`Написать ${name} (${role})`}
            >
              <div className="relative">
                <div
                  className="w-16 h-16 rounded-full flex items-center justify-center text-white text-base font-bold select-none transition-transform duration-150 group-hover:scale-110"
                  style={{ backgroundColor: color }}
                >
                  {initials}
                </div>
                <span
                  className="absolute bottom-1 right-1 w-3.5 h-3.5 rounded-full bg-emerald-400 border-2 border-white"
                  style={{ boxShadow: '0 0 0 2px rgba(52,211,153,0.40)' }}
                  aria-hidden="true"
                />
              </div>
              <span className="text-sm font-bold leading-tight text-center" style={{ color: '#0B2B5E' }}>
                {name}
              </span>
              <span className="text-[11px] font-semibold leading-tight text-center text-slate-500 -mt-0.5 line-clamp-2 w-full px-0.5">
                {role}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* ─── 4. ДОКУМЕНТЫ И СЕРТИФИКАТЫ ─────────────────────────────────────── */}
      <div className="flex flex-col gap-2">
        <button
          type="button"
          className={[
            'w-full flex items-center gap-4 px-5 py-5 rounded-xl',
            'text-left transition-all duration-150 active:scale-[0.98] hover:bg-[rgba(11,43,94,0.08)]',
            'focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0B2B5E]/40',
          ].join(' ')}
          style={{
            backgroundColor: 'rgba(11,43,94,0.05)',
            border: '1px solid rgba(11,43,94,0.20)',
          }}
          aria-label="Сертификаты и документы ISO, ГОСТ"
        >
          <span
            className="flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center"
            style={{ backgroundColor: '#0B2B5E' }}
            aria-hidden="true"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              <path d="M9 12l2 2 4-4" />
            </svg>
          </span>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-black uppercase tracking-wide leading-tight" style={{ color: '#0B2B5E' }}>
              Сертификаты и документы
            </p>
            <p className="text-xs font-medium text-slate-400 mt-1">ISO, ГОСТ, декларации</p>
          </div>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#0B2B5E" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
            <path d="M5 12h14M12 5l7 7-7 7" />
          </svg>
        </button>

        <button
          type="button"
          className={[
            'w-full flex items-center gap-4 px-5 py-5 rounded-xl',
            'text-left transition-all duration-150 active:scale-[0.98] hover:bg-[rgba(11,43,94,0.08)]',
            'focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0B2B5E]/40',
          ].join(' ')}
          style={{
            backgroundColor: 'rgba(11,43,94,0.05)',
            border: '1px solid rgba(11,43,94,0.20)',
          }}
          aria-label="Типовые договоры и оферты"
        >
          <span
            className="flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center"
            style={{ backgroundColor: '#0B2B5E' }}
            aria-hidden="true"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
            </svg>
          </span>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-black uppercase tracking-wide leading-tight" style={{ color: '#0B2B5E' }}>
              Типовые договоры
            </p>
            <p className="text-xs font-medium text-slate-400 mt-1">оферты и шаблоны</p>
          </div>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#0B2B5E" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
            <path d="M5 12h14M12 5l7 7-7 7" />
          </svg>
        </button>

        {/* ── «Загрузить реквизиты» — Smart Contract CTA ── */}
        <button
          type="button"
          onClick={onUploadRequisites}
          className={[
            'w-full flex items-center gap-4 px-5 py-5 rounded-xl',
            'text-left transition-all duration-150 active:scale-[0.98]',
            'hover:bg-[rgba(242,101,34,0.08)]',
            'focus:outline-none focus-visible:ring-2 focus-visible:ring-[#F26522]/50',
          ].join(' ')}
          style={{
            backgroundColor: 'rgba(242,101,34,0.06)',
            border: '1px solid rgba(242,101,34,0.30)',
          }}
          aria-label="Загрузить реквизиты компании для создания договора"
        >
          <span
            className="flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center"
            style={{ backgroundColor: '#F26522' }}
            aria-hidden="true"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="17 8 12 3 7 8" />
              <line x1="12" y1="3" x2="12" y2="15" />
            </svg>
          </span>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-black uppercase tracking-wide leading-tight" style={{ color: '#F26522' }}>
              Загрузить реквизиты
            </p>
            <p className="text-xs font-medium text-slate-400 mt-1">AI-анализ и верификация</p>
          </div>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#F26522" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
            <path d="M5 12h14M12 5l7 7-7 7" />
          </svg>
        </button>
      </div>
    </aside>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// SMART CONTRACT MODULE: МОДАЛ «ЗАГРУЗИТЬ РЕКВИЗИТЫ»
// 3 шага: [Загрузка файла] → [AI-анализ] → [Форма верификации + Подтвердить]
// ═══════════════════════════════════════════════════════════════════════════════

type RequisitesStep = 'upload' | 'analyzing' | 'form' | 'done';

interface RequisitesFormData {
  inn: string;
  address: string;
  bankAccount: string;
}

interface UploadRequisitesModalProps {
  open: boolean;
  onClose: () => void;
}

/**
 * `UploadRequisitesModal` — трёхшаговый модал Smart Contract Module.
 *
 * Флоу:
 *   1. `upload`    — Drag & Drop / клик для загрузки файла (PDF/JPG/PNG)
 *   2. `analyzing` — Прогресс-бар AI-анализа (симуляция ~2 с)
 *   3. `form`      — Форма верификации: ИНН, Адрес, Расчётный счёт + Подтвердить
 *   4. `done`      — Сообщение об успехе
 */
function UploadRequisitesModal({ open, onClose }: UploadRequisitesModalProps) {
  const [step, setStep]               = useState<RequisitesStep>('upload');
  const [progress, setProgress]       = useState(0);
  const [dragOver, setDragOver]       = useState(false);
  const [fileName, setFileName]       = useState('');
  const [form, setForm]               = useState<RequisitesFormData>({ inn: '', address: '', bankAccount: '' });
  const fileInputRef                  = useRef<HTMLInputElement>(null);

  // Сброс состояния при открытии
  useEffect(() => {
    if (open) {
      setStep('upload');
      setProgress(0);
      setFileName('');
      setForm({ inn: '', address: '', bankAccount: '' });
    }
  }, [open]);

  // Шаг 2: Симуляция AI-анализа
  useEffect(() => {
    if (step !== 'analyzing') return;
    let p = 0;
    const interval = setInterval(() => {
      p += Math.random() * 12 + 6;
      if (p >= 100) {
        p = 100;
        clearInterval(interval);
        setTimeout(() => setStep('form'), 400);
      }
      setProgress(Math.min(p, 100));
    }, 120);
    return () => clearInterval(interval);
  }, [step]);

  // Закрытие по Escape
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open, onClose]);

  // Блокировка скролла body
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, [open]);

  if (!open) return null;

  function handleFile(file: File) {
    setFileName(file.name);
    setStep('analyzing');
    setProgress(0);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }

  function handleFileInput(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  }

  const stepLabels: Record<Exclude<RequisitesStep, 'done'>, string> = {
    upload:    'Загрузка',
    analyzing: 'AI-анализ',
    form:      'Верификация',
  };

  const progressLabel =
    progress < 35 ? 'Распознавание текста...'
    : progress < 70 ? 'Извлечение реквизитов...'
    : 'Верификация данных...';

  const isFormValid = form.inn.trim().length >= 10 && form.address.trim().length > 5 && form.bankAccount.trim().length >= 20;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(11,43,94,0.80)', backdropFilter: 'blur(6px)' }}
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Загрузить реквизиты"
    >
      <div
        className="relative w-full max-w-[440px] rounded-2xl overflow-hidden"
        style={{ backgroundColor: '#fff', boxShadow: '0 24px 80px rgba(0,0,0,0.30)' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── Заголовок модала ── */}
        <div className="px-6 py-4 flex items-center gap-3" style={{ backgroundColor: '#0B2B5E' }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="17 8 12 3 7 8" />
            <line x1="12" y1="3" x2="12" y2="15" />
          </svg>
          <span className="text-sm font-black uppercase tracking-widest text-white flex-1">
            Загрузить реквизиты
          </span>
          {/* Индикатор шагов */}
          <div className="flex items-center gap-1.5 mr-2" aria-hidden="true">
            {(['upload', 'analyzing', 'form'] as const).map((s, i) => {
              const stepOrder = { upload: 0, analyzing: 1, form: 2, done: 3 };
              const currentOrder = stepOrder[step];
              const isActive = s === step;
              const isDone = currentOrder > i;
              return (
                <div
                  key={s}
                  title={stepLabels[s]}
                  className="w-2 h-2 rounded-full transition-all duration-300"
                  style={{
                    backgroundColor: isActive ? '#F26522' : isDone ? 'rgba(255,255,255,0.60)' : 'rgba(255,255,255,0.25)',
                    transform: isActive ? 'scale(1.25)' : 'scale(1)',
                  }}
                />
              );
            })}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex items-center justify-center w-7 h-7 rounded-full transition-colors hover:bg-white/20 focus:outline-none"
            aria-label="Закрыть модальное окно"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round">
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* ── Тело модала ── */}
        <div className="px-6 py-5">

          {/* ── ШАГ 1: ЗАГРУЗКА ФАЙЛА ── */}
          {step === 'upload' && (
            <div className="flex flex-col gap-4">
              <p className="text-xs text-slate-500 leading-relaxed">
                Загрузите PDF или фото реквизитов компании. AI автоматически извлечёт ИНН, адрес и банковские данные.
              </p>
              <div
                className="relative flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed py-10 cursor-pointer transition-all duration-200"
                style={{
                  borderColor:     dragOver ? '#F26522' : 'rgba(11,43,94,0.22)',
                  backgroundColor: dragOver ? 'rgba(242,101,34,0.05)' : 'rgba(11,43,94,0.03)',
                }}
                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') fileInputRef.current?.click(); }}
                aria-label="Перетащите файл или нажмите для выбора"
              >
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"
                  stroke={dragOver ? '#F26522' : '#0B2B5E'} aria-hidden="true">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="17 8 12 3 7 8" />
                  <line x1="12" y1="3" x2="12" y2="15" />
                </svg>
                <span className="text-xs font-semibold" style={{ color: dragOver ? '#F26522' : '#0B2B5E' }}>
                  Перетащите файл сюда
                </span>
                <span className="text-[10px] text-slate-400">или кликните для выбора</span>
                <span
                  className="inline-flex items-center px-3 py-1 rounded-full text-[10px] font-medium"
                  style={{ backgroundColor: 'rgba(11,43,94,0.08)', color: '#0B2B5E' }}
                >
                  PDF · JPG · PNG · до 10 МБ
                </span>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png"
                  className="sr-only"
                  onChange={handleFileInput}
                  tabIndex={-1}
                  aria-hidden="true"
                />
              </div>
            </div>
          )}

          {/* ── ШАГ 2: AI-АНАЛИЗ ── */}
          {step === 'analyzing' && (
            <div className="flex flex-col gap-5 py-2">
              <div className="flex items-center gap-3">
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ backgroundColor: 'rgba(11,43,94,0.08)' }}
                  aria-hidden="true"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#0B2B5E" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                    className="animate-spin" style={{ animationDuration: '2s' }}>
                    <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-bold" style={{ color: '#0B2B5E' }}>AI-анализ документа</p>
                  <p className="text-[11px] text-slate-400 mt-0.5 max-w-[260px] truncate">{fileName}</p>
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] font-medium text-slate-500">{progressLabel}</span>
                  <span className="text-[11px] font-bold tabular-nums" style={{ color: '#F26522' }}>
                    {Math.round(progress)}%
                  </span>
                </div>
                <div className="w-full h-2 rounded-full overflow-hidden" style={{ backgroundColor: 'rgba(11,43,94,0.08)' }}>
                  <div
                    className="h-full rounded-full transition-all duration-100"
                    style={{
                      width:      `${progress}%`,
                      background: 'linear-gradient(90deg, #0B2B5E 0%, #F26522 100%)',
                    }}
                    role="progressbar"
                    aria-valuenow={Math.round(progress)}
                    aria-valuemin={0}
                    aria-valuemax={100}
                  />
                </div>
              </div>
              <p className="text-[10px] text-slate-400 text-center">
                Анализируем реквизиты через AI-модуль EXPO 365...
              </p>
            </div>
          )}

          {/* ── ШАГ 3: ФОРМА ВЕРИФИКАЦИИ ── */}
          {step === 'form' && (
            <div className="flex flex-col gap-4">
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg" style={{ backgroundColor: 'rgba(11,43,94,0.05)' }}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#0B2B5E" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                  <path d="M9 12l2 2 4-4" />
                </svg>
                <p className="text-[10px] font-semibold" style={{ color: '#0B2B5E' }}>
                  Данные успешно распознаны. Проверьте и скорректируйте при необходимости.
                </p>
              </div>
              {[
                { label: 'ИНН',               key: 'inn',         placeholder: '7700000000',                    maxLength: 12, hint: '10 или 12 цифр' },
                { label: 'Юридический адрес', key: 'address',     placeholder: 'г. Москва, ул. Примерная, д. 1', maxLength: 200, hint: 'полный адрес регистрации' },
                { label: 'Расчётный счёт',    key: 'bankAccount', placeholder: '40702810000000000000',           maxLength: 20, hint: '20 цифр' },
              ].map(({ label, key, placeholder, maxLength, hint }) => (
                <div key={key}>
                  <div className="flex items-baseline justify-between mb-1.5">
                    <label className="block text-[11px] font-bold uppercase tracking-wide" style={{ color: '#0B2B5E' }}>
                      {label}
                    </label>
                    <span className="text-[10px] text-slate-400">{hint}</span>
                  </div>
                  <input
                    type="text"
                    value={form[key as keyof RequisitesFormData]}
                    onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                    placeholder={placeholder}
                    maxLength={maxLength}
                    className="w-full px-3 py-2.5 rounded-lg text-sm border transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#F26522]/40"
                    style={{ borderColor: 'rgba(11,43,94,0.18)', color: '#0B2B5E' }}
                  />
                </div>
              ))}
            </div>
          )}

          {/* ── ФИНАЛЬНЫЙ ШАГ: УСПЕХ ── */}
          {step === 'done' && (
            <div className="flex flex-col items-center gap-4 py-6">
              <div
                className="w-16 h-16 rounded-full flex items-center justify-center"
                style={{ backgroundColor: 'rgba(11,43,94,0.08)' }}
                aria-hidden="true"
              >
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#0B2B5E" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                  <polyline points="22 4 12 14.01 9 11.01" />
                </svg>
              </div>
              <div className="text-center">
                <p className="text-sm font-bold mb-1" style={{ color: '#0B2B5E' }}>Реквизиты успешно сохранены</p>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Данные переданы в систему Smart Contract для автоматического формирования договора
                </p>
              </div>
            </div>
          )}
        </div>

        {/* ── Подвал модала ── */}
        {(step === 'form' || step === 'done') && (
          <div className="px-6 pb-6 flex gap-3">
            {step === 'form' && (
              <>
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold border transition-colors hover:bg-slate-50 focus:outline-none"
                  style={{ borderColor: 'rgba(11,43,94,0.20)', color: '#0B2B5E' }}
                >
                  Отмена
                </button>
                <button
                  type="button"
                  onClick={() => setStep('done')}
                  disabled={!isFormValid}
                  className="flex-1 px-4 py-2.5 rounded-xl text-sm font-bold transition-all active:scale-[0.98] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#F26522]/50 disabled:opacity-40 disabled:cursor-not-allowed"
                  style={{
                    backgroundColor: '#F26522',
                    color:           '#FFFFFF',
                    boxShadow:       isFormValid ? '0 3px 10px rgba(242,101,34,0.35)' : 'none',
                  }}
                >
                  Подтвердить
                </button>
              </>
            )}
            {step === 'done' && (
              <button
                type="button"
                onClick={onClose}
                className="w-full px-4 py-2.5 rounded-xl text-sm font-bold transition-all hover:brightness-110 focus:outline-none"
                style={{ backgroundColor: '#0B2B5E', color: '#FFFFFF' }}
              >
                Закрыть
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// МОДАЛЬНОЕ ОКНО — КАРТОЧКА ТОВАРА / ДЕЙСТВИЯ
// ═══════════════════════════════════════════════════════════════════════════════

interface ProductModalProps {
  product:          ExhibitorProduct | null;
  onClose:          () => void;
  /** Callback для инициирования сделки ("Сформировать запрос") */
  onDealRequest?:   (product: ExhibitorProduct) => void;
  /** Байер пришёл по реферальной ссылке — показывать partner price */
  isReferralBuyer?: boolean;
}

/**
 * Модальное окно с детальной карточкой и кнопками действий.
 *
 * Логика кнопок:
 *   • `equipment` / `service` → [Запросить КП] [Видеопрезентацию] [Тест-драйв]
 *                               + акцентная CTA [Запросить финансовую поддержку]
 *   • прочие → [Запросить КП] [Запросить образец]
 */
function ProductModal({ product, onClose, onDealRequest, isReferralBuyer }: ProductModalProps) {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const router = useRouter();

  if (!product) return null;

  const isEquipment    = product.category === 'equipment' || product.category === 'service';
  const hasPartnerDeal = isReferralBuyer && !!product.partnerPrice;

  const handleOverlayClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 sm:p-6"
      style={{ backgroundColor: 'rgba(11,43,94,0.55)', backdropFilter: 'blur(4px)' }}
      onClick={handleOverlayClick}
      role="dialog"
      aria-modal="true"
      aria-label={`Карточка: ${product.name}`}
    >
      <div
        className="relative w-full max-w-md rounded-2xl overflow-hidden bg-white"
        style={{ boxShadow: '0 24px 80px rgba(11,43,94,0.30)' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="absolute inset-x-0 top-0 h-1 bg-[#F26522]" aria-hidden="true" />

        {/* Фото / плейсхолдер */}
        <div
          className="relative w-full aspect-[16/9] overflow-hidden"
          style={{ background: product.imageGradient }}
        >
          {product.imageUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={product.imageUrl}
              alt={product.name}
              className="absolute inset-0 w-full h-full object-cover"
            />
          )}

          <div className="absolute top-3 left-3 flex gap-1.5">
            {product.isNew && (
              <span
                className="inline-flex items-center px-2 py-0.5 rounded-md text-[9px] font-bold uppercase tracking-wide select-none"
                style={{ backgroundColor: '#F26522', color: '#FFFFFF' }}
              >
                Новинка
              </span>
            )}
            {isEquipment && (
              <span
                className="inline-flex items-center px-2 py-0.5 rounded-md text-[9px] font-bold uppercase tracking-wide select-none"
                style={{ backgroundColor: 'rgba(11,43,94,0.85)', color: '#FFFFFF' }}
              >
                Оборудование
              </span>
            )}
          </div>

          <button
            type="button"
            onClick={onClose}
            className="absolute top-2 right-2 w-8 h-8 rounded-full flex items-center justify-center transition-colors duration-150"
            style={{ backgroundColor: 'rgba(0,0,0,0.40)', color: '#fff' }}
            aria-label="Закрыть карточку"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true">
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Контент */}
        <div className="px-5 pb-6 pt-4">
          <div className="flex items-start justify-between gap-3 mb-2">
            <h3 className="text-base font-bold leading-snug flex-1" style={{ color: '#0B2B5E' }}>
              {product.name}
            </h3>
            <div className="flex-shrink-0 text-right">
              {hasPartnerDeal ? (
                <>
                  {/* Partner price badge */}
                  <div
                    className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[8px] font-bold uppercase tracking-wide mb-1"
                    style={{ backgroundColor: 'rgba(11,43,94,0.08)', color: '#0B2B5E' }}
                  >
                    <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /><path d="M9 12l2 2 4-4" /></svg>
                    Для партнёров
                  </div>
                  <p className="text-sm font-bold leading-none" style={{ color: '#F26522' }}>
                    {product.partnerPrice}
                  </p>
                  <p className="text-[9px] text-slate-400 line-through mt-0.5">{product.basePrice}</p>
                </>
              ) : (
                <>
                  <p className="text-[10px] text-slate-400 font-medium leading-none mb-0.5">от</p>
                  <p className="text-sm font-bold leading-none" style={{ color: '#F26522' }}>
                    {product.basePrice}
                  </p>
                </>
              )}
            </div>
          </div>

          {product.shortDescription && (
            <p className="text-xs text-slate-500 leading-relaxed mb-4">
              {product.shortDescription}
            </p>
          )}

          <div className="w-full h-px bg-slate-100 mb-4" aria-hidden="true" />

          {isEquipment ? (
            <div className="flex flex-col gap-2.5">
              {/* ── [Smart Contract] Сформировать запрос — PRIMARY CTA ── */}
              {onDealRequest && (
                <button
                  type="button"
                  onClick={() => { onDealRequest(product); onClose(); }}
                  className={[
                    'w-full flex items-center justify-center gap-2.5 rounded-xl px-4 py-3.5',
                    'text-sm font-bold text-white uppercase tracking-wide',
                    'transition-all duration-150 active:scale-[0.98] hover:brightness-110',
                    'focus:outline-none focus-visible:ring-2 focus-visible:ring-[#F26522]/50',
                  ].join(' ')}
                  style={{ backgroundColor: '#F26522', boxShadow: '0 4px 16px rgba(242,101,34,0.40)' }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0" aria-hidden="true">
                    <path d="M9 12h6M12 9v6" />
                    <path d="M3 9a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V9z" />
                  </svg>
                  Сформировать запрос
                </button>
              )}

              <button
                type="button"
                className={[
                  'w-full flex items-center gap-3 rounded-xl px-4 py-3',
                  'border text-sm font-semibold transition-all duration-150',
                  'focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0B2B5E]/40',
                  'active:scale-[0.98] hover:bg-[rgba(11,43,94,0.07)]',
                ].join(' ')}
                style={{ borderColor: 'rgba(11,43,94,0.20)', color: '#0B2B5E', backgroundColor: 'rgba(11,43,94,0.04)' }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0" aria-hidden="true">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <path d="M14 2v6h6M16 13H8M16 17H8M10 9H8" />
                </svg>
                Запросить КП
              </button>

              <button
                type="button"
                className={[
                  'w-full flex items-center gap-3 rounded-xl px-4 py-3',
                  'border text-sm font-semibold transition-all duration-150',
                  'focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0B2B5E]/40',
                  'active:scale-[0.98] hover:bg-[rgba(11,43,94,0.07)]',
                ].join(' ')}
                style={{ borderColor: 'rgba(11,43,94,0.20)', color: '#0B2B5E', backgroundColor: 'rgba(11,43,94,0.04)' }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0" aria-hidden="true">
                  <path d="M15 10l4.553-2.276A1 1 0 0 1 21 8.618v6.764a1 1 0 0 1-1.447.894L15 14" />
                  <rect x="3" y="6" width="12" height="12" rx="2" />
                </svg>
                Заказать видеопрезентацию
              </button>

              <button
                type="button"
                className={[
                  'w-full flex items-center gap-3 rounded-xl px-4 py-3',
                  'border text-sm font-semibold transition-all duration-150',
                  'focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0B2B5E]/40',
                  'active:scale-[0.98] hover:bg-[rgba(11,43,94,0.07)]',
                ].join(' ')}
                style={{ borderColor: 'rgba(11,43,94,0.20)', color: '#0B2B5E', backgroundColor: 'rgba(11,43,94,0.04)' }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0" aria-hidden="true">
                  <circle cx="12" cy="12" r="10" />
                  <path d="M12 8v4l3 3" />
                </svg>
                Запросить тест-драйв
              </button>

              <div className="w-full h-px bg-slate-100" aria-hidden="true" />

              <Link
                href="/horeca/finance"
                className={[
                  'w-full flex items-center justify-center gap-3 rounded-xl px-4 py-3.5',
                  'text-sm font-semibold text-white transition-all duration-150',
                  'focus:outline-none focus-visible:ring-2 focus-visible:ring-[#F26522]/50',
                  'active:scale-[0.98] hover:brightness-110',
                ].join(' ')}
                style={{ backgroundColor: '#F26522', boxShadow: '0 4px 16px rgba(242,101,34,0.40)' }}
              >
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0" aria-hidden="true">
                  <path d="M2 12C2 6.477 6.477 2 12 2s10 4.477 10 10-4.477 10-10 10S2 17.523 2 12z" />
                  <path d="M9.5 9.5a2.5 2.5 0 0 1 5 0c0 2.5-5 3.5-5 6h5" />
                  <path d="M12 18.5v.5" />
                </svg>
                Запросить финансовую поддержку
              </Link>
            </div>
          ) : (
            <div className="flex flex-col gap-2.5">
              {/* ── [Smart Contract] Сформировать запрос — PRIMARY CTA (non-equipment) ── */}
              {onDealRequest && (
                <button
                  type="button"
                  onClick={() => { onDealRequest(product); onClose(); }}
                  className={[
                    'w-full flex items-center justify-center gap-2.5 rounded-xl px-4 py-3.5',
                    'text-sm font-bold text-white uppercase tracking-wide',
                    'transition-all duration-150 active:scale-[0.98] hover:brightness-110',
                    'focus:outline-none focus-visible:ring-2 focus-visible:ring-[#F26522]/50',
                  ].join(' ')}
                  style={{ backgroundColor: '#F26522', boxShadow: '0 4px 16px rgba(242,101,34,0.40)' }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0" aria-hidden="true">
                    <path d="M9 12h6M12 9v6" />
                    <path d="M3 9a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V9z" />
                  </svg>
                  Сформировать запрос
                </button>
              )}

              <button
                type="button"
                className={[
                  'w-full flex items-center gap-3 rounded-xl px-4 py-3',
                  'border text-sm font-semibold transition-all duration-150',
                  'focus:outline-none focus-visible:ring-2 focus-visible:ring-[#F26522]/40',
                  'active:scale-[0.98] hover:bg-[rgba(242,101,34,0.06)]',
                ].join(' ')}
                style={{ borderColor: '#F26522', color: '#F26522', backgroundColor: 'transparent' }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0" aria-hidden="true">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <path d="M14 2v6h6M16 13H8M16 17H8M10 9H8" />
                </svg>
                Запросить КП
              </button>

              <button
                type="button"
                className={[
                  'w-full flex items-center gap-3 rounded-xl px-4 py-3',
                  'text-sm font-semibold text-white transition-all duration-150',
                  'focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0B2B5E]/40',
                  'active:scale-[0.98] hover:brightness-110',
                ].join(' ')}
                style={{ backgroundColor: '#0B2B5E', boxShadow: '0 2px 10px rgba(11,43,94,0.20)' }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0" aria-hidden="true">
                  <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                </svg>
                Запросить образец
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// DEAL REQUEST MODAL — Smart Contract Bridge
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Модал "Сформировать запрос" — инициализирует объект Сделки.
 * При submit:
 *   1. dispatch CREATE_DEAL → EcosystemStore
 *   2. dispatch MARK_CLIENT → если байер реферальный
 *   3. dispatch REGISTER_REFERRAL_VISITOR → если байер реферальный и новый
 *
 * TODO (Supabase): заменить dispatch на INSERT INTO deal_requests + RLS
 */
interface DealRequestModalProps {
  product:        ExhibitorProduct;
  exhibitorSlug:  string;
  exhibitorName:  string;
  isReferralBuyer: boolean;
  onClose:        () => void;
}

function DealRequestModal({ product, exhibitorSlug, exhibitorName, isReferralBuyer, onClose }: DealRequestModalProps) {
  const { state, dispatch } = useEcosystem();
  const [submitted,  setSubmitted]  = useState(false);
  const [quantity,   setQuantity]   = useState(1);
  const [name,       setName]       = useState('');
  const [company,    setCompany]    = useState('');
  const [email,      setEmail]      = useState('');
  const [message,    setMessage]    = useState('');
  const [isLoading,  setIsLoading]  = useState(false);

  const showPartnerPrice = isReferralBuyer && !!product.partnerPrice;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim()) return;
    setIsLoading(true);

    // Имитируем сетевой запрос
    await new Promise((r) => setTimeout(r, 800));

    const buyerId = `buyer-${Date.now()}`;

    const deal = {
      id:            `deal-${Date.now()}`,
      productId:     product.id,
      productName:   product.name,
      exhibitorId:   `exp-${exhibitorSlug}`,
      exhibitorName,
      exhibitorSlug,
      buyerId,
      buyerName:     name.trim(),
      buyerEmail:    email.trim(),
      buyerCompany:  company.trim(),
      status:        'new' as const,
      isPartnerDeal: isReferralBuyer,
      partnerPrice:  showPartnerPrice ? product.partnerPrice : undefined,
      basePrice:     product.basePrice,
      quantity,
      message:       message.trim() || undefined,
      createdAt:     new Date().toISOString(),
    };

    dispatch({ type: 'CREATE_DEAL', deal });

    // Если реферальный байер — регистрируем как клиента
    if (isReferralBuyer && state.referralSource) {
      const existing = state.referralClients.find(c => c.buyerEmail === email.trim());
      if (!existing) {
        dispatch({
          type: 'REGISTER_REFERRAL_VISITOR',
          client: {
            id:           `ref-${Date.now()}`,
            buyerId,
            buyerName:    name.trim(),
            buyerEmail:   email.trim(),
            buyerCompany: company.trim() || '—',
            referralSlug: state.referralSource,
            visitedAt:    new Date().toISOString(),
            firstDealAt:  new Date().toISOString(),
            totalDeals:   1,
            status:       'client',
          },
        });
      } else {
        dispatch({ type: 'MARK_CLIENT', buyerId: existing.buyerId });
      }
    }

    setIsLoading(false);
    setSubmitted(true);
  };

  const inputCls = [
    'w-full h-10 px-3 rounded-xl border text-sm text-[#0B2B5E]',
    'bg-slate-50 border-slate-200 placeholder:text-slate-400',
    'focus:outline-none focus:border-[#F26522]/70 focus:bg-white',
    'transition-colors duration-150',
  ].join(' ');

  return (
    <div
      className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-4 sm:p-6"
      style={{ backgroundColor: 'rgba(11,43,94,0.60)', backdropFilter: 'blur(6px)' }}
      role="dialog"
      aria-modal="true"
      aria-label="Сформировать запрос"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="relative w-full max-w-md bg-white rounded-2xl overflow-hidden"
        style={{ boxShadow: '0 24px 80px rgba(11,43,94,0.30)' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Синяя полоска-акцент сверху */}
        <div className="absolute inset-x-0 top-0 h-1 bg-[#0B2B5E]" aria-hidden="true" />

        {/* Header */}
        <div
          className="flex items-center justify-between px-5 py-4"
          style={{ borderBottom: '1px solid rgba(11,43,94,0.08)' }}
        >
          <div className="flex items-center gap-2.5">
            <div
              className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
              style={{ backgroundColor: 'rgba(11,43,94,0.08)' }}
              aria-hidden="true"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#0B2B5E" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 12h6M12 9v6" />
                <path d="M3 9a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V9z" />
              </svg>
            </div>
            <h2 className="text-sm font-bold" style={{ color: '#0B2B5E' }}>
              Сформировать запрос
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors duration-150"
            aria-label="Закрыть"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M18 6 6 18M6 6l12 12" /></svg>
          </button>
        </div>

        {/* Body */}
        <div className="px-5 py-4">
          {submitted ? (
            /* Success state */
            <div className="flex flex-col items-center gap-4 py-6 text-center">
              <div
                className="w-14 h-14 rounded-2xl flex items-center justify-center"
                style={{ backgroundColor: 'rgba(11,43,94,0.06)' }}
              >
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#0B2B5E" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                  <path d="M9 12l2 2 4-4" />
                </svg>
              </div>
              <div>
                <h3 className="text-base font-bold text-[#0B2B5E] mb-1">Запрос отправлен!</h3>
                <p className="text-[12px] text-slate-500 leading-relaxed">
                  Ваш запрос на{' '}<strong className="text-[#0B2B5E]">{product.name}</strong>{' '}
                  передан экспоненту. Ожидайте ответа в течение 1 рабочего дня.
                </p>
                {isReferralBuyer && (
                  <div
                    className="inline-flex items-center gap-1.5 mt-2 px-3 py-1.5 rounded-lg text-[11px] font-medium"
                    style={{ backgroundColor: 'rgba(11,43,94,0.06)', color: '#0B2B5E' }}
                  >
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /><path d="M9 12l2 2 4-4" /></svg>
                    Применена партнёрская цена
                  </div>
                )}
              </div>
              <button
                type="button"
                onClick={onClose}
                className="px-6 py-2.5 rounded-xl text-sm font-semibold text-white transition-all duration-150 hover:brightness-110 active:scale-95"
                style={{ backgroundColor: '#F26522', boxShadow: '0 4px 12px rgba(242,101,34,0.35)' }}
              >
                Закрыть
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="flex flex-col gap-3.5">
              {/* Товар */}
              <div
                className="flex items-center gap-3 p-3 rounded-xl"
                style={{ backgroundColor: 'rgba(11,43,94,0.04)', border: '1px solid rgba(11,43,94,0.08)' }}
              >
                <div
                  className="w-10 h-10 rounded-lg flex-shrink-0 overflow-hidden"
                  style={{ background: product.imageGradient }}
                  aria-hidden="true"
                />
                <div className="flex-1 min-w-0">
                  <p className="text-[12px] font-bold text-[#0B2B5E] truncate">{product.name}</p>
                  <p className="text-[11px] font-semibold" style={{ color: '#F26522' }}>
                    {showPartnerPrice ? product.partnerPrice : product.basePrice}
                    {showPartnerPrice && (
                      <span className="ml-1.5 text-[9px] text-slate-400 font-normal line-through">
                        {product.basePrice}
                      </span>
                    )}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button type="button" onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    className="w-7 h-7 rounded-lg border flex items-center justify-center text-[#0B2B5E] hover:bg-[#0B2B5E]/[0.06] transition-colors"
                    style={{ borderColor: 'rgba(11,43,94,0.20)' }}>–</button>
                  <span className="text-sm font-bold text-[#0B2B5E] w-6 text-center">{quantity}</span>
                  <button type="button" onClick={() => setQuantity(quantity + 1)}
                    className="w-7 h-7 rounded-lg border flex items-center justify-center text-[#0B2B5E] hover:bg-[#0B2B5E]/[0.06] transition-colors"
                    style={{ borderColor: 'rgba(11,43,94,0.20)' }}>+</button>
                </div>
              </div>

              {/* Partner badge */}
              {showPartnerPrice && (
                <div
                  className="flex items-center gap-2 px-3 py-2 rounded-lg text-[11px] font-medium"
                  style={{ backgroundColor: 'rgba(11,43,94,0.06)', color: '#0B2B5E' }}
                >
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /><path d="M9 12l2 2 4-4" /></svg>
                  Цена для партнёров активирована — вы пришли по ссылке приглашения
                </div>
              )}

              {/* Поля */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[9px] font-bold uppercase tracking-widest text-slate-500 mb-1">Ваше имя *</label>
                  <input required type="text" placeholder="Иван Иванов" value={name} onChange={e => setName(e.target.value)} className={inputCls} />
                </div>
                <div>
                  <label className="block text-[9px] font-bold uppercase tracking-widest text-slate-500 mb-1">Компания</label>
                  <input type="text" placeholder='ООО «...»' value={company} onChange={e => setCompany(e.target.value)} className={inputCls} />
                </div>
              </div>

              <div>
                <label className="block text-[9px] font-bold uppercase tracking-widest text-slate-500 mb-1">E-mail *</label>
                <input required type="email" placeholder="ivan@company.ru" value={email} onChange={e => setEmail(e.target.value)} className={inputCls} />
              </div>

              <div>
                <label className="block text-[9px] font-bold uppercase tracking-widest text-slate-500 mb-1">Сообщение</label>
                <textarea
                  rows={2}
                  placeholder="Дополнительные сведения о заказе..."
                  value={message}
                  onChange={e => setMessage(e.target.value)}
                  className={[inputCls, 'h-auto resize-none py-2.5'].join(' ')}
                />
              </div>

              {/* Footer */}
              <div className="flex items-center gap-3 pt-1">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 h-10 rounded-xl border text-sm font-medium text-slate-500 hover:bg-slate-50 transition-colors duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0B2B5E]/20"
                  style={{ borderColor: 'rgba(11,43,94,0.15)' }}
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="flex-1 h-10 rounded-xl text-sm font-bold text-white transition-all duration-150 hover:brightness-110 active:scale-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0B2B5E]/40 disabled:opacity-60"
                  style={{ backgroundColor: '#0B2B5E', boxShadow: '0 4px 12px rgba(11,43,94,0.25)' }}
                >
                  {isLoading ? (
                    <span className="flex items-center justify-center gap-2">
                      <svg className="animate-spin" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" /></svg>
                      Отправка...
                    </span>
                  ) : 'Отправить запрос'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// ГЛАВНЫЙ CLIENT COMPONENT — ExhibitorPageClient
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Роль текущего пользователя — передаётся из Server Component page.tsx.
 *
 * SECURITY: значение читается из `app_metadata` (server-editable только),
 * не из `user_metadata` (небезопасна для авторизационных решений).
 *
 *   'visitor'        — зарегистрированный байер / посетитель выставки
 *   'exhibitor'      — верифицированный экспонент платформы
 *   'private_person' — частное лицо (view-only, без B2B-диалогов)
 *   null             — анонимный / не авторизован
 */
export type UserRole = 'visitor' | 'exhibitor' | 'private_person' | null;

export interface ExhibitorPageClientProps {
  profile: ExhibitorProfile;
  /**
   * Роль текущего пользователя из app_metadata.
   * Управляет видимостью кнопки «Чат» (RBAC):
   *   • 'visitor' | 'exhibitor' → кнопка ВИДНА
   *   • 'private_person' | null → кнопка СКРЫТА
   */
  userRole: UserRole;
  /**
   * auth.uid() текущего пользователя — используется как sender_id
   * при вставке в таблицу messages. null = анонимный.
   */
  userId: string | null;
}

/**
 * `ExhibitorPageClient` — персональная витрина экспонента. Blueprint 3.0.
 *
 * Структура:
 *   1. ExhibitorHeader        — аватар, имя, бейдж, статистика, bio, [+ ПОДПИСАТЬСЯ].
 *   2. RecommendedPartnersBar — Instagram Stories-бар партнёров.
 *   3. Двухколоночный layout (xl:flex-row):
 *      • Левая колонка  (flex-1):
 *          - Sticky-табы (Все / Кофе / ... / Новости / О компании)
 *          - Гибридная сетка (8 колонок): товары + новостные карточки перемешаны
 *      • Правая колонка (w-[380px], sticky):
 *          - HotNewsWidget («ГОРЯЧАЯ НОВОСТЬ»)
 *          - ExhibitorSidebar (спецпредложения, чат, команда, документы)
 *   4. ProductModal     — модальное окно товара.
 *   5. ExhibitorArticleModal — модальное окно новости.
 *
 * Mobile: правая колонка — под основным контентом (flex-col).
 */
export default function ExhibitorPageClient({
  profile,
  userRole,
  userId,
}: ExhibitorPageClientProps) {
  // ── URL Parameters & Preview Mode ───────────────────────────────────────────
  const searchParams = useSearchParams();
  const testAsBuyerId = searchParams.get('test_as');
  
  // ── Ecosystem State ──────────────────────────────────────────────────────────
  const { state: ecoState } = useEcosystem();

  // ── Partner Offer Logic ──────────────────────────────────────────────────────
  const { isPartner, specialTerms, computed } = usePartnerOffer(profile.slug);

  // ── Deal Request Modal state ─────────────────────────────────────────────────
  const [dealProduct, setDealProduct] = useState<ExhibitorProduct | null>(null);

  const [activeTab,        setActiveTab]        = useState<DashboardTab>('all');
  const [selectedProduct,  setSelectedProduct]  = useState<ExhibitorProduct | null>(null);
  const [selectedNews,     setSelectedNews]     = useState<ExhibitorNewsItem | null>(null);
  const [requisitesOpen,   setRequisitesOpen]   = useState(false);
  /** Управляет видимостью B2BChatModal — открывается по клику «ЧАТ С ЭКСПОНЕНТОМ» */
  const [chatOpen, setChatOpen] = useState(false);

  /**
   * RBAC: кнопка «Чат» скрывается ТОЛЬКО для роли 'private_person'.
   *
   * Матрица видимости:
   *   'visitor'        → ПОКАЗАТЬ (зарегистрированный байер)
   *   'exhibitor'      → ПОКАЗАТЬ (верифицированный экспонент)
   *   null             → ПОКАЗАТЬ (анонимный / dev / не авторизован)
   *   'private_person' → СКРЫТЬ  (частное лицо — view-only режим)
   *
   * Если пользователь нажимает чат без авторизации, B2BChatModal показывает
   * сообщение «Необходимо войти в систему» внутри модального окна.
   */
  const canUseChat = userRole !== 'private_person';

  const handleOpenProduct  = useCallback((p: ExhibitorProduct) => setSelectedProduct(p), []);
  const handleCloseProduct = useCallback(() => setSelectedProduct(null), []);
  const handleOpenNews     = useCallback((n: ExhibitorNewsItem) => setSelectedNews(n), []);
  const handleCloseNews    = useCallback(() => setSelectedNews(null), []);

  // ── Smart Contract: открыть Deal Request Modal ───────────────────────────────
  const handleDealRequest  = useCallback((p: ExhibitorProduct) => {
    setSelectedProduct(null); // закрываем ProductModal
    setDealProduct(p);
  }, []);
  const handleCloseDeal    = useCallback(() => setDealProduct(null), []);

  // ── Partner Offer: Smart Contract Integration ────────────────────────────────
  const handleStartDeal = useCallback((computedOffer: PartnerOfferComputed) => {
    // Находим текущего реферального клиента
    const currentReferralClient = ecoState.referralClients.find(
      client => client.referralSlug === ecoState.referralSource
    );

    // Создаем параметры Smart Contract
    const contractParams: SmartContractParams = {
      buyerName: currentReferralClient?.buyerName || 'Неизвестный покупатель',
      buyerEmail: currentReferralClient?.buyerEmail || '',
      buyerCompany: currentReferralClient?.buyerCompany || 'Не указана',
      exhibitorSlug: profile.slug,
      exhibitorName: profile.name,
      computed: computedOffer,
      initiatedAt: new Date().toISOString(),
    };

    // TODO: После подключения Supabase - отправка в таблицу smart_contract_drafts
    console.log('[Smart Contract] Инициализирован:', contractParams);

    // Временно показываем alert с параметрами сделки
    alert(
      `Сделка инициирована!\n\n` +
      `Итоговая цена: ${new Intl.NumberFormat('ru-RU', { style: 'currency', currency: 'RUB', maximumFractionDigits: 0 }).format(computedOffer.finalPrice)}\n` +
      `Скидка: ${computedOffer.discountPercent}% (экономия ${new Intl.NumberFormat('ru-RU', { style: 'currency', currency: 'RUB', maximumFractionDigits: 0 }).format(computedOffer.discountAmount)})\n` +
      `Условия: ${computedOffer.paymentTerms ?
        computedOffer.paymentTerms.type === 'deferred'
          ? `Отсрочка ${computedOffer.paymentTerms.deferralDays} дн.`
          : `Рассрочка: ${computedOffer.initialPayment ? new Intl.NumberFormat('ru-RU', { style: 'currency', currency: 'RUB', maximumFractionDigits: 0 }).format(computedOffer.initialPayment) : 0} + ${computedOffer.paymentTerms.paymentsCount} платежей`
        : 'Полная предоплата'}\n\n` +
      `Параметры переданы в Smart Contract модуль.`
    );
  }, [profile.slug, profile.name, ecoState.referralClients, ecoState.referralSource]);

  // ── Discovery Layer: если slug = 'ooo-test' — читаем продукты из контекста ──
  // Admin Products page при сохранении диспатчит SYNC_PRODUCTS / UPDATE_PRODUCT,
  // что мгновенно обновляет publicProducts без перезагрузки страницы.
  const isOooTest    = profile.slug === 'ooo-test';
  const ecoProducts  = ecoState.oooTestProducts as ExhibitorProduct[];
  const liveProducts: ExhibitorProduct[] = isOooTest ? ecoProducts : profile.products;
  const isReferralBuyer = ecoState.isReferralBuyer;

  // Новости экспонента (из профиля или пустой массив)
  const newsItems = profile.news ?? [];

  // Счётчики для всех 10 вкладок (используем liveProducts для live-sync)
  const counts: Record<DashboardTab, number> = {
    all:          liveProducts.length + newsItems.length,
    coffee:       liveProducts.filter((p) => p.category === 'coffee').length,
    tea:          liveProducts.filter((p) => p.category === 'tea').length,
    equipment:    liveProducts.filter((p) => p.category === 'equipment').length,
    service:      liveProducts.filter((p) => p.category === 'service').length,
    tableware:    liveProducts.filter((p) => p.category === 'tableware').length,
    training:     liveProducts.filter((p) => p.category === 'training').length,
    consumables:  liveProducts.filter((p) => p.category === 'consumables').length,
    news:         newsItems.length,
    about:        0,
  };

  // Строим гибридную сетку (используем liveProducts для поддержки live-sync)
  const gridItems = buildExhibitorGrid(liveProducts, newsItems, activeTab);

  // Blueprint-паттерн для фона контентной зоны
  const blueprintBg = {
    backgroundImage:
      'repeating-linear-gradient(0deg,rgba(11,43,94,0.03) 0px,rgba(11,43,94,0.03) 1px,transparent 1px,transparent 24px),' +
      'repeating-linear-gradient(90deg,rgba(11,43,94,0.03) 0px,rgba(11,43,94,0.03) 1px,transparent 1px,transparent 24px)',
    backgroundColor: '#f8fafc',
  };

  return (
    <>
      {/* Dev Preview Mode Indicator */}
      {testAsBuyerId && (
        <div
          className="fixed top-16 left-0 right-0 z-50 px-4 py-2 text-center text-sm font-medium text-white border-b"
          style={{ backgroundColor: '#F26522' }}
        >
          Режим предпросмотра: Вы видите страницу как партнёр Алексей Сорокин
        </div>
      )}

      <div className={`${testAsBuyerId ? 'mt-28' : 'mt-16'} min-h-[calc(100vh-4rem)]`} style={blueprintBg}>

        {/*
         * ── ГЛОБАЛЬНЫЙ ДВУХКОЛОНОЧНЫЙ КАРКАС ───────────────────────────────────
         *
         * Desktop (xl, ≥ 1280px): flex-row
         *   • Левая колонка  (flex-1):    Header → Рекомендации → Табы → Сетка.
         *   • Правая колонка (w-[380px]): sticky top-16, h-[calc(100vh-64px)],
         *     overflow-y-auto — автономный внутренний скролл.
         *
         * Адаптив (< 1280px / xl): flex-col — сайдбар под контентом.
         */}
        <div className="flex flex-col xl:flex-row items-start max-w-[1920px] mx-auto">

          {/* ── ЛЕВАЯ КОЛОНКА (flex-1): Header + Рекомендации + Табы + Сетка ── */}
          <div className="flex-1 min-w-0 w-full">

            {/* 1. Шапка профиля — кнопка чата показывается только для visitor/exhibitor */}
            <ExhibitorHeader
              profile={profile}
              onOpenChat={canUseChat ? () => setChatOpen(true) : undefined}
            />

            {/* 2. «Экспонент рекомендует» */}
            {profile.recommendations && profile.recommendations.length > 0 && (
              <RecommendedPartnersBar recommendations={profile.recommendations} />
            )}

            {/* 2b. Последние новости экспонента — 3 карточки под рекомендациями */}
            {newsItems.length > 0 && (
              <ExhibitorNewsBlock
                news={newsItems}
                onOpenNews={handleOpenNews}
              />
            )}

            {/* 3. Sticky-табы (прилипают под Header) */}
            <div
              className="sticky top-16 z-30"
              style={{
                backdropFilter: 'blur(12px)',
                WebkitBackdropFilter: 'blur(12px)',
                backgroundColor: 'rgba(255,255,255,0.96)',
                borderBottom: '1px solid rgba(11,43,94,0.08)',
              }}
            >
              <ExhibitorTabs
                activeTab={activeTab}
                onTabChange={setActiveTab}
                counts={counts}
              />
            </div>

            {/* 4. Контент активной вкладки */}
            <div className="px-4 sm:px-5 py-5">
              {activeTab === 'about' ? (
                <AboutTab profile={profile} />
              ) : (
                <MixedGrid
                  items={gridItems}
                  onOpenProduct={handleOpenProduct}
                  onOpenNews={handleOpenNews}
                />
              )}
            </div>
          </div>

        </div>
      </div>

      {/* ── Модальное окно карточки товара ──────────────────────────────────── */}
      <ProductModal
        product={selectedProduct}
        onClose={handleCloseProduct}
        onDealRequest={isOooTest ? handleDealRequest : undefined}
        isReferralBuyer={isReferralBuyer}
      />

      {/* ── [Smart Contract] Deal Request Modal ─────────────────────────────── */}
      {dealProduct && (
        <DealRequestModal
          product={dealProduct}
          exhibitorSlug={profile.slug}
          exhibitorName={profile.name}
          isReferralBuyer={isReferralBuyer}
          onClose={handleCloseDeal}
        />
      )}

      {/* ── Модальное окно новости ───────────────────────────────────────────── */}
      <ExhibitorArticleModal item={selectedNews} onClose={handleCloseNews} />

      {/* ── Smart Contract: модал загрузки реквизитов ────────────────────────── */}
      <UploadRequisitesModal open={requisitesOpen} onClose={() => setRequisitesOpen(false)} />

      {/*
       * ── B2BChatModal ──────────────────────────────────────────────────────
       * Модальное окно делового обращения (Supabase INSERT → messages).
       * Открывается только для ролей 'visitor' | 'exhibitor' (canUseChat).
       *
       * sender_id  = userId (auth.uid() из Server Component, безопасен)
       * receiver_id = profile.id (exhibitors.id)
       */}
      {canUseChat && (
        <B2BChatModal
          isOpen={chatOpen}
          onClose={() => setChatOpen(false)}
          exhibitorId={profile.id}
          exhibitorName={profile.name}
          senderId={userId}
          userRole={userRole}
        />
      )}
    </>
  );
}
