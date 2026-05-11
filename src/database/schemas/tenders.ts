/**
 * @file tenders.ts
 * @domain Tender Hub — Procurement Lifecycle
 * @description Canonical schema for the EXPO 365 Tender system.
 * Covers the full lifecycle: Draft → Published → Bidding → Closed → Contracted.
 *
 * Related migrations:
 *   - /supabase/migrations/002_add_created_at_to_tenders.sql
 *   - /supabase/migrations/003_add_tender_unlocks.sql
 *   - /supabase/migrations/004_add_tender_closure_fields.sql
 *   - /supabase/migrations/006_add_tender_financing.sql
 *
 * RLS: Enabled on all tables.
 */

// ─── Enums ────────────────────────────────────────────────────────────────────

export type TenderStatus =
  | 'draft'
  | 'published'
  | 'bidding'
  | 'under_review'
  | 'closed'
  | 'contracted'
  | 'cancelled';

export type TenderCategory =
  | 'coffee-equipment'
  | 'refrigeration'
  | 'cooking-equipment'
  | 'dishwashing'
  | 'consumables'
  | 'cleaning'
  | 'furniture'
  | 'lighting'
  | 'it-pos'
  | 'other';

export type BidStatus =
  | 'submitted'
  | 'shortlisted'
  | 'accepted'
  | 'rejected'
  | 'withdrawn';

export type DeliveryType = 'full' | 'partial' | 'phased';

// ─── Tender Entity ────────────────────────────────────────────────────────────

/**
 * Core tender record. Created by a Buyer, responded to by Exhibitors.
 * Table: `public.tenders`
 */
export interface Tender {
  /** Primary key — UUID v4 */
  id: string;

  /** FK → auth.users (buyer's user ID) */
  buyer_id: string;

  /** Human-readable tender title */
  title: string;

  /** Full procurement requirements description */
  description: string;

  /** Product/equipment category */
  category: TenderCategory;

  /** Total estimated budget in minor units (kopecks/cents) */
  budget_minor_units: number | null;

  /** ISO 4217 currency code */
  currency: 'RUB' | 'EUR' | 'USD';

  /** Minimum acceptable quantity */
  quantity: number;

  /** Unit of measure */
  unit: string;

  /** Required delivery location (city or region) */
  delivery_location: string;

  /** Hard deadline for bid submissions — ISO 8601 */
  bid_deadline: string;

  /** Required delivery date — ISO 8601 */
  delivery_date: string | null;

  /** Tender lifecycle status */
  status: TenderStatus;

  /** Whether tender details are pay-to-view (locked for non-subscribers) */
  is_locked: boolean;

  /** Unlock price in minor units (0 = free) */
  unlock_price_minor_units: number;

  /** ID of the winning bid — null until closed */
  winning_bid_id: string | null;

  /** Reason for closure (if cancelled) */
  closure_reason: string | null;

  /** AI-generated tender quality score (0–100) */
  quality_score: number | null;

  /** ISO 8601 timestamp */
  created_at: string;

  /** ISO 8601 timestamp */
  updated_at: string;
}

// ─── Tender Unlock ────────────────────────────────────────────────────────────

/**
 * Records when an Exhibitor pays to view locked tender details.
 * Table: `public.tender_unlocks`
 */
export interface TenderUnlock {
  id: string;

  /** FK → tenders.id */
  tender_id: string;

  /** FK → auth.users (exhibitor's user ID) */
  exhibitor_id: string;

  /** Amount paid in minor units */
  amount_paid_minor_units: number;

  currency: 'RUB' | 'EUR' | 'USD';

  /** Payment processor transaction reference */
  payment_reference: string | null;

  created_at: string;
}

// ─── Bid (Exhibitor's Response) ───────────────────────────────────────────────

/**
 * An Exhibitor's formal response to a published Tender.
 * Table: `public.tender_bids`
 *
 * Edge cases handled:
 * - Partial delivery: `delivery_type = 'partial'` + `partial_quantity`
 * - Phased delivery: `delivery_type = 'phased'` + `phases` JSONB array
 */
export interface TenderBid {
  id: string;

  /** FK → tenders.id */
  tender_id: string;

  /** FK → auth.users (exhibitor's user ID) */
  exhibitor_id: string;

  /** Bid price in minor units */
  price_minor_units: number;

  currency: 'RUB' | 'EUR' | 'USD';

  /** Quantity offered (may be less than tender quantity for partial bids) */
  quantity_offered: number;

  /** Delivery commitment type */
  delivery_type: DeliveryType;

  /** For partial delivery — quantity the exhibitor can supply */
  partial_quantity: number | null;

  /** For phased delivery — JSON array of { date: string, quantity: number } */
  phases: Array<{ date: string; quantity: number }> | null;

  /** Promised delivery date — ISO 8601 */
  delivery_date: string;

  /** Technical proposal / cover note */
  proposal_text: string | null;

  /** Supabase Storage paths to supporting documents */
  attachment_urls: string[];

  /** Bid lifecycle status */
  status: BidStatus;

  /** AI-generated bid relevance score (0–100) */
  relevance_score: number | null;

  created_at: string;
  updated_at: string;
}

// ─── Contract Draft ───────────────────────────────────────────────────────────

/**
 * Pre-final contract generated after a bid is accepted.
 * Table: `public.contract_drafts`
 */
export interface ContractDraft {
  id: string;

  tender_id: string;
  bid_id: string;
  buyer_id: string;
  exhibitor_id: string;

  /** Whether a bank partner is involved (tripartite contract) */
  has_financing: boolean;

  /** FK → bank_partners.id (null if no financing) */
  bank_partner_id: string | null;

  /** Contract body in Markdown or HTML */
  contract_body: string;

  /** 'pending_buyer' | 'pending_exhibitor' | 'pending_bank' | 'signed' | 'void' */
  signature_status: string;

  /** ISO 8601 signing deadlines */
  buyer_signed_at: string | null;
  exhibitor_signed_at: string | null;
  bank_signed_at: string | null;

  created_at: string;
  updated_at: string;
}

// ─── SQL Reference ────────────────────────────────────────────────────────────

/**
 * @sql
 * CREATE TABLE public.tenders (
 *   id                        UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
 *   buyer_id                  UUID NOT NULL REFERENCES auth.users(id),
 *   title                     TEXT NOT NULL,
 *   description               TEXT NOT NULL,
 *   category                  TEXT NOT NULL,
 *   budget_minor_units        BIGINT,
 *   currency                  CHAR(3) NOT NULL DEFAULT 'RUB',
 *   quantity                  INTEGER NOT NULL DEFAULT 1,
 *   unit                      TEXT NOT NULL DEFAULT 'pcs',
 *   delivery_location         TEXT NOT NULL,
 *   bid_deadline              TIMESTAMPTZ NOT NULL,
 *   delivery_date             TIMESTAMPTZ,
 *   status                    TEXT NOT NULL DEFAULT 'draft',
 *   is_locked                 BOOLEAN NOT NULL DEFAULT false,
 *   unlock_price_minor_units  INTEGER NOT NULL DEFAULT 0,
 *   winning_bid_id            UUID REFERENCES tender_bids(id),
 *   closure_reason            TEXT,
 *   quality_score             SMALLINT CHECK (quality_score BETWEEN 0 AND 100),
 *   created_at                TIMESTAMPTZ NOT NULL DEFAULT NOW(),
 *   updated_at                TIMESTAMPTZ NOT NULL DEFAULT NOW()
 * );
 *
 * ALTER TABLE public.tenders ENABLE ROW LEVEL SECURITY;
 *
 * -- Buyers see only their own tenders (full access)
 * CREATE POLICY "buyers_own_tenders" ON public.tenders
 *   FOR ALL USING (buyer_id = auth.uid());
 *
 * -- Exhibitors see published tenders (read-only, locked fields filtered at API layer)
 * CREATE POLICY "exhibitors_read_published" ON public.tenders
 *   FOR SELECT USING (status IN ('published', 'bidding'));
 */
