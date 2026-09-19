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
import {
  listAdminOrganizations,
  listAdminUsers,
  listProductCatalog
} from "@/modules/admin/user-queries";
import { listAdminSupportTickets } from "@/modules/communications/service";
export const metadata = { title: "Yönetim merkezi", robots: { index: false, follow: false } };
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
  const tab = [
    "organizations",
    "listings",
    "orders",
    "communications",
    "barcodes",
    "users"
  ].includes(params.tab ?? "")
    ? params.tab!
    : "organizations";
  const [orgs, items, orders, accounts, catalog, tickets, organizationOptions] = await Promise.all([
    tab === "organizations" ? listOrganizationReviewQueue(page) : Promise.resolve([]),
    tab === "listings" ? listListingReviewQueue(page) : Promise.resolve([]),
    tab === "orders" ? listAdminOrderQueue(page) : Promise.resolve([]),
    tab === "users" ? listAdminUsers(page) : Promise.resolve([]),
    tab === "barcodes" ? listProductCatalog(page) : Promise.resolve([]),
    tab === "communications" ? listAdminSupportTickets(actor!) : Promise.resolve([]),
    ["communications", "organizations"].includes(tab)
      ? listAdminOrganizations()
      : Promise.resolve([])
  ]);
  const rows =
    tab === "organizations"
      ? orgs
      : tab === "listings"
        ? items
        : tab === "orders"
          ? orders
          : tab === "users"
            ? accounts
            : tab === "barcodes"
              ? catalog
              : tickets;
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
          ["orders", "Sipariş ve itirazlar"],
          ["communications", "Duyuru ve destek"],
          ["barcodes", "Barkod kataloğu"],
          ["users", "Kullanıcı güvenliği"]
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
        {tab === "users" &&
          accounts.slice(0, 20).map((account) => (
            <article className="panel-card" key={account.id}>
              <h2 className="panel-title">{account.name}</h2>
              <p className="subtext">
                {account.email} · {account.superAdmin ? "Süper admin" : "İşletme kullanıcısı"}
              </p>
              <p className="subtext my-4">
                {account.disabledAt
                  ? "Yönetici tarafından kilitli"
                  : account.lockedUntil && account.lockedUntil > new Date()
                    ? "Geçici giriş kilidi"
                    : "Hesap etkin"}{" "}
                · {account.emailVerified ? "E-posta doğrulandı" : "E-posta doğrulaması bekleniyor"}
              </p>
              <div className="grid md:grid-cols-2 gap-5">
                <div>
                  <h3 className="font-semibold mb-2">Parola kurtarma</h3>
                  <p className="subtext mb-3">
                    Bağlantı kullanıcının kayıtlı e-postasına gider. Yeni parolayı kullanıcı
                    belirler.
                  </p>
                  <SubmitForm
                    endpoint="/api/admin/users/password-reset"
                    json
                    values={{ userId: account.id }}
                    label="Yenileme bağlantısı gönder"
                    successMessage="Parola yenileme bağlantısı gönderildi."
                  >
                    <label>
                      İşlem gerekçesi
                      <textarea name="reason" minLength={10} maxLength={1000} required rows={2} />
                    </label>
                  </SubmitForm>
                </div>
                <div>
                  <h3 className="font-semibold mb-2">Erişim yönetimi</h3>
                  <SubmitForm
                    endpoint="/api/admin/users/security"
                    json
                    values={{ userId: account.id }}
                    label="Güvenlik işlemini uygula"
                    successMessage="İşlem uygulandı; mevcut oturumlar sonlandırıldı."
                  >
                    <label>
                      İşlem
                      <select name="action" required>
                        <option value="REVOKE_SESSIONS">Tüm oturumları kapat</option>
                        <option value="UNLOCK">Hesap kilidini kaldır</option>
                        {account.id !== actor?.id && !account.superAdmin && (
                          <option value="LOCK">Hesabı kilitle</option>
                        )}
                      </select>
                    </label>
                    <label>
                      İşlem gerekçesi
                      <textarea name="reason" minLength={10} maxLength={1000} required rows={2} />
                    </label>
                  </SubmitForm>
                </div>
              </div>
            </article>
          ))}
        {tab === "organizations" && (
          <section className="panel-card">
            <h2 className="panel-title">Tüm işletmeler için kredi sınırları</h2>
            <p className="subtext mb-4">
              Onaylı işletmelerin izin verilen en düşük ve en yüksek bakiye sınırlarını güncelleyin.
              Bu işlem işletmelerin mevcut bakiyelerini değiştirmez.
            </p>
            <SubmitForm
              endpoint="/api/admin/credit-limits"
              json
              values={{ applyToAll: true, operation: "SET_LIMITS" }}
              label="Toplu sınırları uygula"
            >
              <div className="form-grid">
                <label>
                  Alt sınır (TL, 0 veya negatif)
                  <input
                    name="lowerLimit"
                    type="number"
                    max={0}
                    min={-1000000}
                    step="0.01"
                    required
                    defaultValue={0}
                  />
                </label>
                <label>
                  Üst sınır (TL, boşsa sınırsız)
                  <input name="upperLimit" type="number" min={0} max={1000000} step="0.01" />
                </label>
              </div>
              <label>
                Gerekçe
                <textarea name="reason" minLength={10} maxLength={2000} required rows={2} />
              </label>
            </SubmitForm>
          </section>
        )}
        {tab === "organizations" &&
          orgs.slice(0, 20).map((row) => {
            const decisions = getAllowedOrganizationReviewDecisions(row.status);
            return (
              <details className="panel-card admin-organization" key={row.id}>
                <summary className="flex justify-between flex-wrap gap-3">
                  <div>
                    <h2 className="panel-title">{row.legalName || row.publicAlias}</h2>
                    <p className="subtext">
                      {organizationTypeLabels[row.type]} · {row.province} / {row.district}
                    </p>
                  </div>
                  <StatusBadge status={row.status} />
                </summary>
                <div className="mt-5 border-t border-[var(--line)] pt-5">
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
                      <dt>GLN numarası</dt>
                      <dd>{row.gln || "Belirtilmemiş"}</dd>
                    </div>
                    <div>
                      <dt>Yetkili kişi</dt>
                      <dd>{row.authorizedPersonName || "Belirtilmemiş"}</dd>
                    </div>
                    <div>
                      <dt>Mevcut kredi</dt>
                      <dd>{formatValue(row.balanceKurus)}</dd>
                    </div>
                    <div>
                      <dt>Alt / üst sınır</dt>
                      <dd>
                        -{formatValue(row.creditLimitKurus)} /{" "}
                        {row.creditUpperLimitKurus === null
                          ? "Sınırsız"
                          : formatValue(row.creditUpperLimitKurus)}
                      </dd>
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
                      <p className="subtext">
                        Belge eklenmemiş. Başvuru belgeleri isteğe bağlıdır.
                      </p>
                    )}
                  </div>
                  <details className="border-t border-[var(--line)] pt-4 my-5">
                    <summary className="text-sm font-semibold">
                      İşletme adı ve GLN bilgisini düzenle
                    </summary>
                    <SubmitForm
                      className="mt-4"
                      endpoint="/api/admin/organizations"
                      json
                      values={{ organizationId: row.id }}
                      label="İşletme bilgilerini güncelle"
                    >
                      <div className="form-grid">
                        <label>
                          Eczane / işletme adı
                          <input
                            name="pharmacyName"
                            defaultValue={row.legalName || row.publicAlias}
                            minLength={3}
                            maxLength={160}
                            required
                          />
                        </label>
                        <label>
                          GLN numarası
                          <input
                            name="gln"
                            defaultValue={row.gln ?? ""}
                            inputMode="numeric"
                            pattern="[0-9]{13}"
                            minLength={13}
                            maxLength={13}
                            required
                          />
                        </label>
                      </div>
                      <label>
                        Gerekçe
                        <textarea name="reason" minLength={10} maxLength={2000} required rows={2} />
                      </label>
                    </SubmitForm>
                  </details>
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
                    <summary className="text-sm font-semibold">
                      Takas kredi sınırlarını yönet
                    </summary>
                    <p className="subtext mt-3">
                      Alt ve üst sınırlar yalnızca hesabın izin verilen bakiye aralığını belirler;
                      mevcut bakiyeye para eklemez veya bakiyeden para düşmez.
                    </p>
                    <SubmitForm
                      className="mt-4"
                      endpoint="/api/admin/credit-limits"
                      json
                      values={{ organizationId: row.id, operation: "SET_LIMITS" }}
                      label="Sınırları güncelle"
                    >
                      <div className="form-grid">
                        <label>
                          Alt sınır (TL, 0 veya negatif)
                          <input
                            type="number"
                            step="0.01"
                            min={-1000000}
                            max={0}
                            name="lowerLimit"
                            required
                            defaultValue={-row.creditLimitKurus / 100}
                          />
                        </label>
                        <label>
                          Üst sınır (TL, boşsa sınırsız)
                          <input
                            type="number"
                            step="0.01"
                            min={0}
                            max={1000000}
                            name="upperLimit"
                            defaultValue={
                              row.creditUpperLimitKurus === null
                                ? ""
                                : row.creditUpperLimitKurus / 100
                            }
                          />
                        </label>
                        <label>
                          Gerekçe
                          <textarea
                            name="reason"
                            minLength={10}
                            maxLength={2000}
                            required
                            rows={2}
                          />
                        </label>
                      </div>
                    </SubmitForm>
                    <SubmitForm
                      className="mt-5"
                      endpoint="/api/admin/credit-limits"
                      json
                      values={{ organizationId: row.id, operation: "ADJUST_BALANCE" }}
                      label="Bakiyeyi güncelle"
                      successMessage="İşletmenin mevcut bakiyesi güncellendi."
                    >
                      <div className="form-grid">
                        <label>
                          Mevcut bakiye değişikliği (TL)
                          <input
                            type="number"
                            step="0.01"
                            min={-1000000}
                            max={1000000}
                            name="balanceDelta"
                            required
                            placeholder="Para eklemek için 1000, düşmek için -1000"
                          />
                          <small>Bu işlem gerçek bakiyeye muhasebe hareketi olarak işlenir.</small>
                        </label>
                        <label>
                          Gerekçe
                          <textarea
                            name="reason"
                            minLength={10}
                            maxLength={2000}
                            required
                            rows={2}
                          />
                        </label>
                      </div>
                    </SubmitForm>
                  </details>
                </div>
              </details>
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
                <details className="border-t border-[var(--line)] pt-4 mb-5">
                  <summary className="text-sm font-semibold">
                    İlan içeriğini ve görsellerini düzenle
                  </summary>
                  <SubmitForm
                    className="mt-4"
                    endpoint="/api/admin/listings"
                    label="İlan değişikliklerini kaydet"
                    successMessage="İlan güncellendi."
                  >
                    <input type="hidden" name="listingId" value={row.id} />
                    <div className="form-grid">
                      <label>
                        İlaç adı
                        <input
                          name="productName"
                          defaultValue={row.productName}
                          minLength={3}
                          maxLength={240}
                          required
                        />
                      </label>
                      <label>
                        Barkod
                        <input
                          name="barcode"
                          defaultValue={row.productGtin}
                          pattern="[0-9]{8,14}"
                          required
                        />
                      </label>
                      <label>
                        Ürün türü
                        <select name="productType" defaultValue={row.productType}>
                          <option value="HUMAN">Beşeri ilaç</option>
                          <option value="VETERINARY">Veteriner ürünü</option>
                        </select>
                      </label>
                      <label>
                        Etken madde
                        <input
                          name="activeIngredient"
                          defaultValue={row.activeIngredient ?? ""}
                          maxLength={240}
                        />
                      </label>
                      <label>
                        Üretici
                        <input
                          name="manufacturer"
                          defaultValue={row.manufacturer ?? ""}
                          maxLength={180}
                        />
                      </label>
                      <label>
                        Doz / güç
                        <input name="strength" defaultValue={row.strength ?? ""} maxLength={120} />
                      </label>
                      <label>
                        Form
                        <input name="form" defaultValue={row.form ?? ""} maxLength={120} />
                      </label>
                      <label>
                        Son kullanma tarihi
                        <input
                          name="expiryDate"
                          type="date"
                          defaultValue={row.minExpiryDate}
                          required
                        />
                      </label>
                      <label>
                        Kullanılabilir miktar
                        <input
                          name="quantityAvailable"
                          type="number"
                          min={0}
                          max={100000}
                          defaultValue={row.quantityAvailable}
                          required
                        />
                      </label>
                      <label>
                        Birim referans değeri (TL)
                        <input
                          name="unitReferenceValue"
                          type="number"
                          min="0.01"
                          max={1000000}
                          step="0.01"
                          defaultValue={row.unitReferenceValueKurus / 100}
                          required
                        />
                      </label>
                      <label>
                        Saklama koşulları
                        <input
                          name="storageConditions"
                          maxLength={500}
                          defaultValue={row.storageConditions ?? ""}
                        />
                      </label>
                      <label>
                        Yeni ürün fotoğrafı <span className="field-optional">İsteğe bağlı</span>
                        <input
                          name="medicineImage"
                          type="file"
                          accept="image/jpeg,image/png,image/webp"
                        />
                      </label>
                      <label>
                        Yeni ambalaj fotoğrafı <span className="field-optional">İsteğe bağlı</span>
                        <input
                          name="packageImage"
                          type="file"
                          accept="image/jpeg,image/png,image/webp"
                        />
                      </label>
                    </div>
                    <label className="check-label">
                      <input name="replaceImages" type="checkbox" value="true" /> Mevcut görselleri
                      yeni yüklenenlerle değiştir
                    </label>
                    <label>
                      Değişiklik gerekçesi
                      <textarea name="reason" minLength={10} maxLength={2000} required rows={2} />
                    </label>
                  </SubmitForm>
                </details>
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
              <details className="panel-card" key={row.id}>
                <summary className="flex justify-between gap-3 flex-wrap">
                  <div>
                    <h2 className="panel-title">
                      {row.productName} · Sipariş {row.id.slice(0, 8)}
                    </h2>
                    <p className="subtext">
                      {formatDate(row.createdAt)} · {row.quantity} adet ·{" "}
                      {formatValue(row.totalReferenceValueKurus)} referans değer
                    </p>
                  </div>
                  <StatusBadge status={row.status} />
                </summary>
                <div className="mt-5 border-t border-[var(--line)] pt-5">
                  <dl className="review-grid">
                    <div>
                      <dt>Sipariş kimliği</dt>
                      <dd>{row.id}</dd>
                    </div>
                    <div>
                      <dt>İlan kimliği</dt>
                      <dd>{row.listingId}</dd>
                    </div>
                    <div>
                      <dt>Parti kimliği</dt>
                      <dd>{row.batchId ?? "Belirtilmemiş"}</dd>
                    </div>
                    <div>
                      <dt>Barkod</dt>
                      <dd>{row.productGtin}</dd>
                    </div>
                    <div>
                      <dt>Ürün türü</dt>
                      <dd>{row.productType === "HUMAN" ? "Beşeri ilaç" : "Veteriner ürünü"}</dd>
                    </div>
                    <div>
                      <dt>Son kullanma tarihi</dt>
                      <dd>{formatDate(row.expiryDate)}</dd>
                    </div>
                    <div>
                      <dt>Birim referans</dt>
                      <dd>
                        {row.unitReferenceValueKurus === null
                          ? "Belirtilmemiş"
                          : formatValue(row.unitReferenceValueKurus)}
                      </dd>
                    </div>
                    <div>
                      <dt>Oluşturulma / güncelleme</dt>
                      <dd>
                        {formatDate(row.createdAt)} / {formatDate(row.updatedAt)}
                      </dd>
                    </div>
                    <div>
                      <dt>Teslim bildirimi</dt>
                      <dd>{row.handoverDeclaredAt ? formatDate(row.handoverDeclaredAt) : "Yok"}</dd>
                    </div>
                    <div>
                      <dt>Tamamlanma</dt>
                      <dd>{row.completedAt ? formatDate(row.completedAt) : "Yok"}</dd>
                    </div>
                    <div>
                      <dt>İptal</dt>
                      <dd>{row.cancelledAt ? formatDate(row.cancelledAt) : "Yok"}</dd>
                    </div>
                    <div>
                      <dt>Otomatik tamamlama</dt>
                      <dd>{row.autoCompleteAfter ? formatDate(row.autoCompleteAfter) : "Yok"}</dd>
                    </div>
                  </dl>
                  <div className="grid lg:grid-cols-2 gap-4 my-5">
                    {[
                      ["ALICI", row.buyer],
                      ["SATICI", row.seller]
                    ].map(([label, party]) => {
                      const contact = party as typeof row.buyer;
                      return (
                        <section
                          className="rounded-xl border border-[var(--line)] p-4"
                          key={label as string}
                        >
                          <p className="eyebrow">{label as string} BİLGİLERİ</p>
                          <h3 className="font-semibold mt-2">
                            {contact?.pharmacyName ?? "Bulunamadı"}
                          </h3>
                          <dl className="review-grid mt-4">
                            <div>
                              <dt>Yetkili</dt>
                              <dd>{contact?.contactName ?? "Belirtilmemiş"}</dd>
                            </div>
                            <div>
                              <dt>Telefon</dt>
                              <dd>{contact?.phone ?? "Belirtilmemiş"}</dd>
                            </div>
                            <div>
                              <dt>E-posta</dt>
                              <dd>{contact?.email ?? "Belirtilmemiş"}</dd>
                            </div>
                            <div>
                              <dt>Konum</dt>
                              <dd>
                                {contact
                                  ? `${contact.province} / ${contact.district}`
                                  : "Belirtilmemiş"}
                              </dd>
                            </div>
                            <div className="md:col-span-2">
                              <dt>Adres</dt>
                              <dd>{contact?.address ?? "Belirtilmemiş"}</dd>
                            </div>
                          </dl>
                        </section>
                      );
                    })}
                  </div>
                  <details className="border-t border-[var(--line)] pt-4 my-5">
                    <summary className="text-sm font-semibold">
                      Teslim kayıtları ve itirazlar
                    </summary>
                    <div className="mt-4 grid gap-3">
                      {row.deliveryConfirmations.map((confirmation) => (
                        <article
                          className="rounded-xl border border-[var(--line)] p-3"
                          key={confirmation.id}
                        >
                          <p className="subtext">
                            Teslim kaydı: {confirmation.kind} · {formatDate(confirmation.createdAt)}
                          </p>
                          <p className="subtext mt-1">
                            İşlemi yapan kullanıcı: {confirmation.actorUserId}
                          </p>
                          {confirmation.note && (
                            <p className="subtext mt-1">Açıklama: {confirmation.note}</p>
                          )}
                        </article>
                      ))}
                      {row.disputes.map((dispute) => (
                        <article className="notice" key={dispute.id}>
                          <strong>İtiraz · {dispute.status}</strong>
                          <p>{dispute.reason}</p>
                          {dispute.resolution && <p>Çözüm: {dispute.resolution}</p>}
                        </article>
                      ))}
                      {!row.deliveryConfirmations.length && !row.disputes.length && (
                        <p className="subtext">Teslim kaydı veya itiraz bulunmuyor.</p>
                      )}
                    </div>
                  </details>
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
                </div>
              </details>
            );
          })}
        {tab === "communications" && (
          <section className="panel-card">
            <h2 className="panel-title">Duyuru gönder</h2>
            <p className="subtext mb-4">
              Duyuru, seçilen kullanıcıların sonraki girişinde bir kez büyük pencere olarak
              gösterilir ve bildirim geçmişinde kalır.
            </p>
            <SubmitForm
              endpoint="/api/admin/announcements"
              json
              label="Duyuruyu gönder"
              successMessage="Duyuru gönderildi."
            >
              <label>
                Alıcı
                <select name="organizationId" defaultValue="">
                  <option value="">Tüm onaylı işletmeler</option>
                  {organizationOptions
                    .filter((item) => item.status === "APPROVED")
                    .map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.name}
                      </option>
                    ))}
                </select>
              </label>
              <label>
                Başlık
                <input name="title" minLength={3} maxLength={180} required />
              </label>
              <label>
                Mesaj
                <textarea name="body" minLength={3} maxLength={4000} rows={5} required />
              </label>
            </SubmitForm>
          </section>
        )}
        {tab === "communications" &&
          tickets.map((ticket) => (
            <details className="panel-card" key={ticket.id}>
              <summary className="flex justify-between gap-3">
                <strong>
                  {ticket.organizationName} · {ticket.kind === "COMPLAINT" ? "Şikayet" : "Talep"}:{" "}
                  {ticket.subject}
                </strong>
                <StatusBadge status={ticket.status} />
              </summary>
              <div className="message-list mt-5">
                {ticket.messages.map((message) => (
                  <article
                    className={message.fromAdmin ? "message-bubble message-own" : "message-bubble"}
                    key={message.id}
                  >
                    <p>{message.body}</p>
                    <small>
                      {message.fromAdmin ? "Yönetici" : ticket.organizationName} ·{" "}
                      {formatDate(message.createdAt)}
                    </small>
                  </article>
                ))}
              </div>
              {ticket.status !== "CLOSED" && (
                <SubmitForm
                  className="mt-5"
                  endpoint="/api/admin/support"
                  json
                  values={{ ticketId: ticket.id }}
                  label="Yanıtı gönder"
                  successMessage="Yanıt kullanıcıya bildirildi."
                >
                  <label>
                    Yanıt
                    <textarea name="body" minLength={1} maxLength={4000} rows={4} required />
                  </label>
                  <label className="check-label">
                    <input name="close" type="checkbox" /> Yanıttan sonra kaydı kapat
                  </label>
                </SubmitForm>
              )}
            </details>
          ))}
        {tab === "barcodes" && (
          <section className="panel-card">
            <h2 className="panel-title">Yeni barkod ekle</h2>
            <SubmitForm
              endpoint="/api/admin/barcodes"
              json
              values={{ action: "UPSERT", isActive: true }}
              label="Kataloğa ekle"
              successMessage="Barkod eklendi."
            >
              <div className="form-grid">
                <label>
                  Barkod / GTIN
                  <input name="gtin" pattern="[0-9]{8,14}" required />
                </label>
                <label>
                  İlaç adı
                  <input name="name" minLength={3} maxLength={240} required />
                </label>
                <label>
                  Tür
                  <select name="type" required>
                    <option value="HUMAN">Beşeri ilaç</option>
                    <option value="VETERINARY">Veteriner ürünü</option>
                  </select>
                </label>
                <label>
                  Etken madde
                  <input name="activeIngredient" maxLength={240} />
                </label>
                <label>
                  Üretici
                  <input name="manufacturer" maxLength={180} />
                </label>
                <label>
                  Doz / güç
                  <input name="strength" maxLength={120} />
                </label>
                <label>
                  Form
                  <input name="form" maxLength={120} />
                </label>
              </div>
            </SubmitForm>
          </section>
        )}
        {tab === "barcodes" &&
          catalog.slice(0, 50).map((product) => (
            <details className="panel-card" key={product.id}>
              <summary className="flex justify-between gap-3">
                <strong>
                  {product.name} · {product.gtin}
                </strong>
                <StatusBadge status={product.isActive ? "ACTIVE" : "REMOVED"} />
              </summary>
              <SubmitForm
                className="mt-5"
                endpoint="/api/admin/barcodes"
                json
                values={{ action: "UPSERT", productId: product.id }}
                label="Barkodu güncelle"
              >
                <div className="form-grid">
                  <label>
                    Barkod / GTIN
                    <input name="gtin" defaultValue={product.gtin} pattern="[0-9]{8,14}" required />
                  </label>
                  <label>
                    İlaç adı
                    <input
                      name="name"
                      defaultValue={product.name}
                      minLength={3}
                      maxLength={240}
                      required
                    />
                  </label>
                  <label>
                    Tür
                    <select name="type" defaultValue={product.type}>
                      <option value="HUMAN">Beşeri ilaç</option>
                      <option value="VETERINARY">Veteriner ürünü</option>
                    </select>
                  </label>
                  <label>
                    Etken madde
                    <input
                      name="activeIngredient"
                      defaultValue={product.activeIngredient ?? ""}
                      maxLength={240}
                    />
                  </label>
                  <label>
                    Üretici
                    <input
                      name="manufacturer"
                      defaultValue={product.manufacturer ?? ""}
                      maxLength={180}
                    />
                  </label>
                  <label>
                    Doz / güç
                    <input name="strength" defaultValue={product.strength ?? ""} maxLength={120} />
                  </label>
                  <label>
                    Form
                    <input name="form" defaultValue={product.form ?? ""} maxLength={120} />
                  </label>
                  <label>
                    Durum
                    <select name="isActive" defaultValue={product.isActive ? "true" : "false"}>
                      <option value="true">Aktif</option>
                      <option value="false">Pasif</option>
                    </select>
                  </label>
                </div>
              </SubmitForm>
              {product.isActive && (
                <SubmitForm
                  className="mt-5"
                  endpoint="/api/admin/barcodes"
                  json
                  values={{ action: "DELETE", productId: product.id }}
                  label="Barkodu devre dışı bırak"
                >
                  <label>
                    Gerekçe
                    <textarea name="reason" minLength={10} maxLength={1000} required rows={2} />
                  </label>
                </SubmitForm>
              )}
            </details>
          ))}
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
