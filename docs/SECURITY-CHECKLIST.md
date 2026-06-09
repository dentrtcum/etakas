# Security Checklist

- [ ] Secrets are stored only in environment variables.
- [ ] Admin TOTP is required in production.
- [x] Auth routes are mounted through Better Auth.
- [x] Admin authorization helper requires TOTP enrollment.
- [ ] Production trading mode is blocked without legal approval.
- [ ] All mutations validate authentication and authorization server-side.
- [ ] Private documents are never exposed through public URLs.
- [ ] PII and serial data are redacted from logs.
- [ ] Ledger and audit records are immutable through the application.
