# Güvenlik kontrol listesi

İşaretli maddeler çalışma dizinindeki uygulamayı anlatır; canlı ortamda doğrulanmış oldukları anlamına gelmez. Kontrol komutlarının son sonuçları [PROGRESSION.md](../PROGRESSION.md) içindedir.

## Kodda uygulanan kontroller

- [x] Her girişte parola ve süreli, tek kullanımlık e-posta kodu; kod doğrulanmadan oturum oluşturulmaz.
- [x] 12–128 karakter parola politikası, scrypt parola özeti, sunucuda özetlenen rastgele oturum anahtarı ve 12 saatlik oturum.
- [x] Parola kurtarmada süreli ve tek kullanımlık bağlantı; başarılı değişiklikte eski oturumların ve doğrulama bağlantılarının iptali.
- [x] IP ve gerektiğinde hesap temelli PostgreSQL rate limit; kimlik doğrulama formlarında sunucuda Turnstile doğrulaması.
- [x] Başarısız girişlerde geçici kilit; süper adminin kalıcı kilidi parola kurtarmayla kaldırılamaz.
- [x] Süper admin rolü ve işletme üyelikleri sunucuda ayrı doğrulanır. İşletme kaydı süper admin oluşturmaz.
- [x] Yazma isteklerinde aynı origin kontrolü, gerçek gövde boyutu sınırı, yetki denetimi ve güvenli hata yanıtları.
- [x] Nonce kullanan CSP, özel sayfalarda önbellek kapatma ve güvenlik başlıkları.
- [x] Özel Blob dosyalarında sunucuda erişim kontrolü; tür/boyut doğrulaması, görsel yeniden kodlama ve belge indirme kaydı.
- [x] AES-256-GCM alan şifrelemesi; anahtar kimlikli yeni format, eski şifreli kayıtlar için geriye uyumlu çözme.
- [x] İşlem, stok ve bakiye değişikliklerinde veritabanı işlemleri/kilitler; muhasebe ve denetim kayıtlarında mevcut değişmezlik koruması.
- [x] Güncel bağımlılık kilidi için çevrimiçi npm taraması; rapor ve kapsamı [DEPENDENCY-AUDIT.md](DEPENDENCY-AUDIT.md) içinde.
- [x] Canlı işlem ve hukuki içerik için ayrı, varsayılan kapalı hazırlık kontrolleri.

## Canlı yayın öncesi doğrulanacaklar

- [ ] Yeni migration ve ortam değişkenleri doğru Vercel/Neon ortamında uygulanmalı.
- [ ] İşletme ve admin e-postaları gerçekten teslim edilmeli; süre, yanlış kod, yeniden kullanım ve kilit senaryoları denenmeli.
- [ ] Turnstile üretim anahtarları doğru alan adında çalışmalı; istemci verisini değiştirerek atlatılamadığı doğrulanmalı.
- [ ] Yetkisiz işletme ve anonim kullanıcıyla API/belge erişimi, eşzamanlı siparişler ve muhasebe değişmezleri gerçek test ortamında denenmeli.
- [ ] Yedek geri yükleme, anahtar koruma, saklama/imha takvimi ve olay müdahale sorumlusu belirlenmeli.
- [ ] Mevzuata uygun iş modeli ve veri aktarımı düzenlemeleri yetkili uzman incelemesinden geçmeli.

Dosya antivirüs taraması kullanıcının isteğiyle bu kapsamda yoktur. Dosya türü denetimi bunun yerine geçmez. Otomatik TOTP kurulumu veya TOTP zorunluluğu bulunmaz; mevcut ikinci adım e-posta doğrulamasıdır. Hiçbir kontrol listesi bütün açıkların ortadan kalktığı garantisi vermez.
