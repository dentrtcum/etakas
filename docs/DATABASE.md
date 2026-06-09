# Database

The database is PostgreSQL. Dates are stored in UTC and displayed in `Europe/Istanbul`.

## Principles

- Ledger entries are append-only.
- Balance is derived from ledger entries, with optional summaries only for performance.
- Stock reservations and balance holds are created in the same transaction as orders.
- Serial and karekod values are encrypted and also stored as keyed hashes for uniqueness checks.
- Constraints prevent negative quantities, invalid statuses and inconsistent order amounts.
- Production must use a high-entropy encryption secret; encrypted fields are not searchable except through approved keyed hashes.

## Initial Schema

The first migration creates the requested core entities: users, sessions, organizations, memberships, organization documents/reviews, product catalog, batches, package serials, listings, order flow, inventory reservations, balance holds, ledger accounts/transactions/entries, delivery confirmations, disputes, notifications, audit logs, policy/system settings, legal acceptances, login events and admin approvals.

Ledger, audit and transaction rows are protected with database triggers that reject update and delete operations. Application-level corrections must use reversal or compensating transactions.

`user_roles` stores global admin roles separately from `organization_members`, because admin privileges are platform-level and must not depend on a business membership row.

The development seed uses fixed synthetic UUIDs and `onConflictDoNothing()` so it can be rerun without duplicating users, roles, organizations, ledger accounts, catalog products, batches or listings.
