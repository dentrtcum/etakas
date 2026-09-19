import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentAppUser } from "@/lib/auth/current-user";
import { AnnouncementModal } from "@/components/announcement-modal";
import {
  getNavigationBadgeCounts,
  listUnreadAnnouncements
} from "@/modules/notifications/service";
export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentAppUser();
  if (!user) redirect("/giris?next=/panel");
  const [announcements, badgeCounts] = await Promise.all([
    listUnreadAnnouncements(user.id),
    getNavigationBadgeCounts(user.id)
  ]);
  return (
    <>
      <AnnouncementModal announcement={announcements[0]} />
      <nav className="account-tabs" aria-label="Hesap menüsü">
        {[
          { href: "/panel", label: "Genel bakış", count: 0 },
          { href: "/pazar-yeri", label: "Pazar yeri", count: 0 },
          { href: "/ilanlarim", label: "İlanlarım", count: 0 },
          { href: "/siparisler", label: "Siparişlerim", count: 0 },
          { href: "/mesajlar", label: "Mesajlar", count: badgeCounts.messages },
          { href: "/destek", label: "Şikayet ve talepler", count: 0 },
          { href: "/bildirimler", label: "Bildirimler", count: badgeCounts.notifications },
          { href: "/hesabim", label: "İşletmem", count: 0 }
        ].map(({ href, label, count }) => (
          <Link key={href} href={href}>
            {label}
            {Number(count) > 0 && (
              <span
                className="nav-badge"
                aria-label={`${count} okunmamış ${label.toLocaleLowerCase("tr-TR")}`}
              >
                {Number(count) > 99 ? "99+" : count}
              </span>
            )}
          </Link>
        ))}
      </nav>
      {children}
    </>
  );
}
