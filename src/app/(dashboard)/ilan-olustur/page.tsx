import { PageHeading, EmptyState } from "@/components/ui";
import { SubmitForm } from "@/components/submit-form";
import { getAccountContext } from "@/modules/organizations/account-queries";
import { BarcodeInput } from "./barcode-input";
export default async function CreateListingPage() {
  const { organization } = await getAccountContext();
  if (organization?.status !== "APPROVED")
    return (
      <main className="page-container">
        <PageHeading eyebrow="İLAN YÖNETİMİ" title="Yeni ilan" />
        <EmptyState
          title="Önce işletme onayı gerekiyor"
          description="Başvurunuz onaylandıktan sonra stoklarınızı ilan olarak paylaşabilirsiniz."
          href="/hesabim"
          label="Başvurumu görüntüle"
        />
      </main>
    );
  return (
    <main className="page-container max-w-4xl">
      <PageHeading
        eyebrow="STOKLARINIZI DEĞERLENDİRİN"
        title="Yeni ilan oluştur"
        description="Ürününüzü tanıtın, stok bilgilerini ekleyin. İlanınız inceleme sonrasında pazar yerinde yayınlanır."
      />
      <SubmitForm endpoint="/api/listings" label="İncelemeye gönder" redirectTo="/ilanlarim">
        <section className="panel-card">
          <div className="form-section-title">
            <span className="step-number">01</span>
            <div>
              <h2 className="panel-title">Ürün ve stok bilgileri</h2>
              <p className="subtext">
                Barkodu elle yazabilir veya desteklenen cihazlarda kamerayla okutabilirsiniz.
              </p>
            </div>
          </div>
          <div className="form-grid">
            <div className="md:col-span-2">
              <BarcodeInput />
            </div>
            <label className="md:col-span-2">
              Ürün adı
              <input
                name="productName"
                required
                minLength={3}
                maxLength={240}
                placeholder="Ürünün ambalaj üzerindeki tam adı"
              />
              <small>Katalogda kayıtlı barkodlar mevcut ürün bilgileriyle eşleştirilir.</small>
            </label>
            <label>
              Son kullanma tarihi
              <input name="expiryDate" required type="date" />
            </label>
            <label>
              Miktar
              <input
                name="quantity"
                required
                type="number"
                min={1}
                max={100000}
                placeholder="Adet"
              />
            </label>
            <label>
              Birim referans değeri (TL)
              <input
                name="unitReferenceValue"
                required
                type="number"
                min="0.01"
                step="0.01"
                max="1000000"
                placeholder="0,00"
              />
              <small>Takas bakiyesinde kullanılacak birim değer.</small>
            </label>
            <label>
              Parti / lot numarası <span className="field-optional">İsteğe bağlı</span>
              <input name="lotNumber" maxLength={120} />
            </label>
            <label className="md:col-span-2">
              Saklama koşulları <span className="field-optional">İsteğe bağlı</span>
              <textarea name="storageConditions" maxLength={500} rows={2} />
            </label>
          </div>
        </section>
        <section className="panel-card">
          <div className="form-section-title">
            <span className="step-number">02</span>
            <div>
              <h2 className="panel-title">Görsel ve belgeler</h2>
              <p className="subtext">
                Ürün ve ambalaj görselleri gereklidir. Tüm dosyaların toplamı en fazla 4 MB
                olabilir.
              </p>
            </div>
          </div>
          <div className="form-grid">
            <label>
              Ürün fotoğrafı
              <input
                name="medicineImage"
                required
                type="file"
                accept="image/jpeg,image/png,image/webp"
              />
            </label>
            <label>
              Ambalaj / seri no fotoğrafı
              <input
                name="packageImage"
                required
                type="file"
                accept="image/jpeg,image/png,image/webp"
              />
            </label>
            <label>
              Fatura belgesi <span className="field-optional">İsteğe bağlı · Önerilir</span>
              <input
                name="invoiceDocument"
                type="file"
                accept="image/jpeg,image/png,image/webp,application/pdf"
              />
            </label>
            <label>
              Ek belge <span className="field-optional">İsteğe bağlı</span>
              <input
                name="otherDocument"
                type="file"
                accept="image/jpeg,image/png,image/webp,application/pdf"
              />
            </label>
          </div>
        </section>
      </SubmitForm>
    </main>
  );
}
