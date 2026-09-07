import { PageHeading } from "@/components/ui";
import { SubmitForm } from "@/components/submit-form";
import { FileText, Info } from "lucide-react";
const fields = [
  ["authorizedPersonName", "Yetkili kişi adı soyadı", "text", "name"],
  ["taxNumber", "Vergi numarası", "text", "off"],
  ["ownerIdentityNumber", "İşletme sahibi T.C. kimlik no", "text", "off"],
  ["email", "E-posta adresi", "email", "email"],
  ["phone", "Telefon", "tel", "tel"],
  ["province", "İl", "text", "address-level1"],
  ["district", "İlçe", "text", "address-level2"]
] as const;
const documents = [
  ["licenseDocument", "Ruhsat / faaliyet izin belgesi"],
  ["taxPlateDocument", "Vergi levhası"],
  ["ownerIdentityDocument", "Kimlik belgesi"],
  ["diplomaDocument", "Diploma / mesleki yeterlilik belgesi"],
  ["chamberRegistrationDocument", "Oda kayıt belgesi"],
  ["signatureCircularDocument", "İmza sirküleri / yetki belgesi"]
] as const;
export default function RegistrationPage() {
  return (
    <main className="page-container max-w-4xl">
      <PageHeading
        eyebrow="ARAMIZA KATILIN"
        title="İşletme kaydı"
        description="Temel bilgilerinizi paylaşın. Başvurunuz incelendikten sonra pazar yerini kullanabilir ve ilan verebilirsiniz."
      />
      <SubmitForm
        endpoint="/api/organization-applications"
        label="Başvuruyu gönder"
        redirectTo="/isletme-kaydi/basarili"
      >
        <section className="panel-card">
          <div className="form-section-title">
            <span className="step-number">01</span>
            <div>
              <h2 className="panel-title">İşletme ve iletişim bilgileri</h2>
              <p className="subtext">Bu bölümdeki tüm alanlar zorunludur.</p>
            </div>
          </div>
          <div className="form-grid">
            <label>
              İşletme türü
              <select name="type" required>
                <option value="PHARMACY">Eczane</option>
                <option value="VETERINARY_CLINIC">Veteriner kliniği</option>
                <option value="VETERINARY_POLYCLINIC">Veteriner polikliniği</option>
                <option value="ANIMAL_HOSPITAL">Hayvan hastanesi</option>
              </select>
            </label>
            {fields.map(([name, label, type, autoComplete]) => (
              <label key={name}>
                {label}
                <input
                  name={name}
                  type={type}
                  autoComplete={autoComplete}
                  required
                  minLength={
                    name === "ownerIdentityNumber" ? 11 : name === "taxNumber" ? 10 : undefined
                  }
                  maxLength={
                    name === "ownerIdentityNumber" ? 11 : name === "taxNumber" ? 20 : undefined
                  }
                  pattern={name === "ownerIdentityNumber" ? "[0-9]{11}" : undefined}
                />
              </label>
            ))}
            <label className="md:col-span-2">
              Parola
              <input
                name="password"
                type="password"
                autoComplete="new-password"
                minLength={8}
                maxLength={160}
                required
              />
              <small>En az 8 karakter kullanın.</small>
            </label>
          </div>
        </section>
        <section className="panel-card">
          <div className="form-section-title">
            <span className="step-number">02</span>
            <div>
              <h2 className="panel-title">Adres ve belgeler</h2>
              <p className="subtext">
                Açık adres zorunludur. Belgeleri şimdi ekleyebilir veya daha sonra hesabınızdan
                tamamlayabilirsiniz.
              </p>
            </div>
          </div>
          <label>
            Açık adres{" "}
            <textarea
              name="address"
              autoComplete="street-address"
              minLength={10}
              maxLength={500}
              rows={3}
              required
              placeholder="Mahalle, cadde / sokak, bina ve kapı numarası"
            />
          </label>
          <p className="notice">
            <Info size={18} />
            Belgeler isteğe bağlıdır; başvurunuzun incelenmesini kolaylaştırmak için eklemeniz
            önerilir. PDF veya görsel yükleyebilirsiniz. Toplam dosya boyutu en fazla 4 MB.
          </p>
          <div className="form-grid">
            {documents.map(([name, label]) => (
              <label key={name}>
                <span className="flex items-center gap-2">
                  <FileText size={15} />
                  {label}
                </span>
                <span>
                  <span className="field-optional">İsteğe bağlı · Önerilir</span>
                </span>
                <input
                  name={name}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,application/pdf"
                />
              </label>
            ))}
          </div>
        </section>
        <div className="panel-card grid gap-4">
          <label className="check-label">
            <input name="kvkkAccepted" type="checkbox" required />
            Başvuru ve belgelerimin işletme doğrulaması amacıyla işlenmesini kabul ediyorum.
          </label>
          <label className="check-label">
            <input name="termsAccepted" type="checkbox" required />
            Paylaştığım bilgilerin doğruluğunu ve platform kullanım koşullarını kabul ediyorum.
          </label>
        </div>
      </SubmitForm>
    </main>
  );
}
