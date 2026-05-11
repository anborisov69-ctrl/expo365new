/**
 * bi-signals.ts — Типы для системы Business Intelligence сигналов EXPO 365
 * ──────────────────────────────────────────────────────────────────────────
 * Используется в:
 *   - src/modules/analytics/biSignals.ts    (движок вычисления)
 *   - src/store/ecosystemStore.tsx           (state)
 *   - src/app/horeca/admin/partners/page.tsx (UI)
 *
 * Два типа сигналов:
 *   competitor_risk      → клиент отправил КП конкурентам в той же категории
 *   portfolio_expansion  → клиент искал категорию, которой нет у ООО «ТЕСТ»
 *
 * Privacy Layer:
 *   Конкретные названия конкурентов НИКОГДА не раскрываются в UI —
 *   используется формулировка "Сторонний поставщик в категории [Х]".
 */

// ═══════════════════════════════════════════════════════════════════════════════
// EVENT TYPES — трекинг поведения клиента
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Событие «Запрос на КП» — клиент отправил запрос стороннему экспоненту.
 *
 * exhibitorSlug используется во внутренней логике для идентификации конкурента,
 * но НИКОГДА не показывается в публичном UI (Privacy Layer).
 */
export interface QuoteRequestEvent {
  /** Внутренний slug экспонента (только для движка BI, скрыт от UI) */
  exhibitorSlug: string;
  /**
   * Категория конкурента — используется для сопоставления с категориями ООО «ТЕСТ».
   * Пример: 'equipment', 'coffee'
   */
  exhibitorCategory: string;
  /** ISO 8601 timestamp события */
  timestamp: string;
}

/**
 * Событие «Просмотр карточки товара» стороннего экспонента.
 */
export interface ProductViewEvent {
  exhibitorSlug: string;
  productCategory: string;
  timestamp: string;
}

/**
 * Поведение конкретного клиента-байера на платформе.
 *
 * Схема БД (target Supabase):
 *   client_behaviors (
 *     id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 *     buyer_id      uuid REFERENCES companies(id),
 *     exhibitor_id  uuid REFERENCES exhibitors(id),   ← кому принадлежит сигнал
 *     event_type    text CHECK (event_type IN ('category_search','product_view','quote_request')),
 *     payload       jsonb NOT NULL,
 *     created_at    timestamptz NOT NULL DEFAULT now()
 *   );
 *   -- RLS: exhibitor_id = auth.uid()
 */
export interface ClientBehavior {
  /** buyerId соответствует ReferralClient.buyerId */
  buyerId: string;
  /**
   * Слаги категорий, которые искал клиент.
   * Пример: ['syrups', 'cups', 'packaging']
   */
  categorySearches: string[];
  /**
   * Запросы на КП, отправленные другим экспонентам.
   * Используется для вычисления Competitor Risk.
   */
  quoteRequests: QuoteRequestEvent[];
  /**
   * Просмотренные карточки товаров сторонних экспонентов.
   * Вспомогательный сигнал — усиливает Competitor Risk.
   */
  productViews: ProductViewEvent[];
}

// ═══════════════════════════════════════════════════════════════════════════════
// SIGNAL TYPES — вычисленные BI-сигналы
// ═══════════════════════════════════════════════════════════════════════════════

/** Тип BI-сигнала */
export type BISignalType = 'competitor_risk' | 'portfolio_expansion';

/**
 * Вычисленный BI-сигнал для конкретного клиента.
 *
 * Генерируется функцией computeBISignals() из src/modules/analytics/biSignals.ts.
 * Используется ТОЛЬКО для отображения в Кабинете Экспонента.
 *
 * Privacy rules:
 *   - competitor_risk: НЕ раскрывать slug конкурента, только категорию
 *   - portfolio_expansion: показывать gap-категорию и к чему она дополнительна
 */
export interface BISignal {
  type: BISignalType;

  // ── Competitor Risk fields ─────────────────────────────────────────────────
  /**
   * [competitor_risk] Категория, в которой клиент обратился к конкуренту.
   * UI отображает: "Сторонний поставщик в категории [competitorCategory]"
   * Пример: "Кофейное оборудование"
   */
  competitorCategory?: string;

  // ── Portfolio Expansion fields ─────────────────────────────────────────────
  /**
   * [portfolio_expansion] Категория-пробел, которую ищет клиент,
   * но которой нет у ООО «ТЕСТ».
   * Пример: "Сиропы и топпинги"
   */
  gapCategory?: string;
  /**
   * [portfolio_expansion] Базовая категория ООО «ТЕСТ», к которой относится gap.
   * Пример: "Кофе и напитки" (gap: Сиропы → дополнение к Кофе)
   */
  complementaryTo?: string;

  /** ISO 8601 — когда сигнал был зафиксирован */
  detectedAt: string;
}
