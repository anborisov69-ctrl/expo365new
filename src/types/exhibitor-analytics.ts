/**
 * exhibitor-analytics.ts — Типы для Панели Аналитики Экспонента
 * ──────────────────────────────────────────────────────────────
 * Используется в:
 *   - src/data/analyticsData.ts          (mock-данные)
 *   - src/app/horeca/admin/analytics/    (UI компоненты)
 *
 * Принципы нейминга:
 *   • Запрещено: KPI, ROI, CTR, Conversion Rate, RFQ
 *   • Разрешено: человекочитаемые термины (Партнёры, Сделки, Победы)
 *
 * Схема БД (target Supabase):
 *   analytics_snapshots (
 *     id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 *     exhibitor_id   uuid REFERENCES exhibitors(id),
 *     period_start   date NOT NULL,
 *     period_end     date NOT NULL,
 *     new_partners   int  NOT NULL DEFAULT 0,
 *     deals_total    numeric(14,2) NOT NULL DEFAULT 0,
 *     news_interest  int  NOT NULL DEFAULT 0,
 *     win_percent    numeric(5,2) NOT NULL DEFAULT 0,
 *     created_at     timestamptz NOT NULL DEFAULT now()
 *   );
 *   -- RLS: exhibitor_id = auth.uid()
 */

// ═══════════════════════════════════════════════════════════════════════════════
// PERIOD — временной фильтр
// ═══════════════════════════════════════════════════════════════════════════════

/** Предустановленные временные периоды для фильтра */
export type TimePeriod = 'week' | 'month' | 'quarter' | 'year' | 'custom';

export const TIME_PERIOD_LABELS: Record<TimePeriod, string> = {
  week:    'Неделя',
  month:   'Месяц',
  quarter: 'Квартал',
  year:    'Год',
  custom:  'Период',
};

/** Диапазон дат для кастомного выбора через календарь */
export interface DateRange {
  from: string; // ISO 8601 date: YYYY-MM-DD
  to:   string; // ISO 8601 date: YYYY-MM-DD
}

// ═══════════════════════════════════════════════════════════════════════════════
// METRIC CARDS — основные показатели
// ═══════════════════════════════════════════════════════════════════════════════

/** Тренд изменения показателя по сравнению с предыдущим периодом */
export type MetricTrend = 'up' | 'down' | 'neutral';

/**
 * Карточка с одним бизнес-показателем.
 *
 * Человекочитаемые названия (ОБЯЗАТЕЛЬНО — без профессионального жаргона):
 *   "Новые партнёры"     — количество новых B2B-контактов за период
 *   "Сумма сделок"       — общая сумма подтверждённых договоров в рублях
 *   "Интерес к новостям" — суммарные просмотры публикаций экспонента
 *   "Процент побед"      — доля выигранных тендеров от общего числа участий
 */
export interface MetricCardData {
  /** Уникальный идентификатор метрики */
  id: string;
  /** Человекочитаемое название метрики */
  label: string;
  /** Отформатированное значение для отображения (напр. "₽ 4 820 000") */
  value: string;
  /** Числовое значение для вычислений */
  rawValue: number;
  /** Изменение: "+12" или "-3.4%" */
  delta: string;
  /** Направление изменения */
  trend: MetricTrend;
  /** Пояснение под значением */
  description: string;
  /** Иконка из lucide-react (React.ElementType) */
  iconName: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// DEALS CHART — график суммы сделок
// ═══════════════════════════════════════════════════════════════════════════════

/** Одна точка данных на линейном графике */
export interface ChartDataPoint {
  /** Метка оси X: дата или период ("Jan", "Фев", "Нед 1") */
  label: string;
  /** Сумма сделок в рублях */
  dealsAmount: number;
  /** Количество выигранных тендеров (для выделения оранжевым) */
  wonTenders: number;
}

/** Данные для линейного графика "Сумма сделок" */
export interface DealsChartData {
  points: ChartDataPoint[];
  /** Максимальное значение для нормализации оси Y */
  maxValue: number;
  /** Сумма за период в рублях */
  periodTotal: number;
}

// ═══════════════════════════════════════════════════════════════════════════════
// TOP PRODUCTS — топ-10 товаров
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Позиция в рейтинге топ-10 товаров.
 *
 * Схема БД (target):
 *   product_stats (
 *     product_id    uuid REFERENCES products(id),
 *     exhibitor_id  uuid REFERENCES exhibitors(id),
 *     period_start  date,
 *     period_end    date,
 *     views         int NOT NULL DEFAULT 0,
 *     price_requests int NOT NULL DEFAULT 0
 *   );
 *   -- RLS: exhibitor_id = auth.uid()
 */
export interface TopProductEntry {
  /** UUID товара */
  id: string;
  /** Название товара */
  name: string;
  /** URL обложки из Supabase Storage или публичного CDN */
  imageUrl: string;
  /** Бренд */
  brand: string;
  /** Количество просмотров карточки товара */
  views: number;
  /** Количество запросов цены (нажатий "Запросить цену") */
  priceRequests: number;
  /** Порядковый номер в рейтинге (1–10) */
  rank: number;
}

// ═══════════════════════════════════════════════════════════════════════════════
// RESPONSE TIME — среднее время ответа на тендер
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Запись о скорости ответа экспонента на тендер.
 *
 * Логика расчёта:
 *   responseTimeHours = (proposal_sent_at - tender_created_at) / 3600
 *
 * Схема БД (target):
 *   tender_responses (
 *     id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 *     tender_id        uuid REFERENCES tenders(id),
 *     exhibitor_id     uuid REFERENCES exhibitors(id),
 *     tender_created_at timestamptz NOT NULL,  ← берётся из tenders.created_at
 *     proposal_sent_at  timestamptz NOT NULL,  ← момент нажатия "Отправить предложение"
 *     response_hours    numeric(6,2) GENERATED ALWAYS AS
 *                         (EXTRACT(EPOCH FROM (proposal_sent_at - tender_created_at)) / 3600) STORED
 *   );
 *   -- RLS: exhibitor_id = auth.uid()
 */
export interface TenderResponseRecord {
  tenderId: string;
  tenderTitle: string;
  tenderCreatedAt: string; // ISO 8601
  proposalSentAt:  string; // ISO 8601
  responseHours:   number;
}

/** Агрегированная статистика времени ответа */
export interface ResponseTimeStats {
  /** Среднее время ответа в часах за выбранный период */
  averageHours: number;
  /** Лучший (минимальный) результат за период */
  bestHours: number;
  /** Индустриальный бенчмарк в часах для сравнения */
  benchmarkHours: number;
  /** История по точкам для мини-спарклайна */
  history: Array<{ label: string; hours: number }>;
}

// ═══════════════════════════════════════════════════════════════════════════════
// ANALYTICS SNAPSHOT — полный снимок аналитики за период
// ═══════════════════════════════════════════════════════════════════════════════

/** Полный набор данных для рендеринга панели аналитики */
export interface ExhibitorAnalyticsSnapshot {
  period:           TimePeriod;
  dateRange:        DateRange;
  metrics:          MetricCardData[];
  dealsChart:       DealsChartData;
  topProducts:      TopProductEntry[];
  responseTime:     ResponseTimeStats;
}
