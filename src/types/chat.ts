// ════════════════════════════════════════════════════════════════════════════
// src/types/chat.ts
// ExpoChatSync — типы чат-системы «Посетитель ↔ Экспонент»
//
// Соглашения:
//   • UUID-идентификаторы совместимы с таблицами Supabase (gen_random_uuid()).
//   • Все ISO-строки timestamps — UTC (суффикс Z).
//   • ChatEvent<T> — типобезопасная обёртка для BroadcastChannel / Realtime.
// ════════════════════════════════════════════════════════════════════════════

// ── Роли и статусы ───────────────────────────────────────────────────────────

/**
 * Роль участника чат-диалога.
 * 'visitor' — посетитель витрины (потенциальный покупатель / партнёр).
 * 'manager' — сотрудник экспонента, принявший обращение.
 */
export type ChatMessageRole = 'visitor' | 'manager';

/**
 * Жизненный цикл чат-сессии.
 *
 * pending → active → closed
 *   pending : сессия создана посетителем, менеджер ещё не ответил.
 *   active  : менеджер подключился и ведёт диалог.
 *   closed  : сессия завершена любой из сторон.
 */
export type ChatSessionStatus = 'pending' | 'active' | 'closed';

// ── Сущности ─────────────────────────────────────────────────────────────────

/**
 * Одно сообщение в рамках чат-сессии.
 *
 * При интеграции с Supabase хранится в таблице `chat_messages` с RLS:
 *   — visitor видит только сообщения своей сессии.
 *   — manager видит все сообщения своего экспонента.
 */
export interface ChatMessage {
  /** UUID сообщения (gen_random_uuid) */
  id: string;
  /** UUID родительской сессии */
  sessionId: string;
  /** Кто отправил */
  role: ChatMessageRole;
  /** Текстовое содержимое */
  content: string;
  /** ISO-timestamp отправки (UTC) */
  sentAt: string;
  /** true когда собеседник прочитал сообщение */
  read: boolean;
}

/**
 * Чат-сессия между посетителем и командой экспонента.
 *
 * Поле `createdAt` фиксируется как **ResponseStart** timestamp —
 * используется в аналитике для расчёта KPI времени ответа:
 *   response_time_ms = first_manager_reply_at - created_at
 */
export interface ChatSession {
  /** UUID сессии (gen_random_uuid) */
  id: string;
  /** Анонимный fingerprint или auth UUID посетителя */
  visitorId: string;
  /** UUID экспонента (FK → exhibitors.id) */
  exhibitorId: string;
  /** Slug витрины экспонента (для канала BroadcastChannel / Realtime) */
  exhibitorSlug: string;
  /** Текущий статус жизненного цикла */
  status: ChatSessionStatus;
  /**
   * ResponseStart — ISO-timestamp создания сессии.
   * Фиксируется в момент клика «ЧАТ С ЭКСПОНЕНТОМ».
   */
  createdAt: string;
  /** Первый ответ менеджера (null → ни одного ответа ещё) */
  firstManagerReplyAt: string | null;
  /** Timestamp закрытия сессии */
  closedAt: string | null;
}

// ── WebSocket / Realtime Events ───────────────────────────────────────────────

/**
 * Словарь типов событий чат-канала.
 * Используется одинаково для BroadcastChannel (demo) и Supabase Realtime (prod).
 */
export type ChatEventType =
  | 'SessionStart'   // посетитель открыл чат → сигнал «Vibrant Alert» для экспонента
  | 'MessageSent'    // сообщение от любой стороны
  | 'ManagerJoined'  // менеджер подключился → сбросить Vibrant Alert
  | 'ManagerTyping'  // менеджер набирает текст (индикатор «печатает…»)
  | 'VisitorTyping'  // посетитель набирает текст
  | 'SessionClose';  // сессия завершена

/**
 * Типобезопасная обёртка события чат-канала.
 *
 * @template T — payload конкретного события (SessionStartPayload, MessageSentPayload и т.д.)
 */
export interface ChatEvent<T = unknown> {
  type: ChatEventType;
  /** UUID сессии, к которой относится событие */
  sessionId: string;
  payload: T;
  /** ISO UTC timestamp генерации события */
  timestamp: string;
}

// ── Payload-типы для каждого события ─────────────────────────────────────────

/** Payload события `SessionStart` */
export interface SessionStartPayload {
  visitorId: string;
  exhibitorId: string;
  exhibitorSlug: string;
  /** Отображаемое название экспонента (для заголовка панели в кабинете) */
  exhibitorName: string;
}

/** Payload события `MessageSent` */
export interface MessageSentPayload {
  messageId: string;
  content: string;
  role: ChatMessageRole;
  sentAt: string;
}

/**
 * Payload события `ManagerJoined`.
 * `statusLabel` — человекочитаемый статус:
 *   «Сотрудник ООО «ТЕСТ» на связи» (не «Manager Online»).
 */
export interface ManagerJoinedPayload {
  managerName: string;
  statusLabel: string;
}
