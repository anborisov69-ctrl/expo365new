import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/tender-close
// Body: { tenderId: string; buyerId: string }
//
// Вызывает Supabase RPC close_tender() — атомарная операция, которая:
//   1. Обновляет status = 'closed', closed_by = 'buyer', closed_at = NOW()
//   2. Создаёт нейтральные уведомления для всех участвующих экспонентов
//
// Причина закрытия не принимается и не записывается намеренно — исключает
// субъективную обратную связь. Для admin-лога фиксируется только факт действия.
//
// Используем service-role ключ, чтобы обойти RLS только для мутаций
// (RLS по-прежнему защищает SELECT-запросы пользователей).
// ─────────────────────────────────────────────────────────────────────────────

interface CloseTenderPayload {
  tenderId: string
  buyerId: string
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as CloseTenderPayload

    // ── Validate input ───────────────────────────────────────────────────────
    if (!body.tenderId || !body.buyerId) {
      return NextResponse.json(
        { error: 'tenderId и buyerId обязательны' },
        { status: 400 }
      )
    }

    // UUID-чекер (базовая санитизация)
    const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    if (!UUID_RE.test(body.tenderId) || !UUID_RE.test(body.buyerId)) {
      return NextResponse.json(
        { error: 'Некорректный формат идентификатора' },
        { status: 400 }
      )
    }

    // ── Supabase admin client (service_role — только на сервере) ────────────
    const supabaseUrl     = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseService = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !supabaseService) {
      console.error('[tender-close] Supabase env vars not configured')
      return NextResponse.json(
        { error: 'Сервис временно недоступен' },
        { status: 503 }
      )
    }

    const supabase = createClient(supabaseUrl, supabaseService, {
      auth: { persistSession: false }
    })

    // ── Verify tender ownership ──────────────────────────────────────────────
    const { data: tender, error: fetchError } = await supabase
      .from('tenders')
      .select('buyer_id, status')
      .eq('id', body.tenderId)
      .single()

    if (fetchError) {
      console.error('[tender-close] Tender fetch error:', fetchError.message)
      return NextResponse.json(
        { error: 'Тендер не найден' },
        { status: 404 }
      )
    }

    if (tender.buyer_id !== body.buyerId) {
      console.error(`[tender-close] Ownership mismatch: tender.buyer_id=${tender.buyerId}, provided buyerId=${body.buyerId}`)
      return NextResponse.json(
        { error: 'Недостаточно прав для закрытия тендера' },
        { status: 403 }
      )
    }

    if (tender.status === 'closed') {
      return NextResponse.json(
        { error: 'Тендер уже закрыт' },
        { status: 409 }
      )
    }

    // ── Call atomic RPC ──────────────────────────────────────────────────────
    const { data, error } = await supabase.rpc('close_tender', {
      p_tender_id: body.tenderId,
      p_buyer_id:  body.buyerId,
    })

    if (error) {
      console.error('[tender-close] RPC error:', error.message)
      return NextResponse.json(
        { error: error.message ?? 'Ошибка закрытия тендера' },
        { status: 422 }
      )
    }

    // RPC returns { success, tender_id, closed_at, notified } or { success: false, error }
    if (!data?.success) {
      return NextResponse.json(
        { error: data?.error ?? 'Не удалось закрыть тендер' },
        { status: 409 }
      )
    }

    // ── Admin audit log (только факт действия, без причины) ─────────────────
    console.info(
      `[tender-close] [AUDIT] Buyer ${body.buyerId} closed the tender ${body.tenderId}`
    )

    return NextResponse.json({
      success:  true,
      tenderId: body.tenderId,
      closedAt: data.closed_at,
      notified: data.notified,
    })

  } catch (err) {
    console.error('[tender-close] Unexpected error:', err)
    return NextResponse.json(
      { error: 'Внутренняя ошибка сервера' },
      { status: 500 }
    )
  }
}
