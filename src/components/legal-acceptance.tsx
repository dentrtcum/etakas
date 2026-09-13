import { LegalContent } from "@/components/legal-content";
import { LegalDialog } from "@/components/legal-dialog";
import { legalDocuments } from "@/lib/legal/documents";
import { LEGAL_VERSION } from "@/lib/legal/version";
import Link from "next/link";

export function LegalAcceptance() {
  return (
    <section className="panel-card legal-acceptance">
      <h2 className="panel-title">Bilgilendirme ve kullanım koşulları</h2>
      <p className="subtext">
        İlgili metni açıp inceleyebilir, sonra başvurunuza kaldığınız yerden devam edebilirsiniz.
      </p>
      <input type="hidden" name="legalVersion" value={LEGAL_VERSION} />
      <div className="check-label">
        <input id="terms-accepted" name="termsAccepted" type="checkbox" required />
        <div>
          <LegalDialog title="Kullanım Koşulları" href="/hukuki/kullanim-kosullari">
            <LegalContent document={legalDocuments["kullanim-kosullari"]} />
          </LegalDialog>{" "}
          <label htmlFor="terms-accepted" className="inline-label">
            metnini okudum ve kabul ediyorum. İşletmeyi temsil etmeye yetkili olduğumu ve
            bilgilerimin doğruluğunu beyan ediyorum.
          </label>
        </div>
      </div>
      <div className="check-label">
        <input id="privacy-acknowledged" name="privacyAcknowledged" type="checkbox" required />
        <div>
          <LegalDialog title="KVKK Aydınlatma Metni" href="/hukuki/kvkk-aydinlatma">
            <LegalContent document={legalDocuments["kvkk-aydinlatma"]} />
          </LegalDialog>{" "}
          <label htmlFor="privacy-acknowledged" className="inline-label">
            aracılığıyla kişisel verilerimin işlenmesi hakkında bilgilendirildim.
          </label>
        </div>
      </div>
      <p className="subtext">
        Bu bildirim reklam izni veya genel açık rıza değildir.{" "}
        <Link
          className="text-link"
          href="/hukuki/gizlilik-politikasi"
          target="_blank"
          rel="noopener noreferrer"
        >
          Gizlilik Politikası
        </Link>{" "}
        ve{" "}
        <Link
          className="text-link"
          href="/hukuki/platform-kurallari"
          target="_blank"
          rel="noopener noreferrer"
        >
          Platform Kuralları
        </Link>{" "}
        ayrıca inceleyebilirsiniz.
      </p>
    </section>
  );
}
