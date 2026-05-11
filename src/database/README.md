# /src/database — Schema Definitions & Data Architecture

This directory contains the **canonical data schemas**, TypeScript type definitions, and design-time references for the EXPO 365 PostgreSQL database (hosted on Supabase).

> **Live migrations** are stored in [`/supabase/migrations/`](../../supabase/migrations/).  
> This directory houses the **schema source of truth** — typed interfaces, ERD notes, and seed data.

## Structure

```
/src/database
  /schemas
    /brands.ts        # Exhibitor / Brand entity schema
    /tenders.ts       # Tender lifecycle schema
    /finance.ts       # Finance & banking schema
  /seeds              # Development seed data (non-production)
  /rls                # Row Level Security policy documentation
  README.md
```

## Security Architecture

All tables implement **Row Level Security (RLS)**. This is non-negotiable for multi-tenant isolation.

Policy pattern:
```sql
-- Example: Exhibitors can only see their own tenders
CREATE POLICY "exhibitor_own_tenders" ON tenders
  FOR ALL USING (exhibitor_id = auth.uid());
```

## Domain Ownership

| Schema File | Domain Owner | Related Routes |
|---|---|---|
| `brands.ts` | Exhibitor module | `/horeca/exhibitors/*` |
| `tenders.ts` | Tender Hub module | `/horeca/buyer/dashboard/tenders/*` |
| `finance.ts` | Finance Gateway module | `/horeca/finance/*` |
