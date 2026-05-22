/**
 * tenderUnlockService.ts — Сервис для управления разблокировками тендеров
 * ════════════════════════════════════════════════════════════════════════════
 * 
 * Реализует функциональность "Pay-per-Tender":
 * - Проверка статуса доступа к тендерам с учетом оплаченных разблокировок
 * - Покупка доступа к отдельным тендерам
 * - Real-time обновления статуса разблокировок
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js'
import { 
  TenderUnlock, 
  TenderAccessStatus,
  TenderUnlockStatus,
  TenderUnlockPricing,
  CheckTenderAccessRequest,
  CheckTenderAccessResponse,
  PurchaseTenderAccessRequest,
  PurchaseTenderAccessResponse,
  TenderUnlockService,
  TenderUnlockError,
  SupportedCurrency
} from '@/types/tender-unlocks'
import { SubscriptionTier } from '@/types/subscription-tiers'

// ═══════════════════════════════════════════════════════════════════════════════
// CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════════

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

/** Время ограничения доступа для базовых пользователей (в часах) */
const TENDER_ACCESS_RESTRICTION_HOURS = 48

/** Базовая цена за разблокировку тендера */
const DEFAULT_UNLOCK_PRICE = 500

/** Цена Premium подписки для расчета окупаемости */
const PREMIUM_SUBSCRIPTION_PRICE = 1500

// ═══════════════════════════════════════════════════════════════════════════════
// SERVICE IMPLEMENTATION
// ═══════════════════════════════════════════════════════════════════════════════

class TenderUnlockServiceImpl implements TenderUnlockService {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private _supabase: SupabaseClient<any> | null = null

  /** Ленивая инициализация — клиент создаётся только при первом обращении (в runtime, не при сборке) */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private get supabase(): SupabaseClient<any> {
    if (!this._supabase) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      this._supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      ) as SupabaseClient<any>
    }
    return this._supabase
  }

  /**
   * Проверяет доступ экспонента к тендеру с учетом разблокировок
   */
  async checkAccess(request: CheckTenderAccessRequest): Promise<CheckTenderAccessResponse> {
    try {
      const { tenderId, exhibitorId } = request

      // Получаем данные тендера и экспонента
      const [tenderData, exhibitorData, unlockData] = await Promise.all([
        this.getTenderData(tenderId),
        this.getExhibitorData(exhibitorId),
        this.getUnlockData(exhibitorId, tenderId)
      ])

      if (!tenderData || !exhibitorData) {
        throw new TenderUnlockError(
          'Tender or exhibitor not found',
          'INVALID_TENDER',
          tenderId,
          exhibitorId
        )
      }

      const accessStatus = this.calculateAccessStatus(
        tenderData,
        exhibitorData.subscription_tier,
        unlockData
      )

      const recommendedAction = this.getRecommendedAction(accessStatus, exhibitorData.subscription_tier)

      return {
        hasAccess: accessStatus.status === 'unlocked' || accessStatus.status === 'accessible',
        accessStatus,
        recommendedAction
      }
    } catch (error) {
      console.error('[TenderUnlockService] Error checking access:', error)
      throw error instanceof TenderUnlockError ? error : new TenderUnlockError(
        'Failed to check tender access',
        'NETWORK_ERROR',
        request.tenderId,
        request.exhibitorId
      )
    }
  }

  /**
   * Получает цену разблокировки для тендера
   */
  async getUnlockPricing(tenderId: string): Promise<TenderUnlockPricing> {
    try {
      // Получаем цену через функцию PostgreSQL
      const { data, error } = await this.supabase.rpc('get_tender_unlock_price', {
        p_tender_id: tenderId
      })

      if (error) throw error

      const unlockPrice = data || DEFAULT_UNLOCK_PRICE
      const breakEvenCount = Math.ceil(PREMIUM_SUBSCRIPTION_PRICE / unlockPrice)

      return {
        tenderId,
        unlockPrice,
        currency: 'RUB' as SupportedCurrency,
        premiumPrice: PREMIUM_SUBSCRIPTION_PRICE,
        breakEvenCount
      }
    } catch (error) {
      console.error('[TenderUnlockService] Error getting unlock pricing:', error)
      throw new TenderUnlockError(
        'Failed to get unlock pricing',
        'NETWORK_ERROR',
        tenderId
      )
    }
  }

  /**
   * Совершает покупку доступа к тендеру
   */
  async purchaseAccess(request: PurchaseTenderAccessRequest): Promise<PurchaseTenderAccessResponse> {
    try {
      const { exhibitorId, tenderId, amount, currency } = request

      // Проверяем, не куплен ли уже доступ
      const existingUnlock = await this.getUnlockData(exhibitorId, tenderId)
      if (existingUnlock) {
        throw new TenderUnlockError(
          'Access already purchased for this tender',
          'ALREADY_UNLOCKED',
          tenderId,
          exhibitorId
        )
      }

      // Вызываем функцию PostgreSQL для покупки доступа
      const { data, error } = await this.supabase.rpc('purchase_tender_access', {
        p_exhibitor_id: exhibitorId,
        p_tender_id: tenderId,
        p_payment_amount: amount,
        p_payment_currency: currency
      })

      if (error) {
        throw new TenderUnlockError(
          `Payment failed: ${error.message}`,
          'PAYMENT_FAILED',
          tenderId,
          exhibitorId
        )
      }

      const unlockId = data

      // Получаем созданную разблокировку
      const unlock = await this.getUnlockById(unlockId)

      return {
        success: true,
        unlockId,
        unlock: unlock || undefined
      }
    } catch (error) {
      console.error('[TenderUnlockService] Error purchasing access:', error)
      
      if (error instanceof TenderUnlockError) {
        return {
          success: false,
          error: error.message
        }
      }

      return {
        success: false,
        error: 'Failed to purchase tender access'
      }
    }
  }

  /**
   * Получает список разблокировок экспонента
   */
  async getExhibitorUnlocks(exhibitorId: string): Promise<TenderUnlock[]> {
    try {
      const { data, error } = await this.supabase
        .from('tender_unlocks')
        .select('*')
        .eq('exhibitor_id', exhibitorId)
        .order('purchased_at', { ascending: false })

      if (error) throw error

      return data.map(this.mapSupabaseToTenderUnlock)
    } catch (error) {
      console.error('[TenderUnlockService] Error getting exhibitor unlocks:', error)
      throw new TenderUnlockError(
        'Failed to get exhibitor unlocks',
        'NETWORK_ERROR',
        undefined,
        exhibitorId
      )
    }
  }

  /**
   * Проверяет, разблокирован ли тендер для экспонента
   */
  async isUnlocked(exhibitorId: string, tenderId: string): Promise<boolean> {
    try {
      const unlock = await this.getUnlockData(exhibitorId, tenderId)
      return !!unlock
    } catch (error) {
      console.error('[TenderUnlockService] Error checking if unlocked:', error)
      return false
    }
  }

  /**
   * Подписывается на изменения статуса разблокировок
   */
  subscribeToUnlockUpdates(
    exhibitorId: string, 
    callback: (unlock: TenderUnlock) => void
  ): () => void {
    const subscription = this.supabase
      .channel('tender_unlocks')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'tender_unlocks',
          filter: `exhibitor_id=eq.${exhibitorId}`
        },
        (payload: any) => {
          const unlock = this.mapSupabaseToTenderUnlock(payload.new)
          callback(unlock)
        }
      )
      .subscribe()

    return () => {
      subscription.unsubscribe()
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════════
  // PRIVATE HELPERS
  // ═══════════════════════════════════════════════════════════════════════════════

  /**
   * Получает данные тендера
   */
  private async getTenderData(tenderId: string) {
    const { data, error } = await this.supabase
      .from('tenders')
      .select('id, created_at, title, buyer_id')
      .eq('id', tenderId)
      .single()

    if (error) throw error
    return data
  }

  /**
   * Получает данные экспонента
   */
  private async getExhibitorData(exhibitorId: string) {
    const { data, error } = await this.supabase
      .from('exhibitors')
      .select('id, subscription_tier, user_id')
      .eq('id', exhibitorId)
      .single()

    if (error) throw error
    return data
  }

  /**
   * Получает данные разблокировки
   */
  private async getUnlockData(exhibitorId: string, tenderId: string) {
    const { data, error } = await this.supabase
      .from('tender_unlocks')
      .select('*')
      .eq('exhibitor_id', exhibitorId)
      .eq('tender_id', tenderId)
      .single()

    if (error && error.code !== 'PGRST116') throw error // PGRST116 = не найдено
    return data
  }

  /**
   * Получает разблокировку по ID
   */
  private async getUnlockById(unlockId: string): Promise<TenderUnlock | null> {
    try {
      const { data, error } = await this.supabase
        .from('tender_unlocks')
        .select('*')
        .eq('id', unlockId)
        .single()

      if (error) throw error
      return this.mapSupabaseToTenderUnlock(data)
    } catch (error) {
      console.error('[TenderUnlockService] Error getting unlock by ID:', error)
      return null
    }
  }

  /**
   * Вычисляет статус доступа к тендеру
   */
  private calculateAccessStatus(
    tenderData: any,
    exhibitorTier: SubscriptionTier,
    unlockData: any
  ): TenderAccessStatus {
    const tenderCreatedAt = new Date(tenderData.created_at)
    const now = new Date()
    const hoursSinceCreated = (now.getTime() - tenderCreatedAt.getTime()) / (1000 * 60 * 60)
    const hoursToUnlock = Math.max(0, TENDER_ACCESS_RESTRICTION_HOURS - hoursSinceCreated)

    // Premium пользователи всегда имеют доступ
    if (exhibitorTier === 'premium') {
      return {
        tenderId: tenderData.id,
        exhibitorId: '', // будет заполнен в checkAccess
        status: 'unlocked',
        hasUnlock: false,
        tenderCreatedAt,
        hoursToUnlock: 0
      }
    }

    // Если есть оплаченная разблокировка
    if (unlockData) {
      return {
        tenderId: tenderData.id,
        exhibitorId: unlockData.exhibitor_id,
        status: 'unlocked',
        hasUnlock: true,
        tenderCreatedAt,
        hoursToUnlock: 0
      }
    }

    // Если прошло 48 часов - доступ свободный
    if (hoursSinceCreated >= TENDER_ACCESS_RESTRICTION_HOURS) {
      return {
        tenderId: tenderData.id,
        exhibitorId: '', // будет заполнен в checkAccess
        status: 'accessible',
        hasUnlock: false,
        tenderCreatedAt,
        hoursToUnlock: 0
      }
    }

    // Иначе тендер заблокирован
    return {
      tenderId: tenderData.id,
      exhibitorId: '', // будет заполнен в checkAccess
      status: 'locked',
      lockReason: `Доступ откроется через ${Math.ceil(hoursToUnlock)} часов`,
      unlockPrice: DEFAULT_UNLOCK_PRICE,
      hasUnlock: false,
      tenderCreatedAt,
      hoursToUnlock
    }
  }

  /**
   * Определяет рекомендуемое действие для пользователя
   */
  private getRecommendedAction(
    accessStatus: TenderAccessStatus,
    exhibitorTier: SubscriptionTier
  ): 'purchase_unlock' | 'upgrade_premium' | 'wait' | undefined {
    if (accessStatus.status === 'unlocked' || accessStatus.status === 'accessible') {
      return undefined
    }

    if (exhibitorTier === 'premium') {
      return undefined
    }

    if (accessStatus.status === 'locked') {
      return 'purchase_unlock'
    }

    return 'wait'
  }

  /**
   * Преобразует данные из Supabase в TenderUnlock
   */
  private mapSupabaseToTenderUnlock(data: any): TenderUnlock {
    return {
      id: data.id,
      exhibitorId: data.exhibitor_id,
      tenderId: data.tender_id,
      purchasedAt: new Date(data.purchased_at),
      paymentAmount: parseFloat(data.payment_amount),
      paymentCurrency: data.payment_currency as SupportedCurrency,
      createdAt: new Date(data.created_at),
      updatedAt: new Date(data.updated_at)
    }
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// SINGLETON EXPORT
// ═══════════════════════════════════════════════════════════════════════════════

export const tenderUnlockService = new TenderUnlockServiceImpl()

// Re-export types for convenience
export type { 
  TenderUnlock, 
  TenderAccessStatus, 
  TenderUnlockPricing,
  CheckTenderAccessRequest,
  CheckTenderAccessResponse,
  PurchaseTenderAccessRequest,
  PurchaseTenderAccessResponse 
} from '@/types/tender-unlocks'