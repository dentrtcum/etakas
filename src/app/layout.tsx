import type { Metadata } from "next";
import Link from "next/link";
import { Brand } from "@/components/ui";
import "./globals.css";
export const metadata: Metadata = {
  title: { default: "E-Takas | İşletmeler arası takas", template: "%s | E-Takas" },
  description: "Eczaneler ve veteriner işletmeleri için stok, ilan ve takas yönetimi.",
  metadataBase: new URL(process.env.APP_URL || "http://localhost:3000")
};
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="tr">
      <body>
        <a className="skip-link" href="#icerik">
          İçeriğe geç
        </a>
        <header className="site-header">
          <div className="header-inner">
            <Brand />
            <nav className="main-nav" aria-label="Ana menü">
              <Link href="/#nasil-calisir">Nasıl çalışır?</Link>
              <Link href="/pazar-yeri">Pazar yeri</Link>
              <Link href="/panel">Hesabım</Link>
            </nav>
            <div className="header-actions">
              <Link className="button button-secondary" href="/panel">
                Panele git
              </Link>
              <Link className="button button-primary" href="/isletme-kaydi">
                İşletme kaydı
              </Link>
            </div>
          </div>
        </header>
        <div id="icerik">{children}</div>
        <footer className="site-footer">
          <span>
            © {new Date().getFullYear()} E-Takas · İşletmeler arasında daha verimli stok yönetimi.
          </span>
          <span>
            <Link href="/#nasil-calisir">Nasıl çalışır?</Link> · <Link href="/panel">Hesabım</Link>
          </span>
        </footer>
      </body>
    </html>
  );
}
