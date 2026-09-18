import { PageHeading, EmptyState, formatDate } from "@/components/ui";
import { SubmitForm } from "@/components/submit-form";
import { getCurrentAppUser } from "@/lib/auth/current-user";
import { listUserNotifications } from "@/modules/notifications/service";

export default async function NotificationsPage() {
  const actor = await getCurrentAppUser();
  const rows = actor ? await listUserNotifications(actor.id) : [];
  return (
    <main className="page-container">
      <PageHeading eyebrow="HESAP HAREKETLERİ" title="Bildirimler" description="Yönetici kararları, duyurular ve mesaj uyarıları burada saklanır." />
      {rows.length ? <div className="grid gap-4">{rows.map((row) => <article className={`panel-card ${row.readAt ? "" : "notification-unread"}`} key={row.id}><p className="eyebrow">{row.isAnnouncement ? "DUYURU" : "BİLDİRİM"}</p><h2 className="panel-title mt-2">{row.title}</h2><p className="subtext my-3 whitespace-pre-wrap">{row.body}</p><small>{formatDate(row.createdAt)}</small>{!row.readAt && <SubmitForm className="mt-4" endpoint="/api/notifications/read" json values={{ notificationId: row.id }} label="Okundu işaretle" />}</article>)}</div> : <EmptyState title="Henüz bildiriminiz yok" description="Yönetici kararları ve platform duyuruları burada gösterilecek." />}
    </main>
  );
}
