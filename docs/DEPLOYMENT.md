# EXPO 365 — Vercel Deployment Guide

> **Status:** Production-ready. Build passes with 0 errors, 31 pages generated.  
> **Stack:** Next.js 16.2.4 (App Router, Turbopack) · Supabase · Tailwind CSS v4 · TypeScript

---

## 1. Prerequisites

| Requirement | Details |
|---|---|
| GitHub repository | `expo-365-b2b` (or your fork) |
| Vercel account | [vercel.com](https://vercel.com) — Free tier is sufficient |
| Supabase project | [supabase.com](https://supabase.com) — Free tier is sufficient |
| OpenRouter API key | [openrouter.ai/keys](https://openrouter.ai/keys) — for Smart Search AI |

---

## 2. Environment Variables

Configure in **Vercel Dashboard → Project → Settings → Environment Variables**.

> ⚠️ Never commit `.env.local` to Git. The `.gitignore` already excludes all `.env*` files.

| Variable | Required | Description |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | ✅ | Supabase project URL (`https://xxx.supabase.co`) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ✅ | Supabase anon/public key |
| `OPENROUTER_API_KEY` | ✅ | OpenRouter key for Smart Search (phonetic/layout detection) |

**Where to find Supabase credentials:**  
`Supabase Dashboard → Project → Settings → API → Project URL & anon key`

**NODE_ENV:**  
Vercel sets `NODE_ENV=production` automatically. Do not override it.

---

## 3. Vercel Project Setup

### Step 1: Connect Repository

1. Go to [vercel.com/new](https://vercel.com/new)
2. Click **"Import Git Repository"**
3. Select `expo-365-b2b` from GitHub
4. Authorize Vercel if prompted

### Step 2: Configure Build Settings

| Setting | Value |
|---|---|
| **Framework Preset** | Next.js (auto-detected) |
| **Root Directory** | `.` (project root — not a monorepo) |
| **Build Command** | `npm run build` |
| **Output Directory** | `.next` (auto-detected) |
| **Install Command** | `npm install` |

### Step 3: Add Environment Variables

Before clicking **Deploy**, add all three variables from section 2.

### Step 4: Deploy

Click **"Deploy"** — first build takes ~2 minutes.

---

## 4. Post-Deployment Verification Checklist

### SSL Certificate
- [ ] Visit `https://your-project.vercel.app` — padlock icon must be visible
- [ ] `https://` redirect is automatic on Vercel

### Smart Search (Phonetic / Layout)
- [ ] Navigate to `/horeca/marketplace` or `/horeca/discovery`
- [ ] Type `"espresso"` in the search bar — brands should appear
- [ ] Type `"учакзыщ"` (transliteration of "espresso") — same results expected
- [ ] Verify `GET /api/search/brands` returns 200 in Network tab

### Vibrant Orange Chat Signal
- [ ] Navigate to `/horeca/exhibitors/ooo-test`
- [ ] The orange chat widget (`#F26522`) must appear in the lower-right corner
- [ ] Widget text must be free of emojis (verified in build cleanup)

### Витрина ЭКСПО 365
- [ ] Navigate to `/horeca/marketplace`
- [ ] Page `<h1>` must read **"Витрина ЭКСПО 365"** (not "Маркетплейс товаров")
- [ ] Breadcrumb must show **"Витрина ЭКСПО 365"**
- [ ] Navigation tab in buyer cabinet must show **"Витрина ЭКСПО 365"**

---

## 5. Supabase RLS Configuration

All database tables must have Row Level Security enabled before production traffic.

```sql
-- Verify RLS is enabled on all tables:
SELECT schemaname, tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;
```

Apply migrations in order:
```bash
supabase db push
# or manually run files in supabase/migrations/ in order 001 → 008
```

---

## 6. Custom Domain (Optional)

1. Vercel Dashboard → Project → **Settings → Domains**
2. Add `expo365.ru` (or your domain)
3. Add DNS records as instructed by Vercel
4. SSL certificate is provisioned automatically (Let's Encrypt)

---

## 7. Build Summary

```
Route (app)                              Size
─────────────────────────────────────────────
○ / (Static)
● /horeca/exhibitors/[slug] (SSG)       3 slugs prerendered
● /horeca/finance/[bankSlug] (SSG)      4 slugs prerendered
ƒ /api/tender-unlock (Dynamic)
ƒ /api/tender-close (Dynamic)
ƒ /api/search/brands (Dynamic)
... 31 routes total

Build: ✅ 0 TypeScript errors · 0 ESLint errors
```

---

## 8. Fixed Issues (Pre-deployment Cleanup)

| File | Issue | Fix |
|---|---|---|
| `src/app/api/tender-close/route.ts` | `tender.buyerId` → `tender.buyer_id` | Corrected property name |
| `src/components/showroom/PartnerOfferWidget.tsx` | `paymentTerms?.paymentsCount` on union type | Discriminant narrowing |
| `src/hooks/useCrossRoleSync.ts` | `sync_events` table typed as `never[]` | Cast to `any` (no generated DB types) |
| `src/services/tenderUnlockService.ts` | Supabase client at module level → build crash | Lazy getter pattern |
| `src/services/tenderUnlockService.ts` | `.from('exhibitors')` data typed as `never` | `SupabaseClient<any>` explicit type |
| `src/app/horeca/exhibitors/[slug]/page.tsx` | `useSearchParams()` without Suspense | Wrapped in `<Suspense>` |
| 13 components | Emojis in rendered JSX | Removed all emoji characters |
| 4 UI locations | "Маркетплейс" label in navigation/breadcrumbs | Replaced with "Витрина ЭКСПО 365" |
