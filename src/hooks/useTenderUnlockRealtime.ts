/**
 * useTenderUnlockRealtime.ts — Хук для Real-time обновлений разблокировки тендеров
 * ═══════════════════════════════════════════════════════════════════════════════════════
 * 
 * Обеспечивает мгновенные обновления интерфейса при покупке доступа к тендерам
 * через Supabase Realtime subscriptions.
 */

import { useEffect, useState, useCallback, useRef } from 'react'
import { getSupabaseClient } from '@/lib/supabase'
import {
  TenderUnlock,
  TenderAccessStatus,
  TenderUnlockStatus
} from '@/types/tender-unlocks'

// ═══════════════════════════════════════════════════════════════════════════════
// CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════════

// ═══════════════════════════════════════════════════════════════════════════════
// TENDER UNLOCK REALTIME HOOK
// ═══════════════════════════════════════════════════════════════════════════════

interface UseTenderUnlockRealtimeOptions {
  /** ID экспонента для фильтрации обновлений */
  exhibitorId: string
  /** Список ID тендеров для отслеживания (опционально) */
  tenderIds?: string[]
  /** Callback при получении новой разблокировки */
  onUnlockReceived?: (unlock: TenderUnlock) => void
  /** Callback при обновлении статуса доступа */
  onAccessStatusUpdate?: (tenderId: string, status: TenderUnlockStatus) => void
  /** Включить автоматические уведомления */
  enableNotifications?: boolean
}

interface UnlockRealtimeState {
  /** Карта разблокированных тендеров для текущего экспонента */
  unlockedTenders: Map<string, TenderUnlock>
  /** Состояние подключения */
  isConnected: boolean
  /** Состояние загрузки */
  isLoading: boolean
  /** Ошибки подключения */
  error: string | null
}

export function useTenderUnlockRealtime({
  exhibitorId,
  tenderIds = [],
  onUnlockReceived,
  onAccessStatusUpdate,
  enableNotifications = true
}: UseTenderUnlockRealtimeOptions) {
  const [state, setState] = useState<UnlockRealtimeState>({
    unlockedTenders: new Map(),
    isConnected: false,
    isLoading: true,
    error: null
  })

  const supabaseRef = useRef<ReturnType<typeof getSupabaseClient> | null>(null)
  const subscriptionRef = useRef<any>(null)

  // Инициализация Supabase клиента (singleton — без дублирования GoTrueClient)
  useEffect(() => {
    if (!supabaseRef.current) {
      supabaseRef.current = getSupabaseClient()
    }
  }, [])

  // Загрузка существующих разблокировок
  const loadExistingUnlocks = useCallback(async () => {
    if (!supabaseRef.current) return

    try {
      setState(prev => ({ ...prev, isLoading: true, error: null }))

      let query = supabaseRef.current
        .from('tender_unlocks')
        .select('*')
        .eq('exhibitor_id', exhibitorId)

      // Фильтруем по конкретным тендерам если указано
      if (tenderIds.length > 0) {
        query = query.in('tender_id', tenderIds)
      }

      const { data, error } = await query

      if (error) {
        throw error
      }

      const unlocksMap = new Map<string, TenderUnlock>()
      
      if (data) {
        data.forEach((unlock: any) => {
          const tenderUnlock: TenderUnlock = {
            id: unlock.id,
            exhibitorId: unlock.exhibitor_id,
            tenderId: unlock.tender_id,
            purchasedAt: new Date(unlock.purchased_at),
            paymentAmount: parseFloat(unlock.payment_amount),
            paymentCurrency: unlock.payment_currency,
            createdAt: new Date(unlock.created_at),
            updatedAt: new Date(unlock.updated_at)
          }
          
          unlocksMap.set(unlock.tender_id, tenderUnlock)
        })
      }

      setState(prev => ({
        ...prev,
        unlockedTenders: unlocksMap,
        isLoading: false
      }))

    } catch (error) {
      console.error('[UnlockRealtime] Error loading existing unlocks:', error)
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Unknown error',
        isLoading: false
      }))
    }
  }, [exhibitorId, tenderIds])

  // Подписка на Real-time обновления
  useEffect(() => {
    if (!supabaseRef.current || !exhibitorId) return

    // Загружаем существующие разблокировки
    loadExistingUnlocks()

    // Создаем Real-time подписку
    const channel = supabaseRef.current
      .channel('tender_unlocks_channel')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'tender_unlocks',
          filter: `exhibitor_id=eq.${exhibitorId}`
        },
        (payload: any) => {
          console.log('[UnlockRealtime] New unlock received:', payload)

          const newUnlock: TenderUnlock = {
            id: payload.new.id,
            exhibitorId: payload.new.exhibitor_id,
            tenderId: payload.new.tender_id,
            purchasedAt: new Date(payload.new.purchased_at),
            paymentAmount: parseFloat(payload.new.payment_amount),
            paymentCurrency: payload.new.payment_currency,
            createdAt: new Date(payload.new.created_at),
            updatedAt: new Date(payload.new.updated_at)
          }

          // Обновляем состояние
          setState(prev => {
            const newMap = new Map(prev.unlockedTenders)
            newMap.set(newUnlock.tenderId, newUnlock)
            
            return {
              ...prev,
              unlockedTenders: newMap
            }
          })

          // Вызываем callback
          if (onUnlockReceived) {
            onUnlockReceived(newUnlock)
          }

          // Обновляем статус доступа
          if (onAccessStatusUpdate) {
            onAccessStatusUpdate(newUnlock.tenderId, 'unlocked')
          }

          // Показываем уведомление
          if (enableNotifications && (window as any).tenderUnlockNotifications?.add) {
            (window as any).tenderUnlockNotifications.add({
              type: 'unlock_success',
              title: 'Тендер разблокирован!',
              message: 'Доступ к тендеру успешно приобретен. Обновляем интерфейс...',
              data: {
                tenderId: newUnlock.tenderId,
                unlockId: newUnlock.id
              }
            })
          }
        }
      )
      .subscribe((status: any) => {
        console.log('[UnlockRealtime] Subscription status:', status)
        
        setState(prev => ({
          ...prev,
          isConnected: status === 'SUBSCRIBED',
          error: status === 'CHANNEL_ERROR' ? 'Connection failed' : null
        }))
      })

    subscriptionRef.current = channel

    // Cleanup
    return () => {
      if (subscriptionRef.current) {
        supabaseRef.current?.removeChannel(subscriptionRef.current)
        subscriptionRef.current = null
      }
    }
  }, [exhibitorId, loadExistingUnlocks, onUnlockReceived, onAccessStatusUpdate, enableNotifications])

  // Проверка, разблокирован ли тендер
  const isUnlocked = useCallback((tenderId: string): boolean => {
    return state.unlockedTenders.has(tenderId)
  }, [state.unlockedTenders])

  // Получение информации о разблокировке
  const getUnlock = useCallback((tenderId: string): TenderUnlock | null => {
    return state.unlockedTenders.get(tenderId) || null
  }, [state.unlockedTenders])

  // Принудительное обновление разблокировок
  const refreshUnlocks = useCallback(() => {
    loadExistingUnlocks()
  }, [loadExistingUnlocks])

  // Получение списка всех разблокированных тендеров
  const getUnlockedTenderIds = useCallback((): string[] => {
    return Array.from(state.unlockedTenders.keys())
  }, [state.unlockedTenders])

  return {
    // Состояние
    isConnected: state.isConnected,
    isLoading: state.isLoading,
    error: state.error,
    
    // Данные
    unlockedTenders: state.unlockedTenders,
    unlockedTenderIds: getUnlockedTenderIds(),
    
    // Методы
    isUnlocked,
    getUnlock,
    refreshUnlocks
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// TENDER ACCESS STATUS HOOK WITH REALTIME
// ═══════════════════════════════════════════════════════════════════════════════

interface UseTenderAccessWithRealtimeOptions {
  tenderId: string
  exhibitorId: string
  exhibitorTier: 'base' | 'premium'
  tenderCreatedAt: Date | string
}

export function useTenderAccessWithRealtime({
  tenderId,
  exhibitorId,
  exhibitorTier,
  tenderCreatedAt
}: UseTenderAccessWithRealtimeOptions) {
  const [accessStatus, setAccessStatus] = useState<TenderAccessStatus | null>(null)

  // Real-time hook для отслеживания разблокировок
  const { isUnlocked, isConnected, getUnlock } = useTenderUnlockRealtime({
    exhibitorId,
    tenderIds: [tenderId],
    onAccessStatusUpdate: (updatedTenderId, status) => {
      if (updatedTenderId === tenderId) {
        setAccessStatus(prev => prev ? {
          ...prev,
          status,
          hasUnlock: status === 'unlocked'
        } : null)
      }
    }
  })

  // Вычисление статуса доступа
  useEffect(() => {
    const calculateStatus = (): TenderAccessStatus => {
      const createdAt = new Date(tenderCreatedAt)
      const now = new Date()
      const hoursSinceCreated = (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60)
      const hoursToUnlock = Math.max(0, 48 - hoursSinceCreated)

      // Premium всегда имеет доступ
      if (exhibitorTier === 'premium') {
        return {
          tenderId,
          exhibitorId,
          status: 'unlocked',
          hasUnlock: false,
          tenderCreatedAt: createdAt,
          hoursToUnlock: 0
        }
      }

      // Проверяем разблокировку
      if (isUnlocked(tenderId)) {
        return {
          tenderId,
          exhibitorId,
          status: 'unlocked',
          hasUnlock: true,
          tenderCreatedAt: createdAt,
          hoursToUnlock: 0
        }
      }

      // Проверяем 48-часовое правило
      if (hoursSinceCreated >= 48) {
        return {
          tenderId,
          exhibitorId,
          status: 'accessible',
          hasUnlock: false,
          tenderCreatedAt: createdAt,
          hoursToUnlock: 0
        }
      }

      // Иначе заблокировано
      return {
        tenderId,
        exhibitorId,
        status: 'locked',
        lockReason: `Доступ откроется через ${Math.ceil(hoursToUnlock)} часов`,
        unlockPrice: 500, // Можно получать динамически
        hasUnlock: false,
        tenderCreatedAt: createdAt,
        hoursToUnlock
      }
    }

    setAccessStatus(calculateStatus())
  }, [tenderId, exhibitorId, exhibitorTier, tenderCreatedAt, isUnlocked])

  return {
    accessStatus,
    isConnected,
    unlock: getUnlock(tenderId)
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// GLOBAL REALTIME MANAGER
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Глобальный менеджер Real-time обновлений для разблокировок
 */
export class TenderUnlockRealtimeManager {
  private static instance: TenderUnlockRealtimeManager
  private subscribers = new Map<string, Set<(unlock: TenderUnlock) => void>>()

  static getInstance(): TenderUnlockRealtimeManager {
    if (!TenderUnlockRealtimeManager.instance) {
      TenderUnlockRealtimeManager.instance = new TenderUnlockRealtimeManager()
    }
    return TenderUnlockRealtimeManager.instance
  }

  subscribe(exhibitorId: string, callback: (unlock: TenderUnlock) => void): () => void {
    if (!this.subscribers.has(exhibitorId)) {
      this.subscribers.set(exhibitorId, new Set())
    }
    
    this.subscribers.get(exhibitorId)!.add(callback)

    // Возвращаем функцию отписки
    return () => {
      const callbacks = this.subscribers.get(exhibitorId)
      if (callbacks) {
        callbacks.delete(callback)
        if (callbacks.size === 0) {
          this.subscribers.delete(exhibitorId)
        }
      }
    }
  }

  notifySubscribers(exhibitorId: string, unlock: TenderUnlock): void {
    const callbacks = this.subscribers.get(exhibitorId)
    if (callbacks) {
      callbacks.forEach(callback => callback(unlock))
    }
  }
}

// Экспорт singleton
export const realtimeManager = TenderUnlockRealtimeManager.getInstance()