import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { randomUUID } from "node:crypto";
import { ArrowLeft, MapPin, Package } from "lucide-react";
import { PageHeading, StatusBadge, formatDate, formatValue } from "@/components/ui";
import { SubmitForm } from "@/components/submit-form";
import { getAccountContext } from "@/modules/organizations/account-queries";
import { getMarketplaceListingForOrganization } from "@/modules/marketplace/marketplace-queries";
import { requireOrganizationAccess } from "@/lib/auth/authorization";
import { isLiveTradingEnabled } from "@/modules/compliance/live-trading";

export default async function MarketplaceListingPage({
  params
}: {
  params: Promise<{ listingId: string }>;
}) {
  const { actor, organization } = await getAccountContext();
  if (!organization || organization.status !== "APPROVED") notFound();
  const { listingId } = await params;
  const listing = await getMarketplaceListingForOrganization(organization.id, listingId);
  if (!listing) notFound();
  const canOrder =
    listing.quantityAvailable > 0 &&
    isLiveTradingEnabled() &&
    requireOrganizationAccess(actor, organization.id, [
      "ORGANIZATION_OWNER",
      "ORGANIZATION_MANAGER",
      "ORDER_MANAGER"
    ]).allowed;

  return (
    <main className="page-container">
      <Link className="text-link inline-flex items-center gap-2 mb-6" href="/pazar-yeri">
        <ArrowLeft size={16} /> Pazar yerine dön
      </Link>
      <PageHeading
        eyebrow="İLAN AYRINTILARI"
        title={listing.productName}
        description={`Barkod ${listing.productGtin} · Son güncelleme ${formatDate(listing.updatedAt)}`}
        action={<StatusBadge status={listing.status} />}
      />
      <div className="grid lg:grid-cols-[1.4fr_0.8fr] gap-6 items-start">
        <section className="grid gap-5">
          <article className="panel-card">
            {listing.images.length ? (
              <div className="grid sm:grid-cols-2 gap-4 mb-6">
                {listing.images.map((image, index) => (
                  <a
                    key={image.id}
                    href={`/api/documents/image/${image.id}`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    <Image
                      className="w-full h-64 rounded-xl border border-[var(--line)] object-contain bg-white"
                      src={`/api/documents/image/${image.id}`}
                      alt={`${listing.productName} görseli ${index + 1}`}
                      width={720}
                      height={520}
                      unoptimized
                    />
                  </a>
                ))}
              </div>
            ) : (
              <div className="product-symbol mb-6">
                <Package size={52} strokeWidth={1.2} />
              </div>
            )}
            <h2 className="panel-title">Ürün ve ilan bilgileri</h2>
            <dl className="review-grid mt-5">
              <div>
                <dt>Kullanılabilir miktar</dt>
                <dd>{listing.quantityAvailable} adet</dd>
              </div>
              <div>
                <dt>Rezerve miktar</dt>
                <dd>{listing.quantityReserved} adet</dd>
              </div>
              <div>
                <dt>Birim referans değeri</dt>
                <dd>{formatValue(listing.unitReferenceValueKurus)}</dd>
              </div>
              <div>
                <dt>Son kullanma tarihi</dt>
                <dd>{formatDate(listing.minExpiryDate)}</dd>
              </div>
              <div>
                <dt>Ürün türü</dt>
                <dd>{listing.productType === "HUMAN" ? "Beşeri ilaç" : "Veteriner ürünü"}</dd>
              </div>
              <div>
                <dt>Etken madde</dt>
                <dd>{listing.activeIngredient ?? "Belirtilmemiş"}</dd>
              </div>
              <div>
                <dt>Üretici</dt>
                <dd>{listing.manufacturer ?? "Belirtilmemiş"}</dd>
              </div>
              <div>
                <dt>Doz / güç</dt>
                <dd>{listing.strength ?? "Belirtilmemiş"}</dd>
              </div>
              <div>
                <dt>Form</dt>
                <dd>{listing.form ?? "Belirtilmemiş"}</dd>
              </div>
              <div>
                <dt>Ambalaj</dt>
                <dd>{listing.packageShape ?? "Belirtilmemiş"}</dd>
              </div>
              <div className="md:col-span-2">
                <dt>Saklama koşulları</dt>
                <dd>{listing.storageConditions ?? "Belirtilmemiş"}</dd>
              </div>
            </dl>
          </article>
          <details className="panel-card" open>
            <summary className="flex items-center justify-between gap-3">
              <h2 className="panel-title">Tamamlanan alımlar</h2>
              <span className="status-badge">{listing.purchases.length}</span>
            </summary>
            <div className="mt-5 border-t border-[var(--line)] pt-5">
              {listing.purchases.length ? (
                <div className="grid gap-3">
                  {listing.purchases.map((purchase) => (
                    <div
                      className="flex justify-between gap-4 rounded-xl border border-[var(--line)] p-4"
                      key={purchase.orderId}
                    >
                      <div>
                        <strong>{purchase.buyerName}</strong>
                        <p className="subtext mt-1">
                          {purchase.completedAt ? formatDate(purchase.completedAt) : "Tamamlandı"}
                        </p>
                      </div>
                      <strong>{purchase.quantity} adet</strong>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="subtext">Bu ilandan henüz tamamlanmış bir alım bulunmuyor.</p>
              )}
            </div>
          </details>
        </section>
        <aside className="grid gap-5 lg:sticky lg:top-24">
          <section className="panel-card">
            <p className="eyebrow">İLAN SAHİBİ</p>
            <h2 className="panel-title mt-3">{listing.sellerPublicAlias}</h2>
            <p className="subtext flex items-center gap-2 mt-3">
              <MapPin size={15} /> {listing.sellerProvince} / {listing.sellerDistrict}
            </p>
            <Link
              className="button button-secondary mt-5"
              href={`/mesajlar?to=${listing.sellerOrganizationId}`}
            >
              İşletmeye mesaj gönder
            </Link>
          </section>
          <section className="panel-card">
            <h2 className="panel-title">Takas talebi</h2>
            {canOrder ? (
              <SubmitForm
                className="mt-5"
                endpoint="/api/orders"
                label="Takas için rezerve et"
                json
                values={{
                  buyerOrganizationId: organization.id,
                  listingId: listing.id,
                  idempotencyKey: randomUUID()
                }}
                redirectTo="/siparisler"
              >
                <label>
                  Miktar
                  <input
                    type="number"
                    min={1}
                    max={listing.quantityAvailable}
                    defaultValue={1}
                    required
                    name="quantity"
                  />
                </label>
              </SubmitForm>
            ) : (
              <p className="subtext mt-3">Bu ilan şu anda rezervasyona uygun değil.</p>
            )}
          </section>
        </aside>
      </div>
    </main>
  );
}
