/**
 * brandSearch.ts — Кросс-язычный алгоритмический движок поиска брендов
 * ────────────────────────────────────────────────────────────────────────
 *
 * Pipeline обработки запроса:
 *   rawQuery
 *     → normalize (lowercase, trim, collapse spaces)
 *       → [candidate_0] original normalized
 *       → [candidate_1] layout EN→RU (hfyxbkbj → ранчилио)
 *       → [candidate_2] layout RU→EN (vandom → random)
 *       → [candidate_3] transliterate RU→EN (ранчилио → ranchilio)
 *       → [candidate_4] transliterate + phonetic (ranchilio → rancilio key)
 *         → для каждого кандидата:
 *             1. exact match name or alias → score 100/90
 *             2. transliteration match     → score 80
 *             3. phonetic key match        → score 60
 *             4. fuzzy (Levenshtein ≤ 2)  → score 40
 *
 * QA-сценарии (покрываются):
 *   «ранчилио»  → candidate_0 alias match   → Rancilio ✓
 *   «rancilio»  → candidate_0 exact match   → Rancilio ✓
 *   «hfyxbkbj»  → candidate_1 EN→RU → «ранчилио» → alias → Rancilio ✓
 *   «мацер»     → candidate_3 → «matser» → phonetic key → Mazzer ✓
 *   «vfpth»     → candidate_1 EN→RU → «мазер» → translit → «mazer» → fuzzy Mazzer ✓
 */

import type { BrandRecord } from '@/types/search';
import type { BrandSearchResult, SearchMatchReason } from '@/types/search';
import { MATCH_SCORES } from '@/types/search';
import { BRANDS } from '@/data/brandsData';

// ═══════════════════════════════════════════════════════════════════════════════
// ТАБЛИЦЫ ПЕРЕКОДИРОВКИ КЛАВИАТУРЫ
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Перекодировка EN→RU.
 *
 * Сценарий: пользователь набирает в латинской раскладке, но хотел российскую.
 * Пример: "hfyxbkbj" (EN keys) → "ранчилио" (RU chars at same positions)
 *
 * Позиции клавиш (QWERTY → ЙЦУКЕН, стандарт RU):
 *   Row 1: q→й  w→ц  e→у  r→к  t→е  y→н  u→г  i→ш  o→щ  p→з  [→х  ]→ъ
 *   Row 2: a→ф  s→ы  d→в  f→а  g→п  h→р  j→о  k→л  l→д  ;→ж  '→э
 *   Row 3: z→я  x→ч  c→с  v→м  b→и  n→т  m→ь  ,→б  .→ю
 */
const EN_TO_RU: Record<string, string> = {
  q: 'й', w: 'ц', e: 'у', r: 'к', t: 'е', y: 'н', u: 'г', i: 'ш',
  o: 'щ', p: 'з', '[': 'х', ']': 'ъ',
  a: 'ф', s: 'ы', d: 'в', f: 'а', g: 'п', h: 'р', j: 'о', k: 'л',
  l: 'д', ';': 'ж', "'": 'э',
  z: 'я', x: 'ч', c: 'с', v: 'м', b: 'и', n: 'т', m: 'ь', ',': 'б',
  '.': 'ю',
};

/**
 * Перекодировка RU→EN.
 *
 * Сценарий: пользователь набирает в русской раскладке, но хотел латинскую.
 * Пример: "ку" (RU keys) → "rb" (EN chars at same positions)
 */
const RU_TO_EN: Record<string, string> = Object.fromEntries(
  Object.entries(EN_TO_RU).map(([en, ru]) => [ru, en]),
);

// ═══════════════════════════════════════════════════════════════════════════════
// ТАБЛИЦА ТРАНСЛИТЕРАЦИИ RU→EN (ISO 9, адаптированная под HoReCa)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Транслитерация кириллицы в латиницу.
 *
 * Особенности:
 *   - ц → ts (не c, т.к. «Rancilio», а не «ratsilio» — для поиска допустимо оба)
 *   - х → kh (не h, т.к. «Mahlkönig» содержит h в другом смысле)
 *   - Мягкий/твёрдый знак удаляются
 */
const TRANSLIT_MAP: Record<string, string> = {
  а: 'a',  б: 'b',  в: 'v',  г: 'g',  д: 'd',
  е: 'e',  ё: 'yo', ж: 'zh', з: 'z',  и: 'i',
  й: 'y',  к: 'k',  л: 'l',  м: 'm',  н: 'n',
  о: 'o',  п: 'p',  р: 'r',  с: 's',  т: 't',
  у: 'u',  ф: 'f',  х: 'kh', ц: 'ts', ч: 'ch',
  ш: 'sh', щ: 'sch',ъ: '',   ы: 'y',  ь: '',
  э: 'e',  ю: 'yu', я: 'ya',
};

// ═══════════════════════════════════════════════════════════════════════════════
// ФОНЕТИЧЕСКАЯ НОРМАЛИЗАЦИЯ
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Правила фонетической нормализации латинской строки.
 *
 * Цель: привести фонетически близкие слова к единому «ключу».
 *
 * Примеры:
 *   «ranchilio» → «rantsilio» → phonetic → «rantsilio»
 *   «rancilio»  → «rantsilio» (после unify c/ts)
 *   «rancillio» → «rantsilio» (двойные согласные схлопываются)
 *   «mazer»     → phonetic → «matser»? нет — после collapse «mazer» ≈ «mazzer» ≈ «maser»
 */
const PHONETIC_RULES: Array<[RegExp, string]> = [
  // Двойные согласные → одиночные (maZZer → mazer)
  [/([bcdfghjklmnpqrstvwxyz])\1+/g, '$1'],
  // ch / tch → c (ranchilio → rancilio)
  [/tch/g, 'c'],
  [/ch/g,  'c'],
  // sh / sch / shch → s
  [/shch/g, 's'],
  [/sch/g,  's'],
  [/sh/g,   's'],
  // zh → z
  [/zh/g,  'z'],
  // kh → k
  [/kh/g,  'k'],
  // ts / tz → ts (унификация ц)
  [/tz/g,  'ts'],
  // ph → f
  [/ph/g,  'f'],
  // ya / ye / yo / yu → a / e / o / u
  [/ya/g,  'a'],
  [/ye/g,  'e'],
  [/yo/g,  'o'],
  [/yu/g,  'u'],
  // w → v (немецкие имена)
  [/w/g,   'v'],
  // Удалить h в середине (silent h, напр. winterhAlter)
  // Только между двумя гласными: not needed — causes false positives
  // Убрать гласные дублирование: io → io (уже схлопнуто выше для согласных)
];

// ═══════════════════════════════════════════════════════════════════════════════
// УТИЛИТЫ
// ═══════════════════════════════════════════════════════════════════════════════

/** Нормализует строку: lowercase, trim, убирает многократные пробелы */
function normalize(s: string): string {
  return s.toLowerCase().trim().replace(/\s+/g, ' ');
}

/**
 * Конвертирует строку по таблице посимвольного маппинга.
 * Символы, отсутствующие в таблице, сохраняются без изменений.
 */
function convertLayout(s: string, map: Record<string, string>): string {
  return s.split('').map((c) => map[c] ?? c).join('');
}

/**
 * Транслитерирует кириллицу → латиница.
 * Применяется поочерёдно сначала двухсимвольные биграммы, затем одиночные.
 */
export function transliterate(s: string): string {
  let result = '';
  const lower = s.toLowerCase();
  let i = 0;
  while (i < lower.length) {
    const ch = lower[i];
    if (TRANSLIT_MAP[ch] !== undefined) {
      result += TRANSLIT_MAP[ch];
    } else {
      result += ch;
    }
    i++;
  }
  return result;
}

/**
 * Создаёт «фонетический ключ» для сравнения.
 *
 * Алгоритм:
 *   1. Уже латинская строка (предполагается)
 *   2. Применяем правила замены
 *   3. Удаляем все не-буквенные символы
 *   4. Убираем гласные в конце слова (не обязательно, но для брендов не применяем)
 */
export function phoneticKey(s: string): string {
  let result = s.toLowerCase();
  for (const [pattern, replacement] of PHONETIC_RULES) {
    result = result.replace(pattern, replacement);
  }
  // Схлопнуть двойные гласные: aa → a, oo → o и т.д.
  result = result.replace(/([aeiou])\1+/g, '$1');
  // Удалить пробелы и дефисы
  result = result.replace(/[\s\-]/g, '');
  return result;
}

/**
 * Расстояние Левенштейна между двумя строками.
 * Оптимизировано через одномерный массив.
 *
 * @returns Число операций вставки/удаления/замены
 */
export function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;

  // Ограничение: не считаем если разница длин > 5 (оптимизация)
  if (Math.abs(a.length - b.length) > 5) return Math.abs(a.length - b.length);

  const row: number[] = Array.from({ length: b.length + 1 }, (_, i) => i);

  for (let i = 1; i <= a.length; i++) {
    let prev = i;
    for (let j = 1; j <= b.length; j++) {
      const val =
        a[i - 1] === b[j - 1]
          ? row[j - 1]
          : Math.min(row[j - 1] + 1, row[j] + 1, prev + 1);
      row[j - 1] = prev;
      prev = val;
    }
    row[b.length] = prev;
  }
  return row[b.length];
}

// ═══════════════════════════════════════════════════════════════════════════════
// ГЕНЕРАЦИЯ КАНДИДАТОВ
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Из сырого запроса генерирует список кандидатов-строк для сравнения с брендами.
 *
 * Карта кандидатов:
 *   [0] original    — как введено пользователем (нормализовано)
 *   [1] en_to_ru    — предположение: EN-раскладка, а хотел RU
 *   [2] ru_to_en    — предположение: RU-раскладка, а хотел EN
 *   [3] translit01  — транслитерация оригинала (если кириллица)
 *   [4] translit_of_en_to_ru — конвертировали раскладку, потом транслитерировали
 */
export function generateCandidates(rawQuery: string): string[] {
  const orig    = normalize(rawQuery);
  const enToRu  = convertLayout(orig, EN_TO_RU);
  const ruToEn  = convertLayout(orig, RU_TO_EN);
  const translit = transliterate(orig);
  const translitOfEnToRu = transliterate(enToRu);

  // Дедuplicate и отфильтровать пустые
  return [...new Set([orig, enToRu, ruToEn, translit, translitOfEnToRu])]
    .filter(Boolean);
}

// ═══════════════════════════════════════════════════════════════════════════════
// МАТЧИНГ ОДНОГО БРЕНДА
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Проверяет, совпадает ли строка `candidate` с брендом `brand`.
 *
 * Возвращает { reason, score } при совпадении или null.
 *
 * Порядок проверки (от точных к нечётким):
 *   1. exact — точное совпадение с name или alias
 *   2. alias — частичное содержание в alias
 *   3. transliteration — прямое совпадение после translit(alias) == candidate
 *   4. phonetic — phoneticKey(candidate) == phoneticKey(name/alias)
 *   5. fuzzy — levenshtein(candidate, name/alias) ≤ порогу
 */
function matchBrand(
  candidate: string,
  brand: BrandRecord,
  matchType: 'original' | 'layout' | 'translit',
): { reason: SearchMatchReason; score: number } | null {
  const candNorm   = candidate.toLowerCase().replace(/[\s\-]/g, '');
  const nameNorm   = brand.name.toLowerCase().replace(/[\s\-]/g, '');

  // ── 1. Exact match name ───────────────────────────────────────────────────
  if (candNorm === nameNorm || candidate === brand.name.toLowerCase()) {
    return {
      reason: matchType === 'layout' ? 'layout' : 'exact',
      score: matchType === 'layout' ? MATCH_SCORES.layout : MATCH_SCORES.exact,
    };
  }

  // ── 2. Alias exact match ──────────────────────────────────────────────────
  const aliasNorms = brand.aliases.map((a) => a.toLowerCase().replace(/[\s\-]/g, ''));
  if (aliasNorms.some((a) => a === candNorm)) {
    const reason: SearchMatchReason =
      matchType === 'layout'   ? 'layout' :
      matchType === 'translit' ? 'transliteration' :
      'alias';
    return { reason, score: MATCH_SCORES[reason] };
  }

  // ── 3. Transliteration match: translit(alias) == candidate ────────────────
  const translitAliases = brand.aliases.map((a) => transliterate(a).replace(/[\s\-]/g, ''));
  const translitName    = transliterate(brand.name).toLowerCase().replace(/[\s\-]/g, '');
  if (
    translitAliases.some((ta) => ta === candNorm) ||
    translitName === candNorm
  ) {
    return { reason: 'transliteration', score: MATCH_SCORES.transliteration };
  }

  // ── 4. Phonetic key match ─────────────────────────────────────────────────
  const candPhonetic  = phoneticKey(candidate);
  const namePhonetic  = phoneticKey(brand.name);
  const aliasPhonetics = [
    namePhonetic,
    ...brand.aliases.map((a) => phoneticKey(transliterate(a))),
    ...translitAliases.map(phoneticKey),
  ];
  if (candPhonetic.length >= 3 && aliasPhonetics.some((ap) => ap === candPhonetic)) {
    return { reason: 'phonetic', score: MATCH_SCORES.phonetic };
  }

  // ── 5. Fuzzy (Levenshtein) ────────────────────────────────────────────────
  const threshold = candidate.length <= 4 ? 1 : 2;
  const comparisons = [
    nameNorm,
    translitName,
    ...aliasNorms,
    ...translitAliases,
  ];
  const minDist = Math.min(...comparisons.map((c) => levenshtein(candNorm, c)));
  if (minDist <= threshold) {
    // Скор уменьшается с расстоянием
    const score = MATCH_SCORES.fuzzy - minDist * 10;
    return { reason: 'fuzzy', score: Math.max(score, 10) };
  }

  return null;
}

// ═══════════════════════════════════════════════════════════════════════════════
// ГЛАВНАЯ ФУНКЦИЯ ПОИСКА
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Ищет бренды по запросу с использованием полного pipeline.
 *
 * @param rawQuery — сырой пользовательский ввод
 * @param limit    — максимальное число результатов (default: 5)
 * @returns Массив BrandSearchResult, отсортированных по score DESC
 *
 * @example
 *   searchBrands('ранчилио')  // → [{ brand: Rancilio, reason: 'alias', score: 90 }]
 *   searchBrands('hfyxbkbj')  // → [{ brand: Rancilio, reason: 'layout', score: 75 }]
 *   searchBrands('мацер')     // → [{ brand: Mazzer,   reason: 'phonetic', score: 60 }]
 *   searchBrands('vfpth')     // → [{ brand: Mazzer,   reason: 'fuzzy', score: 30+ }]
 */
export function searchBrands(rawQuery: string, limit = 5): BrandSearchResult[] {
  if (!rawQuery || rawQuery.trim().length < 2) return [];

  const candidates = generateCandidates(rawQuery);
  const results    = new Map<string, BrandSearchResult>();

  for (const brand of BRANDS) {
    let bestResult: BrandSearchResult | null = null;

    for (let ci = 0; ci < candidates.length; ci++) {
      const candidate = candidates[ci];
      const matchType =
        ci === 0 ? 'original' :
        ci === 1 || ci === 2 ? 'layout' :
        'translit';

      const match = matchBrand(candidate, brand, matchType);
      if (!match) continue;

      if (!bestResult || match.score > bestResult.score) {
        bestResult = {
          brand,
          score:          match.score,
          matchReason:    match.reason,
          normalizedQuery: candidate,
        };
      }
    }

    if (bestResult) {
      const existing = results.get(brand.id);
      if (!existing || bestResult.score > existing.score) {
        results.set(brand.id, bestResult);
      }
    }
  }

  return [...results.values()]
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

// ═══════════════════════════════════════════════════════════════════════════════
// ЭКСПОРТ УТИЛИТ (для тестов и внешнего использования)
// ═══════════════════════════════════════════════════════════════════════════════

export { EN_TO_RU, RU_TO_EN, TRANSLIT_MAP };
