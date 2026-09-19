import { PageHeading, EmptyState, StatusBadge, formatValue, formatDate } from "@/components/ui";
import { SubmitForm } from "@/components/submit-form";
import { getAccountContext } from "@/modules/organizations/account-queries";
import { listOrganizationOrders } from "@/modules/orders/order-queries";
import { requireOrganizationAccess } from "@/lib/auth/authorization";
import { isLiveTradingEnabled } from "@/modules/compliance/live-trading";
import { OPEN_ORDER_STATUSES } from "@/modules/orders/open-statuses";

type OrderParty = {
  pharmacyName: string;
  contactName: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  province: string;
  district: string;
};

function PartyDetails({ title, party }: { title: string; party?: OrderParty }) {
  return (
    <section className="rounded-xl border border-[var(--line)] p-4">
      <p className="eyebrow">{title}</p>
      <h3 className="font-semibold mt-2">{party?.pharmacyName ?? "İşletme bilgisi bulunamadı"}</h3>
      <dl className="review-grid mt-4">
        <div>
          <dt>Yetkili kişi</dt>
          <dd>{party?.contactName ?? "Belirtilmemiş"}</dd>
        </div>
        <div>
          <dt>Telefon</dt>
          <dd>{party?.phone ?? "Belirtilmemiş"}</dd>
        </div>
        <div>
          <dt>E-posta</dt>
          <dd>{party?.email ?? "Belirtilmemiş"}</dd>
        </div>
        <div>
          <dt>İl / ilçe</dt>
          <dd>{party ? `${party.province} / ${party.district}` : "Belirtilmemiş"}</dd>
        </div>
        <div className="md:col-span-2">
          <dt>Açık adres</dt>
          <dd>{party?.address ?? "Belirtilmemiş"}</dd>
        </div>
      </dl>
    </section>
  );
}

export default async function OrdersPage() {
  const { actor, organization } = await getAccountContext();
  const rows = organization ? await listOrganizationOrders(organization.id) : [];
  const activeOrderStatuses = new Set<string>(OPEN_ORDER_STATUSES);
  const activeOrders = rows.filter((row) => activeOrderStatuses.has(row.status));
  const pastOrders = rows.filter((row) => !activeOrderStatuses.has(row.status));
  const canManage = Boolean(
    organization &&
    requireOrganizationAccess(actor, organization.id, [
      "ORGANIZATION_OWNER",
      "ORGANIZATION_MANAGER",
      "ORDER_MANAGER"
    ]).allowed
  );
  const canTransfer = canManage && organization?.status === "APPROVED" && isLiveTradingEnabled();

  function renderOrderCards(sectionOrders: typeof rows) {
    return (
      <div className="grid gap-4 mt-5">
        {sectionOrders.map((row) => {
          const isBuyer = row.buyerOrganizationId === organization?.id;
          const initial = [
            "RESERVED",
            "CONTACT_DETAILS_REVEALED",
            "SELLER_PREPARING",
            "READY_FOR_PICKUP"
          ].includes(row.status);
          return (
            <details className="panel-card" key={row.id}>
              <summary className="flex justify-between flex-wrap gap-4">
                <div>
                  <p className="eyebrow">
                    {isBuyer ? "ALIŞ" : "GÖNDERİM"} · {row.id.slice(0, 8)}
                  </p>
                  <h3 className="panel-title mt-2">{row.productName}</h3>
                  <p className="subtext mt-2">
                    {formatDate(row.createdAt)} · {row.quantity} adet · {formatValue(row.total)}{" "}
                    referans değer
                  </p>
                </div>
                <StatusBadge status={row.status} />
              </summary>
              <div className="mt-5 border-t border-[var(--line)] pt-5">
                <dl className="review-grid mb-5">
                  <div>
                    <dt>Barkod</dt>
                    <dd>{row.productGtin}</dd>
                  </div>
                  <div>
                    <dt>Son kullanma tarihi</dt>
                    <dd>{formatDate(row.expiryDate)}</dd>
                  </div>
                  <div>
                    <dt>Sipariş numarası</dt>
                    <dd>{row.id}</dd>
                  </div>
                  <div>
                    <dt>Son güncelleme</dt>
                    <dd>{formatDate(row.updatedAt)}</dd>
                  </div>
                </dl>
                <div className="grid lg:grid-cols-2 gap-4">
                  <PartyDetails title="ALICI BİLGİLERİ" party={row.buyer} />
                  <PartyDetails title="SATICI BİLGİLERİ" party={row.seller} />
                </div>
                {canManage && (
                  <div className="flex flex-wrap gap-4 mt-5">
                    {canTransfer && !isBuyer && initial && (
                      <SubmitForm
                        endpoint={`/api/orders/${row.id}/handover`}
                        json
                        label="Teslim ettiğimi bildir"
                        successMessage="Teslim bildirimi alındı. Alıcı onayı bekleniyor."
                      />
                    )}
                    {canTransfer && isBuyer && row.status === "BUYER_CONFIRMATION_PENDING" && (
                      <SubmitForm
                        endpoint={`/api/orders/${row.id}/complete`}
                        json
                        label="Teslim aldım, takası tamamla"
                      />
                    )}
                    {isBuyer && initial && (
                      <SubmitForm
                        endpoint={`/api/orders/${row.id}/cancel`}
                        json
                        label="Rezervasyonu iptal et"
                      />
                    )}
                  </div>
                )}
                {canManage &&
                  !["CANCELLED", "COMPLETED", "EXPIRED", "DISPUTED", "ADMIN_FROZEN"].includes(
                    row.status
                  ) && (
                    <details className="mt-5 border-t border-[var(--line)] pt-4">
                      <summary className="text-sm font-semibold">
                        Bir sorun mu var? İtiraz bildir
                      </summary>
                      <SubmitForm
                        className="mt-4"
                        endpoint={`/api/orders/${row.id}/dispute`}
                        json
                        label="İtirazı gönder"
                      >
                        <label>
                          Açıklama
                          <textarea
                            name="reason"
                            required
                            minLength={10}
                            maxLength={2000}
                            rows={3}
                          />
                        </label>
                      </SubmitForm>
                    </details>
                  )}
                {["DISPUTED", "ADMIN_FROZEN"].includes(row.status) && (
                  <p className="notice">
                    Bu işlem yönetici incelemesinde. Karar verilene kadar tamamlanamaz.
                  </p>
                )}
              </div>
            </details>
          );
        })}
      </div>
    );
  }

  return (
    <main className="page-container">
      <PageHeading
        eyebrow="TAKAS YÖNETİMİ"
        title="Siparişlerim"
        description="Devam eden işlemleri ve tamamlanan sipariş geçmişinizi ayrı bölümlerde takip edin. Sipariş ayrıntılarında alıcı ve satıcı iletişim bilgileri yalnızca işlem taraflarına gösterilir."
      />
      {rows.length ? (
        <div className="grid gap-5">
          <details className="panel-card" open>
            <summary className="flex items-center justify-between gap-3">
              <h2 className="panel-title">Devam eden siparişler</h2>
              <span className="status-badge">{activeOrders.length}</span>
            </summary>
            {activeOrders.length ? (
              renderOrderCards(activeOrders)
            ) : (
              <p className="subtext mt-4">Devam eden sipariş bulunmuyor.</p>
            )}
          </details>
          <details className="panel-card">
            <summary className="flex items-center justify-between gap-3">
              <h2 className="panel-title">Geçmiş siparişler</h2>
              <span className="status-badge">{pastOrders.length}</span>
            </summary>
            {pastOrders.length ? (
              renderOrderCards(pastOrders)
            ) : (
              <p className="subtext mt-4">Geçmiş sipariş bulunmuyor.</p>
            )}
          </details>
        </div>
      ) : (
        <EmptyState
          title="Takas yolculuğunuz burada başlayacak"
          description="Bir ilanı rezerve ettiğinizde veya bir işletme sizden ürün istediğinde siparişleriniz burada görünür."
          href="/pazar-yeri"
          label="Pazar yerini keşfet"
        />
      )}
    </main>
  );
}
