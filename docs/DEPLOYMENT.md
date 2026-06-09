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

## Initial Admin

After migrations, create the first super admin with:

```bash
npm run db:bootstrap-admin
```

The command requires `INITIAL_ADMIN_EMAIL` and `INITIAL_ADMIN_PASSWORD`; do not commit either value.

## Vercel Cron

`vercel.json` schedules `/api/cron/complete-orders` hourly. Configure `CRON_SECRET` in Vercel and send it as `Authorization: Bearer <secret>` for manual runs.
