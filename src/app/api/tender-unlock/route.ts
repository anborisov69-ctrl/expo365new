/**
 * route.ts — API роут для обработки покупки доступа к тендерам
 * ═══════════════════════════════════════════════════════════════════
 * 
 * Обрабатывает платежи за разблокировку тендеров и интеграцию с 
 * платежными системами (например, ЮKassa, Stripe).
 */

import { NextRequest, NextResponse } from 'next/server'
import { tenderUnlockService } from '@/services/tenderUnlockService'
import { 
  PurchaseTenderAccessRequest, 
  TenderUnlockError,
  SupportedCurrency 
} from '@/types/tender-unlocks'

// ═══════════════════════════════════════════════════════════════════════════════
// POST - Purchasing tender access
// ═══════════════════════════════════════════════════════════════════════════════

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    // Валидация входных данных
    const validation = validatePurchaseRequest(body)
    if (!validation.isValid) {
      return NextResponse.json(
        { error: validation.error },
        { status: 400 }
      )
    }

    const purchaseRequest: PurchaseTenderAccessRequest = validation.data!

    // Инициализация платежа
    const paymentResult = await initializePayment(purchaseRequest)
    
    if (!paymentResult.success) {
      return NextResponse.json(
        { error: paymentResult.error },
        { status: 400 }
      )
    }

    // Если платеж прошел успешно, создаем разблокировку
    const unlockResult = await tenderUnlockService.purchaseAccess(purchaseRequest)

    if (!unlockResult.success) {
      // В случае ошибки, откатываем платеж (если необходимо)
      await rollbackPayment(paymentResult.paymentId)
      
      return NextResponse.json(
        { error: unlockResult.error },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      unlockId: unlockResult.unlockId,
      unlock: unlockResult.unlock,
      paymentId: paymentResult.paymentId
    })

  } catch (error) {
    console.error('[API] Tender unlock error:', error)
    
    if (error instanceof TenderUnlockError) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// GET - Getting unlock status
// ═══════════════════════════════════════════════════════════════════════════════

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const exhibitorId = searchParams.get('exhibitorId')
    const tenderId = searchParams.get('tenderId')

    if (!exhibitorId || !tenderId) {
      return NextResponse.json(
        { error: 'Missing exhibitorId or tenderId' },
        { status: 400 }
      )
    }

    // Проверяем доступ к тендеру
    const accessResult = await tenderUnlockService.checkAccess({
      exhibitorId,
      tenderId
    })

    return NextResponse.json(accessResult)

  } catch (error) {
    console.error('[API] Check access error:', error)
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// UTILITIES
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Валидация запроса на покупку
 */
function validatePurchaseRequest(body: any): {
  isValid: boolean
  error?: string
  data?: PurchaseTenderAccessRequest
} {
  const { exhibitorId, tenderId, paymentType, amount, currency } = body

  // Проверяем обязательные поля
  if (!exhibitorId || !tenderId || !paymentType || !amount || !currency) {
    return {
      isValid: false,
      error: 'Missing required fields: exhibitorId, tenderId, paymentType, amount, currency'
    }
  }

  // Проверяем типы
  if (typeof exhibitorId !== 'string' || typeof tenderId !== 'string') {
    return {
      isValid: false,
      error: 'exhibitorId and tenderId must be strings'
    }
  }

  if (!['one_time', 'subscription_upgrade'].includes(paymentType)) {
    return {
      isValid: false,
      error: 'paymentType must be one_time or subscription_upgrade'
    }
  }

  if (typeof amount !== 'number' || amount <= 0) {
    return {
      isValid: false,
      error: 'amount must be a positive number'
    }
  }

  if (!['RUB', 'USD', 'EUR'].includes(currency)) {
    return {
      isValid: false,
      error: 'currency must be RUB, USD, or EUR'
    }
  }

  return {
    isValid: true,
    data: {
      exhibitorId,
      tenderId,
      paymentType,
      amount,
      currency: currency as SupportedCurrency
    }
  }
}

/**
 * Инициализация платежа (заглушка для интеграции с платежной системой)
 */
async function initializePayment(request: PurchaseTenderAccessRequest): Promise<{
  success: boolean
  paymentId?: string
  error?: string
}> {
  try {
    // В реальной системе здесь будет интеграция с ЮKassa, Stripe, etc.
    // Пока что возвращаем успешный результат для demo
    
    console.log(`[Payment] Initializing payment for ${request.amount} ${request.currency}`)
    
    // Simulate payment processing
    await new Promise(resolve => setTimeout(resolve, 1000))
    
    // Simulate payment success (в продакшене здесь будет реальная логика)
    const paymentId = `payment_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    
    return {
      success: true,
      paymentId
    }

  } catch (error) {
    console.error('[Payment] Error initializing payment:', error)
    
    return {
      success: false,
      error: 'Payment initialization failed'
    }
  }
}

/**
 * Откат платежа в случае ошибки
 */
async function rollbackPayment(paymentId?: string): Promise<void> {
  if (!paymentId) return
  
  try {
    // В реальной системе здесь будет логика отмены платежа
    console.log(`[Payment] Rolling back payment ${paymentId}`)
    
  } catch (error) {
    console.error('[Payment] Error rolling back payment:', error)
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// WEBHOOK ENDPOINTS (для обработки уведомлений от платежных систем)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Обработка webhook от платежной системы
 * В продакшене это должен быть отдельный endpoint
 */
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json()
    
    // Здесь должна быть логика обработки webhook от платежной системы
    // Например, подтверждение успешного платежа
    
    console.log('[Webhook] Payment notification:', body)
    
    return NextResponse.json({ received: true })
    
  } catch (error) {
    console.error('[Webhook] Error processing payment notification:', error)
    
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    )
  }
}