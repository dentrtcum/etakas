import Link from "next/link";
import { PageHeading, EmptyState, StatusBadge, formatValue, formatDate } from "@/components/ui";
import {
  getAccountContext,
  getOwnListings,
  readPage
} from "@/modules/organizations/account-queries";
import { SubmitForm } from "@/components/submit-form";
export default async function ListingsPage({
  searchParams
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const { organization } = await getAccountContext();
  const page = readPage((await searchParams).page);
  const rows = organization ? await getOwnListings(organization.id, page) : [];
  return (
    <main className="page-container">
      <PageHeading
        eyebrow="STOK YÖNETİMİ"
        title="İlanlarım"
        description="İlanlarınızın onay durumunu, kullanılabilir ve rezerve miktarlarını takip edin."
        action={
          organization?.status === "APPROVED" ? (
            <Link href="/ilan-olustur" className="button button-primary">
              + Yeni ilan
            </Link>
          ) : undefined
        }
      />
      {rows.length ? (
        <div className="grid gap-4">
          {rows.slice(0, 20).map((row) => (
            <article className="panel-card" key={row.id}>
              <div className="flex justify-between flex-wrap gap-3">
                <div>
                  <h2 className="panel-title">{row.productName}</h2>
                  <p className="subtext">
                    Barkod: {row.barcode} · SKT: {formatDate(row.expiry)}
                  </p>
                </div>
                <StatusBadge status={row.status} />
              </div>
              <div className="product-details">
                <span>{row.quantity} adet kullanılabilir</span>
                <span>{row.reserved} adet rezerve</span>
                <strong>{formatValue(row.value)} referans / adet</strong>
              </div>
              {row.note && <p className="notice">İnceleme notu: {row.note}</p>}
              {row.status === "CHANGES_REQUESTED" && (
                <SubmitForm
                  endpoint={`/api/listings/${row.id}/resubmit`}
                  label="Düzenleyip yeniden gönder"
                >
                  <div className="form-grid">
                    <label>
                      Ürün adı
                      <input
                        name="productName"
                        required
                        minLength={3}
                        maxLength={240}
                        defaultValue={row.productName}
                      />
                    </label>
                    <label>
                      Son kullanma tarihi
                      <input name="expiryDate" required type="date" defaultValue={row.expiry} />
                    </label>
                    <label>
                      Miktar
                      <input
                        name="quantity"
                        required
                        type="number"
                        min={1}
                        max={100000}
                        defaultValue={row.quantity}
                      />
                    </label>
                    <label>
                      Birim referans değeri (TL)
                      <input
                        name="unitReferenceValue"
                        required
                        type="number"
                        min="0.01"
                        step="0.01"
                        max="1000000"
                        defaultValue={row.value / 100}
                      />
                    </label>
                    <label>
                      Ek belge / görsel
                      <input
                        name="otherDocument"
                        type="file"
                        accept="image/jpeg,image/png,image/webp,application/pdf"
                      />
                    </label>
                  </div>
                </SubmitForm>
              )}
            </article>
          ))}
        </div>
      ) : (
        <EmptyState
          title="Henüz ilan bulunmuyor"
          description="Oluşturduğunuz ilanlar ve inceleme sonuçları burada listelenir."
          href={organization?.status === "APPROVED" ? "/ilan-olustur" : undefined}
          label="Yeni ilan oluştur"
        />
      )}
      <div className="pagination">
        {page > 1 ? (
          <Link href={`?page=${page - 1}`} className="button button-secondary">
            ← Önceki
          </Link>
        ) : (
          <span />
        )}
        <span>Sayfa {page}</span>
        {rows.length > 20 ? (
          <Link href={`?page=${page + 1}`} className="button button-secondary">
            Sonraki →
          </Link>
        ) : (
          <span />
        )}
      </div>
    </main>
  );
}
