# Admin Guide

The admin panel is mounted under `/admin36100`. The Phase 3 baseline blocks anonymous access; role-enriched admin checks are centralized in `src/lib/auth/authorization.ts` and will be attached to persisted memberships as the review workflow moves from baseline UI to database-backed mutations.

Initial implementation phases establish the secure project, database schema and audit model. Review workflows are added in later phases.

## Organization Review Baseline

Admins review applications through a state machine. Applications move from `SUBMITTED` to `UNDER_REVIEW`, then to `APPROVED`, `REJECTED`, `ADDITIONAL_DOCUMENT_REQUIRED` or `SUSPENDED`. Every decision requires a meaningful reason and must be written to audit logs when persistence is connected.
