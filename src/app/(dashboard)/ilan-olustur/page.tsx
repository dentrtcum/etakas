import { redirect } from "next/navigation";
import { getCurrentAppUser } from "@/lib/auth/current-user";

export default async function CreateListingPage() {
  const actor = await getCurrentAppUser();

  if (!actor) {
    redirect("/giris");
  }

  return (
    <main className="min-h-screen bg-[var(--surface)]">
      <section className="mx-auto max-w-5xl px-6 py-10 lg:px-8">
        <div className="mb-8 flex flex-col gap-3 border-b border-[var(--line)] pb-6">
          <p className="text-sm font-semibold uppercase tracking-wide text-[var(--primary)]">
            İlan oluşturma
          </p>
          <h1 className="text-3xl font-bold">Stoktan ilana gönder</h1>
        </div>

        <form className="grid gap-5" action="/api/listings" method="post">
          <div className="grid gap-5 md:grid-cols-2">
            <label className="grid gap-2">
              <span className="text-sm font-medium">İşletme ID</span>
              <input
                className="h-11 rounded-md border border-[var(--line)] bg-white px-3"
                name="organizationId"
                placeholder="UUID"
                required
              />
            </label>
            <label className="grid gap-2">
              <span className="text-sm font-medium">Ürün ID</span>
              <input
                className="h-11 rounded-md border border-[var(--line)] bg-white px-3"
                name="productId"
                placeholder="UUID"
                required
              />
            </label>
            <label className="grid gap-2">
              <span className="text-sm font-medium">Lot/parti no</span>
              <input className="h-11 rounded-md border border-[var(--line)] bg-white px-3" name="lotNumber" required />
            </label>
            <label className="grid gap-2">
              <span className="text-sm font-medium">Son kullanma tarihi</span>
              <input className="h-11 rounded-md border border-[var(--line)] bg-white px-3" name="expiryDate" required type="date" />
            </label>
            <label className="grid gap-2">
              <span className="text-sm font-medium">Fatura tarihi</span>
              <input className="h-11 rounded-md border border-[var(--line)] bg-white px-3" name="invoiceDate" type="date" />
            </label>
            <label className="grid gap-2">
              <span className="text-sm font-medium">Fatura no</span>
              <input className="h-11 rounded-md border border-[var(--line)] bg-white px-3" name="invoiceNumber" />
            </label>
            <label className="grid gap-2">
              <span className="text-sm font-medium">Miktar</span>
              <input className="h-11 rounded-md border border-[var(--line)] bg-white px-3" min={1} name="quantity" required type="number" />
            </label>
            <label className="grid gap-2">
              <span className="text-sm font-medium">Birim referans değer (kuruş)</span>
              <input
                className="h-11 rounded-md border border-[var(--line)] bg-white px-3"
                min={0}
                name="unitReferenceValueKurus"
                required
                type="number"
              />
            </label>
          </div>
          <label className="grid gap-2">
            <span className="text-sm font-medium">Saklama koşulları</span>
            <textarea className="min-h-24 rounded-md border border-[var(--line)] bg-white p-3" name="storageConditions" />
          </label>
          <div>
            <button
              className="h-11 rounded-md bg-[var(--primary)] px-5 font-semibold text-white hover:bg-[var(--primary-strong)]"
              type="submit"
            >
              Admin incelemesine gönder
            </button>
          </div>
        </form>
      </section>
    </main>
  );
}
