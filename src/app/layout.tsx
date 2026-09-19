import type { Metadata } from "next";
import Link from "next/link";
import { cookies } from "next/headers";
import { Brand } from "@/components/ui";
import { CookiePreferences } from "@/components/cookie-preferences";
import { LogoutButton } from "@/components/logout-form";
import { getCurrentAppUser } from "@/lib/auth/current-user";
import { legalLinks } from "@/lib/legal/documents";
import { legalOperator } from "@/lib/legal/config";
import "./globals.css";
export const metadata: Metadata = {
  title: { default: "E-Takas | İşletmeler arası takas", template: "%s | E-Takas" },
  description: "Eczaneler ve veteriner işletmeleri için stok, ilan ve takas yönetimi.",
  metadataBase: new URL(process.env.APP_URL || "http://localhost:3000"),
  icons: { icon: "/EtakasLogo.png", apple: "/EtakasLogo.png" }
};
export const dynamic = "force-dynamic";
export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const [user, cookieStore] = await Promise.all([getCurrentAppUser(), cookies()]);
  return (
    <html lang="tr" data-scroll-behavior="smooth">
      <body>
        <a className="skip-link" href="#icerik">
          İçeriğe geç
        </a>
        <header className="site-header">
          <div className="header-inner">
            <Brand />
            {user ? (
              <LogoutButton />
            ) : (
              <>
                <nav className="main-nav" aria-label="Ana menü">
                  <Link href="/#nasil-calisir">Nasıl çalışır?</Link>
                  <Link href="/pazar-yeri">Pazar yeri</Link>
                  <Link href="/sss">S.S.S.</Link>
                </nav>
                <div className="header-actions">
                  <Link className="button button-secondary" href="/giris">
                    Giriş Yap
                  </Link>
                  <Link className="button button-primary" href="/isletme-kaydi">
                    İşletme kaydı
                  </Link>
                </div>
              </>
            )}
          </div>
        </header>
        <div id="icerik">{children}</div>
        <footer className="site-footer">
          <div className="footer-top">
            <div className="footer-about">
              <Brand />
              <p>İşletmeler arasında daha verimli stok yönetimi.</p>
              <p>
                Platform işletici:{" "}
                <a href="https://www.sabotyazilim.com.tr/" target="_blank" rel="noopener noreferrer">
                  {legalOperator.name}
                </a>
              </p>
              <a href={`mailto:${legalOperator.email}`}>{legalOperator.email}</a>
              <address>{legalOperator.address}</address>
            </div>
            <nav className="footer-links" aria-label="Bilgi ve yardım">
              <h2>Bilgi ve yardım</h2>
              <Link href="/#nasil-calisir">Nasıl çalışır?</Link>
              <Link href="/sss">Sıkça sorulan sorular</Link>
              <Link href="/hukuki">Hukuki metinler</Link>
              <CookiePreferences noticeSeen={cookieStore.has("e_takas_cookie_notice")} />
            </nav>
            <nav className="footer-links footer-legal" aria-label="Hukuki metinler">
              <h2>Koşullar ve gizlilik</h2>
              {legalLinks.map((link) => (
                <Link href={link.href} key={link.href}>
                  {link.title}
                </Link>
              ))}
            </nav>
          </div>
          <div className="footer-bottom">
            <span>
              © {new Date().getFullYear()} Etakas · {legalOperator.name}
            </span>
            <span>Bireysel tüketicilere ilaç satışı veya sağlık danışmanlığı sunulmaz.</span>
          </div>
        </footer>
      </body>
    </html>
  );
}
