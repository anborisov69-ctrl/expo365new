-- ════════════════════════════════════════════════════════════════════════════
-- Migration: 010_add_messages_table.sql
-- Module:    B2B Chat — прямые сообщения «Посетитель/Экспонент → Экспонент»
-- Context:   EXPO 365 HoReCa B2B Platform
--
-- Архитектура:
--   • messages — прямые сообщения с полями sender_id / receiver_id.
--     sender_id   = auth.uid() отправителя (visitor или exhibitor).
--     receiver_id = exhibitors.id получателя (FK на таблицу экспонентов).
--
-- RLS-модель:
--   • Отправитель: INSERT (только от своего имени) + SELECT (свои исходящие).
--   • Получатель (менеджеры экспонента): SELECT + UPDATE is_read.
--   • Realtime: INSERT/UPDATE события публикуются для live-sync в кабинете.
-- ════════════════════════════════════════════════════════════════════════════

-- ── 1. Таблица прямых сообщений ──────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS messages (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Отправитель: auth.uid() (посетитель, авторизованный байер или экспонент)
  sender_id   UUID        NOT NULL,

  -- Получатель: UUID экспонента (FK → exhibitors.id)
  -- ON DELETE CASCADE — при удалении экспонента его входящие удаляются
  receiver_id UUID        NOT NULL REFERENCES exhibitors(id) ON DELETE CASCADE,

  -- Тело сообщения — минимальная длина 1 символ, максимальная 4000
  body        TEXT        NOT NULL CHECK (char_length(body) BETWEEN 1 AND 4000),

  -- Статус прочтения: менеджер экспонента ставит true при открытии
  is_read     BOOLEAN     NOT NULL DEFAULT false,

  -- Фиксируется на стороне сервера (DEFAULT now())
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE  messages IS 'Прямые B2B-сообщения: посетитель/экспонент → экспонент EXPO 365';
COMMENT ON COLUMN messages.sender_id   IS 'auth.uid() отправителя';
COMMENT ON COLUMN messages.receiver_id IS 'exhibitors.id получателя (не auth.users.id)';
COMMENT ON COLUMN messages.is_read     IS 'true = менеджер экспонента прочитал сообщение';

-- ── 2. Индексы производительности ────────────────────────────────────────────

-- Кабинет экспонента: все непрочитанные входящие (самые частые запросы)
CREATE INDEX IF NOT EXISTS idx_messages_receiver_unread
  ON messages(receiver_id, is_read)
  WHERE is_read = false;

-- Хронологическая лента входящих для кабинета экспонента
CREATE INDEX IF NOT EXISTS idx_messages_receiver_created
  ON messages(receiver_id, created_at DESC);

-- История исходящих для посетителя / отправителя
CREATE INDEX IF NOT EXISTS idx_messages_sender_created
  ON messages(sender_id, created_at DESC);

-- ── 3. Row Level Security ─────────────────────────────────────────────────────

ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- ── Отправитель: INSERT только от своего имени ────────────────────────────────
--
-- Предотвращает отправку от чужого имени (sender_id != auth.uid()).
-- WITH CHECK гарантирует валидацию на уровне БД, а не только фронтенда.
CREATE POLICY "sender_insert_own_message"
  ON messages
  FOR INSERT
  WITH CHECK (sender_id = auth.uid());

-- ── Отправитель: SELECT своих исходящих ──────────────────────────────────────
CREATE POLICY "sender_select_own_messages"
  ON messages
  FOR SELECT
  USING (sender_id = auth.uid());

-- ── Менеджеры экспонента: SELECT входящих сообщений своей компании ───────────
--
-- Связь: auth.uid() → exhibitor_users.user_id → exhibitor_users.exhibitor_id
-- Изоляция: менеджер видит ТОЛЬКО сообщения своего экспонента.
CREATE POLICY "exhibitor_manager_select_messages"
  ON messages
  FOR SELECT
  USING (
    receiver_id IN (
      SELECT exhibitor_id
      FROM exhibitor_users
      WHERE user_id = auth.uid()
    )
  );

-- ── Менеджеры экспонента: UPDATE is_read (пометить как прочитанное) ───────────
--
-- Только поле is_read может быть обновлено получателем.
-- SELECT-политика выше уже ограничивает область видимости строк.
CREATE POLICY "exhibitor_manager_mark_read"
  ON messages
  FOR UPDATE
  USING (
    receiver_id IN (
      SELECT exhibitor_id
      FROM exhibitor_users
      WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    receiver_id IN (
      SELECT exhibitor_id
      FROM exhibitor_users
      WHERE user_id = auth.uid()
    )
  );

-- ── Service-role: неограниченный доступ (webhooks, бэкенд-функции) ────────────
CREATE POLICY "service_role_all_messages"
  ON messages
  FOR ALL
  USING (auth.role() = 'service_role');

-- ── 4. Supabase Realtime ──────────────────────────────────────────────────────
--
-- Публикует INSERT и UPDATE события через WebSocket.
-- Фронтенд-фильтр: supabase.channel('messages:{exhibitorId}')
--   .on('postgres_changes', { event: 'INSERT', filter: `receiver_id=eq.{id}` })
ALTER PUBLICATION supabase_realtime ADD TABLE messages;
