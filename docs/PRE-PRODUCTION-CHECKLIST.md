# Pre-Production Checklist

- [ ] Legal approval documented.
- [ ] `TRADING_MODE` selected intentionally.
- [ ] Security environment variables configured.
- [ ] Private storage and file scanner configured.
- [ ] `npm run lint` passes.
- [ ] `npm run typecheck` passes.
- [ ] `npm run test` passes.
- [ ] `npm run build` passes.
- [ ] Vercel environment variables are configured.
- [ ] `npm run db:migrate` has been run against production database.
- [ ] Cron endpoint returns 401 without `CRON_SECRET` and 200 with the configured secret.
