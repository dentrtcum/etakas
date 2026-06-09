import { LockKeyhole, ShieldCheck } from "lucide-react";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth/authorization";
import { getCurrentAppUser } from "@/lib/auth/current-user";

const reviewRows = [
  {
    title: "Sentetik Eczane Ltd.",
    type: "Eczane",
    city: "İstanbul",
    status: "UNDER_REVIEW"
  },
  {
    title: "Sentetik Veteriner Kliniği",
    type: "Veteriner kliniği",
    city: "Ankara",
    status: "SUBMITTED"
  }
];

export default async function AdminHomePage() {
  const actor = await getCurrentAppUser();
  const authorization = requireAdmin(actor);

  if (!authorization.allowed && authorization.reason === "UNAUTHENTICATED") {
    redirect("/giris");
  }

  if (!authorization.allowed) {
    redirect("/giris");
  }

  return (
    <main className="min-h-screen bg-[var(--background)]">
      <section className="mx-auto max-w-6xl px-6 py-10 lg:px-8">
        <div className="mb-8 flex flex-col gap-3 border-b border-[var(--line)] pb-6">
          <div className="flex items-center gap-3 text-[var(--primary)]">
            <ShieldCheck aria-hidden="true" size={22} />
            <p className="text-sm font-semibold uppercase tracking-wide">Admin paneli</p>
          </div>
          <h1 className="text-3xl font-bold">Doğrulama incelemeleri</h1>
        </div>

        <div className="overflow-hidden rounded-md border border-[var(--line)] bg-white">
          <table className="w-full border-collapse text-left text-sm">
            <thead className="bg-slate-50 text-[var(--muted)]">
              <tr>
                <th className="px-4 py-3 font-semibold">İşletme</th>
                <th className="px-4 py-3 font-semibold">Tür</th>
                <th className="px-4 py-3 font-semibold">İl</th>
                <th className="px-4 py-3 font-semibold">Durum</th>
              </tr>
            </thead>
            <tbody>
              {reviewRows.map((row) => (
                <tr className="border-t border-[var(--line)]" key={row.title}>
                  <td className="px-4 py-3 font-medium">{row.title}</td>
                  <td className="px-4 py-3">{row.type}</td>
                  <td className="px-4 py-3">{row.city}</td>
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center gap-2 rounded-md bg-amber-50 px-2 py-1 text-xs font-semibold text-amber-800">
                      <LockKeyhole aria-hidden="true" size={14} />
                      {row.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
