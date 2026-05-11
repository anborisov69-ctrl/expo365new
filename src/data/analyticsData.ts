/**
 * analyticsData.ts — Mock-данные для Панели Аналитики Экспонента
 * ──────────────────────────────────────────────────────────────
 * Статические данные для разработки / демо окружения.
 *
 * TODO (production): Заменить функции на Supabase-запросы:
 *   - getMetrics()     → supabase.from('analytics_snapshots').select(...)
 *   - getTopProducts() → supabase.from('product_stats').select(...).order('views', { ascending: false }).limit(10)
 *   - getResponseTime()→ supabase.from('tender_responses').select('response_hours').eq('exhibitor_id', uid)
 *
 * Все запросы должны использовать RLS: exhibitor_id = auth.uid()
 */

import type {
  MetricCardData,
  DealsChartData,
  TopProductEntry,
  ResponseTimeStats,
  ExhibitorAnalyticsSnapshot,
  TimePeriod,
  DateRange,
} from '@/types/exhibitor-analytics';

// ═══════════════════════════════════════════════════════════════════════════════
// METRIC CARDS — основные показатели по периодам
// ═══════════════════════════════════════════════════════════════════════════════

const METRICS_BY_PERIOD: Record<TimePeriod, MetricCardData[]> = {
  week: [
    {
      id:          'new-partners',
      label:       'Новые партнёры',
      value:       '7',
      rawValue:    7,
      delta:       '+3',
      trend:       'up',
      description: 'за последние 7 дней',
      iconName:    'Users',
    },
    {
      id:          'deals-total',
      label:       'Сумма сделок',
      value:       '₽ 840 000',
      rawValue:    840000,
      delta:       '+12.4%',
      trend:       'up',
      description: 'подтверждены договорами',
      iconName:    'TrendingUp',
    },
    {
      id:          'news-interest',
      label:       'Интерес к новостям',
      value:       '1 240',
      rawValue:    1240,
      delta:       '+8.7%',
      trend:       'up',
      description: 'просмотров публикаций',
      iconName:    'Newspaper',
    },
    {
      id:          'win-percent',
      label:       'Процент побед',
      value:       '68%',
      rawValue:    68,
      delta:       '+4%',
      trend:       'up',
      description: 'тендеров выиграно',
      iconName:    'Trophy',
    },
  ],
  month: [
    {
      id:          'new-partners',
      label:       'Новые партнёры',
      value:       '34',
      rawValue:    34,
      delta:       '+18',
      trend:       'up',
      description: 'за последние 30 дней',
      iconName:    'Users',
    },
    {
      id:          'deals-total',
      label:       'Сумма сделок',
      value:       '₽ 4 820 000',
      rawValue:    4820000,
      delta:       '+18.4%',
      trend:       'up',
      description: 'подтверждены договорами',
      iconName:    'TrendingUp',
    },
    {
      id:          'news-interest',
      label:       'Интерес к новостям',
      value:       '12 481',
      rawValue:    12481,
      delta:       '+22.1%',
      trend:       'up',
      description: 'просмотров публикаций',
      iconName:    'Newspaper',
    },
    {
      id:          'win-percent',
      label:       'Процент побед',
      value:       '73%',
      rawValue:    73,
      delta:       '+5%',
      trend:       'up',
      description: 'тендеров выиграно',
      iconName:    'Trophy',
    },
  ],
  quarter: [
    {
      id:          'new-partners',
      label:       'Новые партнёры',
      value:       '98',
      rawValue:    98,
      delta:       '+41',
      trend:       'up',
      description: 'за последние 3 месяца',
      iconName:    'Users',
    },
    {
      id:          'deals-total',
      label:       'Сумма сделок',
      value:       '₽ 14 350 000',
      rawValue:    14350000,
      delta:       '+8.2%',
      trend:       'up',
      description: 'подтверждены договорами',
      iconName:    'TrendingUp',
    },
    {
      id:          'news-interest',
      label:       'Интерес к новостям',
      value:       '38 740',
      rawValue:    38740,
      delta:       '-3.1%',
      trend:       'down',
      description: 'просмотров публикаций',
      iconName:    'Newspaper',
    },
    {
      id:          'win-percent',
      label:       'Процент побед',
      value:       '69%',
      rawValue:    69,
      delta:       '-2%',
      trend:       'down',
      description: 'тендеров выиграно',
      iconName:    'Trophy',
    },
  ],
  year: [
    {
      id:          'new-partners',
      label:       'Новые партнёры',
      value:       '312',
      rawValue:    312,
      delta:       '+87',
      trend:       'up',
      description: 'за последние 12 месяцев',
      iconName:    'Users',
    },
    {
      id:          'deals-total',
      label:       'Сумма сделок',
      value:       '₽ 58 200 000',
      rawValue:    58200000,
      delta:       '+31.6%',
      trend:       'up',
      description: 'подтверждены договорами',
      iconName:    'TrendingUp',
    },
    {
      id:          'news-interest',
      label:       'Интерес к новостям',
      value:       '148 920',
      rawValue:    148920,
      delta:       '+44.8%',
      trend:       'up',
      description: 'просмотров публикаций',
      iconName:    'Newspaper',
    },
    {
      id:          'win-percent',
      label:       'Процент побед',
      value:       '71%',
      rawValue:    71,
      delta:       '+9%',
      trend:       'up',
      description: 'тендеров выиграно',
      iconName:    'Trophy',
    },
  ],
  custom: [
    {
      id:          'new-partners',
      label:       'Новые партнёры',
      value:       '—',
      rawValue:    0,
      delta:       '—',
      trend:       'neutral',
      description: 'за выбранный период',
      iconName:    'Users',
    },
    {
      id:          'deals-total',
      label:       'Сумма сделок',
      value:       '—',
      rawValue:    0,
      delta:       '—',
      trend:       'neutral',
      description: 'за выбранный период',
      iconName:    'TrendingUp',
    },
    {
      id:          'news-interest',
      label:       'Интерес к новостям',
      value:       '—',
      rawValue:    0,
      delta:       '—',
      trend:       'neutral',
      description: 'за выбранный период',
      iconName:    'Newspaper',
    },
    {
      id:          'win-percent',
      label:       'Процент побед',
      value:       '—',
      rawValue:    0,
      delta:       '—',
      trend:       'neutral',
      description: 'за выбранный период',
      iconName:    'Trophy',
    },
  ],
};

// ═══════════════════════════════════════════════════════════════════════════════
// DEALS CHART — данные линейного графика
// ═══════════════════════════════════════════════════════════════════════════════

const DEALS_CHART_BY_PERIOD: Record<TimePeriod, DealsChartData> = {
  week: {
    periodTotal: 840000,
    maxValue:    300000,
    points: [
      { label: 'Пн',   dealsAmount: 80000,  wonTenders: 0 },
      { label: 'Вт',   dealsAmount: 140000, wonTenders: 1 },
      { label: 'Ср',   dealsAmount: 95000,  wonTenders: 0 },
      { label: 'Чт',   dealsAmount: 210000, wonTenders: 2 },
      { label: 'Пт',   dealsAmount: 175000, wonTenders: 1 },
      { label: 'Сб',   dealsAmount: 300000, wonTenders: 3 },
      { label: 'Вс',   dealsAmount: 60000,  wonTenders: 0 },
    ],
  },
  month: {
    periodTotal: 4820000,
    maxValue:    900000,
    points: [
      { label: '1 мая',  dealsAmount: 320000, wonTenders: 1 },
      { label: '5 мая',  dealsAmount: 480000, wonTenders: 2 },
      { label: '10 мая', dealsAmount: 540000, wonTenders: 3 },
      { label: '15 мая', dealsAmount: 700000, wonTenders: 4 },
      { label: '20 мая', dealsAmount: 820000, wonTenders: 5 },
      { label: '25 мая', dealsAmount: 900000, wonTenders: 6 },
      { label: '30 мая', dealsAmount: 830000, wonTenders: 5 },
    ],
  },
  quarter: {
    periodTotal: 14350000,
    maxValue:    6000000,
    points: [
      { label: 'Фев',  dealsAmount: 3200000, wonTenders: 8  },
      { label: 'Мар',  dealsAmount: 4800000, wonTenders: 12 },
      { label: 'Апр',  dealsAmount: 3950000, wonTenders: 10 },
      { label: 'Май',  dealsAmount: 5100000, wonTenders: 14 },
      { label: 'Июн',  dealsAmount: 4200000, wonTenders: 11 },
      { label: 'Июл',  dealsAmount: 5900000, wonTenders: 16 },
    ],
  },
  year: {
    periodTotal: 58200000,
    maxValue:    8000000,
    points: [
      { label: 'Янв', dealsAmount: 3400000, wonTenders: 8  },
      { label: 'Фев', dealsAmount: 4200000, wonTenders: 10 },
      { label: 'Мар', dealsAmount: 5100000, wonTenders: 13 },
      { label: 'Апр', dealsAmount: 4700000, wonTenders: 11 },
      { label: 'Май', dealsAmount: 6200000, wonTenders: 15 },
      { label: 'Июн', dealsAmount: 5400000, wonTenders: 13 },
      { label: 'Июл', dealsAmount: 7100000, wonTenders: 18 },
      { label: 'Авг', dealsAmount: 6500000, wonTenders: 16 },
      { label: 'Сен', dealsAmount: 7800000, wonTenders: 20 },
      { label: 'Окт', dealsAmount: 8000000, wonTenders: 21 },
      { label: 'Ноя', dealsAmount: 7600000, wonTenders: 19 },
      { label: 'Дек', dealsAmount: 6900000, wonTenders: 17 },
    ],
  },
  custom: {
    periodTotal: 0,
    maxValue: 1,
    points: [],
  },
};

// ═══════════════════════════════════════════════════════════════════════════════
// TOP-10 PRODUCTS — рейтинг самых популярных товаров
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Статический топ-10. В production этот список одинаков для всех периодов
 * (перемещаются только ранги и счётчики), поэтому здесь одна коллекция.
 *
 * TODO: Заменить на запрос с агрегацией по дате:
 *   supabase.from('product_stats')
 *     .select('product_id, sum(views), sum(price_requests), products(name, image_url, brand)')
 *     .gte('period_start', from)
 *     .lte('period_end', to)
 *     .order('views', { ascending: false })
 *     .limit(10)
 */
export const TOP_10_PRODUCTS: TopProductEntry[] = [
  {
    id:            'p-001',
    rank:          1,
    name:          'La Marzocco Linea Micra',
    brand:         'La Marzocco',
    imageUrl:      '/assets/brands/la-marzocco.svg',
    views:         3840,
    priceRequests: 127,
  },
  {
    id:            'p-002',
    rank:          2,
    name:          'Rancilio Specialità',
    brand:         'Rancilio',
    imageUrl:      '/assets/brands/rancilio.svg',
    views:         2910,
    priceRequests: 98,
  },
  {
    id:            'p-003',
    rank:          3,
    name:          'Mahlkönig E65S GBW',
    brand:         'Mahlkönig',
    imageUrl:      '/assets/brands/mahlkoenig.svg',
    views:         2480,
    priceRequests: 84,
  },
  {
    id:            'p-004',
    rank:          4,
    name:          'Victoria Arduino Mythos 2',
    brand:         'Victoria Arduino',
    imageUrl:      '/assets/brands/victoria-arduino.svg',
    views:         2210,
    priceRequests: 71,
  },
  {
    id:            'p-005',
    rank:          5,
    name:          'Nuova Simonelli Aurelia Wave',
    brand:         'Nuova Simonelli',
    imageUrl:      '/assets/brands/nuova-simonelli.svg',
    views:         1980,
    priceRequests: 63,
  },
  {
    id:            'p-006',
    rank:          6,
    name:          'Julius Meinl Supreme Blend',
    brand:         'Julius Meinl',
    imageUrl:      '/assets/brands/julius-meinl.svg',
    views:         1740,
    priceRequests: 58,
  },
  {
    id:            'p-007',
    rank:          7,
    name:          'Dalla Corte Mina',
    brand:         'Dalla Corte',
    imageUrl:      '/assets/brands/dalla-corte.svg',
    views:         1620,
    priceRequests: 54,
  },
  {
    id:            'p-008',
    rank:          8,
    name:          'Anfim SCODY II',
    brand:         'Anfim',
    imageUrl:      '/assets/brands/anfim.svg',
    views:         1410,
    priceRequests: 47,
  },
  {
    id:            'p-009',
    rank:          9,
    name:          'WBC Precision Kettle',
    brand:         'WBC',
    imageUrl:      '/assets/brands/wbc.svg',
    views:         1280,
    priceRequests: 41,
  },
  {
    id:            'p-010',
    rank:          10,
    name:          'Montana Coffee Single Origin',
    brand:         'Montana Coffee',
    imageUrl:      '/assets/brands/montana-coffee.svg',
    views:         1140,
    priceRequests: 38,
  },
];

// ═══════════════════════════════════════════════════════════════════════════════
// RESPONSE TIME — среднее время ответа на тендер
// ═══════════════════════════════════════════════════════════════════════════════

const RESPONSE_TIME_BY_PERIOD: Record<TimePeriod, ResponseTimeStats> = {
  week: {
    averageHours:   1.8,
    bestHours:      0.5,
    benchmarkHours: 4.0,
    history: [
      { label: 'Пн', hours: 2.4 },
      { label: 'Вт', hours: 1.1 },
      { label: 'Ср', hours: 3.0 },
      { label: 'Чт', hours: 0.5 },
      { label: 'Пт', hours: 1.8 },
      { label: 'Сб', hours: 2.2 },
      { label: 'Вс', hours: 1.6 },
    ],
  },
  month: {
    averageHours:   2.1,
    bestHours:      0.4,
    benchmarkHours: 4.0,
    history: [
      { label: '1 нед',  hours: 2.8 },
      { label: '2 нед',  hours: 1.9 },
      { label: '3 нед',  hours: 2.4 },
      { label: '4 нед',  hours: 1.6 },
    ],
  },
  quarter: {
    averageHours:   2.6,
    bestHours:      0.6,
    benchmarkHours: 4.0,
    history: [
      { label: 'Мес 1', hours: 3.2 },
      { label: 'Мес 2', hours: 2.4 },
      { label: 'Мес 3', hours: 2.1 },
    ],
  },
  year: {
    averageHours:   2.9,
    bestHours:      0.3,
    benchmarkHours: 4.0,
    history: [
      { label: 'Q1', hours: 3.8 },
      { label: 'Q2', hours: 3.1 },
      { label: 'Q3', hours: 2.4 },
      { label: 'Q4', hours: 2.1 },
    ],
  },
  custom: {
    averageHours:   0,
    bestHours:      0,
    benchmarkHours: 4.0,
    history: [],
  },
};

// ═══════════════════════════════════════════════════════════════════════════════
// ПУБЛИЧНЫЙ API — функции получения данных
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Возвращает полный снимок аналитики для заданного периода.
 *
 * TODO (production): async функция с fetchом из Supabase, использующая RLS.
 */
export function getAnalyticsSnapshot(
  period: TimePeriod,
  dateRange: DateRange,
): ExhibitorAnalyticsSnapshot {
  return {
    period,
    dateRange,
    metrics:      METRICS_BY_PERIOD[period] ?? METRICS_BY_PERIOD.month,
    dealsChart:   DEALS_CHART_BY_PERIOD[period] ?? DEALS_CHART_BY_PERIOD.month,
    topProducts:  TOP_10_PRODUCTS,
    responseTime: RESPONSE_TIME_BY_PERIOD[period] ?? RESPONSE_TIME_BY_PERIOD.month,
  };
}

/** Хелпер: DateRange для стандартных периодов относительно сегодняшней даты */
export function getDefaultDateRange(period: Exclude<TimePeriod, 'custom'>): DateRange {
  const now  = new Date();
  const to   = now.toISOString().slice(0, 10);
  const from = new Date(now);

  switch (period) {
    case 'week':    from.setDate(now.getDate() - 7);   break;
    case 'month':   from.setMonth(now.getMonth() - 1); break;
    case 'quarter': from.setMonth(now.getMonth() - 3); break;
    case 'year':    from.setFullYear(now.getFullYear() - 1); break;
  }

  return { from: from.toISOString().slice(0, 10), to };
}
