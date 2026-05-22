-- ═══════════════════════════════════════════════════════════════════════════
-- Миграция 009: Таблица новостей экспонентов
-- ═══════════════════════════════════════════════════════════════════════════
--
-- Таблица `news` — публикации и события экспонентов EXPO 365.
--
-- Используется в:
--   • /horeca/admin/news  — CRUD для admin и verified_exhibitor
--   • /horeca/exhibitors/[slug] — публичное чтение последних 3 опуб. новостей
--   • NewsFeedPanel  — глобальная лента событий на главной / discovery
--
-- RLS-политики:
--   • SELECT:  любой (anon / authenticated) может читать status = 'published'
--   • INSERT:  только authenticated пользователь с ролью admin или exhibitor
--   • UPDATE:  только владелец (created_by = auth.uid()) или admin
--   • DELETE:  только admin
--
-- Security note (Rule 5 из skill):
--   RLS включён на таблице — обязательно для публично-доступной схемы.
-- ═══════════════════════════════════════════════════════════════════════════

-- ─── 1. Создание таблицы (IF NOT EXISTS — безопасная идемпотентная миграция) ─

CREATE TABLE IF NOT EXISTS public.news (
  -- Первичный ключ
  id              uuid            PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Связь с экспонентом (FK на exhibitor_profiles.id)
  exhibitor_id    uuid            NOT NULL,

  -- Контент
  title           text            NOT NULL CHECK (char_length(title) BETWEEN 3 AND 255),
  content         text            NOT NULL DEFAULT '',
  image_url       text            NULL,

  -- Классификация
  category        text            NOT NULL DEFAULT 'equipment',
  promo_type      text            NOT NULL DEFAULT 'new'
                                  CHECK (promo_type IN ('new', 'sale', 'special')),

  -- Статус публикации
  status          text            NOT NULL DEFAULT 'draft'
                                  CHECK (status IN ('published', 'draft', 'scheduled')),
  publish_date    date            NOT NULL DEFAULT CURRENT_DATE,

  -- Аудит
  created_by      uuid            NOT NULL REFERENCES auth.users (id) ON DELETE SET NULL,
  views           integer         NOT NULL DEFAULT 0,
  created_at      timestamptz     NOT NULL DEFAULT now(),
  updated_at      timestamptz     NOT NULL DEFAULT now()
);

-- ─── 2. Индексы ─────────────────────────────────────────────────────────────

-- Основной запрос витрины: по exhibitor_id + status = 'published' + publish_date DESC
CREATE INDEX IF NOT EXISTS idx_news_exhibitor_status_date
  ON public.news (exhibitor_id, status, publish_date DESC);

-- Отдельный индекс по статусу для глобальной ленты
CREATE INDEX IF NOT EXISTS idx_news_status_date
  ON public.news (status, publish_date DESC);

-- Поиск по автору
CREATE INDEX IF NOT EXISTS idx_news_created_by
  ON public.news (created_by);

-- ─── 3. Триггер auto-update updated_at ──────────────────────────────────────

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Применяем только если триггер ещё не существует
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'trg_news_updated_at'
      AND tgrelid = 'public.news'::regclass
  ) THEN
    CREATE TRIGGER trg_news_updated_at
      BEFORE UPDATE ON public.news
      FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
  END IF;
END;
$$;

-- ─── 4. Row Level Security ───────────────────────────────────────────────────

ALTER TABLE public.news ENABLE ROW LEVEL SECURITY;

-- Публичное чтение опубликованных новостей (anon + authenticated)
CREATE POLICY IF NOT EXISTS "news_public_read_published"
  ON public.news FOR SELECT
  USING (status = 'published');

-- Создание новостей: только аутентифицированные пользователи
CREATE POLICY IF NOT EXISTS "news_authenticated_insert"
  ON public.news FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = created_by);

-- Редактирование: только владелец или admin
-- NOTE: raw_user_meta_data небезопасен для проверки роли (Skill Rule 6).
-- Используем raw_app_meta_data для безопасной проверки роли.
CREATE POLICY IF NOT EXISTS "news_owner_or_admin_update"
  ON public.news FOR UPDATE
  TO authenticated
  USING (
    auth.uid() = created_by
    OR (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
  );

-- Удаление: только admin
CREATE POLICY IF NOT EXISTS "news_admin_delete"
  ON public.news FOR DELETE
  TO authenticated
  USING (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
  );

-- ─── 5. Права доступа для Data API ──────────────────────────────────────────
-- Без явного GRANT таблица недоступна через REST Data API даже с RLS.
-- SELECT для anon (нужно для публичного чтения новостей без авторизации).
GRANT SELECT ON public.news TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.news TO authenticated;

-- ─── 6. Комментарии ─────────────────────────────────────────────────────────
COMMENT ON TABLE  public.news                IS 'Новости и события экспонентов EXPO 365. RLS: публичное чтение published.';
COMMENT ON COLUMN public.news.exhibitor_id   IS 'UUID экспонента (FK → exhibitor_profiles.id)';
COMMENT ON COLUMN public.news.category       IS 'Тег индустрии: coffee | tea | equipment | textile | dishes | food | cold-beverages';
COMMENT ON COLUMN public.news.promo_type     IS 'Тип промо: new | sale | special';
COMMENT ON COLUMN public.news.status         IS 'Статус: published | draft | scheduled';
COMMENT ON COLUMN public.news.publish_date   IS 'Дата публикации (YYYY-MM-DD). Используется для сортировки и статуса scheduled.';
