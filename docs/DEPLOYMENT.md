# Deployment

E-Takas targets Vercel.

## Required Production Settings

- `DATABASE_URL`
- `AUTH_SECRET`
- `ENCRYPTION_KEY`
- `BLOB_READ_WRITE_TOKEN`
- `CRON_SECRET`
- `FILE_SCANNER_PROVIDER`
- `TRADING_MODE=demo` or `pilot` until legal approval is complete
- `LEGAL_APPROVAL_CONFIRMED=false` unless counsel approval is documented

Production startup must fail closed if required security settings are missing.
