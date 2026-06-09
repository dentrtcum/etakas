import { CheckCircle2, CircleAlert } from "lucide-react";
import { getSetupStatus } from "@/lib/setup/status";

export const dynamic = "force-dynamic";

function StatusLine({ ok, label }: { ok: boolean; label: string }) {
  const Icon = ok ? CheckCircle2 : CircleAlert;
  return (
    <li className="flex items-center gap-3 border-b border-[var(--line)] py-3 last:border-0">
      <Icon aria-hidden="true" className={ok ? "text-emerald-700" : "text-amber-700"} size={18} />
      <span>{label}</span>
    </li>
  );
}

export default async function SetupPage() {
  const status = await getSetupStatus();

  return (
    <main className="min-h-screen bg-[var(--background)]">
      <section className="mx-auto max-w-4xl px-6 py-10 lg:px-8">
        <div className="mb-8 border-b border-[var(--line)] pb-6">
          <p className="text-sm font-semibold uppercase tracking-wide text-[var(--primary)]">
            Kurulum durumu
          </p>
          <h1 className="mt-2 text-3xl font-bold">E-Takas sistem kontrolü</h1>
        </div>

        <div className="rounded-md border border-[var(--line)] bg-white p-6">
          <ul>
            <StatusLine ok={status.env.databaseUrl} label="DATABASE_URL tanımlı" />
            <StatusLine ok={status.env.authSecret} label="AUTH_SECRET tanımlı" />
            <StatusLine ok={status.env.encryptionKey} label="ENCRYPTION_KEY tanımlı" />
            <StatusLine ok={status.env.cronSecret} label="CRON_SECRET tanımlı" />
            <StatusLine ok={status.database.connected} label="PostgreSQL bağlantısı başarılı" />
            <StatusLine ok={status.database.migrationsApplied} label="Migration tabloları mevcut" />
            <StatusLine ok={status.data.superAdminExists} label="Super admin kullanıcısı mevcut" />
          </ul>

          {status.database.error ? (
            <p className="mt-5 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
              Veritabanı hatası: {status.database.error}
            </p>
          ) : null}

          <div className="mt-6 rounded-md bg-slate-50 p-4 text-sm leading-6 text-[var(--muted)]">
            <p>Production trading mode: {status.env.tradingMode}</p>
            <p>Legal approval confirmed: {String(status.env.legalApprovalConfirmed)}</p>
          </div>
        </div>
      </section>
    </main>
  );
}
