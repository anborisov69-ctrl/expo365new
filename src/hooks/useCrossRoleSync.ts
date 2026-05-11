/**
 * useCrossRoleSync.ts — Хук для Real-time синхронизации между Management Cabinet и Visitor Vitrine
 * ═══════════════════════════════════════════════════════════════════════════════════════
 *
 * Обеспечивает мгновенную синхронизацию состояния между административной панелью экспонента
 * и витриной посетителя через Supabase Realtime subscriptions.
 *
 * Основные сценарии синхронизации:
 * 1. Обновление статуса чат-сессий (pending → active → closed)
 * 2. Синхронизация сообщений в реальном времени
 * 3. Обновление статуса тендеров (открыт/закрыт)
 * 4. Синхронизация финансовых предложений
 *
 * @module hooks/useCrossRoleSync
 */

import { useEffect, useState, useCallback, useRef } from 'react'
import { createClient } from '@supabase/supabase-js'

// Конфигурация Supabase (должна быть в .env.local)
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://your-project.supabase.co'
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'your-anon-key'

// Типы событий для cross-role синхронизации
export type SyncEventType = 
  | 'CHAT_SESSION_UPDATED'
  | 'CHAT_MESSAGE_SENT'
  | 'TENDER_STATUS_CHANGED'
  | 'FINANCE_OFFER_UPDATED'
  | 'PRODUCT_VISIBILITY_CHANGED'

export interface SyncEvent<T = any> {
  type: SyncEventType
  payload: T
  timestamp: string
  source: 'management' | 'visitor'
  targetRole: 'management' | 'visitor' | 'both'
}

export interface ChatSessionSyncPayload {
  sessionId: string
  exhibitorId: string
  status: 'pending' | 'active' | 'closed'
  updatedAt: string
}

export interface ChatMessageSyncPayload {
  messageId: string
  sessionId: string
  role: 'visitor' | 'manager'
  content: string
  sentAt: string
}

export interface TenderStatusSyncPayload {
  tenderId: string
  status: 'open' | 'closed' | 'archived'
  closedBy?: string // buyer_id
  closedAt?: string
}

export interface FinanceOfferSyncPayload {
  offerId: string
  tenderId: string
  bankId: string
  status: 'pending' | 'accepted' | 'rejected'
  updatedAt: string
}

export interface UseCrossRoleSyncOptions {
  /** ID экспонента для фильтрации событий */
  exhibitorId?: string
  /** Роль текущего пользователя (management или visitor) */
  currentRole: 'management' | 'visitor'
  /** Включить синхронизацию чат-сессий */
  enableChatSync?: boolean
  /** Включить синхронизацию тендеров */
  enableTenderSync?: boolean
  /** Включить синхронизацию финансовых предложений */
  enableFinanceSync?: boolean
  /** Callback при получении события */
  onEvent?: (event: SyncEvent) => void
}

export interface UseCrossRoleSyncReturn {
  /** Подключен ли к Realtime */
  isConnected: boolean
  /** Количество полученных событий */
  eventCount: number
  /** Последнее полученное событие */
  lastEvent: SyncEvent | null
  /** Отправить событие синхронизации */
  emitEvent: <T>(type: SyncEventType, payload: T, targetRole?: 'management' | 'visitor' | 'both') => Promise<void>
  /** Отключиться от Realtime */
  disconnect: () => void
}

/**
 * Хук для cross-role синхронизации через Supabase Realtime
 */
export function useCrossRoleSync({
  exhibitorId,
  currentRole,
  enableChatSync = true,
  enableTenderSync = true,
  enableFinanceSync = true,
  onEvent
}: UseCrossRoleSyncOptions): UseCrossRoleSyncReturn {
  const [isConnected, setIsConnected] = useState(false)
  const [eventCount, setEventCount] = useState(0)
  const [lastEvent, setLastEvent] = useState<SyncEvent | null>(null)

  const supabaseRef = useRef<ReturnType<typeof createClient> | null>(null)
  const subscriptionRef = useRef<any>(null)

  // Инициализация Supabase клиента
  useEffect(() => {
    if (!supabaseRef.current) {
      supabaseRef.current = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
    }
  }, [])

  // Функция для отправки событий
  const emitEvent = useCallback(async <T>(
    type: SyncEventType,
    payload: T,
    targetRole: 'management' | 'visitor' | 'both' = 'both'
  ) => {
    if (!supabaseRef.current) {
      console.warn('[CrossRoleSync] Supabase client not initialized')
      return
    }

    const event: SyncEvent<T> = {
      type,
      payload,
      timestamp: new Date().toISOString(),
      source: currentRole,
      targetRole
    }

    try {
      // В production: отправляем событие через Supabase Realtime
      // Для демо используем BroadcastChannel как fallback
      if (typeof BroadcastChannel !== 'undefined') {
        const channel = new BroadcastChannel(`expo365-sync-${exhibitorId || 'global'}`)
        channel.postMessage(event)
        channel.close()
      }

      // Также отправляем в Supabase для persistence и cross-device синхронизации
      const { error } = await supabaseRef.current
        .from('sync_events')
        .insert({
          type,
          payload,
          source: currentRole,
          target_role: targetRole,
          exhibitor_id: exhibitorId,
          created_at: new Date().toISOString()
        })

      if (error) {
        console.error('[CrossRoleSync] Error saving sync event:', error)
      }
    } catch (error) {
      console.error('[CrossRoleSync] Error emitting event:', error)
    }
  }, [currentRole, exhibitorId])

  // Подписка на Realtime события
  useEffect(() => {
    if (!supabaseRef.current || !exhibitorId) return

    const supabase = supabaseRef.current

    // Создаем канал для синхронизации
    const channel = supabase
      .channel(`cross-role-sync-${exhibitorId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'sync_events',
          filter: `exhibitor_id=eq.${exhibitorId}`
        },
        (payload) => {
          const event = payload.new as any
          
          // Фильтруем события по targetRole
          if (
            event.target_role === 'both' ||
            event.target_role === currentRole ||
            (event.target_role === 'management' && currentRole === 'management') ||
            (event.target_role === 'visitor' && currentRole === 'visitor')
          ) {
            const syncEvent: SyncEvent = {
              type: event.type as SyncEventType,
              payload: event.payload,
              timestamp: event.created_at,
              source: event.source as 'management' | 'visitor',
              targetRole: event.target_role as 'management' | 'visitor' | 'both'
            }

            setLastEvent(syncEvent)
            setEventCount(prev => prev + 1)
            setIsConnected(true)

            // Вызываем callback
            if (onEvent) {
              onEvent(syncEvent)
            }

            // Обработка специфичных типов событий
            switch (syncEvent.type) {
              case 'CHAT_SESSION_UPDATED':
                if (enableChatSync) {
                  console.log('[CrossRoleSync] Chat session updated:', syncEvent.payload)
                }
                break
              case 'TENDER_STATUS_CHANGED':
                if (enableTenderSync) {
                  console.log('[CrossRoleSync] Tender status changed:', syncEvent.payload)
                }
                break
              case 'FINANCE_OFFER_UPDATED':
                if (enableFinanceSync) {
                  console.log('[CrossRoleSync] Finance offer updated:', syncEvent.payload)
                }
                break
            }
          }
        }
      )
      .subscribe((status) => {
        console.log('[CrossRoleSync] Subscription status:', status)
        setIsConnected(status === 'SUBSCRIBED')
      })

    subscriptionRef.current = channel

    return () => {
      if (subscriptionRef.current) {
        supabase.removeChannel(subscriptionRef.current)
        subscriptionRef.current = null
        setIsConnected(false)
      }
    }
  }, [exhibitorId, currentRole, enableChatSync, enableTenderSync, enableFinanceSync, onEvent])

  // Fallback на BroadcastChannel для демо (если Supabase не настроен)
  useEffect(() => {
    if (!exhibitorId || supabaseRef.current) return

    if (typeof BroadcastChannel !== 'undefined') {
      const channel = new BroadcastChannel(`expo365-sync-${exhibitorId}`)
      
      channel.onmessage = (event) => {
        const syncEvent = event.data as SyncEvent
        
        // Фильтруем события по targetRole
        if (
          syncEvent.targetRole === 'both' ||
          syncEvent.targetRole === currentRole
        ) {
          setLastEvent(syncEvent)
          setEventCount(prev => prev + 1)
          
          if (onEvent) {
            onEvent(syncEvent)
          }
        }
      }

      return () => {
        channel.close()
      }
    }
  }, [exhibitorId, currentRole, onEvent])

  const disconnect = useCallback(() => {
    if (subscriptionRef.current && supabaseRef.current) {
      supabaseRef.current.removeChannel(subscriptionRef.current)
      subscriptionRef.current = null
      setIsConnected(false)
    }
  }, [])

  return {
    isConnected,
    eventCount,
    lastEvent,
    emitEvent,
    disconnect
  }
}

/**
 * Вспомогательный хук для синхронизации чат-сессий
 */
export function useChatSessionSync(
  exhibitorId: string,
  currentRole: 'management' | 'visitor',
  onSessionUpdate?: (payload: ChatSessionSyncPayload) => void
) {
  const { emitEvent, ...rest } = useCrossRoleSync({
    exhibitorId,
    currentRole,
    enableChatSync: true,
    enableTenderSync: false,
    enableFinanceSync: false,
    onEvent: (event) => {
      if (event.type === 'CHAT_SESSION_UPDATED' && onSessionUpdate) {
        onSessionUpdate(event.payload as ChatSessionSyncPayload)
      }
    }
  })

  const updateSessionStatus = useCallback((
    sessionId: string,
    status: 'pending' | 'active' | 'closed',
    targetRole: 'management' | 'visitor' | 'both' = 'both'
  ) => {
    const payload: ChatSessionSyncPayload = {
      sessionId,
      exhibitorId,
      status,
      updatedAt: new Date().toISOString()
    }
    
    return emitEvent('CHAT_SESSION_UPDATED', payload, targetRole)
  }, [emitEvent, exhibitorId])

  return {
    ...rest,
    updateSessionStatus
  }
}

/**
 * Вспомогательный хук для синхронизации статуса тендеров
 */
export function useTenderStatusSync(
  exhibitorId: string,
  currentRole: 'management' | 'visitor',
  onTenderStatusChange?: (payload: TenderStatusSyncPayload) => void
) {
  const { emitEvent, ...rest } = useCrossRoleSync({
    exhibitorId,
    currentRole,
    enableChatSync: false,
    enableTenderSync: true,
    enableFinanceSync: false,
    onEvent: (event) => {
      if (event.type === 'TENDER_STATUS_CHANGED' && onTenderStatusChange) {
        onTenderStatusChange(event.payload as TenderStatusSyncPayload)
      }
    }
  })

  const updateTenderStatus = useCallback((
    tenderId: string,
    status: 'open' | 'closed' | 'archived',
    closedBy?: string,
    targetRole: 'management' | 'visitor' | 'both' = 'both'
  ) => {
    const payload: TenderStatusSyncPayload = {
      tenderId,
      status,
      closedBy,
      closedAt: status === 'closed' ? new Date().toISOString() : undefined
    }
    
    return emitEvent('TENDER_STATUS_CHANGED', payload, targetRole)
  }, [emitEvent])

  return {
    ...rest,
    updateTenderStatus
  }
}