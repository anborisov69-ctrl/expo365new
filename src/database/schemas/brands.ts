/**
 * @file brands.ts
 * @domain Exhibitor / Brand Entity
 * @description Canonical schema for EXPO 365 Exhibitors (formerly "Suppliers").
 * See /docs/TERMINOLOGY.md for naming conventions.
 *
 * PostgreSQL table: `exhibitors`
 * RLS: Enabled — exhibitors can only mutate their own records.
 */

// ─── Subscription Tier ────────────────────────────────────────────────────────

export type SubscriptionTier = 'basic' | 'pro' | 'premium';

// ─── Exhibitor (Brand) Entity ─────────────────────────────────────────────────

/**
 * Core exhibitor record stored in `public.exhibitors`.
 * All IDs use UUID v4 (`uuid_generate_v4()`).
 */
export interface Exhibitor {
  /** Primary key — UUID v4 */
  id: string;

  /** Display name of the brand/company */
  name: string;

  /** URL-safe slug for public profile routing: /horeca/exhibitors/{slug} */
  slug: string;

  /** Short tagline (max 160 chars) shown on discovery cards */
  tagline: string | null;

  /** Long form description for full profile page */
  description: string | null;

  /** Supabase Storage path to brand logo */
  logo_url: string | null;

  /** Supabase Storage path to hero/cover image */
  cover_image_url: string | null;

  /** Primary product category (e.g. "coffee-equipment", "cleaning") */
  category: string;

  /** ISO 3166-1 alpha-2 country code (e.g. "IT", "RU", "DE") */
  country_code: string;

  /** Active subscription tier — drives feature access */
  subscription_tier: SubscriptionTier;

  /** Whether the exhibitor profile is publicly visible */
  is_active: boolean;

  /** Whether showroom/vitrine listings are enabled for this exhibitor */
  vitrine_enabled: boolean;

  /** Verified badge — manual admin approval */
  is_verified: boolean;

  /** Contact email (not publicly displayed) */
  contact_email: string;

  /** Public website URL */
  website_url: string | null;

  /** ISO 8601 timestamp */
  created_at: string;

  /** ISO 8601 timestamp */
  updated_at: string;
}

// ─── Exhibitor Analytics Snapshot ─────────────────────────────────────────────

/**
 * Aggregated BI metrics per exhibitor.
 * Table: `exhibitor_analytics_snapshots`
 * Populated by the BI Signals Engine (see /src/modules/analytics/).
 */
export interface ExhibitorAnalyticsSnapshot {
  id: string;
  exhibitor_id: string;

  /** 0–100 composite loyalty score */
  loyalty_index: number;

  /** 0.0–1.0 probability of exhibitor disengagement within 30 days */
  churn_risk_score: number;

  /** Total profile views in the snapshot window */
  profile_views: number;

  /** Number of tenders the exhibitor responded to */
  tender_bids_count: number;

  /** Number of accepted bids (won deals) */
  won_deals_count: number;

  /** Snapshot period start — ISO 8601 */
  period_start: string;

  /** Snapshot period end — ISO 8601 */
  period_end: string;

  created_at: string;
}

// ─── Exhibitor Product (Vitrine Item) ─────────────────────────────────────────

/**
 * A product listed by an exhibitor in the EXPO 365 Vitrine.
 * Table: `vitrine_products`
 * NOTE: Legacy table name was `marketplace_products` — use `vitrine_products` for new migrations.
 */
export interface VitrineProduct {
  id: string;
  exhibitor_id: string;

  /** Product name (multilingual — stored as primary locale value) */
  name: string;

  /** Short description (max 300 chars) */
  description: string | null;

  /** Main product image — Supabase Storage path */
  image_url: string | null;

  /** Product category slug */
  category: string;

  /** Price in kopecks/cents (integer to avoid float precision issues) */
  price_minor_units: number;

  /** ISO 4217 currency code */
  currency: 'RUB' | 'EUR' | 'USD';

  /** Minimum order quantity */
  moq: number;

  /** Unit of measure (e.g. "pcs", "kg", "box") */
  unit: string;

  /** Whether this product is currently available for ordering */
  is_available: boolean;

  /** Sort order within exhibitor's vitrine */
  sort_order: number;

  created_at: string;
  updated_at: string;
}

// ─── SQL Reference ────────────────────────────────────────────────────────────

/**
 * @sql
 * CREATE TABLE public.exhibitors (
 *   id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
 *   name              TEXT NOT NULL,
 *   slug              TEXT NOT NULL UNIQUE,
 *   tagline           TEXT,
 *   description       TEXT,
 *   logo_url          TEXT,
 *   cover_image_url   TEXT,
 *   category          TEXT NOT NULL,
 *   country_code      CHAR(2) NOT NULL DEFAULT 'RU',
 *   subscription_tier TEXT NOT NULL DEFAULT 'basic'
 *                     CHECK (subscription_tier IN ('basic', 'pro', 'premium')),
 *   is_active         BOOLEAN NOT NULL DEFAULT true,
 *   vitrine_enabled   BOOLEAN NOT NULL DEFAULT false,
 *   is_verified       BOOLEAN NOT NULL DEFAULT false,
 *   contact_email     TEXT NOT NULL,
 *   website_url       TEXT,
 *   created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
 *   updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
 * );
 *
 * ALTER TABLE public.exhibitors ENABLE ROW LEVEL SECURITY;
 *
 * CREATE POLICY "exhibitors_own_profile" ON public.exhibitors
 *   FOR ALL USING (id = auth.uid());
 *
 * CREATE POLICY "exhibitors_public_read" ON public.exhibitors
 *   FOR SELECT USING (is_active = true);
 */
