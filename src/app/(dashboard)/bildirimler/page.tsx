import { PageHeading, EmptyState, formatDate } from "@/components/ui";
import { SubmitForm } from "@/components/submit-form";
import { getCurrentAppUser } from "@/lib/auth/current-user";
import { listUserNotifications } from "@/modules/notifications/service";

export default async function NotificationsPage() {
  const actor = await getCurrentAppUser();
  const rows = actor ? await listUserNotifications(actor.id) : [];
  const hasReadNotifications = rows.some((row) => row.readAt);
  return (
    <main className="page-container">
      <PageHeading
        eyebrow="HESAP HAREKETLERİ"
        title="Bildirimler"
        description="Sipariş hareketleri, yönetici kararları, duyurular ve mesaj uyarıları burada saklanır."
        action={
          hasReadNotifications ? (
            <SubmitForm
              endpoint="/api/notifications/delete"
              json
              values={{ allRead: true }}
              label="Okunanları sil"
              successMessage="Okunan bildirimler silindi."
            />
          ) : undefined
        }
      />
      {rows.length ? (
        <div className="grid gap-4">
          {rows.map((row) => (
            <details
              className={`panel-card ${row.readAt ? "" : "notification-unread"}`}
              key={row.id}
              open={!row.readAt}
            >
              <summary className="flex justify-between gap-4 flex-wrap">
                <div>
                  <p className="eyebrow">{row.isAnnouncement ? "DUYURU" : "BİLDİRİM"}</p>
                  <h2 className="panel-title mt-2">{row.title}</h2>
                  <small className="inline-block mt-2">{formatDate(row.createdAt)}</small>
                </div>
                {!row.readAt && <span className="status-badge">YENİ</span>}
              </summary>
              <div className="mt-4 border-t border-[var(--line)] pt-4">
                <p className="subtext mb-4 whitespace-pre-wrap">{row.body}</p>
                <div className="flex flex-wrap gap-3">
                  {!row.readAt && (
                    <SubmitForm
                      endpoint="/api/notifications/read"
                      json
                      values={{ notificationId: row.id }}
                      label="Okundu işaretle"
                    />
                  )}
                  <SubmitForm
                    endpoint="/api/notifications/delete"
                    json
                    values={{ notificationId: row.id }}
                    label="Bildirimi sil"
                    successMessage="Bildirim silindi."
                  />
                </div>
              </div>
            </details>
          ))}
        </div>
      ) : (
        <EmptyState
          title="Henüz bildiriminiz yok"
          description="Sipariş hareketleri, yönetici kararları ve platform duyuruları burada gösterilecek."
        />
      )}
    </main>
  );
}
