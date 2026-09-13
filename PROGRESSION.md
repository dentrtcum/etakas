# Etakas ilerleme kaydı

Son güncelleme: 13 Eylül 2026. Bu dosya kesinti sonrası devam noktasıdır.

## Güncel durum — 13 Eylül

- [x] Güvenlik/tasarım sürümü `bbea95e` GitHub main ve Vercel Production'a yayınlandı; güvenli tanılama `67a321d` ile eklendi. `EMAIL_PROVIDER` Production'da `gmail` olarak ayarlandı.
- [x] Son 503 hatası logda `rate-limit` aşamasında bulundu. Ham SQL'de Date parametresi gerçek Neon bağlantısında `ERR_INVALID_ARG_TYPE` ile yeniden üretildi; ISO metniyle sorgu başarılı oldu, tanılama transaction'ı geri alındı. Regresyon testi (13 güvenlik testi), typecheck ve ilgili ESLint geçti.
- [x] Rate-limit tarih düzeltmesi `2312ce9` ile yayınlandı; Vercel `dpl_F6XFSPe2Q8mtr2iisYkYRPdiCVg9` READY, alias `etakas.vercel.app`. Canlı API'ye CAPTCHA'sız tanılama isteği `400 CAPTCHA_REQUIRED` döndürdü: sayaç/DB aşaması geçti, CAPTCHA koruması çalıştı.
- [x] Kullanıcı gerçek Turnstile doğrulamasının geçtiğini, Gmail parola yenileme bağlantısının ve giriş doğrulama kodlarının ulaştığını, parola değiştirmenin çalıştığını doğruladı.
- [x] Çıkışta ham `403 INVALID_ORIGIN` sayfası açılması Vercel logunda doğrulandı. Çıkış formu güvenli istemci isteğine geçirildi; API JSON/303 yanıtlarını destekliyor ve originsiz klasik form yedeği yalnızca `sec-fetch-site=same-origin` ile kanonik origin eşleştiğinde kabul ediliyor. 28 dosya / 123 test, typecheck, lint ve build geçti.
- [ ] Çıkış düzeltmesinin üretime yayını ve oturumlu gerçek tarayıcı doğrulaması bekleniyor.

- [x] Neon bağlantısı ve önceki dört migration'ın dosya özetleri doğrulandı.
- [x] `pg_dump` ile migration öncesi yedek alındı; `pg_restore --list` ve SHA-256 kontrolü başarılı. Gerçek geri yükleme provası yapılmadı.
- [x] `0005_security_auth` canlı Neon veritabanına tek transaction içinde uygulandı ve bağımsız bağlantıyla yeniden doğrulandı. Eski oturumlar kapandı; kullanıcı/parola ve işletme/ürün kayıtları korundu.
- [x] Kullanıcının yenilediği Gmail uygulama şifresiyle TLS üzerinden SMTP kimlik doğrulaması başarılı. Gerçek e-posta gönderilmedi; teslim ve Vercel çalışma zamanından gönderim ayrıca doğrulanmalı.
- [x] Gmail adresi ve CAPTCHA anahtarlarının varlık/biçim kontrolleri başarılı. Son Vercel Production kontrolünde Gmail, CAPTCHA ve `AUTH_RATE_LIMIT_SECRET` değişkenleri mevcut.
- [ ] CAPTCHA'nın gerçek tarayıcı token'ı ve hostname/action doğrulaması canlı akışta henüz yapılmadı.
- [x] Yeni uygulama sürümü dağıtıldı. Hukuki metin incelemesi ve tam kabul testleri bekliyor.

Ayrıntılar: [MIGRATION-0005-REPORT.md](docs/MIGRATION-0005-REPORT.md). Aşağıdaki eski servis notları tarihsel kayıttır; güncel durum için bu bölüm esas alınmalıdır.

## Kapsam ve kararlar

- Geniş güvenlik yaması ve bağımlılık yükseltmeleri; e-posta ile her girişte doğrulama, parola kurtarma, CAPTCHA, hız sınırı, hesap kilidi.
- Tek `SUPER_ADMIN`; işletme kaydı hiçbir yönetici yetkisi vermez. Süper adminin inceleme için kişisel verileri görebilmesi korunur.
- Yeni logo: `logo/EtakasLogo.png`. Misafire **Giriş Yap**, giriş yapan kullanıcıya üst bölümde yalnızca logo ve **Çıkış yap**.
- Sade animasyonlar, erişilebilir tasarım, SSS, hukuki metinler ve gerçek çerez bilgilendirmesi.
- İşleten: **Sabot Yazılım**. Başvuru: **ahmetnayki77@gmail.com**. Adres: **Aydınlıkevler Mahallesi, Celal Aras Caddesi No: 16, Merkez / Kars**.
- Alan adı henüz yok: Gmail uygulama şifresiyle SMTP seçeneği hazır; gelecekte Resend kullanılabilir.
- Kullanıcının isteğiyle antivirüs taraması ve gerçek kullanıcı/canlı işlem testleri bu aşamada yapılmayacak.
- Yeni güvenlik sürümü henüz üretime yayımlanmadı. Önceki canlı sürüm `cd25ef8`.

## Tamamlanan uygulamalar (son kontroller ayrıca aşağıda)

- [x] Bağımlılık yükseltmeleri ve kullanılmayan ikinci kimlik doğrulama altyapısının kaldırılması.
- [x] İlk yükseltme sonrası çevrimiçi npm audit: üretim ve tüm bağımlılıklarda 0 bilinen açık.
- [x] Şifre + e-posta OTP servisleri; süre, deneme sınırı, tarayıcı bağlama, tek kullanımlılık.
- [x] Parola kurtarma servisleri, oturum sürümleme ve geçersizleştirme.
- [x] Kalıcı yönetici kilidi ile geçici hatalı giriş kilidinin ayrılması; kurtarma kalıcı kilidi açamaz.
- [x] Sunucuda tek SUPER_ADMIN ve işletme bazında rol kontrolü.
- [x] Ortak Origin/CSRF, gerçek istek boyutu ve kalıcı hız sınırı korumaları.
- [x] Cloudflare Turnstile sunucu doğrulaması ve istemci bileşeni.
- [x] Özel dosyalarda tür imzası/boyut kontrolü, görüntü yeniden kodlama, dosya erişim denetimi ve kayıtları.
- [x] Başarısız kayıt/ilan işlemlerindeki yüklenmiş dosyaların geri temizlenmesi.
- [x] Ortak ürün adı değişikliğinin diğer işletmeleri etkilemesinin engellenmesi.
- [x] Sipariş/defter kilitlemesi, kullanıcıya bağlı idempotency, kapatılan ilanı yeniden açmama düzeltmeleri.
- [x] CSP nonce, HTTPS ve tarayıcı güvenlik başlıkları; kurulum ayrıntıları yalnızca yöneticiye açık.
- [x] Şifreli alanlar için sürümlü anahtar kimliği ve eski anahtarla okuma desteği.
- [x] Logo, oturuma göre üst menü, SSS/hukuki sayfalar/çerez arayüzü için bileşenler.
- [x] Hukuki metinleri okuma arayüzü ve sürümlü koşul kabulü/aydınlatma kaydı.
- [x] Yönetimde parola kurtarma bağlantısı, hesap kilidi ve oturum kapatma arayüzü.

## Devam eden / kalan işler

- [x] Gmail gönderim seçeneğinin ortam değişkenleri ve kurulum belgesiyle bütünleştirilmesi.
- [x] Giriş, e-posta doğrulama ve parola kurtarma ekranlarının kod kontrolü.
- [x] Kayıt testlerinin yeni hukuki alanlara; şifreleme testlerinin v2 biçimine uyarlanması.
- [x] Son TypeScript, ESLint, birim testleri ve üretim derlemesi; hatalar giderildi.
- [x] Yeni bağımlılıklar dahil son çevrimiçi audit sonucu: üretim ve tüm bağımlılıklarda 0 bilinen açık.
- [x] README/güvenlik/yayın belgeleri güncel uygulamaya uyarlandı; eski Better Auth/TOTP ve tarama iddiaları düzeltildi.
- [x] Migration 0005 ile şema karşılaştırıldı; yeni snapshot eklendi. 13 Eylül'de yedek sonrası canlı Neon'a uygulandı.
- [ ] E-posta ve CAPTCHA ayarları geldikten sonra kontrollü yayın hazırlığı.
- [ ] Kullanıcının sonraki aşamada istediği gerçek e-posta/OTP, eşzamanlı rezervasyon ve tarayıcı testleri.

## Dış servis ve yayın gereklilikleri

- **Son ön kontrol:** kullanıcı dosyayı doldurduğunu bildirdi; ancak diskteki `C:/e-takas/.env.migration.local` dosyasında `DATABASE_URL`, `GMAIL_APP_PASSWORD`, `TURNSTILE_SECRET_KEY` alanlarının üçü de boş. Değerler çıktılanmadan hem normal hem yetkili süreçte aynı sonuç doğrulandı. Editörde kaydedilmemiş değişiklik olabileceği için kullanıcıdan dosyayı kaydetmesi bekleniyor. Hiçbir SMTP bağlantısı, DB sorgusu, yedek veya migration çalışmadı. Kontrol aracı `.cache/production-preflight.mjs` hazır; dosya kaydedilince tekrar çalıştırılmalı.
- **Son devam / kullanıcı izni:** kullanıcı yalnızca Gmail/CAPTCHA ve veritabanı işlemleri için gerekli Production değişkenlerinin geçici yerel kullanımına açık izin verdi. Şifreleme anahtarı veya kapsam dışı sırlar istenmedi.
- **Dar kapsamlı API sonucu:** `GMAIL_USER` ve `NEXT_PUBLIC_TURNSTILE_SITE_KEY` çözümlenmiş olarak alındı. Gmail adresi istenen hesapla eşleşiyor; Site Key gerçek anahtar biçiminde. `DATABASE_URL`, `DATABASE_URL_UNPOOLED`, `GMAIL_APP_PASSWORD`, `TURNSTILE_SECRET_KEY`, `EMAIL_PROVIDER`, `APP_URL` için API `type=sensitive`, `decrypted=false`, değer yok döndürdü. Bu yeni engel otomatik onay reddi değil, sağlayıcının Secret geri okuma davranışıdır.
- **Yerel hazırlık:** `.env.migration.local` oluşturuldu; `git check-ignore` ile Git dışında olduğu doğrulandı. Kullanıcı yalnızca `DATABASE_URL` (etakas'a bağlı Neon doğrudan bağlantısı), `GMAIL_APP_PASSWORD`, `TURNSTILE_SECRET_KEY` alanlarını yerelde doldurmalı. Açık Gmail/site ayarları dosyada hazır. Sırlar sohbete istenmedi; mevcut dosya üzerine yazılmıyor.
- **Yedek aracı hazır:** `C:/Program Files/PostgreSQL/18/bin/pg_dump.exe`, `pg_restore.exe`, `psql.exe` bulundu. Bağlantı geldikten sonra hedef ve mevcut migration geçmişi kontrol edilmeli, özel yerel yedek alınmalı ve doğrulanmalı; sonra migration uygulanmalı. Şu ana kadar yedek, migration, gerçek e-posta gönderimi veya dağıtım yapılmadı.
- **Son durum:** kullanıcı CAPTCHA anahtarlarını da ekledi. CLI `whoami` → `dentrtcum`; `project ls` → `dicrocoellium/etakas`, `https://etakas.vercel.app`. Production listesinde Gmail ve Turnstile değişkenleri görüldü. Bu yalnızca değişken varlığı kontrolüdür; SMTP/CAPTCHA çalışması doğrulanmadı.
- **Tamamlandı:** eksik `AUTH_RATE_LIMIT_SECRET` kriptografik rastgele üretildi ve yalnızca etakas Production ortamına Secret olarak eklendi. Değeri çıktılanmadı, dağıtım yapılmadı.
- **Erişim sınırı:** tüm Production değişkenlerini `.env.verification.local` dosyasına indirme isteği otomatik onay denetimince reddedildi; gerekçe veritabanı/şifreleme sırlarını da içeren geniş aktarım için açık izin bulunmaması. İndirme yapılmadı ve farklı yoldan denenmedi. Devam için yalnızca gerekli servis/veritabanı değişkenlerini yerel doğrulama ve migration'da kullanma kapsamı kullanıcıyla netleştirilmeli. Yedek ve migration henüz yapılmadı.
- Aşağıdaki erişim/CAPTCHA notları önceki adımların geçmişidir; son durum yukarıdadır.
- Son kullanıcı bildirimi: Gmail iki adımlı doğrulaması açıldı, uygulama şifresi oluşturuldu; `EMAIL_PROVIDER=gmail`, `GMAIL_USER`, `GMAIL_APP_PASSWORD` Vercel'e eklendi. Bu bildirim henüz sunucu üzerinden doğrulanmadı ve gerçek e-posta gönderilmedi.
- Kullanıcı CAPTCHA anahtarlarını henüz eklemediğini doğruladı. Sıradaki adım Turnstile Managed widget (`etakas.vercel.app`) ve iki anahtarın Production ortamına eklenmesi.
- Son erişim kontrolü: Vercel eklentisi takım döndürmedi; CLI 59.15.1 `whoami` sonucu `Logged out`. Yerelde `.vercel/project.json` bulunmuyor. Kullanıcının CLI girişinden sonra doğru hesap/proje açıkça bağlanmalı; ardından ayarlar ve Neon yedeği doğrulanarak migration uygulanmalı. Bu aşamada migration veya dağıtım yapılmadı.
- Gmail: Google hesabında iki adımlı doğrulama + **uygulama şifresi**. Normal Gmail parolası kullanılmaz; gizli değerler sohbete veya Git'e yazılmaz.
- `EMAIL_PROVIDER=gmail`, `GMAIL_USER=ahmetnayki77@gmail.com`, `GMAIL_APP_PASSWORD` gizli Vercel değişkeni.
- Turnstile: `NEXT_PUBLIC_TURNSTILE_SITE_KEY` ve `TURNSTILE_SECRET_KEY`; `etakas.vercel.app` için gerçek anahtarlar.
- `AUTH_RATE_LIMIT_SECRET` en az 32 karakter, `APP_URL` doğru HTTPS adresi; mevcut Neon/Blob/şifreleme ayarları korunmalı.
- `LEGAL_CONTENT_APPROVED` işletmecinin metin incelemesi tamamlandıktan sonra; hazırlanan metinler düzenleyici izin yerine geçmez.
- Gerçek ilaç devri için hukuki/resmî uygunluk ve ürün doğrulama akışı ayrıca tamamlanmalı. `LIVE_TRADING_ENABLED=false` varsayılanı korunur.
- E-posta/CAPTCHA kurulmadan yeni girişi zorunlu kılan sürümü canlıya almak kullanıcıyı dışarıda bırakabilir; önce bu gereklilikler tamamlanacak.

## Son kontrol kaydı

- **10 Eylül son birleşik sonuç:** `npm test -- --reporter=dot`: **28 dosya / 121 test geçti**. `npm run typecheck`, `npm run lint`, `npm run build` ve `git diff --check` başarılı.
- **10 Eylül:** `npm run db:generate` güncel 36 tablo için **No schema changes, nothing to migrate** döndürdü; mevcut migration dosyalarını yeniden üretmedi. Bu komut migration'ı veritabanına uygulamaz.
- **10 Eylül:** çevrimiçi `npm audit --offline=false --json` ve üretim `--omit=dev` taraması: **0 bilinen açık**, exit 0. Kilit dosyası SHA-256: `C7A47E06469DC362BBA49E695F98B62DB62B8B622F7D44E3E0140AFBB97D8092`.
- **10 Eylül:** işlem düğmeleri ilgili işletmenin rolüne göre gösteriliyor; süper admin erişimi korunuyor. Takas kapalıyken teslim/tamamlama düğmeleri gösterilmiyor, yetkili iptal/itiraz işlemleri açık kalıyor. Kısmi rezervasyon ve kalan stok görünürlüğü tutarlı hale getirildi.
- **10 Eylül:** yerel geliştirme/üretim ortamı kontrolünde gerekli servis değişkenleri yüklenmiş olarak doğrulanamadı. Gizli değerler çıktılanmadı. Vercel'in güncel uzak değişkenleri veya canlı Neon/Blob bağlantısı bu son oturumda yeniden kontrol edilmedi.
- **Yayın durumu:** çalışma ağacında yerel değişiklikler mevcut; bu güvenlik sürümü GitHub'a gönderilmedi, migration canlıya uygulanmadı ve dağıtım yapılmadı. E-posta/CAPTCHA yapılandırması ve kullanıcının sonraya bıraktığı gerçek kabul testleri bekleniyor.

### Önceki kontrol geçmişi

- 9 Eylül: ilk tüm-suite koşusunda 22 dosya / 71 test geçti. Sonrasında yeni auth/SMTP/muhasebe regresyonları eklendi; son birleşik koşu bekleniyor.
- 9 Eylül: auth/güvenlik odaklı koşu 6 dosya / 54 test geçti; muhasebe odaklı koşu 6 dosya / 22 test geçti.
- 9 Eylül: üretim derlemesi başarılı. Son arayüz/servis tutarlılık düzeltmeleri sonrası son tip/lint/test kontrolü yapılacak.
- Yerel Windows korumalı ortamında test/derleme alt süreçleri EPERM verdi; onaylı yerel tekrarlarla kontroller tamamlandı. Canlı servis testi yapılmadı.
- Yönetici bootstrap işlemi artık mevcut parolayı değiştirmez ve ikinci süper admin oluşturmaz. Sabit parolalı test işletmesi oluşturma aracı kaldırıldı.
- Kalıcı hesap kilidi, eksik/uyumsuz stok rezervasyonu ve bakiye blokajı kontrolleri; iade defteri ters işlem bağlantısı; ortak muhasebe kilidi eklendi.

## Kesinti sonrası başlangıç

1. `git status --short` ile dosyaları kontrol et; tamamlanan değişiklikleri geri alma.
2. Bu dosyanın kalan işler listesini ve çalışan ajanları oku.
3. Migration 0005 uygulanmış durumda; yeniden çalıştırma. Migration/yedek raporunu ve güncel üst bölümü oku.
4. Gmail SMTP girişi başarılı; gerçek teslim ve CAPTCHA tarayıcı doğrulaması bekliyor. Yeni sürümün dağıtımı ayrı aşamadır: [yayın sırası](docs/DEPLOYMENT.md). `.env.migration.local` geçici ve Git dışıdır; değerlerini çıktılama, iş tamamlandığında güvenli temizliğini planla.
5. Yayınlandı iddiasını yalnızca gerçek dağıtım ve alan adı doğrulaması varsa yaz.
