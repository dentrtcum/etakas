import {
  Building2,
  CheckCircle2,
  FileQuestion,
  LockKeyhole,
  PackageSearch,
  RotateCcw,
  ShieldCheck
} from "lucide-react";
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
  VETERINARY_CLINIC: "Veteriner klinigi",
  VETERINARY_POLYCLINIC: "Veteriner poliklinigi",
  ANIMAL_HOSPITAL: "Hayvan hastanesi"
} as const;

const decisionLabels = {
  START_REVIEW: "Incelemeye al",
  REQUEST_ADDITIONAL_DOCUMENT: "Ek belge iste",
  APPROVE: "Onayla",
  REJECT: "Reddet",
  SUSPEND: "Askiya al",
  REOPEN_REVIEW: "Yeniden incele",
  CLOSE: "Kapat"
} as const;

const listingDecisionLabels = {
  APPROVE: "Onayla",
  REQUEST_CHANGES: "Degisiklik iste",
  REJECT: "Reddet",
  REMOVE: "Kaldir"
} as const;

const orderDecisionLabels = {
  FREEZE: "Dondur",
  CANCEL: "Iptal/iade et",
  FORCE_COMPLETE: "Zorla tamamla",
  REFUND_COMPLETED: "Tamamlanan islemi iade et"
} as const;

function StatusBadge({ status }: { status: string }) {
  return (
    <span className="inline-flex items-center gap-2 rounded-md bg-amber-50 px-2 py-1 text-xs font-semibold text-amber-800">
      <LockKeyhole aria-hidden="true" size={14} />
      {status}
    </span>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="rounded-md border border-dashed border-[var(--line)] bg-slate-50 p-6 text-center">
      <FileQuestion className="mx-auto text-[var(--muted)]" size={28} />
      <p className="mt-3 text-sm font-medium text-[var(--muted)]">{text}</p>
    </div>
  );
}

export default async function AdminHomePage() {
  const actor = await getCurrentAppUser();
  const authorization = requireAdmin(actor);

  if (!authorization.allowed) {
    redirect("/giris?next=/admin36100");
  }

  const reviewRows = await listOrganizationReviewQueue();
  const listingRows = await listListingReviewQueue();
  const orderRows = await listAdminOrderQueue();

  return (
    <main className="min-h-screen bg-[var(--background)]">
      <section className="mx-auto max-w-7xl px-6 py-10 lg:px-8">
        <div className="mb-8 border-b border-[var(--line)] pb-6">
          <div className="flex items-center gap-3 text-[var(--primary)]">
            <ShieldCheck aria-hidden="true" size={22} />
            <p className="text-sm font-semibold uppercase tracking-wide">Admin</p>
          </div>
          <h1 className="mt-2 text-3xl font-bold">Tek sayfa yonetim merkezi</h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-[var(--muted)]">
            Isletme dogrulama, ilan inceleme, siparis, itiraz ve iade kararlarini bu sayfadaki acilir
            bolumlerden yonetin.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <div className="rounded-md border border-[var(--line)] bg-white p-4">
            <div className="text-sm text-[var(--muted)]">Isletme incelemesi</div>
            <div className="mt-2 text-3xl font-bold">{reviewRows.length}</div>
          </div>
          <div className="rounded-md border border-[var(--line)] bg-white p-4">
            <div className="text-sm text-[var(--muted)]">Ilan incelemesi</div>
            <div className="mt-2 text-3xl font-bold">{listingRows.length}</div>
          </div>
          <div className="rounded-md border border-[var(--line)] bg-white p-4">
            <div className="text-sm text-[var(--muted)]">Siparis / itiraz</div>
            <div className="mt-2 text-3xl font-bold">{orderRows.length}</div>
          </div>
        </div>

        <div className="mt-8 grid gap-4">
          <details className="rounded-md border border-[var(--line)] bg-white p-5" open>
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4">
              <span className="inline-flex items-center gap-3 font-semibold">
                <Building2 aria-hidden="true" size={20} />
                Isletme basvurulari
              </span>
              <span className="rounded-md bg-slate-100 px-2 py-1 text-xs font-semibold">{reviewRows.length}</span>
            </summary>

            <div className="mt-5 grid gap-4">
              {reviewRows.length === 0 ? <EmptyState text="Incelenecek basvuru yok." /> : null}
              {reviewRows.map((row) => {
                const decisions = getAllowedOrganizationReviewDecisions(row.status);

                return (
                  <article className="rounded-md border border-[var(--line)] p-4" key={row.id}>
                    <div className="flex flex-col justify-between gap-3 md:flex-row">
                      <div>
                        <h2 className="font-semibold">{row.legalName}</h2>
                        <p className="mt-1 text-sm text-[var(--muted)]">
                          {typeLabels[row.type]} / {row.province} / {row.district}
                        </p>
                      </div>
                      <StatusBadge status={row.status} />
                    </div>

                    <div className="mt-4 grid gap-3 text-sm md:grid-cols-3">
                      <div>
                        <div className="text-[var(--muted)]">Yetkili</div>
                        <div>{row.authorizedPersonName ?? "Eksik"} / {row.authorizedPersonTitle ?? "Eksik"}</div>
                      </div>
                      <div>
                        <div className="text-[var(--muted)]">Kimlik / ruhsat</div>
                        <div>{row.ownerIdentityNumber ?? "Eksik"} / {row.licenseNumber ?? "Eksik"}</div>
                      </div>
                      <div>
                        <div className="text-[var(--muted)]">Iletisim</div>
                        <div>{row.contactEmail ?? "Eksik"} / {row.phone ?? "Eksik"}</div>
                      </div>
                      <div>
                        <div className="text-[var(--muted)]">Vergi / oda</div>
                        <div>{row.taxNumber ?? "Eksik"} / {row.professionalChamber ?? "Eksik"}</div>
                      </div>
                      <div className="md:col-span-2">
                        <div className="text-[var(--muted)]">Adres</div>
                        <div>{row.address ?? "Eksik"}</div>
                      </div>
                      <div className="md:col-span-3">
                        <div className="text-[var(--muted)]">Belgeler</div>
                        <div>{row.documents.length} belge yuklendi: {row.documents.map((doc) => doc.kind).join(", ") || "Yok"}</div>
                      </div>
                    </div>

                    {decisions.length > 0 ? (
                      <form action={reviewOrganizationAction} className="mt-4 grid gap-3 md:grid-cols-[220px_1fr_150px]">
                        <input name="organizationId" type="hidden" value={row.id} />
                        <select className="h-11 rounded-md border border-[var(--line)] bg-white px-3" name="decision" required>
                          {decisions.map((decision) => (
                            <option key={decision} value={decision}>
                              {decisionLabels[decision]}
                            </option>
                          ))}
                        </select>
                        <textarea
                          className="min-h-11 rounded-md border border-[var(--line)] p-3"
                          minLength={10}
                          name="reason"
                          placeholder="Gerekce"
                          required
                        />
                        <button className="inline-flex h-11 items-center justify-center gap-2 rounded-md bg-[var(--primary)] px-4 font-semibold text-white" type="submit">
                          <CheckCircle2 aria-hidden="true" size={16} />
                          Kaydet
                        </button>
                      </form>
                    ) : null}
                  </article>
                );
              })}
            </div>
          </details>

          <details className="rounded-md border border-[var(--line)] bg-white p-5">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4">
              <span className="inline-flex items-center gap-3 font-semibold">
                <PackageSearch aria-hidden="true" size={20} />
                Ilan incelemeleri
              </span>
              <span className="rounded-md bg-slate-100 px-2 py-1 text-xs font-semibold">{listingRows.length}</span>
            </summary>

            <div className="mt-5 grid gap-4">
              {listingRows.length === 0 ? <EmptyState text="Incelenecek ilan yok." /> : null}
              {listingRows.map((row) => {
                const decisions = getAllowedListingReviewDecisions(row.status);

                return (
                  <article className="rounded-md border border-[var(--line)] p-4" key={row.id}>
                    <div className="flex flex-col justify-between gap-3 md:flex-row">
                      <div>
                        <h2 className="font-semibold">{row.productName}</h2>
                        <p className="mt-1 text-sm text-[var(--muted)]">
                          {row.productType} / GTIN {row.productGtin} / SKT {row.minExpiryDate}
                        </p>
                      </div>
                      <StatusBadge status={row.status} />
                    </div>
                    <div className="mt-4 grid gap-3 text-sm md:grid-cols-4">
                      <div>Satıcı: {row.sellerPublicAlias}</div>
                      <div>Miktar: {row.quantityAvailable}</div>
                      <div>Referans: {row.unitReferenceValueKurus} kr</div>
                      <div>Gorsel: {row.imageCount} / Belge: {row.documents.length}</div>
                    </div>
                    <form action={reviewListingAction} className="mt-4 grid gap-3 md:grid-cols-[220px_1fr_150px]">
                      <input name="listingId" type="hidden" value={row.id} />
                      <select className="h-11 rounded-md border border-[var(--line)] bg-white px-3" name="decision" required>
                        {decisions.map((decision) => (
                          <option key={decision} value={decision}>
                            {listingDecisionLabels[decision]}
                          </option>
                        ))}
                      </select>
                      <textarea className="min-h-11 rounded-md border border-[var(--line)] p-3" minLength={10} name="reason" placeholder="Gerekce" required />
                      <button className="inline-flex h-11 items-center justify-center gap-2 rounded-md bg-[var(--primary)] px-4 font-semibold text-white" type="submit">
                        <CheckCircle2 aria-hidden="true" size={16} />
                        Kaydet
                      </button>
                    </form>
                  </article>
                );
              })}
            </div>
          </details>

          <details className="rounded-md border border-[var(--line)] bg-white p-5">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4">
              <span className="inline-flex items-center gap-3 font-semibold">
                <RotateCcw aria-hidden="true" size={20} />
                Siparis, itiraz ve iade
              </span>
              <span className="rounded-md bg-slate-100 px-2 py-1 text-xs font-semibold">{orderRows.length}</span>
            </summary>

            <div className="mt-5 grid gap-4">
              {orderRows.length === 0 ? <EmptyState text="Incelenecek siparis veya itiraz yok." /> : null}
              {orderRows.map((row) => (
                <article className="rounded-md border border-[var(--line)] p-4" key={row.id}>
                  <div className="flex flex-col justify-between gap-3 md:flex-row">
                    <div>
                      <h2 className="font-semibold">{row.id}</h2>
                      <p className="mt-1 text-sm text-[var(--muted)]">Ilan: {row.listingId}</p>
                    </div>
                    <StatusBadge status={row.status} />
                  </div>
                  <div className="mt-4 grid gap-3 text-sm md:grid-cols-4">
                    <div>Alici: {row.buyerOrganizationId}</div>
                    <div>Satici: {row.sellerOrganizationId}</div>
                    <div>Miktar: {row.quantity}</div>
                    <div>Takas: {row.totalReferenceValueKurus} kr</div>
                  </div>
                  <form action={adminOrderAction} className="mt-4 grid gap-3 md:grid-cols-[260px_1fr_150px]">
                    <input name="orderId" type="hidden" value={row.id} />
                    <select className="h-11 rounded-md border border-[var(--line)] bg-white px-3" name="decision" required>
                      {Object.entries(orderDecisionLabels).map(([decision, label]) => (
                        <option key={decision} value={decision}>
                          {label}
                        </option>
                      ))}
                    </select>
                    <textarea className="min-h-11 rounded-md border border-[var(--line)] p-3" minLength={10} name="reason" placeholder="Gerekce" required />
                    <button className="inline-flex h-11 items-center justify-center gap-2 rounded-md bg-[var(--primary)] px-4 font-semibold text-white" type="submit">
                      <CheckCircle2 aria-hidden="true" size={16} />
                      Kaydet
                    </button>
                  </form>
                </article>
              ))}
            </div>
          </details>
        </div>
      </section>
    </main>
  );
}
