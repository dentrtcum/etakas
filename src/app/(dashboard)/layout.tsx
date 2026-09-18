import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentAppUser } from "@/lib/auth/current-user";
import { AnnouncementModal } from "@/components/announcement-modal";
import { listUnreadAnnouncements } from "@/modules/notifications/service";
export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentAppUser();
  if (!user) redirect("/giris?next=/panel");
  const announcements = await listUnreadAnnouncements(user.id);
  return (
    <>
      <AnnouncementModal announcement={announcements[0]} />
      <nav className="account-tabs" aria-label="Hesap menüsü">
        {[
          ["/panel", "Genel bakış"],
          ["/pazar-yeri", "Pazar yeri"],
          ["/ilanlarim", "İlanlarım"],
          ["/siparisler", "Siparişlerim"],
          ["/mesajlar", "Mesajlar"],
          ["/destek", "Şikayet ve talepler"],
          ["/bildirimler", "Bildirimler"],
          ["/hesabim", "İşletmem"]
        ].map(([href, label]) => (
          <Link key={href} href={href}>
            {label}
          </Link>
        ))}
      </nav>
      {children}
    </>
  );
}
