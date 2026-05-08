/**
 * @file newsData.ts
 * SHARED NEWS & EVENTS DATA — ЕДИНСТВЕННЫЙ ИСТОЧНИК ИСТИНЫ
 *
 * Используется в трёх контекстах:
 *   1. NewsFeedPanel  — правая лента «НОВИНКИ И СОБЫТИЯ» на Discovery + Catalog
 *   2. ExhibitorPage  — фильтрует по `exhibitorSlug` для витрины экспонента
 *   3. Future         — Supabase `news` table, RLS: публичное чтение is_published=true
 *
 * TODO (Supabase migration):
 *   SELECT * FROM news WHERE is_published = true ORDER BY created_at DESC LIMIT 20;
 *   + RLS: authenticated read for all, write only for verified_exhibitor role.
 */

// ═══════════════════════════════════════════════════════════════════════════════
// ТИПЫ — ДВУХУРОВНЕВАЯ ФИЛЬТРАЦИЯ
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Тег индустрии (Ряд 1 фильтров — «Вид продукции»).
 * 'all' — служебный фильтр-UI, не используется в данных.
 */
export type IndustryTag =
  | 'all'
  | 'coffee'
  | 'tea'
  | 'equipment'
  | 'textile'
  | 'dishes'
  | 'food'
  | 'cold-beverages';

/**
 * Тип предложения (Ряд 2 фильтров — «Тип предложения»).
 *   new     — новинка      → оранжевый  #F26522
 *   sale    — распродажа   → красный    #DC2626
 *   special — спецпред.    → синий      #2563EB
 */
export type PromoType = 'all' | 'new' | 'sale' | 'special';

/**
 * Читаемые метки для тегов индустрии — используются при конвертации
 * в формат ExhibitorNewsItem (поле `category`).
 */
export const INDUSTRY_TAG_LABELS: Record<Exclude<IndustryTag, 'all'>, string> = {
  coffee:          'Горячие напитки',
  tea:             'Чай',
  equipment:       'Оборудование',
  textile:         'Текстиль',
  dishes:          'Посуда',
  food:            'Продукты',
  'cold-beverages': 'Холодные напитки',
};

/**
 * Новость / событие экспонента — главный DTO глобальной ленты.
 *
 * Поля синхронизации:
 *   exhibitorSlug  — URL-slug страницы экспонента (опционально).
 *                    Если задан, новость будет также показана на витрине экспонента.
 *   image          — URL превью-изображения (для HotNewsWidget и ExhibitorNewsCard).
 *   date           — ISO-дата публикации (YYYY-MM-DD).
 *   content        — Полный текст статьи (опционально). Если задан, доступен
 *                    в ExhibitorArticleModal на странице экспонента.
 */
export interface NewsItem {
  /** UUID новости */
  id: string;
  /** ID экспонента (внутренний ключ) */
  exhibitorId: string;
  /** Отображаемое название компании */
  exhibitorName: string;
  /** URL логотипа компании (опционально) */
  exhibitorLogo: string | null;
  /**
   * URL-slug страницы витрины экспонента.
   * Если задан — новость будет дублироваться на странице данного экспонента.
   * Пример: 'espresso-italia' → /horeca/exhibitors/espresso-italia
   */
  exhibitorSlug?: string;
  /** Заголовок новости */
  title: string;
  /** Краткое описание (2-3 строки) для карточки ленты */
  description: string;
  /**
   * Полный текст статьи (опционально).
   * Отображается в ExhibitorArticleModal на странице экспонента.
   * Если не задан — в модале показывается description.
   */
  content?: string;
  /** Индустриальный тег (исключает 'all' — только фильтр-UI) */
  industryTag: Exclude<IndustryTag, 'all'>;
  /** Тип предложения (исключает 'all' — только фильтр-UI) */
  promoType: Exclude<PromoType, 'all'>;
  /** Метка таймера: «Ещё 48 ч», «Ещё 6 дн» и т.д. */
  timerLabel: string;
  /**
   * URL превью-изображения.
   * Используется в HotNewsWidget и ExhibitorNewsCard.
   * Если не задан — показывается синий blueprint-плейсхолдер.
   */
  image?: string;
  /**
   * Дата публикации в формате YYYY-MM-DD или ISO-строка.
   * Используется для сортировки и отображения на странице экспонента.
   */
  date: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// ЕДИНЫЙ МАССИВ НОВОСТЕЙ И СОБЫТИЙ
// Порядок: от самых свежих к более ранним.
// ═══════════════════════════════════════════════════════════════════════════════

export const NEWS_ITEMS: NewsItem[] = [
  // ── La Marzocco: Linea Micra 2025 ────────────────────────────────────────────
  // exhibitorSlug = 'espresso-italia' → дублируется на странице официального
  // дистрибьютора. IndustryTag = 'coffee' → реагирует на фильтр «Кофе» (Горячие напитки).
  {
    id:            'news-001',
    exhibitorId:   'la-marzocco',
    exhibitorName: 'La Marzocco',
    exhibitorSlug: 'espresso-italia',
    exhibitorLogo: '/assets/brands/la-marzocco.svg',
    title:
      'Linea Micra 2025 — домашняя эспрессо-машина нового поколения',
    description:
      'La Marzocco выводит на рынок компактную версию Linea с двойным бойлером и PID-контроллером.',
    content: [
      'La Marzocco официально анонсирует Linea Micra 2025 — первую компактную машину флагманской серии Linea для сегмента home/prosumer.',
      '',
      'Ключевые особенности:',
      '• Двойной бойлер: паровой 0.75 л и заварочный 0.4 л — независимый PID ±0.1 °C',
      '• Стандартный портафильтр E61 58 мм — полная совместимость с профессиональными аксессуарами',
      '• Напорный профиль Flow Control Device: программируемое давление на всём цикле extraction',
      '• Габариты: 349 × 220 × 311 мм — умещается на любой домашней стойке',
      '• Подключение: iOS/Android через Wi-Fi — мониторинг, профили напитков, статистика',
      '',
      'Доступные цвета: нержавеющая сталь, матовый белый, матовый чёрный, бордо (RAL 3005).',
      '',
      'Линейка поступает к официальному дистрибьютору Espresso Italia в мае 2026.',
      'Предзаказ уже открыт. Поставка: 3–5 рабочих дней со склада.',
      '',
      'Специальное условие для новых B2B-партнёров: бесплатная установка + расширенная гарантия 36 мес.',
    ].join('\n'),
    industryTag:  'coffee',
    promoType:    'new',
    timerLabel:   'Ещё 48 ч',
    image:        '/assets/brands/la-marzocco.svg',
    date:         '2026-05-07',
  },

  // ── RATIONAL: iCombi Pro распродажа ──────────────────────────────────────────
  {
    id:            'news-002',
    exhibitorId:   'exp-rational',
    exhibitorName: 'RATIONAL',
    exhibitorSlug: 'rational-russia',
    exhibitorLogo: '/assets/brands/rational.svg',
    title:
      'iCombi Pro 10-2/3 E — распродажа для ресторанов',
    description:
      'Комбинированная печь iCombi Pro со скидкой 18 % для HoReCa-операторов до конца квартала.',
    content: [
      'RATIONAL объявляет ограниченную распродажу складских остатков iCombi Pro 10-2/3 E.',
      '',
      'Условия акции:',
      '• Скидка 18% от прейскурантной цены: ₽ 1 850 000 → ₽ 1 517 000',
      '• Действует до конца Q2 2026 или до исчерпания остатков (14 машин)',
      '• Включает: доставка + монтаж + обучение персонала (1 день)',
      '',
      'Об iCombi Pro 10-2/3 E:',
      '• 10 уровней GN 2/3, производительность 100 порций/час',
      '• iDensityControl — автоматическое управление влажностью',
      '• iCleaning — автомойка 5 уровней интенсивности',
      '• ConnectedCooking — облачный мониторинг и HACCP-отчёты',
      '',
      'Для оформления заказа свяжитесь с региональным менеджером RATIONAL.',
    ].join('\n'),
    industryTag:  'equipment',
    promoType:    'sale',
    timerLabel:   'Ещё 6 дн',
    image:        '/assets/brands/rational.svg',
    date:         '2026-05-05',
  },

  // ── Julius Meinl: Origin Single Estate ───────────────────────────────────────
  {
    id:            'news-003',
    exhibitorId:   'exp-julius-meinl',
    exhibitorName: 'Julius Meinl',
    exhibitorLogo: '/assets/brands/julius-meinl.svg',
    title:         'Новая линейка Origin Single Estate 2025',
    description:   'Моносортовые зерна из Эфиопии, Перу и Колумбии в сезонном релизе.',
    industryTag:   'coffee',
    promoType:     'new',
    timerLabel:    'Ещё 3 дн',
    date:          '2026-05-04',
  },

  // ── Ecolab: APEX Warewash System ─────────────────────────────────────────────
  {
    id:            'news-004',
    exhibitorId:   'exp-ecolab',
    exhibitorName: 'Ecolab',
    exhibitorLogo: '/assets/brands/ecolab.svg',
    title:
      'APEX Warewash System — спецпредложение для закупщиков',
    description:
      'Новая система дозирования APEX снижает расход химии на 35 % и гарантирует уровень HACCP.',
    industryTag:  'equipment',
    promoType:    'special',
    timerLabel:   'Ещё 12 ч',
    date:         '2026-05-07',
  },

  // ── Anfim: Caimano ON-DEMAND ──────────────────────────────────────────────────
  {
    id:            'news-005',
    exhibitorId:   'exp-anfim',
    exhibitorName: 'Anfim',
    exhibitorLogo: '/assets/brands/anfim.svg',
    title:
      'Caimano ON-DEMAND — кофемолка для высоконагруженных точек',
    description:
      'Бесступенчатая регулировка помола, плоские жернова ⌀83 мм, до 15 кг/день.',
    industryTag:  'coffee',
    promoType:    'new',
    timerLabel:   'Ещё 5 дн',
    date:         '2026-05-02',
  },

  // ── Montana Coffee: Текстиль ──────────────────────────────────────────────────
  {
    id:            'news-006',
    exhibitorId:   'exp-montana',
    exhibitorName: 'Montana Coffee',
    exhibitorLogo: '/assets/brands/montana-coffee.svg',
    title:         'Текстильная коллекция 2025: фартуки и форма F&B',
    description:
      'Обновлённый кобренд-каталог: фартуки, рубашки, бандана-сеты. GOTS-хлопок.',
    industryTag:  'textile',
    promoType:    'new',
    timerLabel:   'Ещё 7 дн',
    date:         '2026-05-01',
  },

  // ── Julius Meinl: Tea ─────────────────────────────────────────────────────────
  {
    id:            'news-007',
    exhibitorId:   'exp-julius-meinl',
    exhibitorName: 'Julius Meinl',
    exhibitorLogo: '/assets/brands/julius-meinl.svg',
    title:         'Чайная коллекция Julius Meinl Tea 2025: 24 купажа',
    description:
      'Классические купажи и авторские травяные сборы в премиальных пирамидках.',
    industryTag:  'tea',
    promoType:    'new',
    timerLabel:   'Ещё 10 дн',
    date:         '2026-04-28',
  },

  // ── Marco: Uber Boiler ────────────────────────────────────────────────────────
  {
    id:            'news-008',
    exhibitorId:   'exp-marco',
    exhibitorName: 'Marco',
    exhibitorLogo: '/assets/brands/marco.svg',
    title:
      'Marco Uber Boiler — прецизионный бойлер для чайных станций',
    description:
      'Термоконтроль ±0,5 °C (40–99 °C), программируемые зоны под каждый сорт чая.',
    industryTag:  'tea',
    promoType:    'new',
    timerLabel:   'Ещё 8 дн',
    date:         '2026-04-29',
  },

  // ── Meiko: M-iQ распродажа ────────────────────────────────────────────────────
  {
    id:            'news-009',
    exhibitorId:   'exp-meiko',
    exhibitorName: 'Meiko',
    exhibitorLogo: '/assets/brands/meiko.svg',
    title:         'Meiko M-iQ — разгрузка дефектной посуды со скидкой',
    description:
      'Весенняя распродажа витринных образцов конвейерных посудомоечных машин серии M-iQ.',
    industryTag:  'dishes',
    promoType:    'sale',
    timerLabel:   'Ещё 2 дн',
    date:         '2026-05-06',
  },

  // ── Parmalat: Chef Milk ───────────────────────────────────────────────────────
  {
    id:            'news-010',
    exhibitorId:   'exp-parmalat',
    exhibitorName: 'Parmalat',
    exhibitorLogo: '/assets/brands/parmalat.svg',
    title:         'Parmalat Chef — молоко для кофейных концепций HoReCa',
    description:
      'Специальное молоко UHT с адаптированным белком для идеального питчера и латте-арта.',
    industryTag:  'food',
    promoType:    'special',
    timerLabel:   'Ещё 14 дн',
    date:         '2026-04-24',
  },

  // ── Winterhalter: PT-XL ───────────────────────────────────────────────────────
  {
    id:            'news-011',
    exhibitorId:   'exp-winterhalter',
    exhibitorName: 'Winterhalter',
    exhibitorLogo: '/assets/brands/winterhalter.svg',
    title:         'Winterhalter PT-XL — новый стеклополоскатель',
    description:
      'Инновационный PT-XL с системой импульсного ополаскивания и рекуперацией тепла.',
    industryTag:  'dishes',
    promoType:    'new',
    timerLabel:   'Ещё 9 дн',
    date:         '2026-04-28',
  },

  // ── Unox: SPEED-X ─────────────────────────────────────────────────────────────
  {
    id:            'news-012',
    exhibitorId:   'exp-unox',
    exhibitorName: 'Unox',
    exhibitorLogo: '/assets/brands/unox.svg',
    title:         'SPEED-X — печь с режимом ускоренной выпечки',
    description:
      'Комби-печь SPEED-X с технологией AIR.Plus: от пиццы до кейтеринговых банкетных блюд.',
    industryTag:  'equipment',
    promoType:    'special',
    timerLabel:   'Ещё 4 дн',
    date:         '2026-05-03',
  },

  // ── Baratza: Forte сезонная скидка ────────────────────────────────────────────
  {
    id:            'news-013',
    exhibitorId:   'exp-baratza',
    exhibitorName: 'Baratza',
    exhibitorLogo: '/assets/brands/baratza.svg',
    title:         'Baratza Forte — сезонная скидка 15% для HoReCa',
    description:
      'Профессиональная кофемолка Forte BG со скидкой для операторов кофеен и ресторанов.',
    industryTag:  'coffee',
    promoType:    'sale',
    timerLabel:   'Ещё 11 дн',
    date:         '2026-04-26',
  },

  // ── Alto-Shaam: Vector H Series ───────────────────────────────────────────────
  {
    id:            'news-014',
    exhibitorId:   'exp-alto-shaam',
    exhibitorName: 'Alto-Shaam',
    exhibitorLogo: '/assets/brands/alto-shaam.svg',
    title:         'Vector H Series — многозонная мультиповарная печь',
    description:
      'Несколько независимых зон приготовления в одном корпусе без смешивания запахов.',
    industryTag:  'equipment',
    promoType:    'new',
    timerLabel:   'Ещё 15 дн',
    date:         '2026-04-22',
  },
];

// ═══════════════════════════════════════════════════════════════════════════════
// УТИЛИТЫ — ФИЛЬТРАЦИЯ ДЛЯ ВИТРИНЫ ЭКСПОНЕНТА
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Возвращает новости из глобальной ленты, привязанные к конкретной витрине.
 *
 * Используется в `src/app/horeca/exhibitors/[slug]/page.tsx`:
 *   const feedNews = getNewsByExhibitorSlug(profile.slug);
 *
 * @param slug — URL-slug страницы экспонента (e.g. 'espresso-italia')
 * @returns    — отфильтрованный массив NewsItem[], отсортированный по date DESC
 */
export function getNewsByExhibitorSlug(slug: string): NewsItem[] {
  return NEWS_ITEMS
    .filter((item) => item.exhibitorSlug === slug)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

/**
 * Возвращает все новости для конкретного exhibitorId.
 * Альтернативная фильтрация по внутреннему ID (для будущей миграции на Supabase).
 *
 * @param exhibitorId — внутренний ID экспонента (e.g. 'la-marzocco')
 */
export function getNewsByExhibitorId(exhibitorId: string): NewsItem[] {
  return NEWS_ITEMS
    .filter((item) => item.exhibitorId === exhibitorId)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}
