# Etakas ilerleme kaydı

Son güncelleme: 19 Eylül 2026. Bu dosya güncel durum ve kesinti sonrası devam noktasıdır.

## Güncel durum

- Son yayınlanan uygulama commit'i: `0728dc8` (`main`). Asıl 0006 özellik commit'i `c3eb091`.
- Vercel projesi: `dicrocoellium/etakas`.
- Eski Vercel adresi çalışıyor: `https://etakas.vercel.app`.
- Yeni kanonik adres: `https://www.etaks.com.tr`.
- `https://etaks.com.tr` HTTPS üzerinden kalıcı `308` ile `https://www.etaks.com.tr/` adresine yönleniyor.
- Vercel CLI alan adını `configured_correctly`, projeye bağlı ve doğrulanmış olarak bildirdi. `www` HTTPS üzerinden `200` döndürüyor.
- Genel DNS: `dns1.turhost.com` / `dns2.turhost.com`; kök A kaydı `216.198.79.1`; `www` CNAME kaydı `adb8269a24912b22.vercel-dns-017.com`.
- Kullanıcı gerçek CAPTCHA, Gmail parola yenileme bağlantısı, giriş doğrulama kodu, parola değişikliği ve oturumlu çıkış akışlarını doğruladı.
- Uygulama üretimde; aşağıdaki kabul ve kurumsal e-posta işleri tamamlanmadan tam yayın hazır kabul edilmeyecek.

## Tamamlanan işler

- [x] Güvenlik yaması, bağımlılık yükseltmeleri ve kullanılmayan ikinci kimlik doğrulama altyapısının kaldırılması.
- [x] Her girişte e-posta kodu; süre, deneme sınırı, tarayıcı bağlama ve tek kullanımlılık.
- [x] E-postayla parola kurtarma, oturum sürümleme/geçersizleştirme, hesap kilidi ve yönetici güvenlik işlemleri.
- [x] Tek `SUPER_ADMIN`; işletme kaydı yönetici yetkisi vermez; işletme ve kaynak bazında sunucu yetkilendirmesi.
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
- [ ] Hukuki metinleri ve işletmeci bilgilerini son incelemeden geçirmek; saklama, aktarım ve başvuru süreçlerini kesinleştirmek. Bu inceleme tamamlanmadan `LEGAL_CONTENT_APPROVED` açılmamalı.
- [ ] Gerçek ilaç devrinin hukuki/resmî uygunluk ve ürün doğrulama gerekliliklerini tamamlamak. Canlı işlem bayrakları ancak bu koşullardan sonra değerlendirilmeli.
- [ ] Ayrı veritabanında yedekten geri yükleme provası; hata izleme ve geri dönüş kontrolleri.
- [ ] Geçici migration/teşhis dosyaları ve yerel sırların gerekli temizliği; özel yedeği koruma.
- [ ] Son kod üzerinde TypeScript, ESLint, birim testleri, üretim derlemesi ve güncel bağımlılık audit'i; sonuçları bu dosyaya kaydetmek.

## Korunacak kararlar

- İşleten: **Sabot Yazılım**.
- Mevcut başvuru/iletişim adresi: **ahmetnayki77@gmail.com**; kurumsal adres alındığında hukuki metinler ve uygulama ayarları güncellenecek.
- Tebligat adresi: **Aydınlıkevler Mahallesi, Celal Aras Caddesi No: 16, Merkez / Kars**.
- Logo kaynağı: `logo/EtakasLogo.png`; sitedeki dosya: `public/EtakasLogo.png`.
- Misafire “Giriş Yap”; giriş yapan kullanıcıya üst bölümde logo ve “Çıkış yap”.
- Tek süper adminin görevleri için kişisel veri görünürlüğü korunur.
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
- Yedek: `.cache/backups/etakas-before-0005-2026-09-13T11-27-42-961Z.dump`, 104851 bayt. SHA-256 ve `pg_restore --list` doğrulandı; geri yükleme provası bekliyor. Blob dosyaları ve şifreleme anahtarları arşive dahil değil.
- Yedek: `.cache/backups/etakas-before-0006-2026-09-18T20-39-20-639Z.dump`, 115401 bayt. SHA-256 `e1ea708cd92e9f969393a123c51810b3f9174624edd2fddda4d74eba5558fdc1`; `pg_restore --list` doğrulandı, geri yükleme provası bekliyor.
- `.env.migration.local` ve `.cache/` Git dışındadır. Sırları sohbete, loglara veya Git'e yazma.
- Devam ederken `git status --short` ile kullanıcı değişikliklerini koru. Migration 0005'i yeniden uygulama, mevcut hesabı yeniden oluşturma veya parolasını bootstrap ile değiştirme.
- Ayrıntılı kabul kapsamı: [PRE-PRODUCTION-CHECKLIST.md](docs/PRE-PRODUCTION-CHECKLIST.md); yayın sırası: [DEPLOYMENT.md](docs/DEPLOYMENT.md); e-posta kurulumu: [EMAIL-SETUP.md](docs/EMAIL-SETUP.md).
