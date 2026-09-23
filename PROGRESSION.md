# Etakas ilerleme kaydı

Son güncelleme: 23 Eylül 2026. Bu dosya güncel durum ve kesinti sonrası devam noktasıdır.

## Güncel durum

- Son özellik commit'i: `220b139` (`main`).
- Vercel projesi: `dicrocoellium/etakas`.
- Eski Vercel adresi çalışıyor: `https://etakas.vercel.app`.
- Yeni kanonik adres: `https://www.etaks.com.tr`.
- `https://etaks.com.tr` HTTPS üzerinden kalıcı `308` ile `https://www.etaks.com.tr/` adresine yönleniyor.
- Vercel CLI alan adını `configured_correctly`, projeye bağlı ve doğrulanmış olarak bildirdi. `www` HTTPS üzerinden `200` döndürüyor.
- Genel DNS: `dns1.turhost.com` / `dns2.turhost.com`; kök A kaydı `216.198.79.1`; `www` CNAME kaydı `adb8269a24912b22.vercel-dns-017.com`.
- Kullanıcı gerçek CAPTCHA, Gmail parola yenileme bağlantısı, giriş doğrulama kodu, parola değişikliği ve oturumlu çıkış akışlarını doğruladı.
- Kullanıcı 19 Eylül 2026 tarihinde hukuki metinlerin ve ilaç devrine ilişkin mesleki/resmî uygunluğun incelenip onaylandığını bildirdi.

## 23 Eylül 2026 ikinci süper admin yetkilendirmesi

- [x] Kullanıcının açık talebiyle e-postası doğrulanmış ve etkin ikinci hesaba global `SUPER_ADMIN` rolü verildi; toplam süper admin sayısı 2 olarak bağımsız sorguyla doğrulandı.
- [x] Yetki yükseltmesinden önce doğrulanmış Neon yedeği alındı. Hedef hesabın mevcut oturumları sonlandırıldı, kimlik doğrulama sürümü artırıldı ve işlem değiştirilemez denetim kaydına yazıldı.
- [x] İşletme üyeliğinin tek başına yönetici yetkisi vermediği korundu; ilgili hesap yeniden giriş ve e-posta doğrulamasından sonra yönetim alanına erişebilir.

## 20 Eylül 2026 kapatılan işletme kullanıcıları

- [x] Admin panelindeki “Kullanıcı güvenliği” sorgusu işletme durumunu dikkate alacak şekilde düzeltildi. Yalnızca `CLOSED` işletmelere bağlı kullanıcılar listeden çıkarılıyor; süper admin ve kapatılmamış en az bir işletmeye bağlı kullanıcılar görünmeye devam ediyor.
- [x] Filtre veritabanı sorgusunda sayfalama öncesinde uygulanıyor; kapalı kullanıcıların ilk 20 kayıt sınırında boşluk veya yanlış sayfalama oluşturması engellendi.
- [x] Regresyon testi eklendi. TypeScript, ESLint, 32 dosya / 135 birim testi ve 28 sayfalı Next.js Production build geçti.
- [x] Düzeltme `220b139` commit’iyle GitHub `main` dalına gönderildi. Vercel Production deployment `dpl_GGLoZgJ1b7Msfk9rNuijVgwnG4A5` 40 saniyede `READY` oldu ve üretim alan adlarına bağlandı.
- [x] Canlı Neon doğrulamasında 2 kullanıcıdan aktif kapsamda kalan 1 kullanıcı görünürken yalnızca kapalı işletmeye bağlı 1 kullanıcı filtrelendi. Admin rotası anonim isteği güvenli biçimde girişe yönlendirdi ve son 10 dakikalık Vercel hata taraması temizdi.

## 20 Eylül 2026 TİTCK SKRS barkod kataloğu

- [x] Resmi **TİTCK SKRS E-Reçete İlaç ve Diğer Farmasötik Ürünler Listesi** için platformun manuel kataloğundan ayrı `titck_skrs_products` tablosu ve `0008_titck_skrs_catalog` migration'ı oluşturuldu.
- [x] TİTCK'nin 15 Eylül 2026 tarihli resmi XLSX dosyasındaki etkin ürün sayfası bağımlılıksız normalizer ile işlendi; 7.945 benzersiz etkin barkod yerel kabul veritabanına aktarıldı.
- [x] Barkod araması TİTCK → manuel platform kataloğu sırasını izliyor. Resmi eşleşme yoksa kullanıcı açıkça uyarılıyor, manuel alanlar açılıyor ve barkod mevcut yöntemle kataloğa kaydediliyor.
- [x] İlan gönderiminde resmi ürün adı/ATC/üretici bilgileri sunucuda yeniden doğrulanıyor. TİTCK kaynaklı operasyon kayıtları adminin düzenlenebilir barkod kataloğundan ayrıldı ve gizlendi.
- [x] USB barkod okuyucuların rakam dizisi + `Enter` davranışı, elle giriş ve mevcut kamera tarama desteği birlikte korunuyor.
- [x] İçe aktarma işlemi 1.000'den az satırlı şüpheli dosyayı ve mevcut sürümden eski resmi listeyi reddediyor; güncelleme tek transaction içinde uygulanıyor.
- [x] Yerel doğrulama: TypeScript, ESLint, 31 dosya / 134 birim testi, gerçek PostgreSQL üzerinde 6 entegrasyon testi, 28 sayfalı Production build ve masaüstü/mobil Chromium'da 6 uçtan uca test geçti. Tarayıcı konsol hatası bulunmadı.
- [x] Canlı Neon yedeği alındı ve ayrı yerel veritabanına geri yükleme provası yapıldı. `0008` migration'ı uygulandı; 7.945 etkin resmi kayıt içe aktarıldı ve mevcut iş kayıtlarının korunduğu bağımsız sorguyla doğrulandı.
- [x] Kod `2d3fc88` commit'iyle GitHub `main` dalına gönderildi. Vercel Production deployment `dpl_DMUrkTPEFFw7jE2g5ozfEpqNiGmg` 47 saniyelik build sonunda `READY` oldu ve tüm üretim alan adlarına bağlandı.
- [x] Canlı smoke testi: `www` ana sayfa ve giriş `200`, kök alan adı `308`, barkod API anonim isteği `401`; güvenlik başlıkları, giriş ekranındaki Turnstile, tarayıcı konsolu ve son 10 dakikalık Vercel hata logları temiz.

## 20 Eylül 2026 sipariş, ilan ve bildirim çalışması

- [x] İşletme siparişleri “Devam eden siparişler” ve “Geçmiş siparişler” olarak ayrıldı; büyük bölümler ve sipariş kartları açılır/kapanır hale getirildi.
- [x] Sipariş taraflarına alıcı ve satıcının eczane adı, yetkili adı, telefon, e-posta, il/ilçe ve açık adres bilgileri yalnızca sipariş tarafları ile süper admin için gösteriliyor.
- [x] Pazar yeri ilan kartları ayrı, büyük ilan ayrıntı sayfasına bağlandı. Ürün ayrıntıları, görseller, satıcı, rezervasyon alanı ve tamamlanmış alımlarda alan işletme ile miktar gösteriliyor.
- [x] Pazar yeri filtreleri açılır/kapanır hale getirildi; aktif ilan görsellerine yalnızca onaylı ve ürün türüyle uyumlu pazar yeri katılımcıları erişebiliyor.
- [x] Admin sipariş ekranı tüm durumları listeliyor; sipariş, ürün, taraf iletişim bilgileri, zamanlar, teslim kayıtları, teslim açıklaması, itirazlar ve yönetim işlemleri açılır kartlarda gösteriliyor.
- [x] Yeni sipariş, satıcı teslim bildirimi ve sipariş tamamlanması ilgili işletme üyelerine bildirim oluşturuyor. Bu bildirimler girişte duyurular gibi büyük bir pencere olarak gösteriliyor ve Siparişlerim sayfasına güvenli biçimde yönlendiriyor.
- [x] Bildirim geçmişi açılır kartlara dönüştürüldü; kullanıcı yalnızca kendisine ait tek bildirimi veya okunmuş bildirimlerinin tamamını silebiliyor.
- [x] Yeni erişim ve bildirim davranışları gerçek yerel PostgreSQL üzerinde 5 entegrasyon testiyle doğrulandı.
- [x] Masaüstü ve mobil Chrome’da 6 uçtan uca test geçti: ilan ayrıntısı/alım geçmişi, aktif-geçmiş sipariş ayrımı, iki taraf bilgileri, büyük teslim bildirimi, bildirim silme, admin tam sipariş ayrıntısı, yetki ayrımı ve güvenli çıkış. Tarayıcı konsol hatası bulunmadı.
- [x] Son doğrulama: TypeScript, ESLint, 31 dosya / 133 birim testi, gerçek PostgreSQL entegrasyon testleri ve 28 sayfalı Next.js Production build geçti.
- [x] Kod `40c2f82` commit’iyle GitHub `main` dalına gönderildi. Vercel Production dağıtımı `dpl_2H4VVpsJXpJdpf59j27ExS8d22wE` 46 saniyede `READY` oldu ve `www.etaks.com.tr`, `etaks.com.tr` ile `etakas.vercel.app` alan adlarına bağlandı.
- [x] Canlı smoke testi: kanonik ana sayfa HTTPS `200`, kök alan adı kalıcı `308`, korumalı pazar yeri anonim kullanıcıyı girişe yönlendirdi; tarayıcıda ana içerik ve gezinme doğrulandı, konsol hatası ve son 10 dakikalık Vercel hata logu bulunmadı.

## 19 Eylül 2026 son kabul çalışması

- [x] İşletme kaydındaki il ve ilçe alanları 81 il ve seçilen ile bağlı 973 ilçeyi sunan listelere dönüştürüldü; API geçersiz il-ilçe eşleşmelerini reddediyor.
- [x] İl-ilçe değişikliği TypeScript, ESLint, 31 dosya / 133 birim testi ve Production build ile doğrulandı. Tarayıcıda il seçilmeden ilçe alanının kapalı, Kars seçildiğinde yalnızca bağlı sekiz ilçenin açık olduğu ve konsol hatası bulunmadığı kontrol edildi.
- [x] `adf21bb` GitHub `main` dalına gönderildi. Vercel Production deployment `dpl_ANwoRzyf9X1rqHVXiQYEs4Z5GK1Y` 41 saniyelik build sonrasında `READY` oldu; kanonik alan adında il-ilçe seçimi ve Turnstile bileşeni hatasız doğrulandı, son bir saatlik hata logu taramasında kayıt bulunmadı.
- [x] Boş üst kredi sınırının `0 TL` sayılması düzeltildi; boş değer yeniden sınırsız üst limit oluşturuyor.
- [x] Adminin mevcut bakiye düzeltmesine istemci üretimli idempotency anahtarı eklendi. Aynı istek tekrarlandığında bakiye ikinci kez değişmiyor; farklı içerikle anahtar tekrar kullanılırsa `409` dönüyor.
- [x] Kalan satış kapasitesi hesabına devam eden satışlardan beklenen tutar eklendi; kullanıcı arayüzünde ayrıca gösteriliyor.
- [x] Devam eden işlem sayısı tüm açık sipariş durumlarını kapsayacak şekilde ortak durum listesine bağlandı.
- [x] Mesaj rozeti sayfa yenilemeden güncelleniyor. Mesajlar sayfasına girmek bütün mesajları okundu yapmıyor; yalnızca açılan görüşmede ekranda gösterilen mesaj kimlikleri okunuyor.
- [x] Migration `0007_message_read_tracking` canlı Neon veritabanına uygulandı; bağımsız sorgu `notifications.message_id` sütununu ve toplam `7` migration kaydını doğruladı.
- [x] Migration öncesi canlı yedek: `.cache/backups/etakas-before-0007-2026-09-19T19-41-45.dump`, `133383` bayt, SHA-256 `ddb88b545e45007fa662fa324af98760132a4ee1444c1153ffc4de53ba72cdb2`.
- [x] Bu yedek ayrı yerel `restore_0007` veritabanına geri yüklendi; `1` kullanıcı, `1` işletme ve `6` migration kaydı açıldı.
- [x] Gerçek yerel PostgreSQL ile 5 kabul testi geçti: eşzamanlı sipariş sınırı, negatif bakiye, iptal/teslim tekrarı, admin bakiye idempotency, sohbet ve destek erişim ayrımı.
- [x] Masaüstü ve mobil Chrome'da 4 uçtan uca kabul testi geçti: genel/hukuki sayfalar, işletme paneli, rozet güncellemesi, normal kullanıcının admin reddi ve güvenli çıkış. Tarayıcı konsol hatası görülmedi.
- [x] Son doğrulama: TypeScript ve ESLint geçti; 30 dosyada 130 birim testi geçti; npm audit `0` bilinen açık bildirdi; Next.js Production build geçti.
- [x] Vercel Production ortamına `LEGAL_CONTENT_APPROVED` eklendi.
- [x] Kullanıcının açık izninden sonra `TRADING_MODE=production`, `LEGAL_APPROVAL_CONFIRMED=true` ve `LIVE_TRADING_ENABLED=true` yalnızca Production kapsamına ayrıldı. Preview ortamında gerçek takas açılmadı.
- [x] Değişiklikler `ccfdc42` commit'iyle GitHub `main` dalına gönderildi; yerel ve uzak commit kimlikleri eşleşiyor.
- [x] Yeni ortam değerleriyle yeniden dağıtılan `dpl_DvS3E66AQ1ywT8ZvKL3XmBmAC6fM` Production deployment'ı `READY` oldu. `www.etaks.com.tr`, `etaks.com.tr` ve `etakas.vercel.app` bu sürüme bağlandı.
- [x] Production smoke testi: ana sayfa, giriş ve hukuki sayfalar HTTPS `200`; kök alan adı kanonik `www` adresine yönleniyor; Chromium'da anlamlı içerik, Turnstile bileşeni ve hata katmanı bulunmaması doğrulandı. Son bir saatlik Vercel hata logu taramasında kayıt bulunmadı.
- Uygulama Production ortamında gerçek işlemlere açıldı. Kurumsal göndericiye geçiş ve aşağıdaki genişletilmiş operasyon kontrolleri takip işi olarak korunuyor.

## Tamamlanan işler

- [x] Güvenlik yaması, bağımlılık yükseltmeleri ve kullanılmayan ikinci kimlik doğrulama altyapısının kaldırılması.
- [x] Her girişte e-posta kodu; süre, deneme sınırı, tarayıcı bağlama ve tek kullanımlılık.
- [x] E-postayla parola kurtarma, oturum sürümleme/geçersizleştirme, hesap kilidi ve yönetici güvenlik işlemleri.
- [x] Global `SUPER_ADMIN` rolleri işletme üyeliklerinden ayrı tutulur; işletme kaydı yönetici yetkisi vermez ve işletme/kaynak bazında sunucu yetkilendirmesi uygulanır.
- [x] Cloudflare Turnstile, kalıcı hız sınırı, Origin/CSRF, istek boyutu ve güvenlik başlıkları.
- [x] Hız sınırı sorgusundaki PostgreSQL tarih aktarımı hatası `2312ce9` ile düzeltildi ve canlıda doğrulandı.
- [x] Özel dosyalarda tür/boyut kontrolü, görüntü yeniden kodlama, erişim denetimi ve başarısız işlem temizliği.
- [x] Stok/sipariş/defter kilitlemesi, idempotency ve ilan/ürün tutarlılığı düzeltmeleri.
- [x] Sürümlü alan şifreleme ve eski anahtarla okuma desteği.
- [x] Yeni logo, profesyonel arayüz, sade animasyonlar, SSS, hukuki sayfalar, çerez bilgilendirmesi ve sürümlü kabul kayıtları.
- [x] Gmail SMTP Production ayarları; gerçek parola yenileme ve giriş kodu teslimi.
- [x] Çıkışın ham API ekranına gitmesi düzeltildi; kullanıcı oturumlu çıkışı doğruladı.
- [x] Neon migration öncesi yedek ve `0005_security_auth` migration uygulaması.
- [x] GitHub `main` ve Vercel Production yayını.
- [x] `etaks.com.tr` ve `www.etaks.com.tr` DNS, Vercel proje bağlantısı, HTTPS ve kökten `www` adresine yönlendirme.

## Sıradaki zorunlu yapılandırma

- [x] Vercel Production `APP_URL` değeri `https://www.etaks.com.tr` yapıldı ve Production yeniden dağıtıldı (`18 Eylül 2026`).
- [x] Cloudflare Turnstile widget Hostname Management bölümüne `etaks.com.tr` eklendi. Uygulamadaki `TURNSTILE_ALLOWED_HOSTNAMES` değeri `www.etaks.com.tr,etaks.com.tr` olarak ayarlandı.
- [ ] Yeni alan adında CAPTCHA arayüzü giriş, işletme kaydı ve parola kurtarma sayfalarında doğrulandı. Gerçek giriş, parola kurtarma bağlantısı, e-posta kodu ve çıkış akışlarını yeniden doğrulamak.
- [ ] Kurumsal e-posta adresi ve işlem e-postası sağlayıcısını seçmek; alan adı doğrulaması ile SPF, DKIM ve gerekiyorsa DMARC kayıtlarını eklemek.
- [ ] Gmail geçici göndericisinden kurumsal göndericiye geçip gerçek teslimi yeniden doğrulamak.

## 0006 platform kapsamı

- [x] Negatif bakiyeyi açık alt kredi sınırı olarak yöneten yapı; isteğe bağlı üst kredi sınırı ve sipariş rezervasyonu/tamamlanmasında iki sınırın denetimi.
- [x] Admin için işletme bazında veya tüm onaylı işletmelere toplu alt/üst kredi sınırı ve mevcut kredi bakiyesini görüntüleme.
- [x] İşletmeler arası özel görüşmeler, yeni mesaj bildirimleri ve pazar yeri ilanından satıcıya mesaj başlatma.
- [x] Yalnızca ilgili işletme ile süper adminin görebildiği şikayet/talep kayıtları ve iki yönlü yanıt akışı.
- [x] Tekil veya toplu admin duyurusu; giriş sonrasında okunana kadar büyük pencere ve kalıcı bildirim geçmişi.
- [x] İşletme, ilan, sipariş, kredi ve kullanıcı güvenliği karar gerekçelerinin kullanıcı bildirimine dönüşmesi.
- [x] Kayıtta vergi/T.C. alanlarının yerine eczane/işletme adı ve 13 haneli GLN; adminin eski işletme adı ile GLN bilgisini güncelleyebilmesi.
- [x] Pazar yerinde gerçek işletme adı/konumu, işletmeye mesaj bağlantısı ve ürün, il, tür, stok, SKT ile sıralama filtreleri.
- [x] Barkod kataloğu sorgusu; USB barkod okuyucu/elle giriş/kamera desteği; eşleşen ilaç adının otomatik doldurulması; admin barkod ekleme, düzenleme ve pasife alma.
- [x] İlan görsellerinin isteğe bağlı olması; adminin ilan/katalog ayrıntılarını ve görsellerini değiştirebilmesi.
- [x] Devam eden siparişlerde mevcut admin dondurma ve iptal işlemlerinin karar bildirimleriyle tamamlanması.
- [x] Admin işletme kartlarının eczane adına göre açılır/kapanır düzeni ve Sabot Yazılım kurumsal site bağlantısı.
- [x] Migration: `drizzle/0006_platform_communications.sql`; snapshot zinciri `0005` ile eşleşiyor.
- [x] Yerel doğrulama: TypeScript, ESLint, 29 dosya / 125 test ve Next.js Production build geçti. Kayıt formu tarayıcıda GLN/işletme adı ve kurumsal bağlantıyla hatasız açıldı.
- [x] Canlı Neon yedeği açık kullanıcı yetkisiyle alındı; `0006` migration’ı Drizzle ile uygulandı ve şema/kayıt sayıları bağımsız bağlantıyla doğrulandı.
- [x] Kod değişiklikleri `c3eb091` commit'iyle GitHub `main` dalına gönderildi.
- [x] Vercel kesintisi sonrasında yeniden tetiklenen `dpl_B9zKmdvMWp7aRQqMaysC2Xt9VosU` Production deployment'ı `READY` oldu; `www.etaks.com.tr`, kök alan adı ve `etakas.vercel.app` bu sürüme bağlandı.

## Bakiye ve sayaç düzenlemesi

- [x] Mesajlar ve Bildirimler menü düğmelerine okunmamış kayıt sayacı; Mesajlar sayfası açıldığında yeni mesaj uyarılarını okundu işaretleyen kullanıcı kapsamlı akış.
- [x] Alt ve üst kredi limitlerinin yalnızca izin verilen bakiye aralığı olduğu netleştirildi; limit güncellemesi gerçek bakiyeyi değiştirmiyor.
- [x] Admin “Mevcut bakiye değişikliği (TL)” işlemi `ADMIN_ADJUSTMENT` muhasebe hareketi, denetim kaydı ve kullanıcı bildirimi oluşturuyor.
- [x] Limit değişikliği mevcut bakiye/rezervasyonlarla çelişirse; bakiye ayarı, alım veya satış sınırı aşarsa işlem engelleniyor ve yöneticiyle iletişim uyarısı gösteriliyor.
- [x] Genel bakıştaki Kullanılabilir bakiye gerçek mevcut borç/parayı gösteriyor; açılır ayrıntıda rezerve tutar, alt/üst sınır ile kalan alım/satış kapasitesi yer alıyor.
- [x] Yerel doğrulama: TypeScript, ESLint, 29 dosya / 126 test ve 26 sayfalı Next.js Production build geçti.
- [x] Değişiklikler `0687477` commit'iyle GitHub `main` dalına gönderildi; `dpl_9aQuPdhhMBi6XR8twnCSnasSddc9` Production deployment'ı `READY` oldu ve alan adlarına bağlandı.
- [ ] Okunmamış sayaç, mesaj okuma temizliği, bakiye ayrıntısı ve admin bakiye değişikliğini oturumlu gerçek kullanıcıyla canlıda doğrulamak.

## Sonraki kabul ve yayın işleri

- [ ] Test ortamında işletme kaydı → yönetici onayı → belge yükleme → ilan → sipariş → teslim/iptal akışını tamamlamak; Blob yükleme ve özel dosya erişimini doğrulamak.
- [ ] Normal işletmenin admin paneline ve başka işletmenin verilerine erişemediğini; hesap kilidi, hız sınırı, eski/tekrar kullanılan kodlar ve oturum geçersizleştirmesini uçtan uca test etmek.
- [ ] Eşzamanlı ve tekrarlanan sipariş/iptal/teslim/iade isteklerinde stok ve bakiyenin tutarlı kaldığını gerçek test veritabanıyla doğrulamak.
- [ ] Mobil görünüm, farklı tarayıcılar, klavye erişimi ve hata durumlarının son tasarım kontrolünü yapmak.
- [x] Kullanıcı hukuki metinlerin ve işletmeci bilgilerinin incelenip onaylandığını bildirdi; `LEGAL_CONTENT_APPROVED` Production ortamına eklendi.
- [x] Kullanıcı gerçek ilaç devrinin hukuki/resmî uygunluğunun incelenip onaylandığını bildirdi.
- [x] Ayrı veritabanında canlı yedekten geri yükleme provası tamamlandı.
- [ ] Geçici migration/teşhis dosyaları ve yerel sırların gerekli temizliği; özel yedeği koruma.
- [x] Son kod üzerinde TypeScript, ESLint, birim testleri, üretim derlemesi ve güncel bağımlılık audit'i tamamlandı; sonuçlar yukarıya kaydedildi.

## Korunacak kararlar

- İşleten: **Sabot Yazılım**.
- Mevcut başvuru/iletişim adresi: **ahmetnayki77@gmail.com**; kurumsal adres alındığında hukuki metinler ve uygulama ayarları güncellenecek.
- Tebligat adresi: **Aydınlıkevler Mahallesi, Celal Aras Caddesi No: 16, Merkez / Kars**.
- Logo kaynağı: `logo/EtakasLogo.png`; sitedeki dosya: `public/EtakasLogo.png`.
- Misafire “Giriş Yap”; giriş yapan kullanıcıya üst bölümde logo ve “Çıkış yap”.
- Yetkilendirilmiş süper adminlerin görevleri için kişisel veri görünürlüğü korunur.
- Antivirüs dosya taraması kullanıcının isteğiyle kapsam dışında.
- Alan adının bağlanması gerçek takası açma onayı değildir. `LIVE_TRADING_ENABLED`, `TRADING_MODE`, `LEGAL_APPROVAL_CONFIRMED` ve `LEGAL_CONTENT_APPROVED` ayrıca değerlendirilir.

## Doğrulama kayıtları

- **10 Eylül:** TypeScript, ESLint, 28 dosya / 121 test ve üretim derlemesi geçti. Çevrimiçi npm audit, üretim ve tüm bağımlılıklarda 0 bilinen açık bildirdi; bu tarihsel sonuçtur.
- **13 Eylül:** `0005_security_auth` yedek sonrasında tek transaction ile uygulandı ve ayrı bağlantıda doğrulandı. Migration sırasında 1 kullanıcı, 1 işletme, 0 ürün/ilan/sipariş ve tek süper admin korundu; eski oturumlar kapandı.
- **13 Eylül:** Çıkış düzeltmesinin ara sürümünde tam paket 28 dosya / 123 test geçti. Son `8f7e5c7` sürümünde 13 güvenlik testi, typecheck, lint ve build tekrar geçti; son sürüm için tam paket yeniden koşulduğu iddia edilmemeli.
- **18 Eylül:** Google DNS yeni NS/A/CNAME kayıtlarını başarıyla çözdü. Vercel domain verify sonucu `ok: true`, sorun/çakışma yok. Kök alan adı `308`, `www` alan adı güvenlik başlıklarıyla `200` döndürdü.
- **18 Eylül:** Yeni alan adında Turnstile istemcisi önce `110200` (`Domain not authorized`) döndürdü. Vercel `APP_URL` ve `TURNSTILE_ALLOWED_HOSTNAMES` düzeltildi; Production dağıtımı `dpl_2adfMUB3jm3Yjvo2628fpB1dTckE` başarıyla `READY` oldu.
- **18 Eylül:** Cloudflare Hostname Management kaydı eklendikten sonra temiz tarayıcı oturumlarında `110200` kalktı. Turnstile doğrulama kutusu `www.etaks.com.tr` üzerindeki giriş, işletme kaydı ve parola kurtarma sayfalarında hatasız yüklendi.
- **18 Eylül:** `0006_platform_communications` öncesi canlı Neon yedeği alındı ve arşiv listesi doğrulandı. Migration geçmişi 5'ten 6'ya çıktı; yeni iletişim/destek tabloları ile GLN, üst kredi limiti ve duyuru kolonları doğrulandı. 1 kullanıcı ve 1 işletme korunurken ürün kataloğu, ilan ve sipariş sayıları 0 olarak değişmeden kaldı.
- **18 Eylül:** 0006 kapsamının son kontrolünde TypeScript, ESLint, 29 dosya / 125 test ve Next.js 16 Production build geçti. Çevrimiçi `npm audit` üretim ve geliştirme bağımlılıklarında 0 bilinen açık bildirdi.
- **19 Eylül:** `c3eb091` GitHub `main` dalına gönderildi. Vercel Production deployment başlatıldı; resmi Vercel durum sayfasındaki Build & Deploy kısmi kesintisi nedeniyle deployment en az 16 dakika build makinesi atanmadan `Initializing` kaldı. Bu sırada mevcut `www.etaks.com.tr`, `/giris` ve `/isletme-kaydi` sayfaları `200` dönmeye devam etti.
- **19 Eylül:** Vercel olayı çözüldükten sonra boş `0728dc8` commit'iyle deployment yeniden tetiklendi. `dpl_B9zKmdvMWp7aRQqMaysC2Xt9VosU` 47 saniyelik build ile `READY` oldu; ana sayfa ve kayıt `200`, korumalı Mesajlar rotası anonim istekte girişe `307` döndürdü ve GLN alanı canlı HTML'de doğrulandı.
- **19 Eylül:** Bakiye/limit ayrımı ve okunmamış sayaç düzenlemesinde TypeScript, ESLint, 29 dosya / 126 test ve Production build geçti. `0687477` GitHub'a gönderildi; `dpl_9aQuPdhhMBi6XR8twnCSnasSddc9` 50 saniyelik Production build ile `READY` oldu.

## Yedek ve devam notları

- Migration ayrıntıları: [MIGRATION-0005-REPORT.md](docs/MIGRATION-0005-REPORT.md). Rapordaki servis/yayın sınırları migration anını anlatır; güncel durum bu dosyadadır.
- Platform iletişim migration ayrıntıları: [MIGRATION-0006-REPORT.md](docs/MIGRATION-0006-REPORT.md).
- TİTCK SKRS migration ayrıntıları: [MIGRATION-0008-REPORT.md](docs/MIGRATION-0008-REPORT.md).
- Yedek: `.cache/backups/etakas-before-0005-2026-09-13T11-27-42-961Z.dump`, 104851 bayt. SHA-256 ve `pg_restore --list` doğrulandı; geri yükleme provası bekliyor. Blob dosyaları ve şifreleme anahtarları arşive dahil değil.
- Yedek: `.cache/backups/etakas-before-0006-2026-09-18T20-39-20-639Z.dump`, 115401 bayt. SHA-256 `e1ea708cd92e9f969393a123c51810b3f9174624edd2fddda4d74eba5558fdc1`; `pg_restore --list` doğrulandı, geri yükleme provası bekliyor.
- `.env.migration.local` ve `.cache/` Git dışındadır. Sırları sohbete, loglara veya Git'e yazma.
- Devam ederken `git status --short` ile kullanıcı değişikliklerini koru. Migration 0005'i yeniden uygulama, mevcut hesabı yeniden oluşturma veya parolasını bootstrap ile değiştirme.
- Ayrıntılı kabul kapsamı: [PRE-PRODUCTION-CHECKLIST.md](docs/PRE-PRODUCTION-CHECKLIST.md); yayın sırası: [DEPLOYMENT.md](docs/DEPLOYMENT.md); e-posta kurulumu: [EMAIL-SETUP.md](docs/EMAIL-SETUP.md).
