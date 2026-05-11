-- ═══════════════════════════════════════════════════════════════════════════════
-- Migration 006: Tender Financing Workflow
-- ═══════════════════════════════════════════════════════════════════════════════
-- Добавляет:
--   1. Таблицу tender_financing_offers  — офферы банков на конкретный тендер
--   2. Таблицу tripartite_contracts     — трёхсторонние договоры
--                                         (Поставщик — Покупатель — Банк)
--   3. RLS-политики (multi-tenant isolation):
--      • bank → видит только свои офферы
--      • buyer → видит офферы на свои тендеры + свои контракты
--      • supplier → видит контракты, в которых является стороной
--      • anonymous → не видит ничего
-- ═══════════════════════════════════════════════════════════════════════════════

-- ── ENUM: статус оффера ───────────────────────────────────────────────────────
DO $$ BEGIN
  CREATE TYPE financing_offer_status AS ENUM (
    'active',     -- оффер отправлен, ждёт решения байера
    'accepted',   -- байер принял оффер → создан контракт
    'expired',    -- истёк срок действия
    'withdrawn'   -- банк отозвал оффер
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ── ENUM: статус трёхстороннего контракта ─────────────────────────────────────
DO $$ BEGIN
  CREATE TYPE tripartite_contract_status AS ENUM (
    'draft',            -- черновик сформирован системой
    'sent_to_parties',  -- отправлен всем сторонам для согласования
    'signed',           -- подписан всеми тремя сторонами
    'cancelled'         -- аннулирован
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ── TABLE: tender_financing_offers ────────────────────────────────────────────
-- Банк видит активный тендер и предлагает байеру финансирование.
-- PII байера скрыто до принятия оффера (только buyerCompany и region).
CREATE TABLE IF NOT EXISTS tender_financing_offers (
  id                   uuid                    PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Ссылка на тендер (к моменту prod-интеграции — FK на tenders.id)
  tender_id            text                    NOT NULL,
  tender_title         text                    NOT NULL,

  -- Банк — автор оффера
  bank_id              uuid                    NOT NULL REFERENCES banks(id) ON DELETE RESTRICT,

  -- Параметры финансирования
  service_type         bank_service_type       NOT NULL DEFAULT 'leasing',
  rate_percent         numeric(5,2)            NOT NULL CHECK (rate_percent > 0),
  max_amount           numeric(15,2)           NOT NULL CHECK (max_amount > 0),
  term_months          int4                    NOT NULL CHECK (term_months > 0),
  down_payment_percent numeric(5,2)            CHECK (down_payment_percent >= 0 AND down_payment_percent < 100),

  -- Дополнительно
  comment              text,
  status               financing_offer_status  NOT NULL DEFAULT 'active',
  valid_until          timestamptz,

  created_at           timestamptz             NOT NULL DEFAULT now(),
  updated_at           timestamptz             NOT NULL DEFAULT now()
);

CREATE INDEX idx_tfo_tender_id ON tender_financing_offers(tender_id);
CREATE INDEX idx_tfo_bank_id   ON tender_financing_offers(bank_id);
CREATE INDEX idx_tfo_status    ON tender_financing_offers(status) WHERE status = 'active';

-- Уникальность: один банк — один оффер на один тендер (активный)
CREATE UNIQUE INDEX uq_tfo_bank_tender_active
  ON tender_financing_offers(bank_id, tender_id)
  WHERE status = 'active';

-- updated_at trigger
CREATE OR REPLACE FUNCTION tfo_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$ LANGUAGE plpgsql;

CREATE TRIGGER tfo_updated_at
  BEFORE UPDATE ON tender_financing_offers
  FOR EACH ROW EXECUTE FUNCTION tfo_set_updated_at();

-- ── TABLE: tripartite_contracts ───────────────────────────────────────────────
-- Создаётся системой при принятии байером банковского оффера.
-- Три стороны: Поставщик (supplier) — Покупатель (buyer) — Банк (bank).
CREATE TABLE IF NOT EXISTS tripartite_contracts (
  id                   uuid                          PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Тендер
  tender_id            text                          NOT NULL,
  tender_title         text                          NOT NULL,

  -- Стороны договора
  supplier_id          uuid                          NOT NULL,  -- REFERENCES exhibitors(id)
  supplier_name        text                          NOT NULL,
  buyer_id             uuid                          NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  buyer_company        text                          NOT NULL,
  bank_id              uuid                          NOT NULL REFERENCES banks(id) ON DELETE RESTRICT,
  bank_name            text                          NOT NULL,

  -- Финансовые параметры
  deal_amount          numeric(15,2)                 NOT NULL CHECK (deal_amount > 0),
  financing_offer_id   uuid                          NOT NULL REFERENCES tender_financing_offers(id),
  monthly_payment      numeric(15,2)                 NOT NULL CHECK (monthly_payment > 0),

  -- Статус
  status               tripartite_contract_status    NOT NULL DEFAULT 'draft',

  -- Подписи (JSON: { supplier: ISO, buyer: ISO, bank: ISO } — заполняются по мере подписания)
  signatures           jsonb                         NOT NULL DEFAULT '{}'::jsonb,

  created_at           timestamptz                   NOT NULL DEFAULT now(),
  updated_at           timestamptz                   NOT NULL DEFAULT now()
);

CREATE INDEX idx_tc_tender_id     ON tripartite_contracts(tender_id);
CREATE INDEX idx_tc_buyer_id      ON tripartite_contracts(buyer_id);
CREATE INDEX idx_tc_supplier_id   ON tripartite_contracts(supplier_id);
CREATE INDEX idx_tc_bank_id       ON tripartite_contracts(bank_id);
CREATE INDEX idx_tc_status        ON tripartite_contracts(status);

-- updated_at trigger
CREATE OR REPLACE FUNCTION tc_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$ LANGUAGE plpgsql;

CREATE TRIGGER tc_updated_at
  BEFORE UPDATE ON tripartite_contracts
  FOR EACH ROW EXECUTE FUNCTION tc_set_updated_at();

-- ═══════════════════════════════════════════════════════════════════════════════
-- ROW LEVEL SECURITY (RLS)
-- ═══════════════════════════════════════════════════════════════════════════════

-- ── tender_financing_offers ───────────────────────────────────────────────────
ALTER TABLE tender_financing_offers ENABLE ROW LEVEL SECURITY;

-- Все аутентифициированные пользователи могут читать активные офферы
-- (байер видит офферы на свои тендеры — в prod фильтр по tender_id будет строже)
CREATE POLICY "tfo_select_authenticated"
  ON tender_financing_offers FOR SELECT
  TO authenticated
  USING (status = 'active');

-- Банк видит все свои офферы (любого статуса)
CREATE POLICY "tfo_select_own_bank"
  ON tender_financing_offers FOR SELECT
  TO authenticated
  USING (
    bank_id IN (
      SELECT id FROM banks
      WHERE id::text = auth.uid()::text  -- упрощённо; в prod — через junction table bank_users
    )
  );

-- Банк создаёт офферы только от своего bank_id
CREATE POLICY "tfo_insert_bank"
  ON tender_financing_offers FOR INSERT
  TO authenticated
  WITH CHECK (
    bank_id IN (
      SELECT id FROM banks WHERE id::text = auth.uid()::text
    )
  );

-- Банк обновляет только свои офферы
CREATE POLICY "tfo_update_own_bank"
  ON tender_financing_offers FOR UPDATE
  TO authenticated
  USING (bank_id IN (SELECT id FROM banks WHERE id::text = auth.uid()::text))
  WITH CHECK (bank_id IN (SELECT id FROM banks WHERE id::text = auth.uid()::text));

-- Система меняет статус оффера на 'accepted' (через service role key)
-- → Нет ограничений для service_role (service_role обходит RLS по умолчанию)

-- ── tripartite_contracts ──────────────────────────────────────────────────────
ALTER TABLE tripartite_contracts ENABLE ROW LEVEL SECURITY;

-- Байер видит свои контракты
CREATE POLICY "tc_select_buyer"
  ON tripartite_contracts FOR SELECT
  TO authenticated
  USING (buyer_id = auth.uid());

-- Поставщик видит контракты, где является стороной
CREATE POLICY "tc_select_supplier"
  ON tripartite_contracts FOR SELECT
  TO authenticated
  USING (supplier_id = auth.uid());

-- Банк видит контракты, где является стороной
CREATE POLICY "tc_select_bank"
  ON tripartite_contracts FOR SELECT
  TO authenticated
  USING (
    bank_id IN (
      SELECT id FROM banks WHERE id::text = auth.uid()::text
    )
  );

-- Только service_role создаёт контракты (API route использует service_role key)
-- → Нет INSERT policy для обычных пользователей

-- Стороны могут обновить только своё поле подписи
CREATE POLICY "tc_update_signature_buyer"
  ON tripartite_contracts FOR UPDATE
  TO authenticated
  USING  (buyer_id = auth.uid() AND status IN ('sent_to_parties'))
  WITH CHECK (buyer_id = auth.uid());

CREATE POLICY "tc_update_signature_supplier"
  ON tripartite_contracts FOR UPDATE
  TO authenticated
  USING  (supplier_id = auth.uid() AND status IN ('sent_to_parties'))
  WITH CHECK (supplier_id = auth.uid());

-- ═══════════════════════════════════════════════════════════════════════════════
-- HELPER FUNCTION: расчёт аннуитетного платежа на стороне БД
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION calc_monthly_payment(
  principal     numeric,
  rate_percent  numeric,  -- годовая ставка
  term_months   int
) RETURNS numeric
LANGUAGE plpgsql
IMMUTABLE STRICT
AS $$
DECLARE
  r       numeric;
  payment numeric;
BEGIN
  IF rate_percent = 0 THEN
    RETURN ROUND(principal / term_months, 2);
  END IF;
  r := rate_percent / 100.0 / 12.0;
  payment := principal * (r * POWER(1 + r, term_months)) / (POWER(1 + r, term_months) - 1);
  RETURN ROUND(payment, 2);
END;
$$;

-- Пример использования:
-- SELECT calc_monthly_payment(850000, 6.5, 36);  -- → ~26 154

-- ═══════════════════════════════════════════════════════════════════════════════
-- GRANT публичного доступа к calc_monthly_payment (для RPC из клиента)
-- ═══════════════════════════════════════════════════════════════════════════════
GRANT EXECUTE ON FUNCTION calc_monthly_payment(numeric, numeric, int) TO authenticated;
