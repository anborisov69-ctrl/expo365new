/**
 * search.ts — Типы для кросс-язычной поисковой системы EXPO 365
 * ─────────────────────────────────────────────────────────────────
 *
 * Архитектура поиска:
 *   Запрос пользователя → [Layout Fix] → [Transliteration] → [Phonetic] → [Fuzzy]
 *       ↓
 *   Бренды (приоритет) → Товары (фильтр по бренду) → Категории → Компании
 */

import type { Product } from '@/data/productsData';
import type { Company } from '@/data/companiesData';

// ═══════════════════════════════════════════════════════════════════════════════
// ТИПЫ — БРЕНДЫ
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Запись бренда с полным набором данных для поиска.
 *
 * Схема БД (target):
 *   brands (
 *     id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 *     name       text NOT NULL,            -- canonical: "Rancilio"
 *     slug       text NOT NULL UNIQUE,     -- url-safe: "rancilio"
 *     logo_url   text,
 *     aliases    text[] NOT NULL DEFAULT '{}'::text[],
 *     categories text[] NOT NULL DEFAULT '{}'::text[],
 *     description text
 *   )
 *   -- RLS: все бренды публичны (SELECT публичный); INSERT/UPDATE — только admin
 */
export interface BrandRecord {
  /** UUID бренда */
  id: string;
  /** Каноническое имя на языке оригинала, напр. "Rancilio" */
  name: string;
  /** URL-slug, напр. "rancilio" */
  slug: string;
  /** Путь к логотипу */
  logoUrl?: string;
  /**
   * Массив алиасов: транскрипции, фонетические варианты, разговорные.
   * Хранятся в нижнем регистре для ускорения поиска.
   * Пример: ["ранчилио", "рансилио", "ранкилио", "ranchilio"]
   */
  aliases: string[];
  /** Категории товаров, представленных брендом */
  categories: string[];
  /** Краткое описание для дропдауна */
  description?: string;
  /** Страна происхождения */
  country?: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// ТИПЫ — ПОИСКОВЫЙ РЕЗУЛЬТАТ
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Причина совпадения — используется для UI-подсказки и ранжирования.
 *
 * Порядок приоритета (убывающий):
 *   exact > alias > transliteration > layout > phonetic > fuzzy
 */
export type SearchMatchReason =
  | 'exact'           // «rancilio» → Rancilio
  | 'alias'           // «ранчилио» → Rancilio (через aliases[])
  | 'transliteration' // транслитерация кириллицы в латиницу
  | 'layout'          // исправление раскладки клавиатуры
  | 'phonetic'        // фонетическая близость
  | 'fuzzy';          // расстояние Левенштейна ≤ 2

/** Результат поиска по бренду */
export interface BrandSearchResult {
  brand: BrandRecord;
  /** Числовой скор: выше = релевантнее. Используется для сортировки. */
  score: number;
  /** Причина совпадения — отображается в UI как подсказка */
  matchReason: SearchMatchReason;
  /**
   * Нормализованная форма, которая совпала.
   * Отображается в tooltip или subtitle строки результата.
   */
  normalizedQuery: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// ТИПЫ — АГРЕГИРОВАННЫЕ РЕЗУЛЬТАТЫ
// ═══════════════════════════════════════════════════════════════════════════════

/** Полный набор результатов глобального поиска */
export interface SmartSearchResults {
  /** Найденные бренды, отсортированные по score DESC */
  brands: BrandSearchResult[];
  /** Товары, отфильтрованные по найденному бренду */
  products: Product[];
  /** Компании из companiesData */
  companies: Company[];
}

/** Пустое состояние результатов */
export const EMPTY_SMART_RESULTS: SmartSearchResults = {
  brands:    [],
  products:  [],
  companies: [],
};

// ═══════════════════════════════════════════════════════════════════════════════
// ТИПЫ — API
// ═══════════════════════════════════════════════════════════════════════════════

/** Тело ответа API /api/search/brands */
export interface BrandSearchApiResponse {
  results:  BrandSearchResult[];
  query:    string;
  duration: number; // ms
}

/** Метаданные совпадения для UI (описание cause отображается под именем бренда) */
export const MATCH_REASON_LABELS: Record<SearchMatchReason, string> = {
  exact:           'Точное совпадение',
  alias:           'Транскрипция',
  transliteration: 'Транслитерация',
  layout:          'Исправлена раскладка',
  phonetic:        'Фонетически близко',
  fuzzy:           'Возможно похоже',
};

/** Скоры для каждого типа совпадения */
export const MATCH_SCORES: Record<SearchMatchReason, number> = {
  exact:           100,
  alias:           90,
  transliteration: 80,
  layout:          75,
  phonetic:        60,
  fuzzy:           40,
};
