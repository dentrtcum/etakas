import type { Metadata } from "next";
import Link from "next/link";
import { Plus, Mail } from "lucide-react";
import { PageHeading } from "@/components/ui";
import { legalOperator } from "@/lib/legal/config";

export const metadata: Metadata = {
  title: "Sıkça sorulan sorular",
  description: "Etakas işletme başvurusu, giriş, güvenlik, belgeler ve kullanım hakkında yanıtlar."
};
const questions = [
  [
    "Etakas kimler içindir?",
    "Platform, eczane ve veteriner işletmelerinin yetkili temsilcilerine yönelik işletme başvurusu ve stok süreçlerini yönetmek için geliştirilir. Bireysel tüketicilere ilaç satışı, reçete yönlendirmesi veya sağlık danışmanlığı sunulmaz. Her işletme ve ürün türü için izin verilen işlemler ayrıca değerlendirilir."
  ],
  [
    "Başvuruda hangi bilgiler istenir?",
    "İşletme türü, yetkili kişinin adı soyadı, vergi numarası, işletme sahibinin kimlik numarası, iletişim bilgileri ve açık adres istenir. İşletme unvanı, ruhsat/izin numarası, meslek odası adı ve yetkili görevi/unvanı alanları bulunmaz."
  ],
  [
    "Belgeleri hemen yüklemem gerekiyor mu?",
    "Açık adres zorunludur. Ruhsat, vergi levhası, kimlik, diploma, oda kaydı ve yetki belgeleri isteğe bağlıdır; incelemeyi kolaylaştırdığı için önerilir. Belgelerinizi daha sonra işletme hesabınızdan tamamlayabilirsiniz. Gereksiz kişisel bilgileri kapatın; hasta ve sağlık verilerini paylaşmayın."
  ],
  [
    "Hesabıma nasıl giriş yaparım?",
    "E-posta ve parolanızdan sonra hesabınıza gönderilen süreli, tek kullanımlık kodu girersiniz. E-posta doğrulaması işletme kullanıcıları ve süper yönetici için de gereklidir. Kodunuzu kimseyle paylaşmayın."
  ],
  [
    "Doğrulama e-postası gelmezse ne yapmalıyım?",
    "Spam ve gereksiz klasörünü kontrol edin, adresin doğru olduğundan emin olun. Gönderim aralığı geçtikten sonra formdan yeniden kod isteyebilirsiniz. Sorun sürerse destek adresine yazın; parolanızı veya kodunuzu mesajınıza eklemeyin."
  ],
  [
    "Parolamı unuttum, nasıl yenilerim?",
    "Giriş sayfasındaki Parolamı unuttum bağlantısını kullanın. Kayıtlı e-postanıza gönderilen doğrulama koduyla yeni bir parola belirleyebilirsiniz. Süper yönetici de hesabınız için kurtarma sürecini başlatabilir; mevcut parolanız görüntülenmez veya e-postayla gönderilmez."
  ],
  [
    "Hesabım neden geçici olarak kilitlendi?",
    "Tekrarlanan hatalı giriş denemeleri hesabı geçici olarak kilitleyebilir. İstek sınırında ekranda belirtilen süreyi bekleyin. Size ait olmayan girişlerden şüpheleniyorsanız parola kurtarmayı kullanın ve destek ekibine bildirin."
  ],
  [
    "Yeni kayıt olunca yönetici paneline girebilir miyim?",
    "Hayır. İşletme kaydı yalnızca işletme kullanıcısı yetkisi oluşturur. Yönetici paneli ayrı olarak süper yönetici yetkisine sahip hesaba açıktır; adresini bilmek erişim yetkisi vermez."
  ],
  [
    "Hemen ilaç takası yapabilir miyim?",
    "Başvuru onayı tek başına gerçek ürün transferi izni değildir. Platformun kullanıma açılması, tarafların mesleki yetkileri ve ilgili ürünün mevzuatı ayrıca değerlendirilir. Gerçek işlem koşulları sağlanmadığında ilan ve sipariş işlemleri kapalı tutulur. Platform kayıtları İlaç Takip Sistemi ve diğer resmî yükümlülüklerin yerine geçmez."
  ],
  [
    "Belgelerimi kim görebilir?",
    "Belgeler herkese açık olarak listelenmez. Yetkili işletme kullanıcısı ile inceleme yetkisi bulunan süper yönetici erişebilir. Teslim ve uyuşmazlık süreçlerinde gerekli iletişim bilgileri işlem taraflarına paylaşılabilir."
  ],
  [
    "Takas bakiyesi nakit para mıdır?",
    "Hayır. Referans değer ve bakiye, sistem içindeki işlem kayıtlarını ifade eder; banka hesabı, elektronik para veya nakit çekme hakkı oluşturmaz. Fatura, vergi ve resmî bildirim sorumlulukları ayrıca yerine getirilmelidir."
  ],
  [
    "Reklam çerezi veya pazarlama e-postası kullanılıyor mu?",
    "Mevcut sürümde isteğe bağlı analiz/reklam çerezi ve pazarlama gönderimi yoktur. Oturum ve güvenlik için gerekli teknolojiler kullanılır. Hesap doğrulama ve parola kurtarma e-postaları talep ettiğiniz güvenlik işlemleri içindir. Çerez ayarlarına sayfanın altından ulaşabilirsiniz."
  ],
  [
    "Hesabım veya kişisel verilerim için nasıl başvururum?",
    `Kayıtlı e-posta adresinizden ${legalOperator.email} adresine talebinizi iletebilirsiniz. Başvuru yöntemleri, haklarınız ve saklama koşulları KVKK Aydınlatma Metni'nde açıklanır. Açık işlemler ve zorunlu saklama sebepleri nedeniyle hesap kapatma tüm kayıtların aynı anda silinmesi anlamına gelmeyebilir.`
  ]
];
export default function FaqPage() {
  return (
    <main className="page-container">
      <PageHeading
        eyebrow="YARDIM MERKEZİ"
        title="Sıkça sorulan sorular"
        description="Başvurudan hesap güvenliğine, Etakas hakkında merak ettikleriniz."
      />
      <div className="faq-layout">
        <section className="faq-list" aria-label="Sorular ve yanıtlar">
          {questions.map(([question, answer]) => (
            <details className="faq-item" key={question}>
              <summary>
                {question}
                <Plus size={18} aria-hidden="true" />
              </summary>
              <p>{answer}</p>
            </details>
          ))}
        </section>
        <aside className="panel-card help-card">
          <Mail size={25} aria-hidden="true" />
          <h2>Yardıma ihtiyacınız var mı?</h2>
          <p>
            Sorunuzu ve ilgili ekranı paylaşın. Parolanızı, doğrulama kodunuzu veya hasta bilgisi
            göndermeyin.
          </p>
          <a className="text-link" href={`mailto:${legalOperator.email}`}>
            {legalOperator.email}
          </a>
          <Link className="button button-secondary" href="/hukuki">
            Hukuki metinler
          </Link>
        </aside>
      </div>
    </main>
  );
}
