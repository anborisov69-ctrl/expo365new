-- ════════════════════════════════════════════════════════════════════════════
-- Migration: 008_add_hr_module.sql
-- Module:    HR Hub — рекрутинговая платформа B2B HoReCa
-- Context:   EXPO 365 — Global B2B Ecosystem
--
-- Создаёт:
--   • hr_vacancies            — вакансии экспонентов / посетителей
--   • hr_resumes              — резюме соискателей
--   • hr_applications         — отклики на вакансии
--   • hr_company_subscriptions — подписки на обновления компании
--
-- Настраивает:
--   • Индексы производительности для листинга и фильтрации
--   • Триггеры: updated_at + денормализованный счётчик applications_count
--   • RLS-политики — multi-tenant изоляция (EXPO 365 Security Model)
--   • GRANT для ролей anon / authenticated (Supabase Data API)
-- ════════════════════════════════════════════════════════════════════════════

-- ── 0. Вспомогательная функция обновления updated_at ─────────────────────────
-- Переиспользуется всеми таблицами модуля.
CREATE OR REPLACE FUNCTION hr_set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- ════════════════════════════════════════════════════════════════════════════
-- 1. ТАБЛИЦА ВАКАНСИЙ — hr_vacancies
-- ════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS hr_vacancies (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Работодатель (auth.uid() при создании)
  employer_id      UUID        NOT NULL,
  -- 'exhibitor' | 'visitor'
  employer_type    TEXT        NOT NULL
                     CHECK (employer_type IN ('exhibitor', 'visitor')),

  -- Денормализованное поле: отображение без JOIN
  company_name     TEXT,

  -- Контент вакансии
  title            TEXT        NOT NULL
                     CHECK (char_length(title) BETWEEN 3 AND 120),
  description      TEXT        CHECK (char_length(description)  <= 5000),
  requirements     TEXT        CHECK (char_length(requirements) <= 5000),

  -- Зарплатная вилка — JSONB { min, max, currency }
  -- Пример: {"min": 80000, "max": 120000, "currency": "RUB"}
  salary_range     JSONB       NOT NULL DEFAULT '{"min": null, "max": null, "currency": "RUB"}'::jsonb,

  -- Категория: barista | chef | manager | service | sales | hr | logistics | marketing | finance | other
  category         TEXT        NOT NULL
                     CHECK (category IN ('barista','chef','manager','service','sales','hr','logistics','marketing','finance','other')),

  location         TEXT        CHECK (char_length(location) <= 100),

  -- Тип занятости
  employment_type  TEXT        NOT NULL DEFAULT 'full_time'
                     CHECK (employment_type IN ('full_time','part_time','contract','internship')),

  -- Жизненный цикл
  status           TEXT        NOT NULL DEFAULT 'active'
                     CHECK (status IN ('active','draft','closed')),

  -- Денормализованный счётчик откликов (обновляется триггером)
  applications_count INTEGER    NOT NULL DEFAULT 0
);

-- Триггер updated_at
CREATE TRIGGER hr_vacancies_set_updated_at
  BEFORE UPDATE ON hr_vacancies
  FOR EACH ROW EXECUTE FUNCTION hr_set_updated_at();

-- Индексы
-- Листинг активных вакансий с фильтром по категории
CREATE INDEX IF NOT EXISTS idx_hr_vacancies_status_category
  ON hr_vacancies(status, category);

-- Вакансии конкретного работодателя (Dashboard)
CREATE INDEX IF NOT EXISTS idx_hr_vacancies_employer
  ON hr_vacancies(employer_id, status);

-- Текстовый поиск по title (pg_trgm не гарантирован в Supabase Cloud — используем B-tree LIKE)
CREATE INDEX IF NOT EXISTS idx_hr_vacancies_title
  ON hr_vacancies USING gin(to_tsvector('russian', title));

-- ════════════════════════════════════════════════════════════════════════════
-- 2. ТАБЛИЦА РЕЗЮМЕ — hr_resumes
-- ════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS hr_resumes (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Соискатель (auth.uid())
  user_id         UUID        NOT NULL,

  -- Профиль кандидата
  full_name       TEXT        NOT NULL
                    CHECK (char_length(full_name) BETWEEN 2 AND 100),
  position        TEXT        NOT NULL
                    CHECK (char_length(position) BETWEEN 2 AND 120),

  -- Контакты
  contact_email   TEXT        CHECK (contact_email ~* '^[^@]+@[^@]+\.[^@]+$'),
  contact_phone   TEXT        CHECK (char_length(contact_phone) <= 30),

  -- Развёрнутый профиль
  summary         TEXT        CHECK (char_length(summary)    <= 2000),
  experience      TEXT        CHECK (char_length(experience) <= 5000),
  skills          TEXT        CHECK (char_length(skills)     <= 2000),
  education       TEXT        CHECK (char_length(education)  <= 2000),

  -- Желаемая зарплата — JSONB { amount, currency }
  -- Пример: {"amount": 90000, "currency": "RUB"}
  desired_salary  JSONB       NOT NULL DEFAULT '{"amount": null, "currency": "RUB"}'::jsonb,

  category        TEXT        NOT NULL
                    CHECK (category IN ('barista','chef','manager','service','sales','hr','logistics','marketing','finance','other')),

  location        TEXT        CHECK (char_length(location) <= 100),

  -- Статус видимости
  status          TEXT        NOT NULL DEFAULT 'active'
                    CHECK (status IN ('active','hidden','archived'))
);

-- Триггер updated_at
CREATE TRIGGER hr_resumes_set_updated_at
  BEFORE UPDATE ON hr_resumes
  FOR EACH ROW EXECUTE FUNCTION hr_set_updated_at();

-- Индексы
-- Активные резюме по категории
CREATE INDEX IF NOT EXISTS idx_hr_resumes_status_category
  ON hr_resumes(status, category);

-- Резюме конкретного соискателя (My Resumes)
CREATE INDEX IF NOT EXISTS idx_hr_resumes_user
  ON hr_resumes(user_id, status);

-- Полнотекстовый поиск (full_name + position + skills)
CREATE INDEX IF NOT EXISTS idx_hr_resumes_fts
  ON hr_resumes USING gin(
    to_tsvector('russian',
      coalesce(full_name, '') || ' ' ||
      coalesce(position, '') || ' ' ||
      coalesce(skills, '')
    )
  );

-- ════════════════════════════════════════════════════════════════════════════
-- 3. ТАБЛИЦА ОТКЛИКОВ — hr_applications
-- ════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS hr_applications (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),

  vacancy_id    UUID        NOT NULL REFERENCES hr_vacancies(id) ON DELETE CASCADE,
  resume_id     UUID        REFERENCES hr_resumes(id) ON DELETE SET NULL,

  -- Соискатель (auth.uid())
  applicant_id  UUID        NOT NULL,

  cover_letter  TEXT        CHECK (char_length(cover_letter) <= 3000),

  -- Воронка найма
  status        TEXT        NOT NULL DEFAULT 'pending'
                  CHECK (status IN ('pending','reviewed','rejected','interview')),

  -- Один пользователь — один отклик на вакансию
  UNIQUE (vacancy_id, applicant_id)
);

-- Триггер updated_at
CREATE TRIGGER hr_applications_set_updated_at
  BEFORE UPDATE ON hr_applications
  FOR EACH ROW EXECUTE FUNCTION hr_set_updated_at();

-- Индексы
CREATE INDEX IF NOT EXISTS idx_hr_applications_vacancy
  ON hr_applications(vacancy_id, status);

CREATE INDEX IF NOT EXISTS idx_hr_applications_applicant
  ON hr_applications(applicant_id);

-- ── Триггер счётчика откликов ──────────────────────────────────────────────

CREATE OR REPLACE FUNCTION hr_update_applications_count()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE hr_vacancies
    SET applications_count = applications_count + 1
    WHERE id = NEW.vacancy_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE hr_vacancies
    SET applications_count = GREATEST(applications_count - 1, 0)
    WHERE id = OLD.vacancy_id;
  END IF;
  RETURN NULL;
END;
$$;

CREATE TRIGGER hr_applications_count_sync
  AFTER INSERT OR DELETE ON hr_applications
  FOR EACH ROW EXECUTE FUNCTION hr_update_applications_count();

-- ════════════════════════════════════════════════════════════════════════════
-- 4. ТАБЛИЦА ПОДПИСОК — hr_company_subscriptions
-- ════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS hr_company_subscriptions (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Подписчик (auth.uid())
  subscriber_id UUID        NOT NULL,

  -- Работодатель, на чьи вакансии подписка
  employer_id   UUID        NOT NULL,

  UNIQUE (subscriber_id, employer_id)
);

-- Индекс для быстрой проверки подписки
CREATE INDEX IF NOT EXISTS idx_hr_company_subscriptions_pair
  ON hr_company_subscriptions(subscriber_id, employer_id);

-- ════════════════════════════════════════════════════════════════════════════
-- 5. ROW LEVEL SECURITY
-- ════════════════════════════════════════════════════════════════════════════

ALTER TABLE hr_vacancies             ENABLE ROW LEVEL SECURITY;
ALTER TABLE hr_resumes               ENABLE ROW LEVEL SECURITY;
ALTER TABLE hr_applications          ENABLE ROW LEVEL SECURITY;
ALTER TABLE hr_company_subscriptions ENABLE ROW LEVEL SECURITY;

-- ── hr_vacancies ──────────────────────────────────────────────────────────────

-- Все могут читать активные вакансии (включая анонимных пользователей)
CREATE POLICY "hr_vacancies_select_active"
  ON hr_vacancies
  FOR SELECT
  USING (status = 'active');

-- Работодатель видит все свои вакансии (включая draft/closed)
CREATE POLICY "hr_vacancies_select_own"
  ON hr_vacancies
  FOR SELECT
  USING (employer_id = auth.uid());

-- Только авторизованный пользователь может создавать вакансии
CREATE POLICY "hr_vacancies_insert"
  ON hr_vacancies
  FOR INSERT
  WITH CHECK (employer_id = auth.uid());

-- Работодатель редактирует только свои вакансии
CREATE POLICY "hr_vacancies_update"
  ON hr_vacancies
  FOR UPDATE
  USING  (employer_id = auth.uid())
  WITH CHECK (employer_id = auth.uid());

-- Работодатель удаляет только свои вакансии
CREATE POLICY "hr_vacancies_delete"
  ON hr_vacancies
  FOR DELETE
  USING (employer_id = auth.uid());

-- ── hr_resumes ────────────────────────────────────────────────────────────────

-- HR-менеджеры (authenticated) видят активные резюме соискателей
CREATE POLICY "hr_resumes_select_active"
  ON hr_resumes
  FOR SELECT
  USING (
    status = 'active'
    AND auth.uid() IS NOT NULL
  );

-- Соискатель видит все свои резюме независимо от статуса
CREATE POLICY "hr_resumes_select_own"
  ON hr_resumes
  FOR SELECT
  USING (user_id = auth.uid());

-- Создание резюме — только для авторизованных
CREATE POLICY "hr_resumes_insert"
  ON hr_resumes
  FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- Редактирование — только владелец
CREATE POLICY "hr_resumes_update"
  ON hr_resumes
  FOR UPDATE
  USING  (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Удаление — только владелец
CREATE POLICY "hr_resumes_delete"
  ON hr_resumes
  FOR DELETE
  USING (user_id = auth.uid());

-- ── hr_applications ───────────────────────────────────────────────────────────

-- Соискатель видит свои отклики
CREATE POLICY "hr_applications_select_own_applicant"
  ON hr_applications
  FOR SELECT
  USING (applicant_id = auth.uid());

-- Работодатель видит отклики на свои вакансии
CREATE POLICY "hr_applications_select_own_employer"
  ON hr_applications
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM hr_vacancies v
      WHERE v.id = hr_applications.vacancy_id
        AND v.employer_id = auth.uid()
    )
  );

-- Отклик может создать любой авторизованный пользователь
CREATE POLICY "hr_applications_insert"
  ON hr_applications
  FOR INSERT
  WITH CHECK (applicant_id = auth.uid());

-- Работодатель обновляет статус отклика на своей вакансии
CREATE POLICY "hr_applications_update_employer"
  ON hr_applications
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM hr_vacancies v
      WHERE v.id = hr_applications.vacancy_id
        AND v.employer_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM hr_vacancies v
      WHERE v.id = hr_applications.vacancy_id
        AND v.employer_id = auth.uid()
    )
  );

-- Соискатель может отозвать отклик
CREATE POLICY "hr_applications_delete_own"
  ON hr_applications
  FOR DELETE
  USING (applicant_id = auth.uid());

-- ── hr_company_subscriptions ──────────────────────────────────────────────────

-- Подписчик видит свои подписки
CREATE POLICY "hr_subscriptions_select_own"
  ON hr_company_subscriptions
  FOR SELECT
  USING (subscriber_id = auth.uid());

-- Подписаться может любой авторизованный
CREATE POLICY "hr_subscriptions_insert"
  ON hr_company_subscriptions
  FOR INSERT
  WITH CHECK (subscriber_id = auth.uid());

-- Отписаться может только сам подписчик
CREATE POLICY "hr_subscriptions_delete"
  ON hr_company_subscriptions
  FOR DELETE
  USING (subscriber_id = auth.uid());

-- ════════════════════════════════════════════════════════════════════════════
-- 6. GRANT — Supabase Data API (PostgREST)
-- ════════════════════════════════════════════════════════════════════════════
-- Таблицы входят в схему public, поэтому нужно явно разрешить доступ
-- ролям anon и authenticated для работы через PostgREST / supabase-js.
-- RLS выше контролирует видимость строк — GRANT разрешает доступ к таблице.

GRANT SELECT                    ON hr_vacancies             TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON hr_vacancies        TO authenticated;

GRANT SELECT                    ON hr_resumes               TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON hr_resumes          TO authenticated;

GRANT SELECT, INSERT, UPDATE, DELETE ON hr_applications     TO authenticated;

GRANT SELECT, INSERT, DELETE    ON hr_company_subscriptions TO authenticated;

-- ════════════════════════════════════════════════════════════════════════════
-- 7. КОММЕНТАРИИ (pg_description — документация для Supabase Studio)
-- ════════════════════════════════════════════════════════════════════════════

COMMENT ON TABLE hr_vacancies IS
  'EXPO 365 HR Hub: вакансии от экспонентов и посетителей HoReCa-платформы.';
COMMENT ON TABLE hr_resumes IS
  'EXPO 365 HR Hub: резюме соискателей — профессионалы HoReCa-индустрии.';
COMMENT ON TABLE hr_applications IS
  'EXPO 365 HR Hub: отклики соискателей на вакансии. UNIQUE(vacancy_id, applicant_id).';
COMMENT ON TABLE hr_company_subscriptions IS
  'EXPO 365 HR Hub: подписки на обновления вакансий конкретного работодателя.';

COMMENT ON COLUMN hr_vacancies.salary_range IS
  'JSONB: {"min": number|null, "max": number|null, "currency": "RUB"|"USD"|"EUR"}';
COMMENT ON COLUMN hr_resumes.desired_salary IS
  'JSONB: {"amount": number|null, "currency": "RUB"|"USD"|"EUR"}';
COMMENT ON COLUMN hr_vacancies.applications_count IS
  'Денормализованный счётчик, обновляется триггером hr_applications_count_sync.';
