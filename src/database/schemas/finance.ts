/**
 * @file finance.ts
 * @domain Finance Gateway — Banking & Leasing
 * @description Canonical schema for the EXPO 365 Finance module.
 * Covers loan applications, leasing programs, bank partner management,
 * and tripartite financing flows tied to tender contracts.
 *
 * Related migrations:
 *   - /supabase/migrations/005_add_finance_module.sql
 *   - /supabase/migrations/006_add_tender_financing.sql
 *
 * RLS: Enabled on all tables.
 */

// ─── Enums ────────────────────────────────────────────────────────────────────

export type FinanceProductType = 'loan' | 'leasing' | 'credit_line' | 'bnpl';

export type ApplicationStatus =
  | 'draft'
  | 'submitted'
  | 'under_review'
  | 'pre_approved'
  | 'approved'
  | 'rejected'
  | 'disbursed'
  | 'cancelled';

export type LeasingCalculationBasis = 'annuity' | 'differentiated';

// ─── Bank Partner ─────────────────────────────────────────────────────────────

/**
 * Financial institution registered in the Finance Gateway.
 * Table: `public.bank_partners`
 */
export interface BankPartner {
  /** Primary key — UUID v4 */
  id: string;

  /** Bank display name */
  name: string;

  /** URL-safe slug: /horeca/finance/{slug} */
  slug: string;

  /** Short description shown on finance hub cards */
  tagline: string | null;

  /** Supabase Storage path to bank logo */
  logo_url: string | null;

  /** ISO 3166-1 alpha-2 country code */
  country_code: string;

  /** Primary products this bank offers */
  products: FinanceProductType[];

  /** Minimum loan/leasing amount in minor units */
  min_amount_minor_units: number;

  /** Maximum loan/leasing amount in minor units */
  max_amount_minor_units: number;

  /** Minimum term in months */
  min_term_months: number;

  /** Maximum term in months */
  max_term_months: number;

  /** Indicative annual interest rate (e.g. 18.5 = 18.5% per annum) */
  base_rate_percent: number;

  /** Whether this bank participates in tripartite tender financing */
  supports_tender_financing: boolean;

  /** Whether the bank profile is publicly visible */
  is_active: boolean;

  /** Contact email for partnership inquiries */
  contact_email: string;

  /** Public website URL */
  website_url: string | null;

  created_at: string;
  updated_at: string;
}

// ─── Leasing Rate Plan ────────────────────────────────────────────────────────

/**
 * A specific leasing rate configuration offered by a bank.
 * Table: `public.leasing_rate_plans`
 */
export interface LeasingRatePlan {
  id: string;

  /** FK → bank_partners.id */
  bank_partner_id: string;

  /** Plan display name (e.g. "Express Leasing 12M") */
  name: string;

  /** Equipment category this plan applies to (null = all categories) */
  equipment_category: string | null;

  /** Term in months */
  term_months: number;

  /** Annual rate in percent */
  rate_percent: number;

  /** Advance payment as percentage of total (e.g. 20 = 20%) */
  advance_payment_percent: number;

  /** Calculation method */
  calculation_basis: LeasingCalculationBasis;

  /** Minimum amount for this plan in minor units */
  min_amount_minor_units: number;

  /** Maximum amount for this plan in minor units */
  max_amount_minor_units: number;

  is_active: boolean;
  created_at: string;
}

// ─── Finance Application ──────────────────────────────────────────────────────

/**
 * A loan or leasing application submitted by a Buyer or Exhibitor.
 * Table: `public.finance_applications`
 *
 * Edge cases:
 * - Tender-linked financing: `tender_id` is populated when application
 *   is part of a tripartite contract flow.
 * - Direct applications: `tender_id` is null (buyer applies independently).
 */
export interface FinanceApplication {
  id: string;

  /** FK → auth.users — the applicant (buyer or exhibitor) */
  applicant_id: string;

  /** FK → bank_partners.id */
  bank_partner_id: string;

  /** FK → leasing_rate_plans.id (null for custom loan applications) */
  rate_plan_id: string | null;

  /** FK → tenders.id (null for direct applications) */
  tender_id: string | null;

  /** FK → contract_drafts.id (null until contract stage) */
  contract_draft_id: string | null;

  /** Finance product type */
  product_type: FinanceProductType;

  /** Currency ISO 4217 */
  currency: 'RUB' | 'EUR' | 'USD';

  /** Requested amount in minor units */
  requested_amount_minor_units: number;

  /** Requested term in months */
  requested_term_months: number;

  /** Purpose of financing (free text, max 500 chars) */
  purpose_description: string;

  /** Application lifecycle status */
  status: ApplicationStatus;

  /** Bank's pre-approval offer amount in minor units (set by bank) */
  approved_amount_minor_units: number | null;

  /** Bank's approved interest rate */
  approved_rate_percent: number | null;

  /** Bank's approved term */
  approved_term_months: number | null;

  /** Monthly payment amount in minor units (calculated) */
  monthly_payment_minor_units: number | null;

  /** Bank's decision notes (internal) */
  decision_notes: string | null;

  /** Supabase Storage paths to applicant documents */
  document_urls: string[];

  /** ISO 8601 — when bank submitted their decision */
  decision_at: string | null;

  created_at: string;
  updated_at: string;
}

// ─── Tender Financing Offer ───────────────────────────────────────────────────

/**
 * A bank's proactive financing offer attached to an active tender.
 * Banks can propose financing solutions when viewing the tender feed.
 * Table: `public.tender_financing_offers`
 */
export interface TenderFinancingOffer {
  id: string;

  /** FK → tenders.id */
  tender_id: string;

  /** FK → bank_partners.id */
  bank_partner_id: string;

  /** Finance product being offered */
  product_type: FinanceProductType;

  /** Maximum amount the bank is willing to finance (minor units) */
  max_offered_amount_minor_units: number;

  currency: 'RUB' | 'EUR' | 'USD';

  /** Indicative rate for this specific offer */
  indicative_rate_percent: number;

  /** Maximum term offered in months */
  max_term_months: number;

  /** Marketing message shown on the financing card in UI */
  offer_headline: string;

  /** Whether this offer has been accepted by the buyer */
  is_accepted: boolean;

  /** ISO 8601 — offer expiry date */
  expires_at: string;

  created_at: string;
}

// ─── SQL Reference ────────────────────────────────────────────────────────────

/**
 * @sql
 * CREATE TABLE public.bank_partners (
 *   id                         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
 *   name                       TEXT NOT NULL,
 *   slug                       TEXT NOT NULL UNIQUE,
 *   tagline                    TEXT,
 *   logo_url                   TEXT,
 *   country_code               CHAR(2) NOT NULL DEFAULT 'RU',
 *   products                   TEXT[] NOT NULL DEFAULT '{}',
 *   min_amount_minor_units     BIGINT NOT NULL DEFAULT 0,
 *   max_amount_minor_units     BIGINT NOT NULL,
 *   min_term_months            SMALLINT NOT NULL DEFAULT 3,
 *   max_term_months            SMALLINT NOT NULL DEFAULT 84,
 *   base_rate_percent          NUMERIC(5,2) NOT NULL,
 *   supports_tender_financing  BOOLEAN NOT NULL DEFAULT false,
 *   is_active                  BOOLEAN NOT NULL DEFAULT true,
 *   contact_email              TEXT NOT NULL,
 *   website_url                TEXT,
 *   created_at                 TIMESTAMPTZ NOT NULL DEFAULT NOW(),
 *   updated_at                 TIMESTAMPTZ NOT NULL DEFAULT NOW()
 * );
 *
 * ALTER TABLE public.bank_partners ENABLE ROW LEVEL SECURITY;
 *
 * -- Public read for active banks
 * CREATE POLICY "bank_partners_public_read" ON public.bank_partners
 *   FOR SELECT USING (is_active = true);
 *
 * CREATE TABLE public.finance_applications (
 *   id                                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
 *   applicant_id                      UUID NOT NULL REFERENCES auth.users(id),
 *   bank_partner_id                   UUID NOT NULL REFERENCES bank_partners(id),
 *   rate_plan_id                      UUID REFERENCES leasing_rate_plans(id),
 *   tender_id                         UUID REFERENCES tenders(id),
 *   contract_draft_id                 UUID REFERENCES contract_drafts(id),
 *   product_type                      TEXT NOT NULL,
 *   currency                          CHAR(3) NOT NULL DEFAULT 'RUB',
 *   requested_amount_minor_units      BIGINT NOT NULL,
 *   requested_term_months             SMALLINT NOT NULL,
 *   purpose_description               TEXT NOT NULL,
 *   status                            TEXT NOT NULL DEFAULT 'draft',
 *   approved_amount_minor_units       BIGINT,
 *   approved_rate_percent             NUMERIC(5,2),
 *   approved_term_months              SMALLINT,
 *   monthly_payment_minor_units       BIGINT,
 *   decision_notes                    TEXT,
 *   document_urls                     TEXT[] NOT NULL DEFAULT '{}',
 *   decision_at                       TIMESTAMPTZ,
 *   created_at                        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
 *   updated_at                        TIMESTAMPTZ NOT NULL DEFAULT NOW()
 * );
 *
 * ALTER TABLE public.finance_applications ENABLE ROW LEVEL SECURITY;
 *
 * -- Applicants see only their own applications
 * CREATE POLICY "finance_apps_own" ON public.finance_applications
 *   FOR ALL USING (applicant_id = auth.uid());
 */
