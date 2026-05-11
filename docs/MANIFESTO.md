# EXPO 365 — Design & Engineering Manifesto
> **Version**: 1.0.0 | **Status**: CANONICAL — Source of Truth  
> **Last Updated**: May 2026  
> **Scope**: All UI components, pages, and modules of the EXPO 365 B2B Platform

---

## PREAMBLE

This document is the **single authoritative source** of truth for all design, UX, and engineering decisions on the EXPO 365 platform. Every AI agent, engineer, and contributor **must** read and strictly comply with this manifesto **before** generating or modifying any code.

Deviations from these rules will be treated as critical bugs and reverted without review.

---

## 1. COLOR SYSTEM

### 1.1 Brand Palette (MANDATORY — No Exceptions)

| Token | HEX | Role | Usage |
|---|---|---|---|
| `brand-blue` | `#0B2B5E` | Primary — Stability & Trust | Sidebar bg, headings, icon backgrounds, inactive element borders |
| `brand-orange` | `#F26522` | Action — Energy & Conversion | CTA buttons, active card borders, hover states, alert icons |
| `brand-green` | `#27AE60` | Success — Confirmation & Growth | Success states, completed statuses, positive metrics, deal confirmations |

### 1.2 Registration Points

Colors are registered in **exactly two** locations. Never hardcode hex values in components:

1. [`tailwind.config.ts`](../tailwind.config.ts) → `theme.extend.colors`
2. [`src/app/globals.css`](../src/app/globals.css) → `@theme inline { --color-brand-blue / --color-brand-orange / --color-brand-green }`

### 1.3 Opacity Variants (Card Borders)

All cards use `brand-blue` at **20% opacity** for default borders:
```css
border: 1px solid rgba(11, 43, 94, 0.20);
/* Tailwind equivalent: border-brand-blue/20 */
```

Active/selected states use `brand-orange` at full opacity: `border-brand-orange`.

### 1.4 FORBIDDEN COLORS

The following colors are **strictly prohibited** anywhere in the platform UI:

| Forbidden | Reason |
|---|---|
| `#999999` / `text-gray-400` | Fails WCAG AA contrast (4.5:1) on white backgrounds |
| `#CCCCCC` / `text-gray-300` | Fails WCAG AA contrast — illegible for B2B data-dense UIs |
| Any arbitrary blue hex (e.g. `#1E40AF`) | Must use `brand-blue` token only |
| Any arbitrary orange hex (e.g. `#EA580C`) | Must use `brand-orange` token only |
| Pure black `#000000` on anything except code blocks | Use `brand-blue` for text instead |

---

## 2. BORDER RADIUS SYSTEM

### 2.1 Standard Scale

| Class | Value | Use Case |
|---|---|---|
| `rounded-md` | `6px` | Input fields, small badges, tooltips |
| `rounded-xl` | `12px` | **Minimum** for interactive elements — buttons, tags |
| `rounded-2xl` | `16px` | Standard cards, modals, panels |
| `rounded-3xl` | `24px` | Hero cards, featured sections, primary CTAs |

### 2.2 Rules

- **Minimum border-radius for any interactive element**: `12px` (`rounded-xl`)
- **Maximum for standard cards**: `24px` (`rounded-3xl`)
- **Zero-radius elements are FORBIDDEN** for cards, buttons, and panels
- Sharp corners (`rounded-none`) are allowed only for full-screen backgrounds and dividers

---

## 3. EMOJI POLICY

### TOTAL EMOJI BAN

**Emoji are completely and unconditionally prohibited** across the entire EXPO 365 platform.

This includes but is not limited to:
- Page titles and headings (H1–H6)
- Button labels
- Navigation items (sidebar, breadcrumbs, tabs)
- Card titles and descriptions
- Table cells and data fields
- Alert messages and notifications
- Form labels and placeholder texts
- API response messages rendered in UI
- Metadata (OG tags, page titles)

**Allowed alternatives:**
- Lucide React icons (`import { Icon } from 'lucide-react'`)
- Custom SVG icons stored in `public/assets/icons/`
- CSS decorative elements

**Rationale**: EXPO 365 is a premium B2B platform targeting enterprise HoReCa clients. Emoji undermine credibility, render inconsistently across business environments, and violate the high-end minimalist aesthetic.

---

## 4. TYPOGRAPHY

### 4.1 Font

- **Primary**: Geist Sans (loaded via `next/font/google` in [`src/app/layout.tsx`](../src/app/layout.tsx))
- **Monospace** (code/data): Geist Mono

### 4.2 Hierarchy

| Level | Classes | Use Case |
|---|---|---|
| H1 Landing | `text-4xl sm:text-5xl lg:text-6xl font-bold text-brand-blue tracking-tight` | Landing page hero |
| H1 Dashboard | `text-2xl font-semibold text-brand-blue` | Dashboard page titles |
| H2 Section | `text-xl font-semibold text-brand-blue` | Section headings |
| Body Primary | `text-base text-brand-blue` | Main content text |
| Body Secondary | `text-sm text-brand-blue/65` | Supporting text, labels |
| Caption | `text-xs text-brand-blue/45 tracking-wide` | Metadata, timestamps |

### 4.3 Tone of Voice

- **Forbidden phrases**: "Привет", "Добро пожаловать", "Пока", "Ура", "Отлично"
- **Required tone**: Neutral, professional B2B — direct, informative, authoritative
- **Language**: All user-facing text must support i18n via locale keys (`en` / `ru`)

---

## 5. CONTRAST REQUIREMENTS (WCAG AA+)

All text/background combinations **must pass WCAG AA** (minimum 4.5:1 for normal text):

| Combination | Contrast Ratio | Status |
|---|---|---|
| `#0B2B5E` on `#FFFFFF` | 12.5:1 | PASS |
| `#FFFFFF` on `#0B2B5E` | 12.5:1 | PASS |
| `#FFFFFF` on `#F26522` | 3.12:1 | PASS for large text only |
| `#0B2B5E` on `#F5F5F5` | 11.8:1 | PASS |
| `#27AE60` on `#FFFFFF` | 4.6:1 | PASS |
| `#999999` on `#FFFFFF` | 2.85:1 | **FAIL — PROHIBITED** |
| `#CCCCCC` on `#FFFFFF` | 1.6:1 | **FAIL — PROHIBITED** |

---

## 6. COMPONENT ARCHITECTURE

### 6.1 Card Standard

All cards follow this base structure:

```tsx
// Active card
<div className="rounded-2xl border border-brand-blue/20 bg-white shadow-sm 
                transition-all duration-300
                hover:shadow-[0_8px_40px_rgba(242,101,34,0.15)]
                hover:border-brand-orange/50">
  ...
</div>

// Featured/Hero card
<div className="rounded-3xl border-2 border-brand-orange bg-white/95 
                backdrop-blur-sm p-6 shadow-lg transition-all duration-300
                hover:shadow-[0_8px_40px_rgba(242,101,34,0.28)]
                hover:scale-105 cursor-pointer">
  ...
</div>
```

### 6.2 Button Standard

```tsx
// Primary CTA
<button className="bg-brand-orange text-white hover:bg-brand-orange/90 
                   rounded-2xl px-6 py-3 font-medium transition-colors">
  Action Label
</button>

// Secondary
<button className="border border-brand-blue/20 text-brand-blue 
                   hover:border-brand-orange hover:text-brand-orange 
                   rounded-xl px-4 py-2 transition-colors">
  Secondary Action
</button>
```

### 6.3 Logo Usage

- **Only** allowed source: `public/logo-hero.png`
- Implementation: `<Image src="/logo-hero.png" ... priority />` via `next/image`
- **Prohibited**: SVG interpretations, inline renders, `<img>` tags
- Dashboard size: proportional to `width={160} height={108}`
- Landing size: `width={340} height={230}`, class `object-contain`

---

## 7. BACKGROUND PATTERNS

### 7.1 Blueprint Background

Used on landing pages and hub entrances (`/`, `/horeca`, `/medtech`, etc.):

```css
.blueprint-background {
  background-color: #ffffff;
  background-image:
    linear-gradient(rgba(11, 43, 94, 0.06) 1px, transparent 1px),
    linear-gradient(90deg, rgba(11, 43, 94, 0.06) 1px, transparent 1px);
  background-size: 40px 40px;
}
```

Defined in [`src/app/globals.css`](../src/app/globals.css).

### 7.2 Dashboard Background

- Class: `bg-gray-50` (never blueprint on internal dashboard pages)
- Sidebar: `bg-brand-blue text-white`, width `w-64 shrink-0`

---

## 8. SECURITY & DATABASE

- **RLS (Row Level Security)** is MANDATORY on all Supabase tables — no exceptions
- All primary keys use UUIDs (`uuid_generate_v4()`)
- Multi-tenant isolation is enforced at the database level, never only at the API level
- All migrations stored in [`supabase/migrations/`](../supabase/migrations/)

---

## 9. AI AGENT PROTOCOL

Before any code generation session, all AI agents must:

1. Read this `MANIFESTO.md` in full
2. Read [`TERMINOLOGY.md`](./TERMINOLOGY.md) for correct domain vocabulary
3. Read [`docs/tech-stack.md`](./tech-stack.md) for stack decisions
4. Verify the component being modified does not violate rules in Section 3 (Emoji Ban) and Section 1.4 (Forbidden Colors)

**Drift Check**: If generated code contains `#999`, `#ccc`, `text-gray-400`, `text-gray-300`, or any emoji — it must be rejected and regenerated.

---

## 10. VERSIONING

This manifesto uses semantic versioning. Changes require:
- **Patch**: Clarification, spelling, no behavioral change
- **Minor**: New rule addition, backward-compatible
- **Major**: Breaking change to existing rules (requires team consensus)

All changes must be committed with message: `docs(manifesto): <description>`
