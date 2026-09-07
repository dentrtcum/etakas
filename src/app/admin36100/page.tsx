import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentAppUser } from "@/lib/auth/current-user";
import { requireAdmin } from "@/lib/auth/authorization";
import {
  PageHeading,
  EmptyState,
  StatusBadge,
  formatValue,
  formatDate,
  organizationTypeLabels
} from "@/components/ui";
import { SubmitForm } from "@/components/submit-form";
import { getAllowedOrganizationReviewDecisions } from "@/modules/verification/organization-review";
import { getAllowedListingReviewDecisions } from "@/modules/listings/listing-review";
import { getAllowedAdminOrderDecisions } from "@/modules/orders/order-state";
import { listOrganizationReviewQueue } from "@/modules/verification/review-queries";
import { listListingReviewQueue } from "@/modules/listings/listing-queries";
import { listAdminOrderQueue } from "@/modules/orders/order-queries";
import { readPage } from "@/modules/organizations/account-queries";
const labels: Record<string, string> = {
  START_REVIEW: "İncelemeye al",
  REQUEST_ADDITIONAL_DOCUMENT: "Ek belge iste",
  APPROVE: "Onayla",
  REJECT: "Reddet",
  SUSPEND: "Askıya al",
  REOPEN_REVIEW: "Yeniden incele",
  CLOSE: "Kapat",
  REQUEST_CHANGES: "Düzenleme iste",
  REMOVE: "Yayından kaldır",
  FREEZE: "Dondur",
  CANCEL: "İptal et",
  FORCE_COMPLETE: "Tamamla",
  REFUND_COMPLETED: "İade et"
};
function DecisionFields({ decisions }: { decisions: string[] }) {
  return (
    <div className="form-grid">
      <label>
        Karar
        <select name="decision" required>
          {decisions.map((d) => (
            <option key={d} value={d}>
              {labels[d]}
            </option>
          ))}
        </select>
      </label>
      <label>
        Gerekçe
        <textarea
          name="reason"
          minLength={10}
          maxLength={2000}
          required
          rows={2}
          placeholder="En az 10 karakter"
        />
      </label>
    </div>
  );
}
export default async function AdminPage({
  searchParams
}: {
  searchParams: Promise<{ page?: string; tab?: string }>;
}) {
  const actor = await getCurrentAppUser();
  if (!requireAdmin(actor).allowed) redirect("/giris?next=/admin36100");
  const params = await searchParams;
  const page = readPage(params.page);
  const tab = ["organizations", "listings", "orders"].includes(params.tab ?? "")
    ? params.tab!
    : "organizations";
  const [orgs, items, orders] = await Promise.all([
    tab === "organizations" ? listOrganizationReviewQueue(page) : Promise.resolve([]),
    tab === "listings" ? listListingReviewQueue(page) : Promise.resolve([]),
    tab === "orders" ? listAdminOrderQueue(page) : Promise.resolve([])
  ]);
  const rows = tab === "organizations" ? orgs : tab === "listings" ? items : orders;
  return (
    <main className="page-container">
      <PageHeading
        eyebrow="YÖNETİM MERKEZİ"
        title="İnceleme ve işlemler"
        description="İşletme başvurularını, ilanları ve takas işlemlerini buradan yönetin."
        action={
          <Link href="/panel" className="button button-secondary">
            Hesabıma dön
          </Link>
        }
      />
      <nav className="flex flex-wrap gap-3 mb-7" aria-label="Yönetim bölümleri">
        {[
          ["organizations", "İşletmeler"],
          ["listings", "İlanlar"],
          ["orders", "Sipariş ve itirazlar"]
        ].map(([key, label]) => (
          <Link
            className={`button ${tab === key ? "button-primary" : "button-secondary"}`}
            key={key}
            href={`?tab=${key}`}
          >
            {label}
          </Link>
        ))}
      </nav>
      <div className="grid gap-5">
        {tab === "organizations" &&
          orgs.slice(0, 20).map((row) => {
            const decisions = getAllowedOrganizationReviewDecisions(row.status);
            return (
              <article className="panel-card" key={row.id}>
                <div className="flex justify-between flex-wrap gap-3">
                  <div>
                    <h2 className="panel-title">{row.authorizedPersonName || row.publicAlias}</h2>
                    <p className="subtext">
                      {organizationTypeLabels[row.type]} · {row.province} / {row.district}
                    </p>
                  </div>
                  <StatusBadge status={row.status} />
                </div>
                <dl className="review-grid mt-5">
                  <div>
                    <dt>E-posta</dt>
                    <dd>{row.contactEmail || "Belirtilmemiş"}</dd>
                  </div>
                  <div>
                    <dt>Telefon</dt>
                    <dd>{row.phone || "Belirtilmemiş"}</dd>
                  </div>
                  <div>
                    <dt>T.C. kimlik no</dt>
                    <dd>{row.ownerIdentityNumber || "Belirtilmemiş"}</dd>
                  </div>
                  <div>
                    <dt>Vergi numarası</dt>
                    <dd>{row.taxNumber || "Belirtilmemiş"}</dd>
                  </div>
                  <div className="md:col-span-2">
                    <dt>Açık adres</dt>
                    <dd>{row.address || "Belirtilmemiş"}</dd>
                  </div>
                </dl>
                <div className="my-5">
                  <p className="subtext mb-2">Başvuru belgeleri · {row.documents.length} dosya</p>
                  <div className="flex flex-wrap gap-2">
                    {row.documents.map((doc) => (
                      <a
                        className="button button-secondary text-xs"
                        key={doc.id}
                        href={`/api/documents/organization/${doc.id}`}
                        target="_blank"
                        rel="noreferrer"
                      >
                        {doc.kind.replaceAll("_", " ")} ↗
                      </a>
                    ))}
                  </div>
                  {!row.documents.length && (
                    <p className="subtext">Belge eklenmemiş. Başvuru belgeleri isteğe bağlıdır.</p>
                  )}
                </div>
                {decisions.length > 0 && (
                  <SubmitForm
                    endpoint="/api/admin/organization-reviews"
                    json
                    values={{ organizationId: row.id }}
                    label="Kararı kaydet"
                  >
                    <DecisionFields decisions={decisions} />
                  </SubmitForm>
                )}
                <details className="border-t border-[var(--line)] pt-4 mt-5">
                  <summary className="text-sm font-semibold">Takas kredi limiti</summary>
                  <SubmitForm
                    className="mt-4"
                    endpoint="/api/admin/credit-limits"
                    json
                    values={{ organizationId: row.id }}
                    label="Limiti güncelle"
                  >
                    <div className="form-grid">
                      <label>
                        Kredi limiti (TL)
                        <input
                          type="number"
                          step="0.01"
                          min={0}
                          max={1000000}
                          name="creditLimit"
                          required
                          defaultValue={row.creditLimitKurus / 100}
                        />
                      </label>
                      <label>
                        Gerekçe
                        <textarea name="reason" minLength={10} maxLength={2000} required rows={2} />
                      </label>
                    </div>
                  </SubmitForm>
                </details>
              </article>
            );
          })}
        {tab === "listings" &&
          items.slice(0, 20).map((row) => {
            const decisions = getAllowedListingReviewDecisions(row.status);
            return (
              <article className="panel-card" key={row.id}>
                <div className="flex justify-between gap-3 flex-wrap">
                  <div>
                    <h2 className="panel-title">{row.productName}</h2>
                    <p className="subtext">
                      Barkod {row.productGtin} · {row.sellerPublicAlias} / {row.sellerProvince}
                    </p>
                  </div>
                  <StatusBadge status={row.status} />
                </div>
                <div className="product-details">
                  <span>{row.quantityAvailable} adet</span>
                  <span>{formatValue(row.unitReferenceValueKurus)} / adet</span>
                  <span>SKT {formatDate(row.minExpiryDate)}</span>
                </div>
                <div className="flex flex-wrap gap-2 mb-5">
                  {row.images.map((image, i) => (
                    <a
                      key={image.id}
                      href={`/api/documents/image/${image.id}`}
                      target="_blank"
                      rel="noreferrer"
                      className="button button-secondary"
                    >
                      Görsel {i + 1} ↗
                    </a>
                  ))}
                  {row.documents.map((doc, i) => (
                    <a
                      key={doc.id}
                      href={`/api/documents/listing/${doc.id}`}
                      target="_blank"
                      rel="noreferrer"
                      className="button button-secondary"
                    >
                      Belge {i + 1} ↗
                    </a>
                  ))}
                </div>
                {decisions.length > 0 && (
                  <SubmitForm
                    endpoint="/api/admin/listing-reviews"
                    json
                    values={{ listingId: row.id }}
                    label="Kararı kaydet"
                  >
                    <DecisionFields decisions={decisions} />
                  </SubmitForm>
                )}
              </article>
            );
          })}
        {tab === "orders" &&
          orders.slice(0, 20).map((row) => {
            const decisions = getAllowedAdminOrderDecisions(row.status);
            return (
              <article className="panel-card" key={row.id}>
                <div className="flex justify-between gap-3 flex-wrap">
                  <div>
                    <h2 className="panel-title">Sipariş {row.id.slice(0, 8)}</h2>
                    <p className="subtext">
                      {formatDate(row.createdAt)} · {row.quantity} adet ·{" "}
                      {formatValue(row.totalReferenceValueKurus)} referans değer
                    </p>
                  </div>
                  <StatusBadge status={row.status} />
                </div>
                <p className="subtext my-5">
                  Alıcı: {row.buyerOrganizationId}
                  <br />
                  Satıcı: {row.sellerOrganizationId}
                </p>
                {decisions.length > 0 && (
                  <SubmitForm
                    endpoint="/api/admin/orders"
                    json
                    values={{ orderId: row.id }}
                    label="İşlemi uygula"
                  >
                    <DecisionFields decisions={decisions} />
                  </SubmitForm>
                )}
              </article>
            );
          })}
        {!rows.length && (
          <EmptyState
            title="Bu bölümde kayıt yok"
            description="Yeni başvurular ve işlemler burada görüntülenecek."
          />
        )}
      </div>
      <div className="pagination">
        {page > 1 ? (
          <Link className="button button-secondary" href={`?tab=${tab}&page=${page - 1}`}>
            ← Önceki
          </Link>
        ) : (
          <span />
        )}
        <span>Sayfa {page}</span>
        {rows.length > 20 ? (
          <Link className="button button-secondary" href={`?tab=${tab}&page=${page + 1}`}>
            Sonraki →
          </Link>
        ) : (
          <span />
        )}
      </div>
    </main>
  );
}
