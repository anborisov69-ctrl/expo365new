/**
 * supabase.ts — Singleton Supabase client для EXPO 365
 * ────────────────────────────────────────────────────
 * Предотвращает предупреждение «Multiple GoTrueClient instances detected»,
 * гарантируя единственный клиент на протяжении всего JS-рантайма браузера.
 *
 * Паттерн:
 *   - Браузер  → module-level singleton (один экземпляр на вкладку)
 *   - Сервер   → новый клиент при каждом вызове (нет shared-state между запросами)
 *
 * @module lib/supabase
 */

import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL      = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SupabaseInstance = ReturnType<typeof createClient<any>>

/** Singleton-экземпляр — живёт только на стороне клиента */
let _browserInstance: SupabaseInstance | null = null

/**
 * Возвращает singleton Supabase-клиент.
 * На клиенте — всегда один и тот же объект.
 * На сервере — новый per-request (SSR / Route Handlers).
 */
export function getSupabaseClient(): SupabaseInstance {
  if (typeof window === 'undefined') {
    // SSR / Server Component — изолированный клиент без Session-стора
    return createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: { persistSession: false },
    })
  }

  if (!_browserInstance) {
    _browserInstance = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  }

  return _browserInstance
}
