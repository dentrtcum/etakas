import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentAppUser } from "@/lib/auth/current-user";
export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentAppUser();
  if (!user) redirect("/giris?next=/panel");
  return (
    <>
      <nav className="account-tabs" aria-label="Hesap menüsü">
        {[
          ["/panel", "Genel bakış"],
          ["/pazar-yeri", "Pazar yeri"],
          ["/ilanlarim", "İlanlarım"],
          ["/siparisler", "Siparişlerim"],
          ["/hesabim", "İşletmem"]
        ].map(([href, label]) => (
          <Link key={href} href={href}>
            {label}
          </Link>
        ))}
        <form action="/api/session/logout" method="post">
          <button className="button button-secondary py-2" type="submit">
            Çıkış yap
          </button>
        </form>
      </nav>
      {children}
    </>
  );
}
