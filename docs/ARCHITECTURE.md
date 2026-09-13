# Mimari

Uygulama Next.js App Router ve React Server Components, TypeScript, PostgreSQL/Drizzle ORM, özel Vercel Blob, Tailwind CSS, Vitest ve Playwright kullanır. Sürüm kilidi `package-lock.json` içindedir. Üretim hedefi Vercel ve Neon'dur; bu mimari tanımı canlı bağlantı testi değildir.

## Sorumluluklar

- `src/app`: Sunucuda sayfalar, API uçları ve kullanıcı akışları.
- `src/modules`: İşletme, ilan, sipariş, stok, bakiye ve uyum kuralları.
- `src/lib/auth`: Parola, e-posta challenge, oturum, rol ve nesne erişimi.
- `src/lib/security` ve `src/lib/http`: Origin, CAPTCHA, rate limit, gövde sınırı ve hata yanıtı.
- `src/lib/db`: Şema, bağlantı ve yetki denetimli okumalar.
- `src/lib/legal`: Sürümlemeli hukuki metinler ve işletmeci bilgileri.
- `src/lib/email`: Gmail SMTP veya Resend ile işlem e-postaları.

## Kimlik doğrulama

Uygulama kendi PostgreSQL oturumlarını kullanır; eski Better Auth catch-all API kaldırılmıştır. Parola doğrulanınca, tarayıcıya bağlı süreli e-posta kodu oluşturulur. Kod başarılı doğrulanınca rastgele oturum anahtarı HttpOnly çerezine yazılır; veritabanında yalnızca özeti bulunur. Oturumda e-posta doğrulama zamanı ve kullanıcının `authVersion` değeri tutulur.

Parola değişimi, kalıcı kilit veya yönetici tarafından oturum iptali sürümü artırarak eski oturumları geçersiz kılar. E-posta doğrulama tek seferlik kayıt bayrağı değildir; her yeni girişte uygulanır. Parola kurtarma bağlantısı süreli ve tek kullanımlıktır. Rate limit PostgreSQL'de paylaşıldığından Vercel örnekleri arasında bellek sayacına dayanmaz.

Global `SUPER_ADMIN` rolü işletme üyeliklerinden ayrıdır. İşletme rolü aynı kullanıcının diğer işletmelerine taşınmaz. Yönetici kişisel verileri görebilir; işletme kullanıcılarına nesne bazlı erişim uygulanır. TOTP uygulanmış bir faktör değildir.

## Dosya ve kişisel veri

Dosya imzası/türü, toplam boyut ve dosya sayısı denetlenir; görseller yeniden kodlanır. Belge indirme özel API üzerinden izin kontrolü, özel önbellek başlıkları ve denetim kaydıyla yapılır. Antivirüs taraması kapsam dışındadır.

Hassas alanlar AES-256-GCM ile şifrelenir. Yeni format anahtar kimliği ve AAD içerir; eski kayıtlar çözülmeye devam eder. Arama/tekillik özetleri ayrı anahtar bağımlılığı taşır: şifre çözme halkası eklemek bu özetleri yeniden üretmez. Anahtar rotasyonu [DATABASE.md](DATABASE.md) uyarınca planlanmalıdır.

## İşlem tutarlılığı

İlanlar inceleme durumunda oluşturulur. İşletmeye ait sunulan ürün adı parti üzerinde tutulur; bir işletme ortak ürün kataloğu adını değiştiremez. Yükleme başarılı, veritabanı işlemi başarısız olduğunda yüklenen dosyalar temizlenir.

Sipariş oluşturma, rezervasyon, bakiye blokesi, iptal ve tamamlama veritabanı işlemleri içinde yürür. Muhasebe değişiklikleri ortak PostgreSQL advisory lock ile sıraya alınır; bu tercih düşük hacimde tutarlılığı önceler. Idempotency anahtarı alıcı işletmeyle birlikte benzersizdir. Tamamlama satıcı beyanı ve alıcı onayıyla olur; süreye bağlı otomatik tamamlama yoktur. İade ve itirazlar gerekçeli yönetici işlemleridir.

Hukuki içerik ve canlı takas ayrı hazırlık kontrollerine bağlıdır. Yazılım mevcut hâliyle resmî ilaç takip sisteminin yerini almaz. Kontrollerin gerçek hizmetler ve eşzamanlı isteklerle doğrulanması sonraki test aşamasıdır.
