# Architecture

## Stack

- Next.js App Router with React Server Components.
- TypeScript strict mode.
- PostgreSQL on a Vercel-compatible provider, preferably Neon.
- Drizzle ORM and Drizzle Kit for schema and migrations.
- Better Auth for authentication.
- Tailwind CSS and accessible component primitives.
- Vitest and Playwright for automated tests.

## Why Drizzle

Drizzle is selected over Prisma because E-Takas relies on explicit database constraints, transactional flows, immutable ledger tables and SQL migrations that should stay close to PostgreSQL semantics.

## Module Boundaries

Domain rules live under `src/modules/*` and data access under `src/lib/db`. React components do not own trading policy, authorization, ledger, stock or legal-mode decisions.

## Phase 2 Domain Baseline

- `TradingPolicyService` starts as a default-deny policy module for high-risk categories and cross-organization medicine visibility.
- `LedgerService` starts with integer kuruş validation and double-entry balancing helpers.
- `InventoryService` starts with quantity conservation and reservation/release helpers.
- Drizzle schema and SQL migration are both checked into the repo so schema intent is reviewable before a live database exists.

## Phase 3 Auth Baseline

- Better Auth is mounted under `/api/auth/[...all]` with Node.js runtime, Drizzle adapter, email/password auth and two-factor plugin support.
- Application authorization is centralized in `src/lib/auth/authorization.ts` and must be reused by server actions, route handlers and admin pages.
- Admin access requires both an admin role and TOTP enrollment; organization users are constrained by organization membership.
- Organization applications are validated through a Zod schema before persistence; audit summaries intentionally omit raw tax, license, address and phone values.

## Listing Baseline

- Inventory listing submission creates a product batch and a `PENDING_REVIEW` listing in one transaction.
- Sensitive lot and invoice fields are encrypted before persistence.
- Admin approval is required before a listing can become `ACTIVE`.
- High-risk categories such as cold-chain, biological and non-standard control categories are blocked by default.

## Order Baseline

- Marketplace listing visibility is server-side and hides human medicines from veterinary organizations.
- Order creation locks the listing, batch and buyer ledger account in one PostgreSQL transaction.
- Balance holds and inventory reservations are created atomically with the order.
- Cancellation releases balance and stock reservations.
- Completion consumes the hold, transfers reserved stock and posts balanced ledger entries.
- Seller delivery declaration moves the order to buyer confirmation; buyer confirmation completes the order.
- There is no timed automatic completion or Vercel Cron dependency.
- Disputes, cancellation, forced completion and completed-order refunds are admin-controlled.
