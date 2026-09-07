import Link from "next/link";
import { PageHeading, EmptyState, StatusBadge, formatValue, formatDate } from "@/components/ui";
import { SubmitForm } from "@/components/submit-form";
import { getAccountContext, readPage } from "@/modules/organizations/account-queries";
import { listOrganizationOrders } from "@/modules/orders/order-queries";
export default async function OrdersPage({
  searchParams
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const { actor, organization } = await getAccountContext();
  const page = readPage((await searchParams).page);
  const rows = organization ? await listOrganizationOrders(organization.id, page) : [];
  const canManage = actor.roles.some((role) =>
    ["ORGANIZATION_OWNER", "ORGANIZATION_MANAGER", "ORDER_MANAGER"].includes(role)
  );
  return (
    <main className="page-container">
      <PageHeading
        eyebrow="TAKAS YÖNETİMİ"
        title="Siparişlerim"
        description="Alış ve gönderim işlemlerinizi takip edin. Satıcının teslim bildiriminin ardından alıcı teslimi onaylar."
      />
      {rows.length ? (
        <div className="grid gap-5">
          {rows.slice(0, 20).map((row) => {
            const isBuyer = row.buyerOrganizationId === organization?.id;
            const initial = [
              "RESERVED",
              "CONTACT_DETAILS_REVEALED",
              "SELLER_PREPARING",
              "READY_FOR_PICKUP"
            ].includes(row.status);
            return (
              <article className="panel-card" key={row.id}>
                <div className="flex justify-between flex-wrap gap-4">
                  <div>
                    <p className="eyebrow">
                      {isBuyer ? "ALIŞ" : "GÖNDERİM"} · {row.id.slice(0, 8)}
                    </p>
                    <h2 className="panel-title mt-3">{row.productName}</h2>
                    <p className="subtext">
                      {formatDate(row.createdAt)} · {row.quantity} adet · {formatValue(row.total)}{" "}
                      referans değer
                    </p>
                  </div>
                  <StatusBadge status={row.status} />
                </div>
                {canManage && (
                  <div className="flex flex-wrap gap-4 mt-5">
                    {!isBuyer && initial && (
                      <SubmitForm
                        endpoint={`/api/orders/${row.id}/handover`}
                        json
                        label="Teslim ettiğimi bildir"
                        successMessage="Teslim bildirimi alındı. Alıcı onayı bekleniyor."
                      />
                    )}
                    {isBuyer && row.status === "BUYER_CONFIRMATION_PENDING" && (
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
                {!["CANCELLED", "COMPLETED", "EXPIRED", "DISPUTED", "ADMIN_FROZEN"].includes(
                  row.status
                ) && (
                  <details className="mt-3 border-t border-[var(--line)] pt-4">
                    <summary className="text-xs text-[var(--muted)]">
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
                        <textarea name="reason" required minLength={10} maxLength={2000} rows={3} />
                      </label>
                    </SubmitForm>
                  </details>
                )}
                {["DISPUTED", "ADMIN_FROZEN"].includes(row.status) && (
                  <p className="notice">
                    Bu işlem yönetici incelemesinde. Karar verilene kadar tamamlanamaz.
                  </p>
                )}
              </article>
            );
          })}
        </div>
      ) : (
        <EmptyState
          title="Takas yolculuğunuz burada başlayacak"
          description="Bir ilanı rezerve ettiğinizde veya bir işletme sizden ürün istediğinde siparişleriniz burada görünür."
          href="/pazar-yeri"
          label="Pazar yerini keşfet"
        />
      )}
      <div className="pagination">
        {page > 1 ? <Link href={`?page=${page - 1}`}>← Önceki</Link> : <span />}
        <span>Sayfa {page}</span>
        {rows.length > 20 ? <Link href={`?page=${page + 1}`}>Sonraki →</Link> : <span />}
      </div>
    </main>
  );
}
