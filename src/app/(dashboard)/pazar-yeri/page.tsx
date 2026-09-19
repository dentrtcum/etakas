import Link from "next/link";
import { Package, MapPin, Search } from "lucide-react";
import { PageHeading, EmptyState, formatValue, formatDate, StatusBadge } from "@/components/ui";
import { getAccountContext, readPage } from "@/modules/organizations/account-queries";
import { listMarketplaceListingsForOrganization } from "@/modules/marketplace/marketplace-queries";
import { requireOrganizationAccess } from "@/lib/auth/authorization";
import { isLiveTradingEnabled } from "@/modules/compliance/live-trading";
export default async function MarketplacePage({
  searchParams
}: {
  searchParams: Promise<{
    q?: string;
    page?: string;
    province?: string;
    type?: string;
    minQuantity?: string;
    expiry?: string;
    sort?: string;
  }>;
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
  const province = params.province?.trim().slice(0, 80) || "";
  const productType = ["HUMAN", "VETERINARY"].includes(params.type ?? "")
    ? (params.type as "HUMAN" | "VETERINARY")
    : undefined;
  const minQuantity = Math.max(0, Math.min(100000, Number(params.minQuantity) || 0));
  const expiresWithinDays = [30, 60, 90, 180].includes(Number(params.expiry))
    ? Number(params.expiry)
    : undefined;
  const sort = ["newest", "expiry", "value_asc", "value_desc"].includes(params.sort ?? "")
    ? (params.sort as "newest" | "expiry" | "value_asc" | "value_desc")
    : "newest";
  const rows = await listMarketplaceListingsForOrganization(
    organization.id,
    { search: q, province, productType, minQuantity, expiresWithinDays, sort },
    page
  );
  const pageHref = (nextPage: number) => {
    const query = new URLSearchParams();
    if (q) query.set("q", q);
    if (province) query.set("province", province);
    if (productType) query.set("type", productType);
    if (minQuantity) query.set("minQuantity", String(minQuantity));
    if (expiresWithinDays) query.set("expiry", String(expiresWithinDays));
    if (sort !== "newest") query.set("sort", sort);
    query.set("page", String(nextPage));
    return `/pazar-yeri?${query.toString()}`;
  };
  const tradingEnabled = isLiveTradingEnabled();
  const canList = requireOrganizationAccess(actor, organization.id, [
    "ORGANIZATION_OWNER",
    "ORGANIZATION_MANAGER",
    "INVENTORY_MANAGER"
  ]).allowed;
  return (
    <main className="page-container">
      <PageHeading
        eyebrow="İŞLETMELER ARASI TAKAS"
        title="Pazar yeri"
        description="İşletmenize uygun ürünleri bulun. Kendi ilanlarınız bu listede gösterilmez."
        action={
          canList ? (
            <Link href="/ilan-olustur" className="button button-primary">
              + Yeni ilan
            </Link>
          ) : undefined
        }
      />
      {!tradingEnabled && (
        <p className="notice">
          Platform hazırlık aşamasındadır. Gerçek ürün devri ve sipariş rezervasyonu, gerekli
          kontroller tamamlanana kadar kapalıdır.{" "}
          <Link href="/hukuki/platform-kurallari" className="underline">
            Platform kurallarını inceleyin.
          </Link>
        </p>
      )}
      <details className="panel-card mb-7">
        <summary className="text-sm font-semibold">Arama ve filtreleri göster</summary>
        <form method="get" className="marketplace-filters mt-5">
          <label>
            Ürün veya barkod
            <input
              id="product-search"
              type="search"
              name="q"
              defaultValue={q}
              placeholder="Ürün adı veya barkod"
            />
          </label>
          <label>
            İl
            <input name="province" defaultValue={province} maxLength={80} placeholder="Tümü" />
          </label>
          <label>
            Ürün türü
            <select name="type" defaultValue={productType ?? ""}>
              <option value="">Tümü</option>
              <option value="HUMAN">Beşeri ilaç</option>
              <option value="VETERINARY">Veteriner ürünü</option>
            </select>
          </label>
          <label>
            En az stok
            <input
              name="minQuantity"
              type="number"
              min={0}
              max={100000}
              defaultValue={minQuantity || ""}
            />
          </label>
          <label>
            SKT aralığı
            <select name="expiry" defaultValue={expiresWithinDays ?? ""}>
              <option value="">Tümü</option>
              <option value="30">30 gün içinde</option>
              <option value="60">60 gün içinde</option>
              <option value="90">90 gün içinde</option>
              <option value="180">180 gün içinde</option>
            </select>
          </label>
          <label>
            Sıralama
            <select name="sort" defaultValue={sort}>
              <option value="newest">En yeni</option>
              <option value="expiry">SKT yakın</option>
              <option value="value_asc">Değer artan</option>
              <option value="value_desc">Değer azalan</option>
            </select>
          </label>
          <button className="button button-secondary" type="submit">
            <Search size={16} />
            Filtrele
          </button>
          {(q ||
            province ||
            productType ||
            minQuantity ||
            expiresWithinDays ||
            sort !== "newest") && (
            <Link href="/pazar-yeri" className="subtext underline">
              Filtreyi temizle
            </Link>
          )}
        </form>
      </details>
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
                  <strong>{row.sellerPublicAlias}</strong> · {row.sellerProvince} /{" "}
                  {row.sellerDistrict}
                </p>
                <Link
                  className="text-link text-xs mt-2 inline-block"
                  href={`/mesajlar?to=${row.sellerOrganizationId}`}
                >
                  İşletmeye mesaj gönder
                </Link>
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
                <Link className="button button-primary" href={`/pazar-yeri/${row.id}`}>
                  İlanı ve alım geçmişini incele
                </Link>
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
          href={q ? "/pazar-yeri" : canList ? "/ilan-olustur" : undefined}
          label={q ? "Tüm ilanları göster" : "İlan oluştur"}
        />
      )}
      <div className="pagination">
        {page > 1 ? (
          <Link className="button button-secondary" href={pageHref(page - 1)}>
            ← Önceki
          </Link>
        ) : (
          <span />
        )}
        <span>Sayfa {page}</span>
        {rows.length > 12 ? (
          <Link className="button button-secondary" href={pageHref(page + 1)}>
            Sonraki →
          </Link>
        ) : (
          <span />
        )}
      </div>
    </main>
  );
}
