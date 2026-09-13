import { legalOperator } from "./config";

export type LegalSection = { title: string; paragraphs: string[]; items?: string[] };
export type LegalDocument = {
  title: string;
  summary: string;
  sections: LegalSection[];
  sources: { title: string; href: string }[];
};
const contact = `${legalOperator.name}; ${legalOperator.address}. Başvuru ve iletişim: ${legalOperator.email}.`;
const kvkkSource = {
  title: "KVKK — Aydınlatma yükümlülüğü",
  href: "https://www.kvkk.gov.tr/Icerik/2033/Aydinlatma-Yukumlulugu-"
};
const cookieSource = {
  title: "KVKK — Çerez Uygulamaları Hakkında Rehber",
  href: "https://www.kvkk.gov.tr/Icerik/7353/Cerez-Uygulamalari-Hakkinda-Rehber"
};
const transferSource = {
  title: "KVKK — Yurt dışına aktarımda standart sözleşmeler",
  href: "https://www.kvkk.gov.tr/Icerik/7938/Standart-Sozlesmeler-ve-Baglayici-Sirket-Kurallarina-Iliskin-Dokumanlar-Hakkinda-Kamuoyu-Duyurusu"
};
const medicineSource = {
  title: "Türk Eczacıları Birliği — 6197 sayılı Kanun, madde 24",
  href: "https://www.teb.org.tr/files/yardimci_eczacilar_icin/2_6197Say%C4%B1EczveEcznHakkKanun.pdf"
};
const communicationSource = {
  title: "Ticaret Bakanlığı — Ticari İletişim ve Ticari Elektronik İletiler Hakkında Yönetmelik",
  href: "https://kayseri.ticaret.gov.tr/yayinlar/tuketici/ticari-iletisim-ve-ticari-elektronik-iletiler-hakkinda-yonetmelik"
};

export const legalDocuments: Record<string, LegalDocument> = {
  "kullanim-kosullari": {
    title: "Kullanım Koşulları",
    summary: "Etakas hesabının kullanımı, işletme yükümlülükleri ve platformun hizmet sınırları.",
    sections: [
      {
        title: "1. Taraflar ve kapsam",
        paragraphs: [
          contact,
          "Bu koşullar, Etakas platformunu işletmesi adına kullanmaya yetkili kişi ile Sabot Yazılım arasındaki platform kullanımını düzenler. Başvuruyu gönderen kişi işletmeyi temsil yetkisi bulunduğunu ve verdiği bilgilerin doğru olduğunu beyan eder. Hizmet yalnızca mesleki ve ticari amaçla hareket eden yetkili işletmelere yöneliktir; bireysel tüketicilere ilaç temini hizmeti sunulmaz."
        ]
      },
      {
        title: "2. Hizmetin niteliği",
        paragraphs: [
          "Etakas; işletme başvurusu, stok ilanı incelemesi ve izin verilen işletmeler arası süreçlerin kayıt ve takibi için yazılım sunar. Platform eczane, ecza deposu, ruhsatlandırma makamı veya sağlık danışmanlığı hizmeti değildir. İşletmenin ya da bir ilanın platformda onaylanması ürünün mevzuata uygunluğu, gerçekliği veya kullanım güvenliği hakkında resmî bir belge oluşturmaz.",
          "Platformdaki kayıtlar ilgili resmî takip sistemlerinin yerine geçmez. Sistemde bir işlemin yapılabilmesi, o işleme hukuken izin verildiği anlamına gelmez. Kullanım, Platform Kuralları ve Sorumluluklar sayfasındaki ürün ve faaliyet sınırlarına tabidir."
        ]
      },
      {
        title: "3. Hesap ve erişim",
        paragraphs: [
          "Kişisel hesap bilgileri başkalarıyla paylaşılmamalıdır. E-posta erişiminin ve kullanılan cihazların korunması kullanıcıya aittir. Hesaba ait olağan dışı bir işlem fark edildiğinde destek adresine bildirim yapılmalıdır. İşletme kaydı, e-posta doğrulaması veya başvuru gönderimi kendiliğinden yönetici yetkisi vermez.",
          "Eksik veya çelişkili bilgi, yetki kaybı, kötüye kullanım ya da güvenlik olayı nedeniyle erişim sınırlandırılabilir; başvuru reddedilebilir veya ek bilgi istenebilir. İşletme ruhsatı, temsil yetkisi ve iletişim bilgileri değiştiğinde kullanıcı destek kanalı üzerinden güncelleme istemelidir."
        ]
      },
      {
        title: "4. İlanlar ve işlem kayıtları",
        paragraphs: [
          "İlanı oluşturan işletme; barkod, seri/lot, miktar, son kullanma tarihi, muhafaza şartları ve görsellerin doğruluğundan sorumludur. Reçete, hasta bilgisi, sağlık raporu veya üçüncü kişilere ait gereksiz kişisel bilgiler yüklenemez. Yetkisiz ürün, yanıltıcı ilan, sahte belge, spam ve sistemin işleyişini bozmaya yönelik işlemler yasaktır.",
          "Teslim bildirimi yalnızca fiilî teslim gerçekleştiğinde, alıcı onayı ise ürün ve belgeler kontrol edildikten sonra verilmelidir. İtirazlar sipariş ekranından iletilir; uyuşmazlık incelemesi için taraflardan açıklama ve belge istenebilir. Platform yöneticisinin teknik kayıt üzerindeki kararı, yargı mercilerinin yetkisini ortadan kaldırmaz."
        ]
      },
      {
        title: "5. Bakiye, ücret ve hizmet değişiklikleri",
        paragraphs: [
          "Platformda görülen referans değer ve takas bakiyesi, sistem içi işlem kaydıdır; banka hesabı, elektronik para veya nakit çekme hakkı değildir. Fatura, vergi ve resmî kayıt yükümlülükleri ilgili işlemin taraflarınca ayrıca yerine getirilir. Kullanıcıya açıkça sunulup kabul ettirilmeden ücretli abonelik veya ödeme yükümlülüğü kurulmaz.",
          "Hizmetin güvenliği ve bakımı için geçici kesinti veya işlev sınırlaması olabilir. Önemli koşul değişiklikleri kullanıcıya uygun kanallarla bildirilir; gerektiğinde yeni kabul alınır. Değişiklikler geçmiş işlemleri geriye dönük olarak yeniden tanımlamaz."
        ]
      },
      {
        title: "6. Sorumluluk, sona erme ve başvuru",
        paragraphs: [
          "Sabot Yazılım, kendi kanuni yükümlülüklerini ve kusurundan doğan sorumluluğunu ortadan kaldıran bir garanti veya feragat talep etmez. Platformun teknik işleyişi ile işletmelerin mesleki faaliyetleri ayrı sorumluluk alanlarıdır. Kesintisiz çalışma veya bütün ilanların hatasızlığı konusunda mutlak garanti verilmez.",
          "Hesap kapatma ve itiraz talepleri iletişim adresine gönderilebilir. Açık işlemler ve zorunlu saklama yükümlülükleri değerlendirilerek talep sonuçlandırılır. Bu koşullara Türk hukuku uygulanır; zorunlu görev ve yetki kuralları saklıdır. Tarafların kanuni başvuru hakları sınırlandırılmaz."
        ]
      }
    ],
    sources: [medicineSource]
  },
  "gizlilik-politikasi": {
    title: "Gizlilik Politikası",
    summary: "Hesabınız, belgeleriniz ve platform kullanımınızla ilgili gizlilik uygulamalarımız.",
    sections: [
      {
        title: "1. Kim tarafından uygulanır?",
        paragraphs: [
          contact,
          "Bu politika, Etakas ziyaretçileri, işletme temsilcileri ve kullanıcıları için geçerlidir. Kişisel veri işleme amaçları, hukuki sebepler ve haklar ayrıca KVKK Aydınlatma Metni'nde açıklanır."
        ]
      },
      {
        title: "2. Toplanan bilgiler",
        paragraphs: [
          "Kayıt ve hesap süreçlerinde ad-soyad, işletme türü, vergi/kimlik bilgileri, e-posta, telefon, adres, başvuru belgeleri, hesap doğrulama kayıtları ve hukuki metin kabul kayıtları işlenir. Kullanım sırasında ilan, sipariş, teslim, itiraz, bakiye ve yönetim işlem kayıtları oluşur. Güvenlik amacıyla IP adresi veya bunun güvenli türevleri, tarayıcı bilgileri ve giriş denemesi kayıtları kullanılabilir.",
          "Belge yükleme isteğe bağlıdır. Yalnızca işletme incelemesi için gereken kısımları paylaşın; ilgisiz fotoğraf, aile bilgisi, din, kan grubu veya başka gereksiz alanları kapatın. Hasta, reçete ve teşhis bilgileri platforma yüklenmemelidir."
        ]
      },
      {
        title: "3. Erişim ve altyapı",
        paragraphs: [
          "İşletme belgeleri herkese açık bir galeri olarak sunulmaz; yetkili işletme kullanıcısı ve yetkili yönetici erişimiyle paylaşılır. Süper yönetici, başvuru ve uyuşmazlıkları incelemek için gerekli kişisel bilgilere erişebilir. İşlem taraflarına sürecin yürütülmesi için gerekli işletme ve iletişim bilgileri açıklanabilir.",
          "Barındırma ve dosya depolama için Vercel, veritabanı için Neon, otomatik kötüye kullanım kontrolü için Cloudflare Turnstile ve hesap e-postaları için yapılandırılmış e-posta hizmeti kullanılır. Bu hizmetler veri işleyen veya kendi hizmetleri kapsamında ayrı veri sorumlusu olarak hareket edebilir. Yurt dışına aktarım konusundaki açıklama KVKK Aydınlatma Metni'ndedir."
        ]
      },
      {
        title: "4. Koruma ve saklama",
        paragraphs: [
          "Parolalar tek yönlü özet biçiminde tutulur; e-posta kodları tek kullanımlık ve süreli olarak yönetilir. Erişim kontrolü, özel dosya depolama, şifreli bağlantılar ve işlem kayıtları kullanılır. Dosyalar için antivirüs taraması şu anda sunulmaz; dosyanın platformda bulunması zararsız olduğu garantisi değildir.",
          "Veriler, kullanım amacı ile uygulanabilir yasal saklama ve uyuşmazlık süreleri için gereken süre boyunca tutulur. Amaç sona erdiğinde ve başka hukuki sebep kalmadığında silme, yok etme veya anonimleştirme uygulanmalıdır. Hesap kapatma her kaydın aynı anda silineceği anlamına gelmez; kalan kayıtların gerekçesi talep üzerine açıklanır."
        ]
      },
      {
        title: "5. Tercihler ve iletişim",
        paragraphs: [
          "Mevcut sürümde reklam, davranışsal hedefleme veya isteğe bağlı analiz çerezleri kullanılmaz. Çerez bilgisi ve tercih kaydı alt bölümdeki Çerez ayarları üzerinden görülebilir. E-posta doğrulaması ve parola kurtarma mesajları hesap güvenliği içindir; kayıt olurken reklam izni alınmaz.",
          `Gizlilik, düzeltme veya hesap kapatma talebinizi ${legalOperator.email} adresine iletebilirsiniz. Kimliğinizi doğrulamak için gerektiği ölçüde ek bilgi istenebilir; hiçbir zaman parolanız ya da doğrulama kodunuz istenmez.`
        ]
      }
    ],
    sources: [kvkkSource, transferSource]
  },
  "kvkk-aydinlatma": {
    title: "KVKK Aydınlatma Metni",
    summary:
      "6698 sayılı Kanun kapsamında veri sorumlusu, amaçlar, hukuki sebepler, aktarımlar ve başvuru haklarınız.",
    sections: [
      {
        title: "1. Veri sorumlusu",
        paragraphs: [
          contact,
          "Bu metin, Etakas ziyaretçileri ile işletme sahibi, yetkilisi ve kullanıcılarına kişisel verilerin elde edilmesi sırasında bilgi vermek için hazırlanmıştır. Aydınlatma metnini gördüğünüze ilişkin kayıt, ayrıca açık rıza verdiğiniz anlamına gelmez."
        ]
      },
      {
        title: "2. Veri grupları, amaç ve hukuki sebep",
        paragraphs: [
          "Aşağıdaki değerlendirme, işlenen verinin ilgili amaç bakımından gerekli ve ölçülü olması şartıyla uygulanır. Bir belgenin isteğe bağlı olması, içerdiği bütün kişisel veriler için sınırsız işleme izni vermez."
        ],
        items: [
          "Kimlik, iletişim, işletme ve temsil bilgileri: başvuruyu değerlendirmek, yetkili kişi ile hesap ilişkisini kurmak ve hizmeti sunmak; KVKK m.5/2-c kapsamında sözleşmenin kurulması/ifası ve gerekli ölçüde m.5/2-f kapsamında meşru menfaat.",
          "İlan, teslim, sipariş, bakiye, itiraz ve yazışma kayıtları: hizmeti yürütmek, uyuşmazlıkları incelemek ve hakları korumak; m.5/2-c ve m.5/2-e.",
          "Oturum, IP/güvenlik türevleri, hata ve doğrulama kayıtları: yetkisiz erişimi ve kötüye kullanımı önlemek; temel haklara zarar vermemek kaydıyla m.5/2-f.",
          "Hukuki metin sürümü, kabul ve başvuru kayıtları: bilgilendirme ve sözleşme sürecinin ispatı, başvuruların cevaplanması; uygun olduğu ölçüde m.5/2-ç ve m.5/2-e.",
          "Kanunen yetkili makamlara bildirim ve zorunlu kayıtlar: somut yükümlülüğün bulunduğu ölçüde m.5/2-a ve m.5/2-ç. Platform, bir yasal hüküm varmış gibi gereksiz veri toplamaz."
        ]
      },
      {
        title: "3. Toplama yöntemi ve özel nitelikli veriler",
        paragraphs: [
          "Veriler web formları, kullanıcı yüklemeleri, işlem ekranları, e-posta yazışmaları, çerezler ve güvenlik kayıtları aracılığıyla elektronik ortamda; gerektiğinde yazılı başvuru yoluyla toplanır. Bazı kayıtlar kullanıcının işlemi üzerine otomatik olarak oluşur.",
          "Sağlık bilgisi, biyometrik veri ve diğer özel nitelikli kişisel verilerin toplanması bu hizmetin amacı değildir. Kimlik ve meslek belgelerindeki gereksiz alanları kapatın. Böyle bir veri yanlışlıkla gönderildiyse kaldırılması için destek adresine başvurun. İleride ayrı bir işlem için açık rıza gerekirse amaç ve kapsam belirtilerek ayrıca talep edilir."
        ]
      },
      {
        title: "4. Alıcılar ve yurt dışına aktarım",
        paragraphs: [
          "Gerekli bilgiler; işlem karşı tarafı işletmelere, platformu işleten yetkili kişilere, barındırma/veritabanı/dosya depolama/e-posta ve güvenlik hizmeti sağlayıcılarına, gerektiğinde hukuk ve muhasebe danışmanlarına ve kanunen yetkili kamu kurumlarına amaçla sınırlı olarak aktarılabilir. Belgelerin tamamı pazar yerindeki bütün kullanıcılara açılmaz.",
          "Vercel, Neon, Cloudflare ve e-posta altyapısının sunucu veya destek konumları nedeniyle yurt dışına veri aktarımı söz konusu olabilir. Bu aktarımın KVKK m.9 kapsamında uygun mekanizmaya dayanması gerekir. Sağlayıcı sözleşmelerinin, veri konumlarının ve gereken bildirimlerin işletici tarafından doğrulanması gerekir; bu metin tek başına standart sözleşme, aktarım izni veya aktarım rızası değildir. Düzenli altyapı aktarımı için üyelikle birlikte genel bir açık rıza alınmaz."
        ]
      },
      {
        title: "5. Saklama ve imha",
        paragraphs: [
          "Başvuru, üyelik, işlem ve güvenlik kayıtları; amacın gerektirdiği süre, uygulanabilir kanuni yükümlülükler ve hak arama süreleri dikkate alınarak tutulur. İşleme şartlarının tamamı ortadan kalktığında ilgili veriler silinir, yok edilir veya anonim hale getirilir. İmha talepleri, tamamlanmamış işlemler ve zorunlu saklama sebepleri bakımından ayrıca değerlendirilir. Veriler süresiz saklanacak şekilde kullanılamaz."
        ]
      },
      {
        title: "6. Haklarınız ve başvuru",
        paragraphs: [
          "Kanunun 11. maddesi kapsamında verilerinizin işlenip işlenmediğini öğrenme, işleme hakkında bilgi ve amacına uygun kullanım açıklaması isteme, alıcıları öğrenme, yanlış kayıtların düzeltilmesini, şartları oluştuğunda silme/yok etmeyi ve bu işlemlerin alıcılara bildirilmesini isteme, yalnızca otomatik analiz sonucunda aleyhinize çıkan sonuca itiraz etme ve hukuka aykırı işleme nedeniyle zararın giderilmesini talep etme haklarına sahipsiniz.",
          `Başvurunuzu sistemde kayıtlı e-posta adresinizden ${legalOperator.email} adresine veya imzalı yazıyla ${legalOperator.address} adresine iletebilirsiniz. Başvuruda ad-soyad, talep konusu, yanıt adresi ve mevzuatın gerektirdiği kimlik bilgilerini belirtin. Başvuruya konu hakkı açıklamak için gerekli olmayan belge veya parolayı göndermeyin. Diğer mevzuata uygun başvuru yöntemleri de saklıdır.`,
          "Başvurular talebin niteliğine göre en kısa sürede ve en geç 30 gün içinde sonuçlandırılır. Kural olarak ücret alınmaz; ek maliyet varsa yalnızca Kurulun belirlediği tarife uygulanabilir. Cevabın yetersizliği, ret veya süresinde cevap verilmemesi halinde Kanundaki süre ve usulle Kurula şikâyet hakkınız vardır."
        ]
      }
    ],
    sources: [
      kvkkSource,
      transferSource,
      {
        title: "KVKK — Başvuru ve şikâyet süreleri",
        href: "https://www.kvkk.gov.tr/Icerik/5358/Kamuoyu-Duyurusu"
      }
    ]
  },
  "cerez-politikasi": {
    title: "Çerez Politikası",
    summary:
      "Etakas'ta yalnızca hesap ve güvenlik işlevleri ile çerez tercih kaydı için gerekli teknolojiler kullanılır.",
    sections: [
      {
        title: "1. Amaç ve veri sorumlusu",
        paragraphs: [
          contact,
          "Çerez, tarayıcınızda tutulan küçük bir kayıttır. Benzer amaçla yerel depolama da kullanılabilir. Oturum açmak ve güvenlik doğrulamasını yürütmek için gerekli teknolojiler, hizmetin sunumu ve güvenliğine ilişkin uygun hukuki sebebe dayanır; reklam rızasıyla birleştirilmez."
        ]
      },
      {
        title: "2. Kullanılan kayıtlar",
        paragraphs: [
          "Mevcut sürümde aşağıdaki kayıtlar kullanılabilir. Güvenlik sağlayıcısı davranışı hizmetin yapılandırmasına göre değişebilir."
        ],
        items: [
          "e_takas_session — Etakas, birinci taraf oturum çerezi. Oturumunuzu tanır; HttpOnly korumalıdır. En fazla 7 gün veya çıkış yapana/oturum iptal edilene kadar.",
          "e_takas_cookie_notice — Etakas, birinci taraf tercih çerezi. Çerez bilgilendirmesini gördüğünüzü saklar; kimlik veya reklam profili içermez. 6 ay.",
          "Cloudflare Turnstile — kayıt, giriş ve kurtarma formlarında bot kontrolü. IP ve tarayıcı/sinyal verileri güvenlik doğrulaması için sağlayıcıya iletilebilir. cf_clearance yalnızca sağlayıcının ön doğrulama özelliği etkinleştirilirse oluşabilir; uygulama bu özelliği talep etmez.",
          "Reklam, pazarlama ve isteğe bağlı analiz çerezleri — etkin değildir; bu kategorilerde bir tercih veya onay toplanmaz."
        ]
      },
      {
        title: "3. Tercihlerin yönetimi",
        paragraphs: [
          "Alt bölümdeki Çerez ayarları bağlantısından kullanılan kategorileri görebilir ve bilgilendirme tercihinizi kaydedebilirsiniz. Zorunlu teknolojileri tarayıcı ayarlarından engelleyebilirsiniz; bu durumda giriş veya form gönderimi çalışmayabilir. Yalnızca gerekli kayıtlar kullanıldığı için sizden gereksiz bir 'tümünü kabul et' onayı istenmez.",
          "İleride isteğe bağlı teknolojiler eklenirse önceden kapalı tutulacak, amaç/sağlayıcı/süre bilgisi gösterilecek ve kabul ile reddetme eşit erişilebilir seçenekler olarak sunulacaktır. Onay verilmeden bu teknolojiler başlatılmamalıdır; verilen onay geri alınabilir olmalıdır."
        ]
      },
      {
        title: "4. Aktarım ve haklar",
        paragraphs: [
          "Güvenlik sağlayıcısıyla paylaşılan teknik verilerin yurt dışına aktarımı KVKK Aydınlatma Metni'ndeki açıklamalara tabidir. Çerez ve kişisel veri sorularınızı başvuru adresine iletebilirsiniz. Bu sayfayı okumak, reklam veya genel veri işleme rızası vermek anlamına gelmez."
        ]
      }
    ],
    sources: [
      cookieSource,
      {
        title: "Cloudflare — Turnstile gizlilik açıklaması",
        href: "https://www.cloudflare.com/privacypolicy/"
      }
    ]
  },
  "acik-riza": {
    title: "Açık Rıza Bilgilendirmesi",
    summary:
      "Açık rıza yalnızca belirli ve isteğe bağlı bir işlem için hukuken gerekli olduğunda ayrıca istenir.",
    sections: [
      {
        title: "1. Mevcut hizmette yaklaşım",
        paragraphs: [
          "Hesap açılışı için kullanım koşullarını kabul etmeniz ve KVKK aydınlatmasını gördüğünüzü belirtmeniz istenir. Bunlar genel bir kişisel veri işleme rızası değildir. Hizmetin kurulması veya güvenliği için başka bir kanuni işleme şartı bulunan veriler bakımından ayrıca açık rıza alınmaz.",
          "Şu anda pazarlama, davranışsal analiz veya başka bir isteğe bağlı veri kullanımı sunulmadığı için genel bir açık rıza kutusu bulunmaz. Bu sayfa tek başına herhangi bir rıza beyanı oluşturmaz."
        ]
      },
      {
        title: "2. Ayrı bir işlem eklenirse",
        paragraphs: [
          "İlgili işlem öncesinde veri sorumlusu, işlenecek veri grubu, tekil amaç, alıcılar, süre ve varsa aktarım bilgisi size gösterilir. Rıza aktif seçiminizle alınır; önceden işaretlenmez, farklı amaçlarla birleştirilmez ve zorunlu hizmetin koşulu haline getirilmez.",
          `Böyle bir tercih sunulduğunda verdiğiniz rızayı aynı alandan veya ${legalOperator.email} adresine yazarak geri alabilirsiniz. Geri alma geçmişte hukuka uygun yapılan işlemleri etkilemez; rızaya dayanan sonraki işlem durdurulur.`
        ]
      }
    ],
    sources: [
      {
        title: "KVKK — Açık rızanın hizmet şartına bağlanması",
        href: "https://kvkk.gov.tr/Icerik/5412/Acik-Rizanin-Hizmet-Sartina-Baglanmasi"
      }
    ]
  },
  "ticari-ileti": {
    title: "Elektronik İleti Bilgilendirmesi",
    summary: "Hesap güvenliği mesajları ile reklam ve kampanya iletilerini nasıl ayırıyoruz?",
    sections: [
      {
        title: "1. Hizmet mesajları",
        paragraphs: [
          "Etakas, girişte e-posta doğrulaması ve parola kurtarma gibi talep ettiğiniz hesabın güvenliğini sağlayan işlem mesajları gönderir. Gerekli hesap ve başvuru bilgilendirmeleri de hizmetin yürütülmesi içindir. Bu mesajlara reklam içeriği eklenmez."
        ]
      },
      {
        title: "2. Pazarlama tercihi",
        paragraphs: [
          "Mevcut sürümde kampanya bülteni, reklam e-postası veya pazarlama SMS'i gönderimi yapılmaz; kayıt sırasında ticari ileti onayı toplanmaz. İşletme hesabı açmak, pazarlama izni vermek anlamına gelmez.",
          "Böyle bir hizmet başlatılmadan önce uygulanabilir ticari ileti/İYS kuralları değerlendirilir; gerektiğinde kanal ve gönderici belirtilerek ayrı onay alınır, ret yöntemi sağlanır. Bu bilgilendirme sayfası kendiliğinden ticari ileti izni sayılmaz."
        ]
      },
      {
        title: "3. Şüpheli ileti ve iletişim",
        paragraphs: [
          `Etakas adına parolanız veya doğrulama kodunuz istenirse paylaşmayın. Şüpheli mesajı ve ileti tercihlerine ilişkin talebinizi ${legalOperator.email} adresine iletebilirsiniz.`
        ]
      }
    ],
    sources: [communicationSource]
  },
  "platform-kurallari": {
    title: "Platform Kuralları ve Sorumluluklar",
    summary: "Mesleki yetki, ürün güvenliği ve mevzuata uygun işlem konusunda sınırlar.",
    sections: [
      {
        title: "1. Yetki ve faaliyet sınırı",
        paragraphs: [
          "Etakas bireysel tüketiciye ilaç satışı, reçete yönlendirme veya tedavi önerisi sunmaz. 6197 sayılı Kanunun 24. maddesinde elektronik ortamda ilaç satışına ilişkin yasak ve eczaneler arası takasın İlaç Takip Sistemi'ne bildirimi düzenlenir. Platformun işlev adı veya 'takas' ifadesi bir işlemi kendiliğinden hukuka uygun hale getirmez.",
          "Eczaneler için tanınan bir işlem imkânı veteriner işletmeleri arasında veya farklı işletme türleri arasında otomatik olarak geçerli sayılamaz. İlgili ürün ve taraflar için ruhsat, tedarik, devir ve takip mevzuatı ayrıca değerlendirilmelidir. Resmî süreçler ve gerekli hukuki değerlendirme tamamlanmadan gerçek ürün transferi başlatılamaz."
        ]
      },
      {
        title: "2. Ürün ve kayıt sorumluluğu",
        paragraphs: [
          "İşletme; ürünün yasal kaynağını, gerçekliğini, ambalaj bütünlüğünü, miadını, lot/seri bilgisini ve saklama koşullarını kontrol etmelidir. Platform onayı bu kontrollerin yerine geçmez. Gerekli fatura ve resmî takip bildirimleri tarafların yükümlülüğündedir.",
          "Miadı geçmiş, geri çağrılmış, sahte, hasarlı, izlenebilirliği bulunmayan veya saklama koşulları bozulmuş ürünler paylaşılmamalıdır. Soğuk zincir, biyolojik ve özel kontrole tabi ürünler mevcut akışın dışındadır. Teknik filtrelerin bir ürünü engellememesi, o ürünün uygun olduğu anlamına gelmez."
        ]
      },
      {
        title: "3. Teslim, itiraz ve olay bildirimi",
        paragraphs: [
          "Teslimden önce ürün, miktar, lot/seri ve ambalaj kayıtları karşılaştırılmalıdır. Uygunsuzlukta teslim onayı verilmemeli, ürün uygun şekilde ayrılmalı ve sipariş ekranından itiraz açılmalıdır. Gerekli durumlarda yetkili sağlık veya tarım makamlarına yapılacak bildirim platform bildiriminden bağımsızdır.",
          `Güvenlik olayı, yanıltıcı ilan veya yetkisiz kullanım için ${legalOperator.email} adresine ulaşabilirsiniz. Bildiriminize hasta verisi eklemeyin. Yönetici incelemesi, tarafların resmî başvuru ve mesleki sorumluluklarını ortadan kaldırmaz.`
        ]
      },
      {
        title: "4. Kişisel veri ve mesleki gizlilik",
        paragraphs: [
          "Hasta, reçete, teşhis veya üçüncü kişilerin sağlık bilgileri yüklenemez. Belge görsellerinde inceleme için gerekli olmayan alanlar kapatılmalıdır. İşlem sırasında edinilen işletme iletişim bilgileri reklam listesi oluşturmak ya da başka amaçlarla dağıtmak için kullanılamaz."
        ]
      }
    ],
    sources: [medicineSource]
  }
};

export const legalLinks = Object.entries(legalDocuments).map(([slug, document]) => ({
  href: `/hukuki/${slug}`,
  title: document.title
}));
