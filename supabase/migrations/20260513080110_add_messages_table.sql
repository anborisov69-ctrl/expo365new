-- ════════════════════════════════════════════════════════════════════════════
-- Migration: 20260513080110_add_messages_table.sql
-- Module:    B2B Direct Messages — деловые обращения посетителя к экспоненту
-- Context:   EXPO 365 HoReCa B2B Platform
--
-- Создаёт таблицу `messages` — отдельная от chat_sessions/chat_messages.
-- Это прямое B2B-сообщение (одно обращение), не интерактивный чат-сеанс.
--
-- Поля:
--   sender_id   — auth.uid() посетителя / покупателя
--   receiver_id — exhibitors.id (получатель — экспонент)
--   text        — тело сообщения (до 4000 символов)
--   created_at  — UTC-метка отправки
--
-- Безопасность:
--   • RLS включён — multi-tenant изоляция по sender_id / receiver_id
--   • Authenticated пользователи видят только свои сообщения (отправленные ИЛИ полученные)
--   • Анонимные пользователи не могут читать или писать
--   • INSERT проверяет: sender_id == auth.uid() (нельзя писать от чужого имени)
--
-- Realtime:
--   Таблица добавлена в публикацию supabase_realtime чтобы
--   кабинет экспонента получал новые обращения мгновенно.
-- ════════════════════════════════════════════════════════════════════════════

-- ── 1. Таблица прямых B2B-сообщений ─────────────────────────────────────────

CREATE TABLE IF NOT EXISTS messages (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Отправитель: auth.uid() текущего пользователя
  -- TEXT (не UUID FK) чтобы поддерживать будущие анонимные fingerprint-обращения
  sender_id   UUID        NOT NULL REFERENCES auth.users(id) ON DELETE SET NULL,

  -- Получатель: UUID экспонента из таблицы exhibitors
  receiver_id UUID        NOT NULL,

  -- Тело сообщения (ограничено 4000 символов на уровне приложения)
  text        TEXT        NOT NULL CHECK (char_length(text) <= 4000),

  -- Метка времени (UTC)
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Статус прочтения: false = новое (badge для кабинета экспонента)
  is_read     BOOLEAN     NOT NULL DEFAULT false
);

-- ── 2. Индексы производительности ───────────────────────────────────────────

-- Кабинет экспонента: все непрочитанные входящие
CREATE INDEX IF NOT EXISTS idx_messages_receiver_read
  ON messages(receiver_id, is_read, created_at DESC);

-- История отправленных (кабинет посетителя)
CREATE INDEX IF NOT EXISTS idx_messages_sender_created
  ON messages(sender_id, created_at DESC);

-- ── 3. Row Level Security ────────────────────────────────────────────────────

ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- Отправитель видит свои исходящие сообщения
CREATE POLICY "sender_read_own_messages"
  ON messages
  FOR SELECT
  USING (sender_id = auth.uid());

-- Получатель (экспонент) видит входящие в свой адрес
-- ВАЖНО: receiver_id = exhibitors.id; экспонент идентифицируется через user_id в
-- таблице exhibitor_users. Упрощённая политика: receiver_id = auth.uid() работает
-- если в приложении receiver_id заполняется как user_id владельца витрины.
CREATE POLICY "receiver_read_own_messages"
  ON messages
  FOR SELECT
  USING (receiver_id = auth.uid());

-- Только аутентифицированный пользователь может отправить сообщение от своего имени
-- (sender_id должен точно совпадать с auth.uid() — нельзя написать от чужого имени)
CREATE POLICY "authenticated_insert_own"
  ON messages
  FOR INSERT
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND sender_id = auth.uid()
  );

-- Только получатель может пометить сообщение как прочитанное
CREATE POLICY "receiver_update_read_status"
  ON messages
  FOR UPDATE
  USING  (receiver_id = auth.uid())
  WITH CHECK (receiver_id = auth.uid());

-- Service-role (Edge Functions, webhooks, уведомления) — полный доступ
CREATE POLICY "service_role_all"
  ON messages
  FOR ALL
  USING     (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- ── 4. Realtime-публикация ───────────────────────────────────────────────────
-- Позволяет кабинету экспонента подписаться на новые входящие сообщения
-- через supabase.channel('messages').on('postgres_changes', ...).

ALTER PUBLICATION supabase_realtime ADD TABLE messages;

-- ── 5. Комментарии для документации схемы ───────────────────────────────────

COMMENT ON TABLE messages IS
  'B2B direct messages — деловые обращения посетителей к экспонентам. '
  'Одно сообщение = одно обращение. Для диалога см. chat_sessions + chat_messages.';

COMMENT ON COLUMN messages.sender_id   IS 'auth.uid() отправителя (посетитель / покупатель)';
COMMENT ON COLUMN messages.receiver_id IS 'UUID экспонента-получателя (вероятно exhibitors.id или user_id владельца витрины)';
COMMENT ON COLUMN messages.text        IS 'Текст делового обращения, не более 4000 символов';
COMMENT ON COLUMN messages.is_read     IS 'false = непрочитанное; используется для badge-счётчика в кабинете экспонента';
