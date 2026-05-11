/**
 * POST /api/referral/track
 * ─────────────────────────────────────────────────────────────────────────────
 * Фиксирует реферальный переход одного из трёх типов:
 *
 *   partner — байер кликнул по Партнёрской ссылке → редирект на регистрацию
 *             с флагом PENDING (источник: ?invite=partner&source=ooo-test)
 *
 *   visitor — посетитель кликнул по Гостевой ссылке  → редирект в Шоурум
 *             (источник: ?invite=visitor&source=ooo-test)
 *
 *   b2b     — компания кликнула по Бизнес-ссылке → редирект на лендинг
 *             нового экспонента (источник: ?invite=b2b&ref=ooo-test)
 *
 * В production — заменить на Supabase INSERT:
 *   supabase.from('referral_events').insert({ type, source, slug, ip, ua, ts })
 *   + RLS: authenticated exhibitor_id = source_slug
 *
 * TODO: rate-limiting (1 событие / IP / 10 мин) для защиты счётчиков.
 */

import { NextRequest, NextResponse } from 'next/server';

// ─── Types ────────────────────────────────────────────────────────────────────

export type ReferralEventType = 'partner' | 'visitor' | 'b2b';

export interface ReferralTrackPayload {
  /** Тип приглашения */
  type:   ReferralEventType;
  /**
   * Slug источника (экспонента, создавшего ссылку).
   * Пример: 'ooo-test'
   */
  source: string;
  /**
   * Для b2b: slug нового экспонента (если уже известен из формы регистрации).
   * Для partner/visitor: slug байера (если авторизован).
   * null — анонимный переход (только счётчик клика).
   */
  slug?:  string | null;
}

export interface ReferralTrackResponse {
  ok:       boolean;
  eventId:  string;
  redirect: string;
}

// ─── Redirect destinations ────────────────────────────────────────────────────

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL ?? 'https://expo365.com';

function buildRedirect(type: ReferralEventType, source: string): string {
  switch (type) {
    case 'partner':
      // Регистрация с флагом PENDING — будущая страница /register
      return `${BASE_URL}/register?invite=partner&source=${source}&status=pending`;
    case 'visitor':
      // Прямой переход в Шоурум источника
      return `${BASE_URL}/horeca/exhibitors/${source}?invite=visitor&source=${source}`;
    case 'b2b':
      // Лендинг для новых экспонентов
      return `${BASE_URL}/horeca?invite=b2b&ref=${source}`;
  }
}

// ─── In-memory event log (dev mock) ──────────────────────────────────────────
// В production заменить на Supabase-запись:
//   INSERT INTO referral_events (type, source, slug, ip, user_agent, created_at)
//   VALUES ($1, $2, $3, $4, $5, NOW())

interface ReferralEvent {
  eventId:   string;
  type:      ReferralEventType;
  source:    string;
  slug:      string | null;
  ip:        string;
  userAgent: string;
  createdAt: string;
}

/** Хранилище событий в памяти (сбрасывается при перезапуске — только для dev) */
const EVENT_LOG: ReferralEvent[] = [];
let   EVENT_COUNTER = 1;

// ─── Handler ──────────────────────────────────────────────────────────────────

export async function POST(req: NextRequest): Promise<NextResponse> {
  let body: Partial<ReferralTrackPayload>;

  try {
    body = await req.json() as Partial<ReferralTrackPayload>;
  } catch {
    return NextResponse.json(
      { ok: false, error: 'Invalid JSON body' },
      { status: 400 },
    );
  }

  const { type, source, slug = null } = body;

  // Валидация обязательных полей
  if (!type || !source) {
    return NextResponse.json(
      { ok: false, error: 'Missing required fields: type, source' },
      { status: 422 },
    );
  }

  const VALID_TYPES: ReferralEventType[] = ['partner', 'visitor', 'b2b'];
  if (!VALID_TYPES.includes(type)) {
    return NextResponse.json(
      { ok: false, error: `Invalid type. Must be one of: ${VALID_TYPES.join(', ')}` },
      { status: 422 },
    );
  }

  // Собираем метаданные запроса
  const ip        = req.headers.get('x-forwarded-for') ?? req.headers.get('x-real-ip') ?? 'unknown';
  const userAgent = req.headers.get('user-agent') ?? 'unknown';
  const eventId   = `evt-${Date.now()}-${EVENT_COUNTER++}`;

  const event: ReferralEvent = {
    eventId,
    type,
    source,
    slug:      slug ?? null,
    ip,
    userAgent,
    createdAt: new Date().toISOString(),
  };

  // DEBUG: логируем (в production → Supabase INSERT)
  EVENT_LOG.push(event);
  if (process.env.NODE_ENV === 'development') {
    console.log('[referral/track]', event);
  }

  const redirect = buildRedirect(type, source);

  const response: ReferralTrackResponse = { ok: true, eventId, redirect };

  return NextResponse.json(response, {
    status: 200,
    headers: {
      // Разрешаем вызов из iframe / разных origin (для QR-лендингов)
      'Access-Control-Allow-Origin': '*',
      'Cache-Control': 'no-store',
    },
  });
}

/** GET /api/referral/track — возвращает статистику кликов (only dev / admin) */
export async function GET(req: NextRequest): Promise<NextResponse> {
  // В production → защитить Supabase RLS / Bearer token
  const source = req.nextUrl.searchParams.get('source');

  const filtered = source
    ? EVENT_LOG.filter((e) => e.source === source)
    : EVENT_LOG;

  const stats = {
    total:   filtered.length,
    partner: filtered.filter((e) => e.type === 'partner').length,
    visitor: filtered.filter((e) => e.type === 'visitor').length,
    b2b:     filtered.filter((e) => e.type === 'b2b').length,
    events:  filtered.slice(-20), // последние 20
  };

  return NextResponse.json(stats);
}
