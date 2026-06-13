import { CheckCircle2 } from "lucide-react";
import { redirect } from "next/navigation";
import { getCurrentAppUser } from "@/lib/auth/current-user";
import { BarcodeInput } from "@/app/(dashboard)/ilan-olustur/barcode-input";

export default async function CreateListingPage({
  searchParams
}: {
  searchParams: Promise<{ submitted?: string }>;
}) {
  const actor = await getCurrentAppUser();
  const params = await searchParams;

  if (!actor) {
    redirect("/giris");
  }

  return (
    <main className="min-h-screen bg-[var(--surface)]">
      <section className="mx-auto max-w-5xl px-6 py-10 lg:px-8">
        <div className="mb-8 border-b border-[var(--line)] pb-6">
          <p className="text-sm font-semibold uppercase tracking-wide text-[var(--primary)]">
            Ilan olusturma
          </p>
          <h1 className="mt-2 text-3xl font-bold">Ilaci admin incelemesine gonder</h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-[var(--muted)]">
            Sistem, ilani giris yapan kullanicinin onayli isletmesine baglar. Barkod katalogda yoksa
            admin incelemesi icin otomatik urun kaydi hazirlanir.
          </p>
        </div>

        {params.submitted ? (
          <div className="mb-6 flex items-start gap-3 rounded-md border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">
            <CheckCircle2 aria-hidden="true" size={18} />
            <p>Ilan basvurusu alindi. Admin onayindan sonra pazar yerinde yayinlanacak.</p>
          </div>
        ) : null}

        <form className="grid gap-5" action="/api/listings" encType="multipart/form-data" method="post">
          <section className="rounded-md border border-[var(--line)] bg-white p-5">
            <h2 className="text-lg font-semibold">Ilac ve stok bilgileri</h2>
            <div className="mt-5 grid gap-5 md:grid-cols-2">
              <div className="md:col-span-2">
                <BarcodeInput />
              </div>
              <label className="grid gap-2">
                <span className="text-sm font-medium">Son kullanma tarihi</span>
                <input className="h-11 rounded-md border border-[var(--line)] bg-white px-3" name="expiryDate" required type="date" />
              </label>
              <label className="grid gap-2">
                <span className="text-sm font-medium">Miktar</span>
                <input className="h-11 rounded-md border border-[var(--line)] bg-white px-3" min={1} name="quantity" required type="number" />
              </label>
              <label className="grid gap-2 md:col-span-2">
                <span className="text-sm font-medium">Birim referans deger (kurus)</span>
                <input
                  className="h-11 rounded-md border border-[var(--line)] bg-white px-3"
                  min={0}
                  name="unitReferenceValueKurus"
                  required
                  type="number"
                />
              </label>
            </div>
            <label className="mt-5 grid gap-2">
              <span className="text-sm font-medium">Saklama kosullari</span>
              <textarea
                className="min-h-24 rounded-md border border-[var(--line)] bg-white p-3"
                name="storageConditions"
                placeholder="Istege bagli"
              />
            </label>
          </section>

          <section className="rounded-md border border-[var(--line)] bg-white p-5">
            <h2 className="text-lg font-semibold">Gorsel ve belgeler</h2>
            <div className="mt-5 grid gap-5 md:grid-cols-2">
              <label className="grid gap-2">
                <span className="text-sm font-medium">Ilac fotografi</span>
                <input accept="image/*" className="rounded-md border border-[var(--line)] bg-white px-3 py-2 text-sm" name="medicineImage" required type="file" />
              </label>
              <label className="grid gap-2">
                <span className="text-sm font-medium">Ambalaj / seri no fotografi</span>
                <input accept="image/*" className="rounded-md border border-[var(--line)] bg-white px-3 py-2 text-sm" name="packageImage" required type="file" />
              </label>
              <label className="grid gap-2">
                <span className="text-sm font-medium">Fatura belgesi</span>
                <input accept="image/*,.pdf" className="rounded-md border border-[var(--line)] bg-white px-3 py-2 text-sm" name="invoiceDocument" type="file" />
              </label>
              <label className="grid gap-2">
                <span className="text-sm font-medium">Ek belge</span>
                <input accept="image/*,.pdf" className="rounded-md border border-[var(--line)] bg-white px-3 py-2 text-sm" name="otherDocument" type="file" />
              </label>
            </div>
          </section>

          <div>
            <button
              className="h-11 rounded-md bg-[var(--primary)] px-5 font-semibold text-white hover:bg-[var(--primary-strong)]"
              type="submit"
            >
              Admin incelemesine gonder
            </button>
          </div>
        </form>
      </section>
    </main>
  );
}
