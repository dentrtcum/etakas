import Link from "next/link";
import { randomUUID } from "node:crypto";
import { Package, MapPin, Search } from "lucide-react";
import { PageHeading, EmptyState, formatValue, formatDate, StatusBadge } from "@/components/ui";
import { SubmitForm } from "@/components/submit-form";
import { getAccountContext, readPage } from "@/modules/organizations/account-queries";
import { listMarketplaceListingsForOrganization } from "@/modules/marketplace/marketplace-queries";
export default async function MarketplacePage({
  searchParams
}: {
  searchParams: Promise<{ q?: string; page?: string }>;
}) {
  const { actor, organization } = await getAccountContext();
  const params = await searchParams;
  const page = readPage(params.page);
  const q = params.q?.trim().slice(0, 120) || "";
  if (organization?.status !== "APPROVED")
    return (
      <main className="page-container">
        <PageHeading eyebrow="İŞLETMELER ARASI TAKAS" title="Pazar yeri" />
        <EmptyState
          title="İşletme onayı bekleniyor"
          description="İşletmeniz onaylandıktan sonra uygun ilanlar burada görünecek."
          href="/hesabim"
          label="İşletmemi görüntüle"
        />
      </main>
    );
  const rows = await listMarketplaceListingsForOrganization(organization.id, q, page);
  const canOrder = actor.roles.some((role) =>
    ["ORGANIZATION_OWNER", "ORGANIZATION_MANAGER", "ORDER_MANAGER"].includes(role)
  );
  return (
    <main className="page-container">
      <PageHeading
        eyebrow="İŞLETMELER ARASI TAKAS"
        title="Pazar yeri"
        description="İşletmenize uygun ürünleri bulun. Kendi ilanlarınız bu listede gösterilmez."
        action={
          <Link href="/ilan-olustur" className="button button-primary">
            + Yeni ilan
          </Link>
        }
      />
      <form method="get" className="filter-bar">
        <label className="sr-only" htmlFor="product-search">
          Ürün adı veya barkod
        </label>
        <input
          id="product-search"
          type="search"
          name="q"
          defaultValue={q}
          placeholder="Ürün adı veya barkod ile ara…"
        />
        <button className="button button-secondary" type="submit">
          <Search size={16} />
          Ara
        </button>
        {q && (
          <Link href="/pazar-yeri" className="subtext underline">
            Filtreyi temizle
          </Link>
        )}
      </form>
      {rows.length ? (
        <div className="card-grid">
          {rows.slice(0, 12).map((row) => (
            <article className="product-card" key={row.id}>
              <div className="product-symbol">
                <Package size={39} strokeWidth={1.3} />
              </div>
              <div className="product-card-body">
                <StatusBadge status={row.status} />
                <h2>{row.productName}</h2>
                <p className="subtext">Barkod {row.productGtin}</p>
                <p className="subtext flex items-center gap-1 mt-2">
                  <MapPin size={13} />
                  {row.sellerProvince} · {row.sellerPublicAlias}
                </p>
                <div className="product-details">
                  <div>
                    <p className="subtext">Kullanılabilir</p>
                    <strong>{row.quantityAvailable} adet</strong>
                  </div>
                  <div>
                    <p className="subtext">Birim referans</p>
                    <strong>{formatValue(row.unitReferenceValueKurus)}</strong>
                  </div>
                </div>
                <p className="subtext mb-4">SKT: {formatDate(row.minExpiryDate)}</p>
                {canOrder && (
                  <SubmitForm
                    endpoint="/api/orders"
                    label="Takas için rezerve et"
                    json
                    values={{
                      buyerOrganizationId: organization.id,
                      listingId: row.id,
                      idempotencyKey: randomUUID()
                    }}
                    redirectTo="/siparisler"
                  >
                    <label>
                      Miktar
                      <input
                        type="number"
                        min={1}
                        max={row.quantityAvailable}
                        defaultValue={1}
                        required
                        name="quantity"
                      />
                    </label>
                  </SubmitForm>
                )}
              </div>
            </article>
          ))}
        </div>
      ) : (
        <EmptyState
          title={q ? "Aramanıza uygun ilan yok" : "Henüz aktif ilan bulunmuyor"}
          description={
            q
              ? "Farklı bir ürün adı veya barkodla tekrar arayın."
              : "Diğer onaylı işletmeler ilan yayınladığında bu alanda görünecek. Siz de kendi stoklarınızı paylaşabilirsiniz."
          }
          href={q ? "/pazar-yeri" : "/ilan-olustur"}
          label={q ? "Tüm ilanları göster" : "İlan oluştur"}
        />
      )}
      <div className="pagination">
        {page > 1 ? (
          <Link
            className="button button-secondary"
            href={`?q=${encodeURIComponent(q)}&page=${page - 1}`}
          >
            ← Önceki
          </Link>
        ) : (
          <span />
        )}
        <span>Sayfa {page}</span>
        {rows.length > 12 ? (
          <Link
            className="button button-secondary"
            href={`?q=${encodeURIComponent(q)}&page=${page + 1}`}
          >
            Sonraki →
          </Link>
        ) : (
          <span />
        )}
      </div>
    </main>
  );
}
