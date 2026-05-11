/**
 * /api/search/brands — REST-эндпоинт кросс-язычного поиска брендов
 * ───────────────────────────────────────────────────────────────────
 *
 * GET /api/search/brands?q=ранчилио&limit=5
 *
 * Query params:
 *   q      — поисковый запрос (обязателен, мин. 2 символа)
 *   limit  — макс. кол-во результатов (default: 5, max: 20)
 *
 * Response: BrandSearchApiResponse (см. src/types/search.ts)
 *
 * Особенности:
 *   - Pure server-side (Edge-совместим)
 *   - Никаких DB запросов — поиск по статическому BRANDS[] с движком brandSearch
 *   - TODO: при переходе на Supabase — заменить BRANDS на supabase.from('brands').select()
 *   - Cache-Control: public, max-age=60 (бренды меняются редко)
 *
 * RLS-заметка:
 *   Бренды — публичные данные, RLS не требуется.
 *   При добавлении брендов экспонентами → добавить RLS policy:
 *     brands: exhibitor_id == auth.uid() для INSERT/UPDATE
 */

import { NextRequest, NextResponse } from 'next/server';
import { searchBrands } from '@/lib/brandSearch';
import type { BrandSearchApiResponse } from '@/types/search';

/** Максимальное допустимое значение limit */
const MAX_LIMIT = 20;

export async function GET(request: NextRequest): Promise<NextResponse> {
  const t0 = performance.now();

  const { searchParams } = request.nextUrl;
  const rawQuery = searchParams.get('q') ?? '';
  const limitParam = parseInt(searchParams.get('limit') ?? '5', 10);

  // ── Валидация ─────────────────────────────────────────────────────────────
  if (!rawQuery || rawQuery.trim().length < 2) {
    return NextResponse.json(
      { error: 'Query must be at least 2 characters', results: [], query: rawQuery, duration: 0 },
      { status: 400 },
    );
  }

  const limit = Math.min(
    isNaN(limitParam) || limitParam < 1 ? 5 : limitParam,
    MAX_LIMIT,
  );

  // ── Поиск ─────────────────────────────────────────────────────────────────
  const results = searchBrands(rawQuery, limit);

  const duration = Math.round(performance.now() - t0);

  const body: BrandSearchApiResponse = {
    results,
    query: rawQuery,
    duration,
  };

  return NextResponse.json(body, {
    status: 200,
    headers: {
      // Кеш 60с на CDN — бренды не меняются часто
      'Cache-Control': 'public, max-age=60, stale-while-revalidate=300',
    },
  });
}
