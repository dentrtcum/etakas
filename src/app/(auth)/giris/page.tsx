import Link from "next/link";
import { ArrowLeftRight, Check } from "lucide-react";
export default async function LoginPage({
  searchParams
}: {
  searchParams: Promise<{ error?: string; next?: string }>;
}) {
  const params = await searchParams;
  return (
    <main className="auth-wrap">
      <aside className="auth-aside">
        <div>
          <p className="eyebrow">YENİDEN MERHABA</p>
          <h2 className="text-4xl font-bold leading-tight mt-5">
            İşletmenizin
            <br />
            takas alanı.
          </h2>
          <p className="subtext mt-5">
            Stoklarınızı, ilanlarınızı ve siparişlerinizi tek bir yerden yönetin.
          </p>
        </div>
        <ArrowLeftRight size={65} strokeWidth={1} />
        <p className="hero-caption">
          <Check size={16} />
          İşletmenize özel çalışma alanı
        </p>
      </aside>
      <section className="auth-form">
        <h1>Giriş yap</h1>
        <p className="subtext mb-7">Devam etmek için hesap bilgilerinizi girin.</p>
        {params.error && (
          <p className="notice notice-error" role="alert">
            {params.error === "invalid"
              ? "E-posta veya parola hatalı. Bilgilerinizi kontrol edin."
              : "Giriş şu anda tamamlanamıyor. Lütfen tekrar deneyin."}
          </p>
        )}
        <form className="grid gap-5" action="/api/session/login" method="post">
          <input type="hidden" name="next" value={params.next ?? "/panel"} />
          <label>
            E-posta adresi
            <input
              name="email"
              type="email"
              autoComplete="username"
              required
              placeholder="ornek@eczane.com"
            />
          </label>
          <label>
            Parola
            <input
              name="password"
              type="password"
              autoComplete="current-password"
              required
              placeholder="Parolanız"
            />
          </label>
          <button className="button button-primary mt-2" type="submit">
            Giriş yap
          </button>
        </form>
        <p className="subtext mt-7 text-center">
          Henüz hesabınız yok mu?{" "}
          <Link className="font-bold text-[var(--primary)]" href="/isletme-kaydi">
            İşletme kaydı
          </Link>
        </p>
      </section>
    </main>
  );
}
