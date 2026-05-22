'use client';

// ════════════════════════════════════════════════════════════════════════════
// src/hooks/useMessagesRealtime.ts
// B2B Chat — Realtime-хуки для таблицы messages
//
// Экспортирует:
//   useMessagesRealtime  — подписка на новые сообщения для конкретного
//                          exhibitorId (используется в /admin/messages).
//   useUnreadMessages    — счётчик непрочитанных + живой инкремент через
//                          Realtime (используется в AdminSidebar для dot).
//
// Транспорт:
//   supabase.channel('messages:{exhibitorId}')
//     .on('postgres_changes', { event: 'INSERT', filter: `receiver_id=eq.{id}` })
//
// RLS-совместимость:
//   Realtime события доставляются только если auth.uid() авторизован и
//   политика "exhibitor_manager_select_messages" разрешает доступ.
// ════════════════════════════════════════════════════════════════════════════

import { useEffect, useCallback, useState, useRef } from 'react';
import { getSupabaseClient } from '@/lib/supabase';

// ── Публичный тип сообщения ────────────────────────────────────────────────

/**
 * Прямое B2B-сообщение из таблицы `messages`.
 * Поля точно соответствуют колонкам таблицы (snake_case).
 */
export interface DirectMessage {
  /** UUID сообщения (gen_random_uuid) */
  id: string;
  /** auth.uid() отправителя */
  sender_id: string;
  /** exhibitors.id получателя */
  receiver_id: string;
  /** Текстовое содержимое */
  body: string;
  /** false = непрочитано менеджером */
  is_read: boolean;
  /** ISO-timestamp UTC */
  created_at: string;
}

// ════════════════════════════════════════════════════════════════════════════
// useMessagesRealtime
// ════════════════════════════════════════════════════════════════════════════

/**
 * Подписывается на Supabase Realtime `INSERT` события в таблице `messages`
 * для заданного `exhibitorId` (receiver_id).
 *
 * Каждое новое входящее сообщение вызывает `onNewMessage`.
 * Подписка автоматически отменяется при размонтировании.
 *
 * @param exhibitorId — UUID экспонента (receiver_id). Null → подписка не создаётся.
 * @param onNewMessage — стабильный коллбэк (useCallback рекомендуется).
 */
export function useMessagesRealtime(
  exhibitorId: string | null,
  onNewMessage: (msg: DirectMessage) => void,
): void {
  // Стабилизируем коллбэк через ref, чтобы не пересоздавать канал при его изменении
  const callbackRef = useRef(onNewMessage);
  useEffect(() => {
    callbackRef.current = onNewMessage;
  }, [onNewMessage]);

  useEffect(() => {
    if (!exhibitorId) return;

    const supabase = getSupabaseClient();
    const channelName = `messages_insert:${exhibitorId}`;

    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event:  'INSERT',
          schema: 'public',
          table:  'messages',
          filter: `receiver_id=eq.${exhibitorId}`,
        },
        (payload) => {
          callbackRef.current(payload.new as DirectMessage);
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [exhibitorId]);
}

// ════════════════════════════════════════════════════════════════════════════
// useUnreadMessages
// ════════════════════════════════════════════════════════════════════════════

export interface UseUnreadMessagesReturn {
  /** Текущее количество непрочитанных сообщений */
  count: number;
  /** UUID экспонента текущего авторизованного пользователя (null = не определён) */
  exhibitorId: string | null;
  /** true пока идёт первоначальная загрузка */
  loading: boolean;
}

/**
 * Возвращает количество непрочитанных входящих сообщений для текущего
 * авторизованного менеджера экспонента.
 *
 * Алгоритм:
 *   1. auth.getUser() → получаем user.id
 *   2. exhibitor_users WHERE user_id = user.id → exhibitor_id
 *   3. COUNT messages WHERE receiver_id = exhibitor_id AND is_read = false
 *   4. Realtime INSERT → инкрементируем count
 *
 * Используется в AdminSidebar для оранжевой точки непрочитанных.
 */
export function useUnreadMessages(): UseUnreadMessagesReturn {
  const [count,       setCount]       = useState(0);
  const [exhibitorId, setExhibitorId] = useState<string | null>(null);
  const [loading,     setLoading]     = useState(true);

  // ── Шаг 1+2+3: Определяем exhibitorId и загружаем count ─────────────────
  useEffect(() => {
    let cancelled = false;

    async function init() {
      try {
        const supabase = getSupabaseClient();

        // Получаем auth.uid() — безопасный серверный метод
        const { data: { user } } = await supabase.auth.getUser();
        if (!user || cancelled) return;

        // Ищем экспонента текущего пользователя
        const { data: euRow } = await supabase
          .from('exhibitor_users')
          .select('exhibitor_id')
          .eq('user_id', user.id)
          .maybeSingle();

        if (!euRow?.exhibitor_id || cancelled) return;

        setExhibitorId(euRow.exhibitor_id);

        // Считаем непрочитанные
        const { count: unread } = await supabase
          .from('messages')
          .select('*', { count: 'exact', head: true })
          .eq('receiver_id', euRow.exhibitor_id)
          .eq('is_read', false);

        if (!cancelled) {
          setCount(unread ?? 0);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    init();
    return () => { cancelled = true; };
  }, []);

  // ── Шаг 4: Realtime инкремент при новом сообщении ────────────────────────
  const handleNewMessage = useCallback(() => {
    setCount((prev) => prev + 1);
  }, []);

  useMessagesRealtime(exhibitorId, handleNewMessage);

  return { count, exhibitorId, loading };
}
