# /src/backend — Ru Code Business Logic Layer

This directory contains the **server-side business logic** of EXPO 365: API handlers, service integrations, domain rules, and data transformation pipelines.

## Scope

- Next.js Route Handlers (`route.ts`) that contain complex business logic
- Server Actions for form processing and mutations
- Domain services: tender lifecycle, payment flows, subscription management
- External integrations: Supabase RPC calls, AI/ML signal processors
- Middleware: auth guards, rate limiting, RLS enforcement helpers

## Structure

```
/src/backend
  /services         # Domain service modules (tenderService, paymentService, etc.)
  /actions          # Next.js Server Actions (server-only mutations)
  /rpc              # Supabase RPC wrappers with type safety
  /middleware       # Auth, tenant isolation, rate limiting
  /validators       # Zod schemas for input validation
  /integrations     # Third-party API clients (payment gateway, SMS, etc.)
```

## Security Rules (MANDATORY)

- Every Supabase query must operate under an authenticated session with RLS active
- Never expose raw Supabase error messages to client responses
- All user input must pass Zod validation before DB operations
- Multi-tenant isolation: always filter by `exhibitor_id` or `buyer_id` from JWT claims
- No `service_role` key usage in client-accessible code paths

## Relationship to /src/services

`/src/services/` contains the **current** service files (legacy path, keep as-is).  
New services go into `/src/backend/services/` and follow the modular architecture described here.

## Key Domain Modules

| Module | Responsibility |
|---|---|
| Tender Lifecycle | Create → Publish → Bid → Close → Contract |
| Subscription Gate | Tier checks, unlock economics, access control |
| Finance Gateway | Loan/leasing application routing to bank partners |
| BI Signals Engine | Churn risk scoring, loyalty index computation |
| Smart Search | Phonetic normalization, layout-switching (RU/EN keyboard) |
