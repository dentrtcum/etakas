import { CheckCircle2, FileQuestion, LockKeyhole, PackageSearch, RotateCcw, ShieldCheck, XCircle } from "lucide-react";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth/authorization";
import { getCurrentAppUser } from "@/lib/auth/current-user";
import { getAllowedListingReviewDecisions } from "@/modules/listings/listing-review";
import { listListingReviewQueue } from "@/modules/listings/listing-queries";
import { listAdminOrderQueue } from "@/modules/orders/order-queries";
import { getAllowedOrganizationReviewDecisions } from "@/modules/verification/organization-review";
import { listOrganizationReviewQueue } from "@/modules/verification/review-queries";
import { reviewOrganizationAction } from "@/app/admin36100/actions";
import { reviewListingAction } from "@/app/admin36100/listing-actions";
import { adminOrderAction } from "@/app/admin36100/order-actions";

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

const listingDecisionLabels = {
  APPROVE: "Onayla",
  REQUEST_CHANGES: "Değişiklik iste",
  REJECT: "Reddet",
  REMOVE: "Kaldır"
} as const;

const orderDecisionLabels = {
  FREEZE: "Dondur",
  CANCEL: "İptal/iade et",
  FORCE_COMPLETE: "Zorla tamamla",
  REFUND_COMPLETED: "Tamamlanan işlemi iade et"
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
  const listingRows = await listListingReviewQueue();
  const orderRows = await listAdminOrderQueue();

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

        <div className="mt-12 mb-8 flex flex-col gap-3 border-b border-[var(--line)] pb-6">
          <div className="flex items-center gap-3 text-[var(--primary)]">
            <PackageSearch aria-hidden="true" size={22} />
            <p className="text-sm font-semibold uppercase tracking-wide">İlan inceleme</p>
          </div>
          <h2 className="text-2xl font-bold">Onay bekleyen ilanlar</h2>
        </div>

        {listingRows.length === 0 ? (
          <section className="rounded-md border border-[var(--line)] bg-white p-8 text-center">
            <FileQuestion className="mx-auto text-[var(--muted)]" size={30} />
            <h3 className="mt-3 text-lg font-semibold">İncelenecek ilan yok</h3>
          </section>
        ) : (
          <div className="overflow-x-auto rounded-md border border-[var(--line)] bg-white">
            <table className="w-full min-w-[1080px] border-collapse text-left text-sm">
              <thead className="bg-slate-50 text-[var(--muted)]">
                <tr>
                  <th className="px-4 py-3 font-semibold">Ürün</th>
                  <th className="px-4 py-3 font-semibold">Satıcı</th>
                  <th className="px-4 py-3 font-semibold">Miktar</th>
                  <th className="px-4 py-3 font-semibold">Referans değer</th>
                  <th className="px-4 py-3 font-semibold">Durum</th>
                  <th className="px-4 py-3 font-semibold">Karar</th>
                </tr>
              </thead>
              <tbody>
                {listingRows.map((row) => {
                  const decisions = getAllowedListingReviewDecisions(row.status);

                  return (
                    <tr className="border-t border-[var(--line)] align-top" key={row.id}>
                      <td className="px-4 py-4">
                        <div className="font-medium">{row.productName}</div>
                        <div className="mt-1 text-xs text-[var(--muted)]">
                          {row.productType} / GTIN {row.productGtin} / SKT {row.minExpiryDate}
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <div>{row.sellerPublicAlias}</div>
                        <div className="mt-1 text-xs text-[var(--muted)]">
                          {row.sellerProvince} / {row.sellerDistrict}
                        </div>
                      </td>
                      <td className="px-4 py-4">{row.quantityAvailable}</td>
                      <td className="px-4 py-4">{row.unitReferenceValueKurus} kr</td>
                      <td className="px-4 py-4">
                        <span className="inline-flex items-center gap-2 rounded-md bg-amber-50 px-2 py-1 text-xs font-semibold text-amber-800">
                          <LockKeyhole aria-hidden="true" size={14} />
                          {row.status}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        <form action={reviewListingAction} className="grid max-w-sm gap-2">
                          <input name="listingId" type="hidden" value={row.id} />
                          <select
                            className="h-10 rounded-md border border-[var(--line)] bg-white px-3"
                            name="decision"
                            required
                          >
                            {decisions.map((decision) => (
                              <option key={decision} value={decision}>
                                {listingDecisionLabels[decision]}
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
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        <div className="mt-12 mb-8 flex flex-col gap-3 border-b border-[var(--line)] pb-6">
          <div className="flex items-center gap-3 text-[var(--primary)]">
            <RotateCcw aria-hidden="true" size={22} />
            <p className="text-sm font-semibold uppercase tracking-wide">Sipariş / itiraz / iade</p>
          </div>
          <h2 className="text-2xl font-bold">Admin kontrollü sipariş işlemleri</h2>
        </div>

        {orderRows.length === 0 ? (
          <section className="rounded-md border border-[var(--line)] bg-white p-8 text-center">
            <FileQuestion className="mx-auto text-[var(--muted)]" size={30} />
            <h3 className="mt-3 text-lg font-semibold">İncelenecek sipariş yok</h3>
          </section>
        ) : (
          <div className="overflow-x-auto rounded-md border border-[var(--line)] bg-white">
            <table className="w-full min-w-[1120px] border-collapse text-left text-sm">
              <thead className="bg-slate-50 text-[var(--muted)]">
                <tr>
                  <th className="px-4 py-3 font-semibold">Sipariş</th>
                  <th className="px-4 py-3 font-semibold">Taraflar</th>
                  <th className="px-4 py-3 font-semibold">Miktar</th>
                  <th className="px-4 py-3 font-semibold">Takas değeri</th>
                  <th className="px-4 py-3 font-semibold">Durum</th>
                  <th className="px-4 py-3 font-semibold">Admin kararı</th>
                </tr>
              </thead>
              <tbody>
                {orderRows.map((row) => (
                  <tr className="border-t border-[var(--line)] align-top" key={row.id}>
                    <td className="px-4 py-4">
                      <div className="font-medium">{row.id}</div>
                      <div className="mt-1 text-xs text-[var(--muted)]">İlan: {row.listingId}</div>
                    </td>
                    <td className="px-4 py-4 text-xs">
                      <div>Alıcı: {row.buyerOrganizationId}</div>
                      <div className="mt-1">Satıcı: {row.sellerOrganizationId}</div>
                    </td>
                    <td className="px-4 py-4">{row.quantity}</td>
                    <td className="px-4 py-4">{row.totalReferenceValueKurus} kr</td>
                    <td className="px-4 py-4">
                      <span className="inline-flex items-center gap-2 rounded-md bg-amber-50 px-2 py-1 text-xs font-semibold text-amber-800">
                        <LockKeyhole aria-hidden="true" size={14} />
                        {row.status}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <form action={adminOrderAction} className="grid max-w-sm gap-2">
                        <input name="orderId" type="hidden" value={row.id} />
                        <select className="h-10 rounded-md border border-[var(--line)] bg-white px-3" name="decision" required>
                          {Object.entries(orderDecisionLabels).map(([decision, label]) => (
                            <option key={decision} value={decision}>
                              {label}
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
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  );
}
