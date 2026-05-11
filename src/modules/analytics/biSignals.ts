/**
 * biSignals.ts — Движок Business Intelligence сигналов EXPO 365
 * ──────────────────────────────────────────────────────────────
 * Чистые функции без side-effects. Вычисляют BI-сигналы на основе
 * поведения реферальных клиентов.
 *
 * Два типа сигналов:
 *   1. COMPETITOR RISK (🔴)
 *      Клиент отправил запрос на КП экспоненту в той же категории, что ООО «ТЕСТ».
 *      Privacy: конкретный slug скрыт → "Сторонний поставщик в категории [X]"
 *
 *   2. PORTFOLIO EXPANSION (🟡)
 *      Клиент искал категорию, которой нет у ООО «ТЕСТ», но которая
 *      логически дополняет ассортимент.
 *      Action: рекомендация расширить портфель.
 *
 * Использование:
 *   import { computeBISignals } from '@/modules/analytics/biSignals';
 *   const signals = computeBISignals(clientBehavior);
 *
 * TODO (production):
 *   Заменить статичные COMPETITOR_MAP / GAP_MAP на данные из Supabase:
 *     supabase.from('exhibitor_categories').select('slug, categories')
 */

import type { ClientBehavior, BISignal } from '@/types/bi-signals';
import type { EcoProductCategory } from '@/store/ecosystemStore';

// ═══════════════════════════════════════════════════════════════════════════════
// КОНФИГУРАЦИЯ — категории ООО «ТЕСТ»
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Категории, которые покрывает ООО «ТЕСТ» своим ассортиментом.
 * Синхронизировано с OOO_TEST_INITIAL_PRODUCTS в ecosystemStore.tsx.
 *
 * TODO: В production — вычислять динамически из catalogProducts:
 *   new Set(state.oooTestProducts.map(p => p.category))
 */
export const OOO_TEST_COVERED_CATEGORIES: ReadonlySet<EcoProductCategory> = new Set<EcoProductCategory>([
  'coffee',
  'tea',
  'equipment',
  'service',
  'tableware',
  'training',
  'consumables',
]);

// ═══════════════════════════════════════════════════════════════════════════════
// КОНФИГУРАЦИЯ — карта конкурентов
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Карта конкурентов: exhibitorSlug → список категорий, в которых они конкурируют.
 *
 * Privacy Layer:
 *   Эта карта используется ТОЛЬКО внутри движка.
 *   В UI передаётся только `competitorCategory` (категория), но не slug.
 *
 * TODO (production):
 *   SELECT slug, product_categories FROM exhibitors WHERE status = 'PUBLISHED'
 *   Автоматически строить карту из Supabase.
 */
const COMPETITOR_CATEGORY_MAP: Readonly<Record<string, ReadonlyArray<{
  category: EcoProductCategory;
  /** Human-readable название категории для UI */
  label: string;
}>>> = {
  'espresso-italia': [
    { category: 'equipment', label: 'Кофейное оборудование' },
    { category: 'coffee',    label: 'Кофе' },
  ],
  'rational-russia': [
    { category: 'equipment', label: 'Тепловое оборудование' },
  ],
  // Добавьте новых конкурентов по мере роста реестра компаний
} as const;

// ═══════════════════════════════════════════════════════════════════════════════
// КОНФИГУРАЦИЯ — карта дополнительных (gap) категорий
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Gap-категории: slug поиска → { human-readable label, complementaryTo }
 *
 * Логика: клиент ищет категорию X (которой нет у ООО «ТЕСТ»),
 * но X дополняет категорию Y, которая у ООО «ТЕСТ» есть.
 * → Рекомендация расширить ассортимент.
 *
 * Принцип отбора категорий:
 *   - Высокая совместимость с текущим ассортиментом ООО «ТЕСТ»
 *   - Частый запрос в HoReCa (данные индустриальных отчётов)
 *   - ООО «ТЕСТ» не имеет продуктов в этой категории
 */
interface GapCategoryConfig {
  /** Название категории для UI */
  label: string;
  /** Категория ООО «ТЕСТ», к которой логически примыкает gap */
  complementaryTo: string;
  /** Описание возможности для UI-рекомендации */
  insight: string;
}

const COMPLEMENTARY_GAP_MAP: Readonly<Record<string, GapCategoryConfig>> = {
  // Кофе → дополнения
  syrups: {
    label:          'Сиропы и топпинги',
    complementaryTo: 'Кофе и напитки',
    insight:        'Сиропы — топ-3 допзакупка байеров кофейного сегмента',
  },
  cups: {
    label:          'Одноразовые стаканы',
    complementaryTo: 'Кофе на вынос',
    insight:        'Спрос на eco-friendly стаканы вырос на 34% y/y',
  },
  packaging: {
    label:          'Кофейная упаковка',
    complementaryTo: 'Кофе (розничная фасовка)',
    insight:        'Байеры с coffee-shop форматом всегда ищут упаковку рядом с зерном',
  },
  milk: {
    label:          'Молочные продукты (растительные альтернативы)',
    complementaryTo: 'Кофейные напитки',
    insight:        'Oat-milk и миндальное молоко входят в топ-5 запросов в HoReCa',
  },
  // Оборудование → дополнения
  cleaning: {
    label:          'Средства для очистки оборудования',
    complementaryTo: 'Кофейное оборудование (обслуживание)',
    insight:        'Клиенты с техникой регулярно докупают химию для обслуживания',
  },
  // Чай → дополнения
  teapots: {
    label:          'Чайники и заварники',
    complementaryTo: 'Чай',
    insight:        'Заварники и чайники — естественный апсел к чайному ассортименту',
  },
  honey: {
    label:          'Мёд и варенье',
    complementaryTo: 'Чай',
    insight:        'Позиционируется как "чайный бокс" — высокая маржинальность',
  },
  // HoReCa-специфика → дополнения
  uniforms: {
    label:          'Форменная одежда персонала',
    complementaryTo: 'HoReCa сервис',
    insight:        'Байеры категории "оборудование + обслуживание" ищут полный пакет',
  },
} as const;

/** Набор слагов gap-категорий для быстрой проверки O(1) */
const GAP_SLUGS: ReadonlySet<string> = new Set(Object.keys(COMPLEMENTARY_GAP_MAP));

// ═══════════════════════════════════════════════════════════════════════════════
// ДВИЖОК ВЫЧИСЛЕНИЯ
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Вычисляет Competitor Risk сигналы для данного поведения клиента.
 *
 * Алгоритм:
 *   1. Для каждого quoteRequest ищем exhibitorSlug в COMPETITOR_CATEGORY_MAP
 *   2. Проверяем пересечение категорий конкурента с OOO_TEST_COVERED_CATEGORIES
 *   3. При пересечении — генерируем сигнал (один на exhibitor, берём первый overlap)
 *
 * Дедупликация: один exhibitorSlug → один сигнал (earliest timestamp).
 */
function computeCompetitorRiskSignals(behavior: ClientBehavior): BISignal[] {
  const signals: BISignal[] = [];
  const seenExhibitors = new Set<string>();

  for (const qr of behavior.quoteRequests) {
    if (seenExhibitors.has(qr.exhibitorSlug)) continue;
    seenExhibitors.add(qr.exhibitorSlug);

    const competitorCats = COMPETITOR_CATEGORY_MAP[qr.exhibitorSlug];
    if (!competitorCats) continue;

    // Ищем первую пересекающуюся категорию
    const overlap = competitorCats.find(cc => OOO_TEST_COVERED_CATEGORIES.has(cc.category));
    if (!overlap) continue;

    signals.push({
      type:               'competitor_risk',
      competitorCategory: overlap.label,
      detectedAt:         qr.timestamp,
    });
  }

  return signals;
}

/**
 * Вычисляет Portfolio Expansion сигналы для данного поведения клиента.
 *
 * Алгоритм:
 *   1. Для каждого categorySearch проверяем наличие в GAP_SLUGS
 *   2. При совпадении — генерируем рекомендательный сигнал
 *
 * Дедупликация: один slug → один сигнал.
 */
function computePortfolioExpansionSignals(behavior: ClientBehavior): BISignal[] {
  const signals: BISignal[] = [];
  const seenGaps = new Set<string>();
  const now = new Date().toISOString();

  for (const searchSlug of behavior.categorySearches) {
    if (seenGaps.has(searchSlug)) continue;
    if (!GAP_SLUGS.has(searchSlug)) continue;
    seenGaps.add(searchSlug);

    const gap = COMPLEMENTARY_GAP_MAP[searchSlug];
    signals.push({
      type:            'portfolio_expansion',
      gapCategory:     gap.label,
      complementaryTo: gap.complementaryTo,
      detectedAt:      now,
    });
  }

  return signals;
}

/**
 * Главная функция движка — вычисляет все BI-сигналы для клиента.
 *
 * Порядок сигналов:
 *   1. competitor_risk (красные) — приоритет выше, идут первыми
 *   2. portfolio_expansion (жёлтые) — идут следом
 *
 * @param behavior — поведение клиента из store.clientBehaviors
 * @returns         массив BISignal, отсортированный по priority
 *
 * @example
 *   const signals = computeBISignals(behavior);
 *   const risks = signals.filter(s => s.type === 'competitor_risk');
 *   const insights = signals.filter(s => s.type === 'portfolio_expansion');
 */
export function computeBISignals(behavior: ClientBehavior): BISignal[] {
  return [
    ...computeCompetitorRiskSignals(behavior),
    ...computePortfolioExpansionSignals(behavior),
  ];
}

/**
 * Вычисляет сигналы для всех клиентов из behaviors-массива.
 * Возвращает Map<buyerId, BISignal[]> для O(1) lookup в UI.
 *
 * @example
 *   const signalMap = computeAllBISignals(state.clientBehaviors);
 *   const clientSignals = signalMap.get(client.buyerId) ?? [];
 */
export function computeAllBISignals(behaviors: ClientBehavior[]): Map<string, BISignal[]> {
  const result = new Map<string, BISignal[]>();
  for (const behavior of behaviors) {
    const signals = computeBISignals(behavior);
    if (signals.length > 0) {
      result.set(behavior.buyerId, signals);
    }
  }
  return result;
}

/**
 * Возвращает insight-текст для gap-категории (для детального описания в Drawer).
 * Используется в BISignalDrawer для формирования рекомендательного текста.
 *
 * @param gapLabel — human-readable label gap-категории
 */
export function getGapInsight(gapLabel: string): string {
  const entry = Object.values(COMPLEMENTARY_GAP_MAP).find(g => g.label === gapLabel);
  return entry?.insight ?? 'Клиент ищет товары, дополняющие ваш ассортимент';
}
