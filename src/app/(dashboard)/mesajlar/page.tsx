import Link from "next/link";
import { EmptyState, PageHeading, formatDate } from "@/components/ui";
import { SubmitForm } from "@/components/submit-form";
import { MessageReadMarker } from "@/components/message-read-marker";
import { getAccountContext } from "@/modules/organizations/account-queries";
import {
  listConversationMessages,
  listConversations,
  listMessagingOrganizations
} from "@/modules/communications/service";

export default async function MessagesPage({ searchParams }: { searchParams: Promise<{ conversation?: string; to?: string }> }) {
  const { actor, organization } = await getAccountContext();
  if (!organization) return <main className="page-container"><EmptyState title="İşletme kaydı gerekli" description="Mesajlaşmak için bir işletme hesabınız olmalıdır." /></main>;
  const params = await searchParams;
  const [threads, recipients] = await Promise.all([
    listConversations(actor, organization.id),
    listMessagingOrganizations(organization.id)
  ]);
  const active = threads.find((thread) => thread.id === params.conversation);
  const messages = active ? await listConversationMessages(actor, organization.id, active.id) : [];
  const selectedRecipient = recipients.find((item) => item.id === params.to);
  return (
    <main className="page-container">
      <MessageReadMarker messageIds={messages.filter(message => message.senderOrganizationId !== organization.id).map(message => message.id)} />
      <PageHeading eyebrow="İŞLETME İLETİŞİMİ" title="Mesajlar" description="Onaylı işletmelerle doğrudan ve kayıtlı biçimde görüşün." />
      <div className="message-layout">
        <aside className="panel-card message-sidebar">
          <h2 className="panel-title">Görüşmeler</h2>
          <h3 className="text-sm font-semibold mt-4">Yeni görüşme</h3>
          <div className="grid gap-2 mt-3">
            {recipients.slice(0, 20).map((recipient) => <Link className="conversation-link" key={recipient.id} href={`/mesajlar?to=${recipient.id}`}>{recipient.name} · {recipient.province}</Link>)}
          </div>
          <div className="grid gap-2 mt-4">
            {threads.map((thread) => <Link className="conversation-link" key={thread.id} href={`/mesajlar?conversation=${thread.id}`}>{thread.otherOrganizationName}</Link>)}
          </div>
        </aside>
        <section className="panel-card message-thread">
          {active ? (
            <>
              <h2 className="panel-title">{active.otherOrganizationName}</h2>
              <div className="message-list">
                {messages.map((message) => <article className={message.senderOrganizationId === organization.id ? "message-bubble message-own" : "message-bubble"} key={message.id}><p>{message.body}</p><small>{formatDate(message.createdAt)}</small></article>)}
              </div>
              <SubmitForm endpoint="/api/messages" json values={{ organizationId: organization.id, conversationId: active.id }} label="Mesajı gönder" successMessage="Mesaj gönderildi.">
                <label>Mesaj<textarea name="body" minLength={1} maxLength={4000} rows={4} required /></label>
              </SubmitForm>
            </>
          ) : (
            <>
              <h2 className="panel-title">Yeni görüşme</h2>
              <SubmitForm endpoint="/api/messages" json values={{ organizationId: organization.id }} label="Görüşmeyi başlat" successMessage="Mesaj gönderildi.">
                <label>Alıcı işletme<select name="recipientOrganizationId" defaultValue={selectedRecipient?.id ?? ""} required><option value="" disabled>İşletme seçin</option>{recipients.map((recipient) => <option key={recipient.id} value={recipient.id}>{recipient.name} · {recipient.province}</option>)}</select></label>
                <label>Mesaj<textarea name="body" minLength={1} maxLength={4000} rows={5} required /></label>
              </SubmitForm>
            </>
          )}
        </section>
      </div>
    </main>
  );
}
