# EXPO 365 — Canonical Terminology Reference
> **Version**: 1.0.0 | **Status**: CANONICAL — Source of Truth  
> **Last Updated**: May 2026  
> **Scope**: All UI text, API responses, documentation, marketing copy, and code comments

---

## PREAMBLE

This document defines the **official vocabulary** of the EXPO 365 B2B platform. All AI agents, engineers, copywriters, and product managers **must** use these terms exclusively. Deprecated terms must be replaced immediately upon discovery.

---

## 1. PRODUCT NAME & PLATFORM IDENTITY

| Canonical Term | Deprecated / Forbidden | Context |
|---|---|---|
| **EXPO 365** | "Expo365", "expo365", "expo-365", "Expo" | Brand name — always uppercase with space |
| **EXPO 365 B2B Platform** | "our platform", "the system", "the app" | Full platform name in formal contexts |
| **EXPO 365 HoReCa Hub** | "HoReCa module", "hotel app" | The HoReCa vertical of the platform |

---

## 2. MARKETPLACE MODULE — CRITICAL TERMINOLOGY REPLACEMENT

### OFFICIAL NAME: "EXPO 365 Vitrine" (EN) / "EXPO 365 Витрина" (RU)

The module formerly known as "Marketplace" has been **officially renamed**. This is a strategic brand decision and must be applied universally.

| Canonical Term | Deprecated / Forbidden | Notes |
|---|---|---|
| **EXPO 365 Vitrine** | ~~Marketplace~~ | English UI, API keys, component names |
| **EXPO 365 Showcase** | ~~Marketplace~~ | Alternative English marketing copy |
| **EXPO 365 Витрина** | ~~Маркетплейс~~ | Russian UI and documentation |

#### Scope of Replacement

This replacement applies to:
- All user-facing UI text (labels, headings, descriptions)
- Navigation items (sidebar, breadcrumbs, tabs, menus)
- Page `<title>` and OG meta tags
- API endpoint names and response payloads
- TypeScript type/interface names (`VitrineProduct`, `VitrineItem` — not `MarketplaceProduct`)
- Database table names in new migrations (`vitrine_products` — not `marketplace_products`)
- URL slugs: `/horeca/vitrine` replaces `/horeca/marketplace`
- Component file names: `VitrineClient.tsx` replaces `MarketplaceClient.tsx`
- Code comments and documentation

#### Transition Period

During the codebase migration, existing files with `marketplace` in their names are tolerated but must be refactored in the next sprint. New code must exclusively use `vitrine`.

---

## 3. BUSINESS ROLES

| Canonical Term (EN) | Canonical Term (RU) | Deprecated | Definition |
|---|---|---|---|
| **Buyer** | **Закупщик** | "Client", "Customer", "User" | Enterprise that purchases supplies via tenders |
| **Exhibitor** | **Экспонент** | "Supplier", "Vendor", "Seller" | Brand/company presenting on the platform |
| **Platform Administrator** | **Администратор платформы** | "Admin", "Manager" | EXPO 365 internal operator |
| **Bank Partner** | **Банк-партнёр** | "Financier", "Lender" | Financial institution providing leasing/loans |
| **Invited Expert** | **Приглашённый эксперт** | "Consultant", "Agent" | Third-party verified professional |

---

## 4. CORE MODULES

| Canonical Name (EN) | Canonical Name (RU) | Deprecated | Route |
|---|---|---|---|
| **EXPO 365 Vitrine** | **EXPO 365 Витрина** | Marketplace | `/horeca/vitrine` |
| **Tender Hub** | **Тендерный Хаб** | "Tender module", "Bidding" | `/horeca/buyer/dashboard/tenders` |
| **Finance Gateway** | **Финансовый Шлюз** | "Finance module", "Loans" | `/horeca/finance` |
| **HR Intelligence** | **HR-Интеллект** | "HR module", "Staffing" | `/horeca/hr` (upcoming) |
| **Analytics Command** | **Аналитический Командный Центр** | "Analytics", "Reports" | `/horeca/admin/analytics` |
| **Discovery Feed** | **Лента Открытий** | "Discovery", "Browse" | `/horeca/discovery` |

---

## 5. BUSINESS OBJECTS

| Canonical Term (EN) | Canonical Term (RU) | Deprecated | Definition |
|---|---|---|---|
| **Tender** | **Тендер** | "Request for Quote", "RFQ", "Bid request" | A formal procurement request |
| **Bid** | **Предложение** | "Offer", "Quote", "Response" | An Exhibitor's response to a Tender |
| **Contract Draft** | **Черновик контракта** | "Contract", "Agreement" | Pre-final contract for review |
| **Tripartite Contract** | **Трёхсторонний контракт** | "3-party deal" | Buyer + Exhibitor + Bank agreement |
| **Unlock** | **Разблокировка** | "Access", "View" | Paying to view restricted Tender details |
| **Subscription Tier** | **Уровень подписки** | "Plan", "Package" | Exhibitor subscription level (Basic/Pro/Premium) |
| **Exhibitor Profile** | **Профиль экспонента** | "Company page", "Brand page" | Public-facing brand page on platform |
| **Smart Tender Card** | **Умная карточка тендера** | "Tender card", "Bid card" | AI-enriched tender display component |

---

## 6. SUBSCRIPTION TIERS

| Tier ID | English Name | Russian Name | Level |
|---|---|---|---|
| `basic` | **Basic** | **Базовый** | 1 |
| `pro` | **Pro** | **Профессиональный** | 2 |
| `premium` | **Premium** | **Премиальный** | 3 |

---

## 7. AI & ANALYTICS TERMINOLOGY

| Canonical Term | Deprecated | Definition |
|---|---|---|
| **BI Signal** | "AI tip", "Recommendation" | Predictive analytics insight from the platform AI |
| **Churn Risk Score** | "Churn probability", "Risk score" | AI-calculated probability of supplier disengagement |
| **Loyalty Index** | "Loyalty score", "Engagement rate" | Composite metric of Exhibitor platform engagement |
| **Predictive Alert** | "Warning", "Notification" | System-generated forward-looking advisory |
| **Smart Search** | "Search", "Filter" | Phonetic + layout-aware search for HoReCa products |

---

## 8. TECHNICAL TERMINOLOGY (CODE & DATABASE)

| Canonical Term | Deprecated | Context |
|---|---|---|
| `exhibitor_id` | `supplier_id`, `vendor_id` | Database foreign key |
| `buyer_id` | `client_id`, `customer_id` | Database foreign key |
| `vitrine_products` | `marketplace_products`, `shop_items` | Table name for new migrations |
| `subscription_tier` | `plan`, `package`, `tier_level` | Column name for subscription data |
| `tender_unlock` | `tender_access`, `bid_view` | Feature/table name |
| `bi_signals` | `ai_tips`, `analytics_events` | Module and table name |

---

## 9. COMMUNICATIONS & UI TONE

### English UI Copy Standards

- **Buttons**: Imperative verbs — "Submit Tender", "View Offer", "Unlock Details"
- **Empty states**: "No tenders available yet." (Not "Oops! Nothing here.")
- **Errors**: "This action could not be completed. Please try again." (Not "Something went wrong!")
- **Success**: "Tender submitted successfully." (Not "Done! You're all set.")

### Russian UI Copy Standards

- **Buttons**: "Подать тендер", "Просмотреть предложение", "Открыть детали"
- **Empty states**: "Тендеры пока не добавлены." (Not "Здесь пусто... Пока что!")
- **Errors**: "Действие не удалось. Попробуйте ещё раз."
- **Success**: "Тендер успешно отправлен."

---

## 10. I18N KEY NAMING CONVENTION

All internationalization keys follow this pattern:

```
{module}.{context}.{element}
```

Examples:
```json
{
  "vitrine.product.addToCart": "Add to Cart",
  "tenders.card.unlockDetails": "Unlock Details",
  "analytics.signals.churnRisk": "Churn Risk",
  "common.status.pending": "Pending"
}
```

**Deprecated key patterns** (never use):
- `marketplace.*` — replace with `vitrine.*`
- `supplier.*` — replace with `exhibitor.*`
- `customer.*` — replace with `buyer.*`

---

## CHANGE LOG

| Version | Date | Change |
|---|---|---|
| 1.0.0 | May 2026 | Initial canonical terminology — "Marketplace" → "EXPO 365 Vitrine/Showcase" |
