import { MailCheck, ShieldCheck } from "lucide-react";
import type { ReactNode } from "react";

export function AuthShell({
  title,
  description,
  children
}: {
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <main id="main-content" className="auth-wrap">
      <aside className="auth-aside">
        <div>
          <p className="eyebrow">İŞLETMENİZE ÖZEL</p>
          <h2 className="text-4xl font-bold leading-tight mt-5">
            Hesabınız güvende,
            <br />
            kontrol sizde.
          </h2>
          <p className="subtext mt-5">
            İşletme ve yönetici hesaplarında her giriş, parolanın ardından e-posta doğrulamasıyla
            tamamlanır.
          </p>
        </div>
        <MailCheck size={65} strokeWidth={1} aria-hidden="true" />
        <p className="hero-caption">
          <ShieldCheck size={16} aria-hidden="true" />
          Doğrulama kodunuzu kimseyle paylaşmayın.
        </p>
      </aside>
      <section className="auth-form" aria-labelledby="auth-title">
        <h1 id="auth-title">{title}</h1>
        <p className="subtext mb-7">{description}</p>
        {children}
      </section>
    </main>
  );
}
