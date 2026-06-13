import Link from "next/link";
import { CheckCircle2 } from "lucide-react";

export default function OrganizationRegistrationSuccessPage() {
  return (
    <main className="grid min-h-screen place-items-center bg-[var(--background)] px-6">
      <section className="w-full max-w-xl rounded-md border border-[var(--line)] bg-white p-8 text-center shadow-sm">
        <CheckCircle2 className="mx-auto text-emerald-700" size={40} />
        <h1 className="mt-4 text-2xl font-bold">Kaydiniz basariyla alinmistir</h1>
        <p className="mt-3 text-sm leading-6 text-[var(--muted)]">
          Yonetici onayi beklenmektedir. Belgeleriniz ve isletme bilgileriniz incelendikten sonra alisveris
          ve ilan olusturma ozellikleri acilacaktir.
        </p>
        <div className="mt-6 flex justify-center gap-3">
          <Link className="rounded-md border border-[var(--line)] px-4 py-2 text-sm font-semibold" href="/">
            Ana sayfa
          </Link>
          <Link className="rounded-md bg-[var(--primary)] px-4 py-2 text-sm font-semibold text-white" href="/giris">
            Giris yap
          </Link>
        </div>
      </section>
    </main>
  );
}
