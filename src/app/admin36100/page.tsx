import { CheckCircle2, FileQuestion, LockKeyhole, ShieldCheck, XCircle } from "lucide-react";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth/authorization";
import { getCurrentAppUser } from "@/lib/auth/current-user";
import { getAllowedOrganizationReviewDecisions } from "@/modules/verification/organization-review";
import { listOrganizationReviewQueue } from "@/modules/verification/review-queries";
import { reviewOrganizationAction } from "@/app/admin36100/actions";

const typeLabels = {
  PHARMACY: "Eczane",
  VETERINARY_CLINIC: "Veteriner kliniği",
  VETERINARY_POLYCLINIC: "Veteriner polikliniği",
  ANIMAL_HOSPITAL: "Hayvan hastanesi"
} as const;

const decisionLabels = {
  START_REVIEW: "İncelemeye al",
  REQUEST_ADDITIONAL_DOCUMENT: "Ek belge iste",
  APPROVE: "Onayla",
  REJECT: "Reddet",
  SUSPEND: "Askıya al",
  REOPEN_REVIEW: "Yeniden incele",
  CLOSE: "Kapat"
} as const;

const statusColors = {
  SUBMITTED: "bg-sky-50 text-sky-800",
  UNDER_REVIEW: "bg-amber-50 text-amber-800",
  ADDITIONAL_DOCUMENT_REQUIRED: "bg-orange-50 text-orange-800",
  APPROVED: "bg-emerald-50 text-emerald-800",
  REJECTED: "bg-rose-50 text-rose-800",
  SUSPENDED: "bg-slate-100 text-slate-800",
  DRAFT: "bg-slate-100 text-slate-800",
  CLOSED: "bg-slate-100 text-slate-800"
} as const;

export default async function AdminHomePage() {
  const actor = await getCurrentAppUser();
  const authorization = requireAdmin(actor);

  if (!authorization.allowed) {
    redirect("/giris");
  }

  const reviewRows = await listOrganizationReviewQueue();

  return (
    <main className="min-h-screen bg-[var(--background)]">
      <section className="mx-auto max-w-7xl px-6 py-10 lg:px-8">
        <div className="mb-8 flex flex-col gap-3 border-b border-[var(--line)] pb-6">
          <div className="flex items-center gap-3 text-[var(--primary)]">
            <ShieldCheck aria-hidden="true" size={22} />
            <p className="text-sm font-semibold uppercase tracking-wide">Admin paneli</p>
          </div>
          <h1 className="text-3xl font-bold">Doğrulama incelemeleri</h1>
        </div>

        {reviewRows.length === 0 ? (
          <section className="rounded-md border border-[var(--line)] bg-white p-8 text-center">
            <FileQuestion className="mx-auto text-[var(--muted)]" size={30} />
            <h2 className="mt-3 text-lg font-semibold">İncelenecek başvuru yok</h2>
          </section>
        ) : (
          <div className="overflow-x-auto rounded-md border border-[var(--line)] bg-white">
            <table className="w-full min-w-[980px] border-collapse text-left text-sm">
              <thead className="bg-slate-50 text-[var(--muted)]">
                <tr>
                  <th className="px-4 py-3 font-semibold">İşletme</th>
                  <th className="px-4 py-3 font-semibold">Tür</th>
                  <th className="px-4 py-3 font-semibold">Konum</th>
                  <th className="px-4 py-3 font-semibold">Durum</th>
                  <th className="px-4 py-3 font-semibold">Karar</th>
                </tr>
              </thead>
              <tbody>
                {reviewRows.map((row) => {
                  const decisions = getAllowedOrganizationReviewDecisions(row.status);

                  return (
                    <tr className="border-t border-[var(--line)] align-top" key={row.id}>
                      <td className="px-4 py-4">
                        <div className="font-medium">{row.legalName}</div>
                        <div className="mt-1 text-xs text-[var(--muted)]">{row.publicAlias}</div>
                      </td>
                      <td className="px-4 py-4">{typeLabels[row.type]}</td>
                      <td className="px-4 py-4">
                        {row.province} / {row.district}
                      </td>
                      <td className="px-4 py-4">
                        <span
                          className={`inline-flex items-center gap-2 rounded-md px-2 py-1 text-xs font-semibold ${statusColors[row.status]}`}
                        >
                          <LockKeyhole aria-hidden="true" size={14} />
                          {row.status}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        {decisions.length === 0 ? (
                          <span className="text-sm text-[var(--muted)]">Karar kapalı</span>
                        ) : (
                          <form action={reviewOrganizationAction} className="grid max-w-sm gap-2">
                            <input name="organizationId" type="hidden" value={row.id} />
                            <select
                              className="h-10 rounded-md border border-[var(--line)] bg-white px-3"
                              name="decision"
                              required
                            >
                              {decisions.map((decision) => (
                                <option key={decision} value={decision}>
                                  {decisionLabels[decision]}
                                </option>
                              ))}
                            </select>
                            <textarea
                              className="min-h-20 rounded-md border border-[var(--line)] p-3"
                              minLength={10}
                              name="reason"
                              placeholder="Gerekçe"
                              required
                            />
                            <button
                              className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-[var(--primary)] px-4 font-semibold text-white hover:bg-[var(--primary-strong)]"
                              type="submit"
                            >
                              <CheckCircle2 aria-hidden="true" size={16} />
                              Kaydet
                            </button>
                          </form>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        <div className="mt-5 flex items-center gap-2 text-sm text-[var(--muted)]">
          <XCircle aria-hidden="true" size={16} />
          Her karar audit log üretir; onaylanan işletme için ledger hesabı oluşturulur.
        </div>
      </section>
    </main>
  );
}
