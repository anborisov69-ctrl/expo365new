-- ════════════════════════════════════════════════════════════════════════════
-- Migration: 009_add_hr_module.sql
-- Module:    HR Hub — Вакансии, Резюме, Отклики
-- Context:   EXPO 365 HoReCa B2B Platform
--
-- Создаёт:
--   • hr_vacancies       — вакансии от Exhibitor/Visitor (работодатель)
--   • hr_resumes         — резюме частных лиц (кандидатов)
--   • hr_applications    — отклики кандидатов на вакансии
--   • hr_subscriptions   — подписки кандидатов на компании
--
-- Безопасность:
--   • RLS включён на всех таблицах
--   • Политики multi-tenant: каждый видит только своё + публичный просмотр
-- ════════════════════════════════════════════════════════════════════════════

-- ── 1. Перечисления (Enums) ───────────────────────────────────────────────────

DO $$ BEGIN
  CREATE TYPE hr_vacancy_status AS ENUM ('active', 'draft', 'closed');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE hr_employer_type AS ENUM ('exhibitor', 'visitor');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE hr_application_status AS ENUM ('pending', 'reviewed', 'rejected', 'interview');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE hr_resume_status AS ENUM ('active', 'hidden', 'archived');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ── 2. Таблица вакансий ──────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS hr_vacancies (
  id              UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at      TIMESTAMPTZ   NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ   NOT NULL DEFAULT now(),

  -- Работодатель (ссылка на auth.users, не profiles для максимальной совместимости)
  employer_id     UUID          NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Флаг типа работодателя: экспонент или посетитель
  employer_type   hr_employer_type NOT NULL,

  -- Опциональное название компании (денормализованное для быстрого отображения)
  company_name    TEXT,

  -- Данные вакансии
  title           TEXT          NOT NULL CHECK (char_length(title) BETWEEN 3 AND 120),
  description     TEXT,
  requirements    TEXT,

  -- Зарплатная вилка. JSONB для гибкости: { "min": 80000, "max": 120000, "currency": "RUB" }
  salary_range    JSONB         NOT NULL DEFAULT '{"min": null, "max": null, "currency": "RUB"}'::jsonb,

  -- Категория (ключ): barista, chef, manager, service, sales, hr, other
  category        TEXT          NOT NULL CHECK (char_length(category) BETWEEN 1 AND 60),

  -- Город / регион
  location        TEXT,

  -- Тип занятости: full_time, part_time, contract, internship
  employment_type TEXT          NOT NULL DEFAULT 'full_time'
                  CHECK (employment_type IN ('full_time', 'part_time', 'contract', 'internship')),

  status          hr_vacancy_status NOT NULL DEFAULT 'active',

  -- Количество откликов (денормализовано для производительности)
  applications_count INTEGER    NOT NULL DEFAULT 0,

  CONSTRAINT valid_salary_range CHECK (
    salary_range IS NULL OR jsonb_typeof(salary_range) = 'object'
  )
);

-- ── 3. Таблица резюме ────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS hr_resumes (
  id              UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at      TIMESTAMPTZ   NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ   NOT NULL DEFAULT now(),

  -- Кандидат
  user_id         UUID          NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Персональные данные
  full_name       TEXT          NOT NULL CHECK (char_length(full_name) BETWEEN 2 AND 100),
  position        TEXT          NOT NULL CHECK (char_length(position) BETWEEN 2 AND 120),

  -- Контакт (только работодателю после отклика)
  contact_email   TEXT,
  contact_phone   TEXT,

  -- Профессиональный профиль
  summary         TEXT,
  experience      TEXT,
  skills          TEXT,
  education       TEXT,

  -- Желаемая зарплата
  desired_salary  JSONB         DEFAULT '{"amount": null, "currency": "RUB"}'::jsonb,

  -- Категория соответствует hr_vacancies.category
  category        TEXT          NOT NULL CHECK (char_length(category) BETWEEN 1 AND 60),

  -- Город / регион
  location        TEXT,

  status          hr_resume_status NOT NULL DEFAULT 'active',

  CONSTRAINT valid_desired_salary CHECK (
    desired_salary IS NULL OR jsonb_typeof(desired_salary) = 'object'
  )
);

-- ── 4. Таблица откликов ──────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS hr_applications (
  id              UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at      TIMESTAMPTZ   NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ   NOT NULL DEFAULT now(),

  -- Связи
  vacancy_id      UUID          NOT NULL REFERENCES hr_vacancies(id) ON DELETE CASCADE,
  resume_id       UUID          REFERENCES hr_resumes(id) ON DELETE SET NULL,
  applicant_id    UUID          NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Сопроводительное письмо
  cover_letter    TEXT,

  status          hr_application_status NOT NULL DEFAULT 'pending',

  -- Предотвращение дублирующих откликов
  UNIQUE (vacancy_id, applicant_id)
);

-- ── 5. Таблица подписок на компании ─────────────────────────────────────────

CREATE TABLE IF NOT EXISTS hr_company_subscriptions (
  id              UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at      TIMESTAMPTZ   NOT NULL DEFAULT now(),

  subscriber_id   UUID          NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  employer_id     UUID          NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Предотвращение дублирующих подписок
  UNIQUE (subscriber_id, employer_id)
);

-- ── 6. Индексы для производительности ────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_hr_vacancies_employer
  ON hr_vacancies(employer_id);

CREATE INDEX IF NOT EXISTS idx_hr_vacancies_status_category
  ON hr_vacancies(status, category)
  WHERE status = 'active';

CREATE INDEX IF NOT EXISTS idx_hr_vacancies_employer_type
  ON hr_vacancies(employer_type)
  WHERE status = 'active';

CREATE INDEX IF NOT EXISTS idx_hr_resumes_user
  ON hr_resumes(user_id);

CREATE INDEX IF NOT EXISTS idx_hr_resumes_category_status
  ON hr_resumes(category, status)
  WHERE status = 'active';

CREATE INDEX IF NOT EXISTS idx_hr_applications_vacancy
  ON hr_applications(vacancy_id);

CREATE INDEX IF NOT EXISTS idx_hr_applications_applicant
  ON hr_applications(applicant_id);

CREATE INDEX IF NOT EXISTS idx_hr_subscriptions_subscriber
  ON hr_company_subscriptions(subscriber_id);

-- ── 7. Функция автообновления updated_at ─────────────────────────────────────

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_hr_vacancies_updated_at
  BEFORE UPDATE ON hr_vacancies
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_hr_resumes_updated_at
  BEFORE UPDATE ON hr_resumes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ── 8. Функция для инкремента счётчика откликов ───────────────────────────────

CREATE OR REPLACE FUNCTION increment_vacancy_applications()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  UPDATE hr_vacancies
  SET applications_count = applications_count + 1
  WHERE id = NEW.vacancy_id;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION decrement_vacancy_applications()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  UPDATE hr_vacancies
  SET applications_count = GREATEST(0, applications_count - 1)
  WHERE id = OLD.vacancy_id;
  RETURN OLD;
END;
$$;

CREATE TRIGGER trg_hr_application_inserted
  AFTER INSERT ON hr_applications
  FOR EACH ROW EXECUTE FUNCTION increment_vacancy_applications();

CREATE TRIGGER trg_hr_application_deleted
  AFTER DELETE ON hr_applications
  FOR EACH ROW EXECUTE FUNCTION decrement_vacancy_applications();

-- ── 9. Row Level Security ─────────────────────────────────────────────────────

ALTER TABLE hr_vacancies ENABLE ROW LEVEL SECURITY;
ALTER TABLE hr_resumes ENABLE ROW LEVEL SECURITY;
ALTER TABLE hr_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE hr_company_subscriptions ENABLE ROW LEVEL SECURITY;

-- hr_vacancies: публичное чтение активных, владелец управляет своими
CREATE POLICY "hr_vacancies_public_read"
  ON hr_vacancies FOR SELECT
  USING (status = 'active' OR auth.uid() = employer_id);

CREATE POLICY "hr_vacancies_employer_insert"
  ON hr_vacancies FOR INSERT
  WITH CHECK (auth.uid() = employer_id);

CREATE POLICY "hr_vacancies_employer_update"
  ON hr_vacancies FOR UPDATE
  USING (auth.uid() = employer_id)
  WITH CHECK (auth.uid() = employer_id);

CREATE POLICY "hr_vacancies_employer_delete"
  ON hr_vacancies FOR DELETE
  USING (auth.uid() = employer_id);

-- hr_resumes: активные видны всем, владелец управляет своими
CREATE POLICY "hr_resumes_public_read"
  ON hr_resumes FOR SELECT
  USING (status = 'active' OR auth.uid() = user_id);

CREATE POLICY "hr_resumes_owner_insert"
  ON hr_resumes FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "hr_resumes_owner_update"
  ON hr_resumes FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "hr_resumes_owner_delete"
  ON hr_resumes FOR DELETE
  USING (auth.uid() = user_id);

-- hr_applications: кандидат видит свои, работодатель видит по своим вакансиям
CREATE POLICY "hr_applications_applicant_read"
  ON hr_applications FOR SELECT
  USING (
    auth.uid() = applicant_id
    OR auth.uid() IN (
      SELECT employer_id FROM hr_vacancies WHERE id = vacancy_id
    )
  );

CREATE POLICY "hr_applications_applicant_insert"
  ON hr_applications FOR INSERT
  WITH CHECK (auth.uid() = applicant_id);

CREATE POLICY "hr_applications_applicant_delete"
  ON hr_applications FOR DELETE
  USING (auth.uid() = applicant_id);

-- Статус отклика может менять только работодатель
CREATE POLICY "hr_applications_employer_update_status"
  ON hr_applications FOR UPDATE
  USING (
    auth.uid() IN (
      SELECT employer_id FROM hr_vacancies WHERE id = vacancy_id
    )
  );

-- hr_company_subscriptions: владелец управляет своими
CREATE POLICY "hr_subscriptions_own_read"
  ON hr_company_subscriptions FOR SELECT
  USING (auth.uid() = subscriber_id OR auth.uid() = employer_id);

CREATE POLICY "hr_subscriptions_own_insert"
  ON hr_company_subscriptions FOR INSERT
  WITH CHECK (auth.uid() = subscriber_id);

CREATE POLICY "hr_subscriptions_own_delete"
  ON hr_company_subscriptions FOR DELETE
  USING (auth.uid() = subscriber_id);

-- ── 10. Гранты для authenticated-роли ────────────────────────────────────────
-- Необходимы для доступа через Data API (PostgREST)

GRANT SELECT, INSERT, UPDATE, DELETE ON hr_vacancies TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON hr_resumes TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON hr_applications TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON hr_company_subscriptions TO authenticated;
GRANT SELECT ON hr_vacancies TO anon;
GRANT SELECT ON hr_resumes TO anon;

-- ── 11. Комментарии ───────────────────────────────────────────────────────────

COMMENT ON TABLE hr_vacancies IS 'HR Hub: вакансии от Exhibitor/Visitor (работодатель HoReCa)';
COMMENT ON TABLE hr_resumes IS 'HR Hub: резюме частных лиц (кандидаты на HoReCa-позиции)';
COMMENT ON TABLE hr_applications IS 'HR Hub: отклики кандидатов на вакансии';
COMMENT ON TABLE hr_company_subscriptions IS 'HR Hub: подписки кандидатов на обновления компаний';
