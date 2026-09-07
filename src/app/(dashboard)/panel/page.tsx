import Link from "next/link";
import { Plus, ArrowUpRight } from "lucide-react";
import { PageHeading, StatusBadge, EmptyState, formatValue, formatDate } from "@/components/ui";
import {
  getAccountContext,
  getAccountOverview,
  getOwnListings
} from "@/modules/organizations/account-queries";
import { isAdmin } from "@/lib/auth/roles";
export default async function DashboardPage() {
  const { actor, organization } = await getAccountContext();
  if (!organization)
    return (
      <main className="page-container">
        <PageHeading eyebrow="HESABIM" title="Hoş geldiniz" description={actor.email} />
        <EmptyState
          title={isAdmin(actor) ? "Yönetim alanınız hazır" : "İşletme kaydı bulunamadı"}
          description={
            isAdmin(actor)
              ? "İşletme ve ilan başvurularını yönetim merkezinden inceleyebilirsiniz."
              : "Hesabınızın henüz bir işletme üyeliği bulunmuyor."
          }
          href={isAdmin(actor) ? "/admin36100" : undefined}
          label="Yönetim merkezine git"
        />
      </main>
    );
  const [overview, rows] = await Promise.all([
    getAccountOverview(organization.id),
    getOwnListings(organization.id)
  ]);
  return (
    <main className="page-container">
      <PageHeading
        eyebrow="ÇALIŞMA ALANINIZ"
        title="Genel bakış"
        description={`${actor.email} · ${organization.province} / ${organization.district}`}
        action={
          organization.status === "APPROVED" ? (
            <Link href="/ilan-olustur" className="button button-primary">
              <Plus size={17} />
              Yeni ilan oluştur
            </Link>
          ) : (
            <StatusBadge status={organization.status} />
          )
        }
      />
      {organization.status !== "APPROVED" && (
        <p className="notice">
          İşletme durumunuz: <StatusBadge status={organization.status} />. Başvurunuz onaylandığında
          ilan ve takas işlemleri açılır. Belgelerinizi İşletmem sayfasından tamamlayabilirsiniz.
        </p>
      )}
      <div className="stat-grid">
        {[
          [
            "Kullanılabilir bakiye",
            formatValue(overview.balance - overview.held + organization.creditLimitKurus),
            "Takas referans değeri"
          ],
          ["Rezerve bakiye", formatValue(overview.held), "Devam eden siparişler"],
          ["İlanlarım", overview.listingCount, "Tüm ilan kayıtlarınız"],
          ["Devam eden işlemler", overview.orderCount, "Sipariş ve itirazlar"]
        ].map(([label, value, caption]) => (
          <div className="stat-card" key={label}>
            <small>{label}</small>
            <strong>{value}</strong>
            <em>{caption}</em>
          </div>
        ))}
      </div>
      <div className="grid md:grid-cols-2 gap-4">
        <Link href="/pazar-yeri" className="panel-card flex justify-between gap-4">
          <div>
            <h2 className="panel-title">İhtiyacınız olan ürünlere ulaşın</h2>
            <p className="subtext">İşletmenize uygun aktif ilanları keşfedin.</p>
          </div>
          <ArrowUpRight size={22} />
        </Link>
        <Link href="/siparisler" className="panel-card flex justify-between gap-4">
          <div>
            <h2 className="panel-title">Takas sürecini takip edin</h2>
            <p className="subtext">Rezervasyon ve teslim onaylarını yönetin.</p>
          </div>
          <ArrowUpRight size={22} />
        </Link>
      </div>
      <div className="section-heading">
        <h2>Son ilanlarınız</h2>
        <Link href="/ilanlarim">Tümünü gör →</Link>
      </div>
      {rows.length ? (
        <div className="panel-card table-scroll">
          <table className="data-table">
            <thead>
              <tr>
                <th>ÜRÜN</th>
                <th>STOK</th>
                <th>SON KULLANMA</th>
                <th>DURUM</th>
              </tr>
            </thead>
            <tbody>
              {rows.slice(0, 5).map((row) => (
                <tr key={row.id}>
                  <td>
                    <strong>{row.productName}</strong>
                    <p className="subtext">{row.barcode}</p>
                  </td>
                  <td>{row.quantity} adet</td>
                  <td>{formatDate(row.expiry)}</td>
                  <td>
                    <StatusBadge status={row.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <EmptyState
          title="İlk ilanınız burada görünecek"
          description="Stoklarınızı paylaşmak için barkod ve ürün bilgileriyle yeni bir ilan oluşturun."
          href={organization.status === "APPROVED" ? "/ilan-olustur" : undefined}
          label="İlk ilanı oluştur"
        />
      )}
      {isAdmin(actor) && (
        <Link href="/admin36100" className="button button-secondary mt-6">
          Yönetim merkezine git
        </Link>
      )}
    </main>
  );
}
