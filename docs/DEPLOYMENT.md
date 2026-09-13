# Vercel dağıtımı

Bu belge yeni güvenlik sürümünün yayın sırasını anlatır. Çalışma dizinindeki değişiklikler kendiliğinden canlıya uygulanmış sayılmaz. Güncel durum [PROGRESSION.md](../PROGRESSION.md) içinde tutulur.

## Gerekli yapılandırma

`.env.example` değişken adlarının kaynağıdır. Sırları Git'e eklemeyin veya sohbete yazmayın. Vercel Production ve Preview ortamları ayrı değerlendirilmelidir; önizleme mümkünse ayrı Neon veritabanını ve test hesaplarını kullanmalıdır.

| Değişken | Amaç |
| --- | --- |
| DATABASE_URL | Doğru Neon PostgreSQL bağlantısı |
| APP_URL | Bu dağıtımın kanonik HTTPS adresi; origin ve e-posta bağlantıları |
| AUTH_SECRET, AUTH_RATE_LIMIT_SECRET | Birbirinden ayrı, rastgele ve en az 32 karakterlik sunucu sırları |
| ENCRYPTION_KEY, ENCRYPTION_KEY_ID | Alan şifreleme anahtarı ve kimliği |
| ENCRYPTION_PREVIOUS_KEYS | Anahtar değişiminde eski şifreli kayıtlar için isteğe bağlı anahtar halkası |
| BLOB_READ_WRITE_TOKEN | Özel Vercel Blob deposu |
| EMAIL_PROVIDER ve sağlayıcı alanları | [Gmail veya Resend kurulumu](EMAIL-SETUP.md) |
| TURNSTILE_SECRET_KEY, NEXT_PUBLIC_TURNSTILE_SITE_KEY | Üretim Turnstile anahtarları; test anahtarları üretimde kabul edilmez |
| TURNSTILE_ALLOWED_HOSTNAMES | Kanonik adres dışında gerçekten kullanılan izinli adlar gerekiyorsa virgülle ayrılmış liste |

`NEXT_PUBLIC_TURNSTILE_SITE_KEY` tarayıcıya açık site anahtarıdır; diğer sağlayıcı sırları sunucuya aittir. Build sırasında istemci anahtarı paketlendiği için değişiklik sonrası yeni dağıtım gerekir.

## Yayın sırası

1. Hedef projeyi, veritabanını ve geri dönüş sürümünü kaydedin; Neon yedeği alın.
2. E-posta ve CAPTCHA dahil ortam değişkenlerini yapılandırın. Gerçek test aşamasında e-posta teslimini doğrulayın.
3. `npm run db:migrate` ile `0005_security_auth.sql` dahil migration'ları uygulayın. Bu migration güvenlik tablolarını/alanlarını ekler, sipariş idempotency kapsamını alıcı işletmeye bağlar ve mevcut oturumları kapatır.
4. İlk kurulumsa güçlü `INITIAL_ADMIN_EMAIL`/`INITIAL_ADMIN_PASSWORD` bilgileriyle `npm run db:bootstrap-admin` kullanın; olağan parola kurtarma için bootstrap kullanmayın. Kurulum değişkenlerini iş bitince kaldırın.
5. Lint, typecheck, birim test, build ve audit sonucunu kaydedin. Kullanıcının sonraya bıraktığı gerçek test aşamasını tamamlayın.
6. Önizleme ortamını doğruladıktan sonra üretimi yayınlayın. Yeni sürümde eski kısa parolalı hesapların e-postayla parola yenilemesi gerekir.

Güvenlik yapılandırması eksikken korunan yazma ve giriş akışları hata verir; doğrulamayı atlayan yedek giriş yoktur. `/kurulum` ve `/api/setup/status` yalnızca süper adminin yapılandırma/bağlantı teşhisi içindir. Alanların mevcut görünmesi e-posta teslimini veya CAPTCHA kabulünü kanıtlamaz.

## İşlem modu

Başlangıç değerleri `TRADING_MODE=demo`, `LIVE_TRADING_ENABLED=false`, `LEGAL_APPROVAL_CONFIRMED=false`, `LEGAL_CONTENT_APPROVED=false` olarak kalır. Hukuki içerik onayı tamamlanana kadar yeni işletme başvurusu sunucuda durdurulur. Gerçek takasın açılması için dört kontrolün de uygun duruma gelmesi gerekir; bu değişkenler düzenleyici izin değildir.

Vercel Cron üzerinden otomatik sipariş tamamlama yapılmaz. Kullanıcının isteğiyle bu sürümde antivirüs sağlayıcısı zorunlu değildir ve dosya tarama hizmeti uygulanmamıştır.
