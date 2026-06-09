import { redirect } from "next/navigation";
import { getCurrentAppUser } from "@/lib/auth/current-user";
import { listMarketplaceListingsForOrganization } from "@/modules/marketplace/marketplace-queries";

export default async function MarketplacePage({
  searchParams
}: {
  searchParams: Promise<{ organizationId?: string }>;
}) {
  const actor = await getCurrentAppUser();
  const organizationId = (await searchParams).organizationId ?? actor?.organizationIds[0];

  if (!actor) {
    redirect("/giris");
  }

  if (!organizationId) {
    return (
      <main className="min-h-screen bg-[var(--surface)] px-6 py-10">
        <section className="mx-auto max-w-5xl rounded-md border border-[var(--line)] bg-white p-8">
          <h1 className="text-2xl font-bold">Pazar yeri</h1>
          <p className="mt-3 text-[var(--muted)]">Onaylı bir işletme üyeliği bulunamadı.</p>
        </section>
      </main>
    );
  }

  const rows = await listMarketplaceListingsForOrganization(organizationId);

  return (
    <main className="min-h-screen bg-[var(--surface)]">
      <section className="mx-auto max-w-6xl px-6 py-10 lg:px-8">
        <div className="mb-8 border-b border-[var(--line)] pb-6">
          <p className="text-sm font-semibold uppercase tracking-wide text-[var(--primary)]">
            Pazar yeri
          </p>
          <h1 className="mt-2 text-3xl font-bold">Aktif ilanlar</h1>
        </div>
        <div className="grid gap-3">
          {rows.map((row) => (
            <article className="rounded-md border border-[var(--line)] bg-white p-5" key={row.id}>
              <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div>
                  <h2 className="font-semibold">{row.productName}</h2>
                  <p className="mt-1 text-sm text-[var(--muted)]">
                    {row.productType} / GTIN {row.productGtin} / SKT {row.minExpiryDate}
                  </p>
                  <p className="mt-2 text-sm text-[var(--muted)]">
                    {row.sellerPublicAlias} - {row.sellerProvince}
                  </p>
                </div>
                <div className="text-sm">
                  <div>{row.quantityAvailable} adet</div>
                  <div className="font-semibold">{row.unitReferenceValueKurus} kr</div>
                </div>
              </div>
            </article>
          ))}
          {rows.length === 0 ? (
            <div className="rounded-md border border-[var(--line)] bg-white p-8 text-center text-[var(--muted)]">
              Görüntülenebilir aktif ilan yok.
            </div>
          ) : null}
        </div>
      </section>
    </main>
  );
}
