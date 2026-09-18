import { EmptyState, PageHeading, StatusBadge, formatDate } from "@/components/ui";
import { SubmitForm } from "@/components/submit-form";
import { getAccountContext } from "@/modules/organizations/account-queries";
import { listOwnSupportTickets } from "@/modules/communications/service";

export default async function SupportPage() {
  const { actor, organization } = await getAccountContext();
  if (!organization) return <main className="page-container"><EmptyState title="İşletme kaydı gerekli" description="Yöneticiye talep iletmek için bir işletme hesabınız olmalıdır." /></main>;
  const tickets = await listOwnSupportTickets(actor, organization.id);
  return (
    <main className="page-container">
      <PageHeading eyebrow="ÖZEL DESTEK KANALI" title="Şikayet ve talepler" description="Bu bölümdeki yazışmalar yalnızca işletmeniz ve süper yönetici tarafından görülebilir." />
      <section className="panel-card mb-6">
        <h2 className="panel-title">Yeni kayıt oluştur</h2>
        <SubmitForm endpoint="/api/support" json values={{ organizationId: organization.id }} label="Yöneticiye gönder" successMessage="Kaydınız yöneticiye iletildi.">
          <div className="form-grid mt-4">
            <label>Tür<select name="kind" required><option value="REQUEST">Talep</option><option value="COMPLAINT">Şikayet</option></select></label>
            <label>Konu<input name="subject" minLength={3} maxLength={180} required /></label>
          </div>
          <label>Açıklama<textarea name="body" minLength={1} maxLength={4000} rows={5} required /></label>
        </SubmitForm>
      </section>
      <div className="grid gap-4">
        {tickets.map((ticket) => <details className="panel-card" key={ticket.id}><summary className="flex justify-between gap-3"><strong>{ticket.kind === "COMPLAINT" ? "Şikayet" : "Talep"}: {ticket.subject}</strong><StatusBadge status={ticket.status} /></summary><div className="message-list mt-4">{ticket.messages.map((message) => <article className={message.fromAdmin ? "message-bubble" : "message-bubble message-own"} key={message.id}><p>{message.body}</p><small>{message.fromAdmin ? "Yönetici" : "Siz"} · {formatDate(message.createdAt)}</small></article>)}</div>{ticket.status !== "CLOSED" && <SubmitForm endpoint="/api/support" json values={{ organizationId: organization.id, ticketId: ticket.id }} label="Yanıt gönder"><label>Yeni mesaj<textarea name="body" minLength={1} maxLength={4000} rows={3} required /></label></SubmitForm>}</details>)}
      </div>
    </main>
  );
}
