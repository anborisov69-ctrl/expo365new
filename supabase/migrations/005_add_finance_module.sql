-- ═══════════════════════════════════════════════════════════════════════════════
-- Migration 005: Finance Module — Banks & Loan Applications
-- ═══════════════════════════════════════════════════════════════════════════════
-- Добавляет:
--   1. Таблицу banks (партнёрские банки и лизинговые компании)
--   2. Таблицу bank_services (услуги каждого банка)
--   3. Таблицу loan_applications (заявки байеров на финансирование)
--   4. RLS-политики (multi-tenant isolation):
--      • bank.dashboard → видит только свои заявки
--      • buyer → видит только свои заявки
--      • anonymous → не видит ничего
-- ═══════════════════════════════════════════════════════════════════════════════

-- ── ENUM: тип банковской услуги ───────────────────────────────────────────────
CREATE TYPE bank_service_type AS ENUM (
  'leasing',
  'credit',
  'rko',
  'overdraft',
  'factoring'
);

-- ── ENUM: статус заявки ───────────────────────────────────────────────────────
CREATE TYPE loan_application_status AS ENUM (
  'pending',
  'under_review',
  'pre_approved',
  'approved',
  'rejected',
  'cancelled'
);

-- ── TABLE: banks ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS banks (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  slug            text        UNIQUE NOT NULL,
  name            text        NOT NULL,
  short_name      text        NOT NULL,
  logo_url        text,
  accent_color    char(7)     NOT NULL DEFAULT '#0B2B5E',
  tagline         text,
  description     text,
  horeca_focus    bool        NOT NULL DEFAULT false,
  rating          numeric(2,1),
  approved_count  int4        NOT NULL DEFAULT 0,
  avg_days_review int4        NOT NULL DEFAULT 5,
  contact_email   text,
  contact_phone   text,
  is_active       bool        NOT NULL DEFAULT true,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

-- ── TABLE: bank_services ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS bank_services (
  id           uuid             PRIMARY KEY DEFAULT gen_random_uuid(),
  bank_id      uuid             NOT NULL REFERENCES banks(id) ON DELETE CASCADE,
  service_type bank_service_type NOT NULL,
  title        text             NOT NULL,
  description  text,
  rate_from    numeric(5,2),      -- % годовых
  max_amount   numeric(15,2),     -- руб.
  term_months  int4,
  sort_order   int4             NOT NULL DEFAULT 0,
  created_at   timestamptz      NOT NULL DEFAULT now()
);

CREATE INDEX idx_bank_services_bank_id ON bank_services(bank_id);

-- ── TABLE: loan_applications ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS loan_applications (
  id               uuid                    PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Байер (auth.users)
  buyer_id         uuid                    NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  buyer_name       text                    NOT NULL,
  buyer_company    text                    NOT NULL,

  -- Банк
  bank_id          uuid                    NOT NULL REFERENCES banks(id) ON DELETE RESTRICT,

  -- Товар из каталога
  product_id       text                    NOT NULL,  -- ссылка на products.id
  product_name     text                    NOT NULL,
  product_brand    text                    NOT NULL,

  -- Параметры заявки
  amount           numeric(15,2)           NOT NULL CHECK (amount > 0),
  service_type     bank_service_type       NOT NULL DEFAULT 'leasing',
  status           loan_application_status NOT NULL DEFAULT 'pending',
  purpose_tag      text                    NOT NULL DEFAULT 'Целевой лизинг',

  -- Комментарии
  comment          text,
  bank_comment     text,

  created_at       timestamptz             NOT NULL DEFAULT now(),
  updated_at       timestamptz             NOT NULL DEFAULT now()
);

-- Индексы для эффективных запросов
CREATE INDEX idx_loan_apps_buyer_id    ON loan_applications(buyer_id);
CREATE INDEX idx_loan_apps_bank_id     ON loan_applications(bank_id);
CREATE INDEX idx_loan_apps_status      ON loan_applications(status);
CREATE INDEX idx_loan_apps_created_at  ON loan_applications(created_at DESC);

-- ── TRIGGER: updated_at авто-обновление ──────────────────────────────────────
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_banks_updated_at
  BEFORE UPDATE ON banks
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_loan_apps_updated_at
  BEFORE UPDATE ON loan_applications
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ═══════════════════════════════════════════════════════════════════════════════
-- ROW LEVEL SECURITY (RLS)
-- ═══════════════════════════════════════════════════════════════════════════════

-- banks: публично читаемы, редактирует только admin
ALTER TABLE banks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "banks_public_read"
  ON banks FOR SELECT
  USING (is_active = true);

CREATE POLICY "banks_admin_all"
  ON banks FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE id = auth.uid()
        AND raw_app_meta_data->>'role' = 'admin'
    )
  );

-- bank_services: публично читаемы
ALTER TABLE bank_services ENABLE ROW LEVEL SECURITY;

CREATE POLICY "bank_services_public_read"
  ON bank_services FOR SELECT
  USING (true);

CREATE POLICY "bank_services_admin_all"
  ON bank_services FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE id = auth.uid()
        AND raw_app_meta_data->>'role' = 'admin'
    )
  );

-- loan_applications: байер видит ТОЛЬКО свои; банк видит только свои
ALTER TABLE loan_applications ENABLE ROW LEVEL SECURITY;

-- Байер может видеть и создавать свои заявки
CREATE POLICY "loan_apps_buyer_select"
  ON loan_applications FOR SELECT
  USING (buyer_id = auth.uid());

CREATE POLICY "loan_apps_buyer_insert"
  ON loan_applications FOR INSERT
  WITH CHECK (buyer_id = auth.uid());

CREATE POLICY "loan_apps_buyer_cancel"
  ON loan_applications FOR UPDATE
  USING (
    buyer_id = auth.uid()
    AND status NOT IN ('approved', 'rejected')   -- нельзя отменить уже решённую
  )
  WITH CHECK (status = 'cancelled');             -- байер может только отменить

-- Банк видит заявки, адресованные ему, и может их обновлять
CREATE POLICY "loan_apps_bank_select"
  ON loan_applications FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM auth.users u
      JOIN banks b ON b.id = loan_applications.bank_id
      WHERE u.id = auth.uid()
        AND u.raw_app_meta_data->>'bank_id' = b.id::text
    )
  );

CREATE POLICY "loan_apps_bank_update"
  ON loan_applications FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM auth.users u
      JOIN banks b ON b.id = loan_applications.bank_id
      WHERE u.id = auth.uid()
        AND u.raw_app_meta_data->>'bank_id' = b.id::text
    )
  )
  WITH CHECK (
    -- Банк может только менять статус и добавлять bank_comment
    status IN ('under_review', 'pre_approved', 'approved', 'rejected')
  );

-- Admin имеет полный доступ
CREATE POLICY "loan_apps_admin_all"
  ON loan_applications FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE id = auth.uid()
        AND raw_app_meta_data->>'role' = 'admin'
    )
  );

-- ═══════════════════════════════════════════════════════════════════════════════
-- SEED DATA — начальные данные банков-партнёров
-- ═══════════════════════════════════════════════════════════════════════════════
INSERT INTO banks (slug, name, short_name, accent_color, tagline, description, horeca_focus, rating, approved_count, avg_days_review, contact_email, contact_phone)
VALUES
  ('vtb',    'ВТБ Банк',    'ВТБ',    '#003E8A', 'Лизинг и кредитование для HoReCa — до 200 млн рублей',          'Один из крупнейших банков России с программами для HoReCa.',  true,  4.7, 1240, 3, 'horeca@vtb.ru',         '+7 800 100-24-24'),
  ('tochka', 'Точка Банк',  'Точка',  '#FFD000', 'Быстрые решения для малого бизнеса — одобрение за 1 день',    'Цифровой банк для предпринимателей в сфере HoReCa.',          true,  4.8,  870, 1, 'business@tochka.com',   '+7 800 2000-100'),
  ('arenza',  'Аренза',      'Аренза', '#1A9E5F', 'Специализированный лизинг оборудования для HoReCa',           'Лизинговая компания, работающая напрямую с поставщиками.',    true,  4.9, 3200, 2, 'horeca@arenza.ru',      '+7 499 110-12-00'),
  ('alfa',   'Альфа-Банк',  'Альфа',  '#EF3124', 'Полный пакет банковских решений для ресторанного бизнеса',    'Комплексное финансирование для предприятий HoReCa.',          false, 4.6, 2100, 4, 'sme@alfabank.ru',       '+7 800 200-00-00')
ON CONFLICT (slug) DO NOTHING;
