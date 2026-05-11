'use client';

// ════════════════════════════════════════════════════════════════════════════
// src/hooks/useChatSession.ts
// ExpoChatSync — хуки реального времени для чат-сессий
//
// Архитектура транспорта:
//   DEMO  : BroadcastChannel(expo-chat-{slug}) — работает между вкладками
//           одного браузера без серверного соединения.
//   PROD  : заменяется на supabase.channel('chat:{slug}') с теми же типами событий.
//           Cross-role sync через таблицу sync_events для синхронизации между ролями.
//
// Экспортирует:
//   useChatSession     — сторона посетителя: создать сессию, отправить сообщение.
//   useIncomingChats   — сторона менеджера: принимать сессии, отвечать.
// ════════════════════════════════════════════════════════════════════════════

import { useState, useEffect, useCallback, useRef } from 'react';
import type {
  ChatSession,
  ChatMessage,
  ChatEvent,
  SessionStartPayload,
  MessageSentPayload,
  ManagerJoinedPayload,
} from '@/types/chat';
import { useChatSessionSync } from './useCrossRoleSync';

// ── Утилиты ──────────────────────────────────────────────────────────────────

/**
 * Генерация UUID v4 без внешних зависимостей.
 * Использует `crypto.randomUUID()` там, где доступно; иначе — Math.random fallback.
 */
function generateUUID(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
}

/**
 * Возвращает или создаёт постоянный анонимный ID посетителя.
 * Хранится в localStorage; при входе через Supabase Auth заменяется на auth.uid().
 */
function getOrCreateVisitorId(): string {
  if (typeof window === 'undefined') return 'ssr-placeholder';
  const KEY = 'expo365_visitor_id';
  let id = localStorage.getItem(KEY);
  if (!id) {
    id = `anon-${generateUUID()}`;
    localStorage.setItem(KEY, id);
  }
  return id;
}

/**
 * Имя канала BroadcastChannel, изолированного по slug.
 * Предотвращает «утечку» событий между разными экспонентами.
 */
function bcChannelName(exhibitorSlug: string): string {
  return `expo-chat-${exhibitorSlug}`;
}

// ════════════════════════════════════════════════════════════════════════════
// useChatSession — СТОРОНА ПОСЕТИТЕЛЯ
// ════════════════════════════════════════════════════════════════════════════

export interface UseChatSessionOptions {
  exhibitorId: string;
  exhibitorSlug: string;
  exhibitorName: string;
}

export interface UseChatSessionReturn {
  /** Текущая сессия (null до startSession()) */
  session: ChatSession | null;
  /** Сообщения диалога в хронологическом порядке */
  messages: ChatMessage[];
  /** true когда менеджер подключился к сессии */
  isConnected: boolean;
  /** Человекочитаемый статус — «Сотрудник ООО «ТЕСТ» на связи» */
  managerStatusLabel: string;
  /** Создаёт сессию и эмитит SessionStart → менеджерскому Vibrant Alert */
  startSession: () => void;
  /** Отправляет текстовое сообщение в рамках активной сессии */
  sendMessage: (content: string) => void;
  /** Завершает сессию */
  closeSession: () => void;
}

export function useChatSession({
  exhibitorId,
  exhibitorSlug,
  exhibitorName,
}: UseChatSessionOptions): UseChatSessionReturn {
  const [session, setSession] = useState<ChatSession | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [managerStatusLabel, setManagerStatusLabel] = useState(
    'Установка соединения...',
  );

  const channelRef = useRef<BroadcastChannel | null>(null);
  const visitorIdRef = useRef<string>('');
  // Храним актуальный sessionId через ref, чтобы не пересоздавать listener
  const sessionIdRef = useRef<string | null>(null);

  // Cross-role sync для синхронизации между Management Cabinet и Visitor Vitrine
  const { updateSessionStatus } = useChatSessionSync(
    exhibitorId,
    'visitor',
    (payload) => {
      // Обработка входящих событий синхронизации от менеджера
      if (payload.status === 'active' && sessionIdRef.current === payload.sessionId) {
        setManagerStatusLabel('Менеджер на связи');
        setIsConnected(true);
        setSession((prev) =>
          prev ? { ...prev, status: 'active' } : prev,
        );
      } else if (payload.status === 'closed' && sessionIdRef.current === payload.sessionId) {
        setSession((prev) =>
          prev
            ? { ...prev, status: 'closed', closedAt: payload.updatedAt }
            : prev,
        );
      }
    }
  );

  // Инициализация BroadcastChannel (только на клиенте)
  useEffect(() => {
    if (typeof window === 'undefined') return;

    visitorIdRef.current = getOrCreateVisitorId();

    // Проверка поддержки BroadcastChannel API
    if (typeof BroadcastChannel !== 'undefined') {
      const bc = new BroadcastChannel(bcChannelName(exhibitorSlug));
      channelRef.current = bc;

      bc.onmessage = (event: MessageEvent<ChatEvent>) => {
        const { type, payload, sessionId } = event.data;

        // Фильтрация: обрабатываем только события нашей сессии
        if (sessionIdRef.current && sessionId !== sessionIdRef.current) return;

        switch (type) {
          case 'ManagerJoined': {
            const p = payload as ManagerJoinedPayload;
            setManagerStatusLabel(p.statusLabel);
            setIsConnected(true);
            // Обновляем статус сессии на active
            setSession((prev) =>
              prev ? { ...prev, status: 'active' } : prev,
            );
            break;
          }

          case 'MessageSent': {
            const p = payload as MessageSentPayload;
            // Принимаем только сообщения менеджера (свои уже добавлены локально)
            if (p.role === 'manager') {
              setMessages((prev) => [
                ...prev,
                {
                  id: p.messageId,
                  sessionId,
                  role: 'manager',
                  content: p.content,
                  sentAt: p.sentAt,
                  read: false,
                },
              ]);
            }
            break;
          }

          case 'SessionClose': {
            setSession((prev) =>
              prev
                ? { ...prev, status: 'closed', closedAt: event.data.timestamp }
                : prev,
            );
            break;
          }

          default:
            break;
        }
      };

      return () => {
        bc.close();
        channelRef.current = null;
      };
    } else {
      // Fallback для браузеров без поддержки BroadcastChannel
      console.warn('BroadcastChannel не поддерживается в этом браузере. Синхронизация чата будет ограничена.');
      channelRef.current = null;
    }
  }, [exhibitorSlug]);

  // ── startSession ───────────────────────────────────────────────────────────
  const startSession = useCallback(() => {
    if (session) return; // уже активна

    const newSession: ChatSession = {
      id: generateUUID(),
      visitorId: visitorIdRef.current || getOrCreateVisitorId(),
      exhibitorId,
      exhibitorSlug,
      status: 'pending',
      // ResponseStart фиксируется прямо здесь
      createdAt: new Date().toISOString(),
      firstManagerReplyAt: null,
      closedAt: null,
    };

    setSession(newSession);
    setMessages([]);
    setIsConnected(false);
    setManagerStatusLabel('Ожидание менеджера...');
    sessionIdRef.current = newSession.id;

    // Эмит SessionStart → ExponentChatAlert получает Vibrant Alert
    if (channelRef.current) {
      const event: ChatEvent<SessionStartPayload> = {
        type: 'SessionStart',
        sessionId: newSession.id,
        payload: {
          visitorId: newSession.visitorId,
          exhibitorId,
          exhibitorSlug,
          exhibitorName,
        },
        timestamp: newSession.createdAt,
      };
      channelRef.current.postMessage(event);
    }

    // Cross-role sync: отправляем событие в Supabase для синхронизации с Management Cabinet
    try {
      updateSessionStatus(newSession.id, 'pending', 'management');
    } catch (error) {
      console.warn('[CrossRoleSync] Failed to send sync event:', error);
      // Продолжаем работу без синхронизации
    }

    // Сохранить в localStorage для восстановления после перезагрузки
    try {
      localStorage.setItem(
        `expo365_session_${exhibitorSlug}`,
        JSON.stringify(newSession),
      );
    } catch {
      /* silent — quota exceeded */
    }
  }, [session, exhibitorId, exhibitorSlug, exhibitorName]);

  // ── sendMessage ────────────────────────────────────────────────────────────
  const sendMessage = useCallback(
    (content: string) => {
      if (!session || !content.trim()) return;

      const message: ChatMessage = {
        id: generateUUID(),
        sessionId: session.id,
        role: 'visitor',
        content: content.trim(),
        sentAt: new Date().toISOString(),
        read: false,
      };

      // Оптимистичное добавление в локальный список
      setMessages((prev) => [...prev, message]);

      // Трансляция менеджеру
      if (channelRef.current) {
        const event: ChatEvent<MessageSentPayload> = {
          type: 'MessageSent',
          sessionId: session.id,
          payload: {
            messageId: message.id,
            content: message.content,
            role: 'visitor',
            sentAt: message.sentAt,
          },
          timestamp: message.sentAt,
        };
        channelRef.current.postMessage(event);
      }
    },
    [session],
  );

  // ── closeSession ───────────────────────────────────────────────────────────
  const closeSession = useCallback(() => {
    if (!session) return;

    const closedAt = new Date().toISOString();
    setSession((prev) =>
      prev ? { ...prev, status: 'closed', closedAt } : prev,
    );

    if (channelRef.current) {
      const event: ChatEvent = {
        type: 'SessionClose',
        sessionId: session.id,
        payload: {},
        timestamp: closedAt,
      };
      channelRef.current.postMessage(event);
    }

    try {
      localStorage.removeItem(`expo365_session_${exhibitorSlug}`);
    } catch {
      /* silent */
    }
  }, [session, exhibitorSlug]);

  return {
    session,
    messages,
    isConnected,
    managerStatusLabel,
    startSession,
    sendMessage,
    closeSession,
  };
}

// ════════════════════════════════════════════════════════════════════════════
// useIncomingChats — СТОРОНА МЕНЕДЖЕРА (кабинет экспонента)
// ════════════════════════════════════════════════════════════════════════════

/**
 * Расширенный тип сессии со стороны менеджера:
 * несёт сообщения и флаг активного Vibrant Alert.
 */
export interface IncomingChatSession extends ChatSession {
  messages: ChatMessage[];
  /**
   * true пока менеджер ни разу не ответил.
   * Управляет CSS-классом .alertActive в VibrantAlert.module.css.
   * Сбрасывается при первом нажатии клавиши / отправке сообщения.
   */
  isAlertActive: boolean;
}

export interface UseIncomingChatsReturn {
  /** Все входящие сессии (pending + active + closed) */
  sessions: IncomingChatSession[];
  /** Количество сессий, ожидающих ответа (для бейджа на иконке) */
  totalPending: number;
  /** Отправить ответ менеджера в сессию */
  sendReply: (sessionId: string, content: string) => void;
  /**
   * Снять Vibrant Alert вручную.
   * Вызывается при первом нажатии клавиши в поле ввода панели.
   */
  dismissAlert: (sessionId: string) => void;
  /** Завершить сессию со стороны менеджера */
  closeSession: (sessionId: string) => void;
}

/**
 * Хук для кабинета экспонента.
 * Подписывается на BroadcastChannel и получает входящие SessionStart-события.
 *
 * @param exhibitorSlug — slug текущего экспонента для изоляции канала
 * @param managerLabel  — человекочитаемый статус менеджера для посетителя
 */
export function useIncomingChats(
  exhibitorSlug: string,
  managerLabel = `Сотрудник ООО «ТЕСТ» на связи`,
): UseIncomingChatsReturn {
  const [sessions, setSessions] = useState<IncomingChatSession[]>([]);
  const channelRef = useRef<BroadcastChannel | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Проверка поддержки BroadcastChannel API
    if (typeof BroadcastChannel !== 'undefined') {
      const bc = new BroadcastChannel(bcChannelName(exhibitorSlug));
      channelRef.current = bc;

      bc.onmessage = (event: MessageEvent<ChatEvent>) => {
        const { type, payload, sessionId, timestamp } = event.data;

        switch (type) {
          // ── Новый посетитель открыл чат ──────────────────────────────────────
          case 'SessionStart': {
            const p = payload as SessionStartPayload;
            setSessions((prev) => {
              // Дедупликация (повторный mount)
              if (prev.find((s) => s.id === sessionId)) return prev;
              return [
                ...prev,
                {
                  id: sessionId,
                  visitorId: p.visitorId,
                  exhibitorId: p.exhibitorId,
                  exhibitorSlug: p.exhibitorSlug,
                  status: 'pending',
                  createdAt: timestamp,
                  firstManagerReplyAt: null,
                  closedAt: null,
                  messages: [],
                  isAlertActive: true,   // ← включаем Vibrant Alert
                },
              ];
            });
            break;
          }

          // ── Новое сообщение от посетителя ────────────────────────────────────
          case 'MessageSent': {
            const p = payload as MessageSentPayload;
            if (p.role !== 'visitor') break;
            setSessions((prev) =>
              prev.map((s) => {
                if (s.id !== sessionId) return s;
                return {
                  ...s,
                  messages: [
                    ...s.messages,
                    {
                      id: p.messageId,
                      sessionId,
                      role: 'visitor' as const,
                      content: p.content,
                      sentAt: p.sentAt,
                      read: false,
                    },
                  ],
                };
              }),
            );
            break;
          }

          // ── Посетитель закрыл чат ────────────────────────────────────────────
          case 'SessionClose': {
            setSessions((prev) =>
              prev.map((s) =>
                s.id === sessionId
                  ? { ...s, status: 'closed', closedAt: timestamp, isAlertActive: false }
                  : s,
              ),
            );
            break;
          }

          default:
            break;
        }
      };

      return () => {
        bc.close();
        channelRef.current = null;
      };
    } else {
      // Fallback для браузеров без поддержки BroadcastChannel
      console.warn('BroadcastChannel не поддерживается в этом браузере. Входящие чаты не будут отображаться.');
      channelRef.current = null;
    }
  }, [exhibitorSlug]);

  // ── sendReply ──────────────────────────────────────────────────────────────
  const sendReply = useCallback(
    (sessionId: string, content: string) => {
      if (!content.trim()) return;

      const messageId = generateUUID();
      const sentAt = new Date().toISOString();

      setSessions((prev) =>
        prev.map((s) => {
          if (s.id !== sessionId) return s;

          const isFirstReply = !s.firstManagerReplyAt;

          const updatedSession: IncomingChatSession = {
            ...s,
            status: 'active',
            firstManagerReplyAt: isFirstReply ? sentAt : s.firstManagerReplyAt,
            isAlertActive: false,  // первый ответ снимает Vibrant Alert
            messages: [
              ...s.messages,
              {
                id: messageId,
                sessionId,
                role: 'manager' as const,
                content: content.trim(),
                sentAt,
                read: false,
              },
            ],
          };

          // Эмит ManagerJoined при первом ответе
          if (isFirstReply && channelRef.current) {
            const joinEvent: ChatEvent<ManagerJoinedPayload> = {
              type: 'ManagerJoined',
              sessionId,
              payload: {
                managerName: 'Менеджер',
                statusLabel: managerLabel,
              },
              timestamp: sentAt,
            };
            channelRef.current.postMessage(joinEvent);
          }

          return updatedSession;
        }),
      );

      // Трансляция сообщения посетителю
      if (channelRef.current) {
        const event: ChatEvent<MessageSentPayload> = {
          type: 'MessageSent',
          sessionId,
          payload: {
            messageId,
            content: content.trim(),
            role: 'manager',
            sentAt,
          },
          timestamp: sentAt,
        };
        channelRef.current.postMessage(event);
      }
    },
    [managerLabel],
  );

  // ── dismissAlert ───────────────────────────────────────────────────────────
  const dismissAlert = useCallback((sessionId: string) => {
    setSessions((prev) =>
      prev.map((s) =>
        s.id === sessionId ? { ...s, isAlertActive: false } : s,
      ),
    );
  }, []);

  // ── closeSession (менеджер завершает сессию) ───────────────────────────────
  const closeSession = useCallback(
    (sessionId: string) => {
      const closedAt = new Date().toISOString();
      setSessions((prev) =>
        prev.map((s) =>
          s.id === sessionId
            ? { ...s, status: 'closed', closedAt, isAlertActive: false }
            : s,
        ),
      );

      if (channelRef.current) {
        const event: ChatEvent = {
          type: 'SessionClose',
          sessionId,
          payload: {},
          timestamp: closedAt,
        };
        channelRef.current.postMessage(event);
      }
    },
    [],
  );

  const totalPending = sessions.filter(
    (s) => s.status === 'pending' || s.isAlertActive,
  ).length;

  return { sessions, totalPending, sendReply, dismissAlert, closeSession };
}
