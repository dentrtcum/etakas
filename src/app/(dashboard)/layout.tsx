import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentAppUser } from "@/lib/auth/current-user";
import { AnnouncementModal } from "@/components/announcement-modal";
import { NavigationBadge, NavigationBadges } from "@/components/navigation-badge";
import {
  getNavigationBadgeCounts,
  listUnreadPriorityNotifications
} from "@/modules/notifications/service";
export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentAppUser();
  if (!user) redirect("/giris?next=/panel");
  const [announcements, badgeCounts] = await Promise.all([
    listUnreadPriorityNotifications(user.id),
    getNavigationBadgeCounts(user.id)
  ]);
  return (
    <>
      <AnnouncementModal announcement={announcements[0]} />
      <NavigationBadges initial={badgeCounts}>
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
          ].map(({ href, label }) => (
            <Link key={href} href={href}>
              {label}
              {href === "/mesajlar" && <NavigationBadge kind="messages" label="mesaj" />}
              {href === "/bildirimler" && <NavigationBadge kind="notifications" label="bildirim" />}
            </Link>
          ))}
        </nav>
      </NavigationBadges>
      {children}
    </>
  );
}
