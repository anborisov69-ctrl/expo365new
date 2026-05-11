-- ════════════════════════════════════════════════════════════════════════════
-- Migration: 008_add_cross_role_sync.sql
-- Module:    CrossRoleSync — Real-time синхронизация между Management Cabinet и Visitor Vitrine
-- Context:   EXPO 365 HoReCa B2B Platform
--
-- Создаёт:
--   • sync_events — таблица для событий синхронизации между ролями
-- Настраивает:
--   • RLS-политики для multi-tenant изоляции данных экспонентов
--   • Публикацию Realtime для мгновенной синхронизации
-- ════════════════════════════════════════════════════════════════════════════

-- ── 1. Таблица событий синхронизации ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS sync_events (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Тип события синхронизации
  type          TEXT        NOT NULL CHECK (type IN (
    'CHAT_SESSION_UPDATED',
    'CHAT_MESSAGE_SENT', 
    'TENDER_STATUS_CHANGED',
    'FINANCE_OFFER_UPDATED',
    'PRODUCT_VISIBILITY_CHANGED'
  )),
  
  -- Полезная нагрузка события (JSONB для гибкости)
  payload       JSONB       NOT NULL DEFAULT '{}',
  
  -- Источник события (какая роль инициировала)
  source        TEXT        NOT NULL CHECK (source IN ('management', 'visitor')),
  
  -- Целевая роль (кому предназначено событие)
  target_role   TEXT        NOT NULL DEFAULT 'both' 
               CHECK (target_role IN ('management', 'visitor', 'both')),
  
  -- Внешний ключ на экспонента для изоляции данных
  exhibitor_id  UUID        REFERENCES exhibitors(id) ON DELETE CASCADE,
  
  -- Метаданные
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  processed_at  TIMESTAMPTZ,
  
  -- Индексы для быстрого поиска
  CONSTRAINT valid_payload CHECK (jsonb_typeof(payload) = 'object')
);

-- ── 2. Индексы для оптимизации запросов ──────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_sync_events_exhibitor 
  ON sync_events(exhibitor_id) 
  WHERE exhibitor_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_sync_events_type 
  ON sync_events(type);

CREATE INDEX IF NOT EXISTS idx_sync_events_target_role 
  ON sync_events(target_role);

CREATE INDEX IF NOT EXISTS idx_sync_events_created_at 
  ON sync_events(created_at DESC);

-- Индекс для JSONB поля (оптимизация запросов по payload)
CREATE INDEX IF NOT EXISTS idx_sync_events_payload_gin 
  ON sync_events USING GIN (payload);

-- ── 3. RLS (Row Level Security) политики ─────────────────────────────────────
ALTER TABLE sync_events ENABLE ROW LEVEL SECURITY;

-- Политика: экспоненты видят только свои события
CREATE POLICY "Exhibitors can view own sync events" 
  ON sync_events FOR SELECT 
  USING (
    exhibitor_id IN (
      SELECT id FROM exhibitors WHERE auth.uid() = owner_id
    )
  );

-- Политика: экспоненты могут вставлять свои события
CREATE POLICY "Exhibitors can insert own sync events" 
  ON sync_events FOR INSERT 
  WITH CHECK (
    exhibitor_id IN (
      SELECT id FROM exhibitors WHERE auth.uid() = owner_id
    )
  );

-- Политика: экспоненты могут обновлять свои события (только processed_at)
CREATE POLICY "Exhibitors can update own sync events" 
  ON sync_events FOR UPDATE 
  USING (
    exhibitor_id IN (
      SELECT id FROM exhibitors WHERE auth.uid() = owner_id
    )
  )
  WITH CHECK (
    -- Разрешаем обновлять только processed_at
    (OLD.processed_at IS NULL AND NEW.processed_at IS NOT NULL) OR
    (OLD.processed_at IS NOT NULL AND NEW.processed_at IS NOT NULL)
  );

-- Политика для посетителей (анонимный доступ к событиям с target_role='visitor')
CREATE POLICY "Visitors can view visitor-targeted events" 
  ON sync_events FOR SELECT 
  USING (
    target_role IN ('visitor', 'both')
    AND exhibitor_id IS NOT NULL
  );

-- ── 4. Функция для очистки старых событий ───────────────────────────────────
CREATE OR REPLACE FUNCTION cleanup_old_sync_events(retention_days INTEGER DEFAULT 7)
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM sync_events 
  WHERE created_at < NOW() - (retention_days || ' days')::INTERVAL
    AND processed_at IS NOT NULL;
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ── 5. Триггер для автоматической очистки ───────────────────────────────────
CREATE OR REPLACE FUNCTION trigger_cleanup_sync_events()
RETURNS TRIGGER AS $$
BEGIN
  -- Запускаем очистку раз в 1000 записей
  IF (SELECT COUNT(*) FROM sync_events) % 1000 = 0 THEN
    PERFORM cleanup_old_sync_events(7);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER cleanup_sync_events_trigger
  AFTER INSERT ON sync_events
  EXECUTE FUNCTION trigger_cleanup_sync_events();

-- ── 6. Публикация для Realtime ──────────────────────────────────────────────
-- Включаем Realtime публикацию для таблицы sync_events
ALTER PUBLICATION supabase_realtime ADD TABLE sync_events;

-- ── 7. Комментарии к таблице и колонкам ─────────────────────────────────────
COMMENT ON TABLE sync_events IS 
  'События синхронизации между Management Cabinet и Visitor Vitrine для Real-time обновлений интерфейса';

COMMENT ON COLUMN sync_events.type IS 
  'Тип события: CHAT_SESSION_UPDATED, CHAT_MESSAGE_SENT, TENDER_STATUS_CHANGED, FINANCE_OFFER_UPDATED, PRODUCT_VISIBILITY_CHANGED';

COMMENT ON COLUMN sync_events.payload IS 
  'JSONB с полезной нагрузкой события. Структура зависит от типа события';

COMMENT ON COLUMN sync_events.source IS 
  'Роль, инициировавшая событие: management (админ панель) или visitor (витрина)';

COMMENT ON COLUMN sync_events.target_role IS 
  'Целевая роль: management (только для админ панели), visitor (только для витрины), both (для обеих ролей)';

COMMENT ON COLUMN sync_events.exhibitor_id IS 
  'ID экспонента для изоляции данных. NULL для глобальных событий';

COMMENT ON COLUMN sync_events.processed_at IS 
  'Время обработки события клиентом. NULL если ещё не обработано';

-- ── 8. Примеры использования ────────────────────────────────────────────────
COMMENT ON FUNCTION cleanup_old_sync_events IS 
  'Очищает обработанные события старше retention_days. Возвращает количество удалённых записей';

-- ── 9. Тестовые данные (опционально, для разработки) ───────────────────────
-- INSERT INTO sync_events (type, payload, source, target_role, exhibitor_id) VALUES
--   ('CHAT_SESSION_UPDATED', 
--    '{"sessionId": "test-session-123", "status": "active", "exhibitorId": "test-exhibitor"}',
--    'visitor', 'both', NULL),
--   ('TENDER_STATUS_CHANGED',
--    '{"tenderId": "tender-456", "status": "closed", "closedBy": "buyer-789"}',
--    'management', 'both', NULL);