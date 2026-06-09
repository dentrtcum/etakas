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
