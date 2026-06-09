# Threat Model

## Assets

- Organization identity, licenses, invoices, tax data, addresses and contact data.
- Medicine catalog, batch, stock and package serial data.
- Ledger, holds, orders, delivery confirmations and dispute evidence.
- Admin decisions, policy settings and audit logs.

## Primary Risks

- IDOR across organizations.
- Frontend-only authorization.
- Double spend of Takas Bakiyesi.
- Overselling reserved stock.
- Public document URL exposure.
- PII or serial leakage through logs, metadata, filenames or client components.
- Unauthorized admin access to `/admin36100`.
- Unsafe production trading without legal approval.

## Baseline Controls

- Server-side RBAC and object authorization.
- Server-only data access layer.
- Immutable audit and ledger records.
- Transactional order, hold and reservation mutations.
- Private object storage with signed access.
- Fail-closed production configuration.
- AES-256-GCM field encryption and keyed hashes for PII and serial duplicate checks.
