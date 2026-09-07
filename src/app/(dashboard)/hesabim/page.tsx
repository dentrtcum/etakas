import {
  PageHeading,
  StatusBadge,
  EmptyState,
  organizationTypeLabels,
  formatValue,
  formatDate
} from "@/components/ui";
import { SubmitForm } from "@/components/submit-form";
import {
  getAccountContext,
  getOrganizationDetails,
  getAccountOverview,
  getLedgerHistory,
  readPage
} from "@/modules/organizations/account-queries";
import Link from "next/link";
export default async function AccountPage({
  searchParams
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const { actor, organization } = await getAccountContext();
  if (!organization)
    return (
      <main className="page-container">
        <EmptyState title="İşletme kaydı yok" description="Bu hesap bir işletmeye bağlı değil." />
      </main>
    );
  const page = readPage((await searchParams).page);
  const [details, overview] = await Promise.all([
    getOrganizationDetails(organization.id),
    getAccountOverview(organization.id)
  ]);
  const history = overview.accountId ? await getLedgerHistory(overview.accountId, page) : [];
  return (
    <main className="page-container">
      <PageHeading
        eyebrow="HESAP BİLGİLERİ"
        title="İşletmem"
        description="Başvuru durumunuzu takip edin, belgelerinizi tamamlayın ve bakiye hareketlerinizi inceleyin."
        action={<StatusBadge status={organization.status} />}
      />
      <div className="grid md:grid-cols-2 gap-5">
        <section className="panel-card">
          <h2 className="panel-title">İşletme özeti</h2>
          <dl className="review-grid mt-6">
            <div>
              <dt>İşletme türü</dt>
              <dd>{organizationTypeLabels[organization.type]}</dd>
            </div>
            <div>
              <dt>E-posta</dt>
              <dd>{actor.email}</dd>
            </div>
            <div>
              <dt>Konum</dt>
              <dd>
                {organization.province} / {organization.district}
              </dd>
            </div>
            <div>
              <dt>Kredi limiti</dt>
              <dd>{formatValue(organization.creditLimitKurus)}</dd>
            </div>
            <div className="md:col-span-2">
              <dt>Açık adres</dt>
              <dd>{details.address || "Adres eklenmemiş"}</dd>
            </div>
          </dl>
        </section>
        <section className="panel-card">
          <h2 className="panel-title">Belgelerim</h2>
          <p className="subtext">Belgeler isteğe bağlıdır. İnceleme için eklemeniz önerilir.</p>
          <div className="grid gap-2 my-5">
            {details.documents.length ? (
              details.documents.map((doc) => (
                <div key={doc.id} className="flex justify-between gap-3 text-sm">
                  <a
                    className="underline"
                    href={`/api/documents/organization/${doc.id}`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    {doc.kind.replaceAll("_", " ")}
                  </a>
                  <StatusBadge status={doc.status} />
                </div>
              ))
            ) : (
              <p className="subtext">Henüz belge yüklenmedi.</p>
            )}
          </div>
          <SubmitForm endpoint="/api/organization-documents" label="Belge ekle">
            <input type="hidden" name="organizationId" value={organization.id} />
            <label>
              Belge türü
              <select name="kind">
                <option value="license_document">Ruhsat / faaliyet belgesi</option>
                <option value="tax_plate">Vergi levhası</option>
                <option value="owner_identity">Kimlik belgesi</option>
                <option value="diploma">Diploma</option>
                <option value="chamber_registration">Oda kayıt belgesi</option>
                <option value="signature_circular">Yetki belgesi</option>
              </select>
            </label>
            <label>
              Dosya
              <input
                name="document"
                type="file"
                accept="image/jpeg,image/png,image/webp,application/pdf"
                required
              />
              <small>PDF veya görsel · En fazla 4 MB</small>
            </label>
          </SubmitForm>
        </section>
      </div>
      <div className="section-heading">
        <h2>Bakiye hareketleri</h2>
        <p className="subtext">Güncel bakiye: {formatValue(overview.balance)}</p>
      </div>
      {history.length ? (
        <div className="panel-card table-scroll">
          <table className="data-table">
            <thead>
              <tr>
                <th>TARİH</th>
                <th>İŞLEM</th>
                <th>TUTAR</th>
              </tr>
            </thead>
            <tbody>
              {history.slice(0, 20).map((row) => (
                <tr key={row.id}>
                  <td>{formatDate(row.createdAt)}</td>
                  <td>
                    {row.type === "REVERSAL"
                      ? "İade"
                      : row.type === "ORDER_COMPLETION"
                        ? "Takas tamamlandı"
                        : "Bakiye düzenlemesi"}
                  </td>
                  <td className={row.direction === "CREDIT" ? "text-green-700" : "text-orange-800"}>
                    {row.direction === "CREDIT" ? "+" : "−"} {formatValue(row.amount)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <EmptyState
          title="Henüz bakiye hareketi yok"
          description="Tamamlanan takaslar ve iadeler burada görüntülenir."
        />
      )}
      <div className="pagination">
        {page > 1 ? <Link href={`?page=${page - 1}`}>← Önceki</Link> : <span />}
        <span>Sayfa {page}</span>
        {history.length > 20 ? <Link href={`?page=${page + 1}`}>Sonraki →</Link> : <span />}
      </div>
    </main>
  );
}
