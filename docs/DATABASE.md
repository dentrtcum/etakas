# Database

The database is PostgreSQL. Dates are stored in UTC and displayed in `Europe/Istanbul`.

## Principles

- Ledger entries are append-only.
- Balance is derived from ledger entries, with optional summaries only for performance.
- Stock reservations and balance holds are created in the same transaction as orders.
- Serial and karekod values are encrypted and also stored as keyed hashes for uniqueness checks.
- Constraints prevent negative quantities, invalid statuses and inconsistent order amounts.
