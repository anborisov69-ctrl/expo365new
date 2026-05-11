-- ════════════════════════════════════════════════════════════════════════════
-- Migration: 007_add_chat_sessions.sql
-- Module:    ExpoChatSync — чат «Посетитель ↔ Экспонент»
-- Context:   EXPO 365 HoReCa B2B Platform
--
-- Создаёт:
--   • chat_sessions  — сессии диалога, поле created_at = ResponseStart KPI.
--   • chat_messages  — сообщения сессии.
-- Настраивает:
--   • RLS-политики для multi-tenant изоляции данных экспонентов.
--   • Публикацию Realtime для live-sync через Supabase WebSocket.
-- ════════════════════════════════════════════════════════════════════════════

-- ── 1. Таблица сессий ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS chat_sessions (
  id                     UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  -- Посетитель: анонимный fingerprint или auth.uid() при авторизации
  visitor_id             TEXT        NOT NULL,
  -- FK на экспонента; при удалении — каскадом удаляем сессии
  exhibitor_id           UUID        NOT NULL REFERENCES exhibitors(id) ON DELETE CASCADE,
  exhibitor_slug         TEXT        NOT NULL,

  -- Жизненный цикл: pending → active → closed
  status                 TEXT        NOT NULL DEFAULT 'pending'
                           CHECK (status IN ('pending', 'active', 'closed')),

  -- ResponseStart KPI: фиксируется в момент клика «ЧАТ С ЭКСПОНЕНТОМ».
  -- Формула: response_time_ms = EXTRACT(EPOCH FROM (first_manager_reply_at - created_at)) * 1000
  created_at             TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Заполняется при первом ответе менеджера (NULL = ещё не ответил)
  first_manager_reply_at TIMESTAMPTZ,

  -- Завершение сессии
  closed_at              TIMESTAMPTZ,

  -- Аналитические метаданные
  visitor_ua             TEXT,    -- User-Agent для сегментации устройств
  page_referrer          TEXT     -- Страница, с которой начат чат
);

-- ── 2. Таблица сообщений ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS chat_messages (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID        NOT NULL REFERENCES chat_sessions(id) ON DELETE CASCADE,
  role       TEXT        NOT NULL CHECK (role IN ('visitor', 'manager')),
  content    TEXT        NOT NULL,
  sent_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  -- true когда собеседник прочитал сообщение
  read       BOOLEAN     NOT NULL DEFAULT false
);

-- ── 3. Индексы производительности ───────────────────────────────────────────

-- Запросы кабинета экспонента: все активные сессии по exhibitor_id
CREATE INDEX IF NOT EXISTS idx_chat_sessions_exhibitor_status
  ON chat_sessions(exhibitor_id, status);

-- Запросы посетителя: его личные сессии
CREATE INDEX IF NOT EXISTS idx_chat_sessions_visitor
  ON chat_sessions(visitor_id);

-- Хронологическая выборка сообщений сессии
CREATE INDEX IF NOT EXISTS idx_chat_messages_session_time
  ON chat_messages(session_id, sent_at ASC);

-- Аналитика: фильтрация незакрытых сессий по slug без join
CREATE INDEX IF NOT EXISTS idx_chat_sessions_slug_status
  ON chat_sessions(exhibitor_slug, status);

-- ── 4. Row Level Security ────────────────────────────────────────────────────
ALTER TABLE chat_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

-- ── chat_sessions ─────────────────────────────────────────────────────────────

-- Посетитель: полный доступ к своим сессиям (visitor_id = auth.uid()::text)
CREATE POLICY "visitor_own_sessions"
  ON chat_sessions
  FOR ALL
  USING     (visitor_id = auth.uid()::text)
  WITH CHECK (visitor_id = auth.uid()::text);

-- Менеджер экспонента: доступ к сессиям своей компании.
-- Требует таблицу exhibitor_users (user_id, exhibitor_id).
CREATE POLICY "manager_exhibitor_sessions"
  ON chat_sessions
  FOR ALL
  USING (
    exhibitor_id IN (
      SELECT exhibitor_id
      FROM exhibitor_users
      WHERE user_id = auth.uid()
    )
  );

-- Service-role (внутренние функции, webhooks) — всё разрешено
CREATE POLICY "service_role_sessions"
  ON chat_sessions
  FOR ALL
  USING (auth.role() = 'service_role');

-- ── chat_messages ─────────────────────────────────────────────────────────────

-- Посетитель: сообщения только из своих сессий
CREATE POLICY "visitor_own_messages"
  ON chat_messages
  FOR ALL
  USING (
    session_id IN (
      SELECT id FROM chat_sessions
      WHERE visitor_id = auth.uid()::text
    )
  );

-- Менеджер: сообщения из сессий своего экспонента
CREATE POLICY "manager_exhibitor_messages"
  ON chat_messages
  FOR ALL
  USING (
    session_id IN (
      SELECT cs.id FROM chat_sessions cs
      WHERE cs.exhibitor_id IN (
        SELECT exhibitor_id FROM exhibitor_users
        WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "service_role_messages"
  ON chat_messages
  FOR ALL
  USING (auth.role() = 'service_role');

-- ── 5. Supabase Realtime Publication ─────────────────────────────────────────
-- Включает live-sync через WebSocket канал Supabase.
-- На фронтенде: supabase.channel('chat:ooo-test').on('INSERT', ...)
ALTER PUBLICATION supabase_realtime ADD TABLE chat_sessions;
ALTER PUBLICATION supabase_realtime ADD TABLE chat_messages;
