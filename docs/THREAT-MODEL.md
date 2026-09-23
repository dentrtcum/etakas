# Tehdit modeli

Korunan varlıklar; işletme kimlik ve adres bilgileri, başvuru belgeleri, hesap erişimi, stok/seri kayıtları, siparişler, bakiye ve yönetici kararlarıdır. Güven sınırları tarayıcı, Next.js sunucusu, PostgreSQL, özel Blob deposu, CAPTCHA ve e-posta sağlayıcısı arasındadır.

| Risk | Uygulanan kontrol | Kalan doğrulama veya sınır |
| --- | --- | --- |
| İşletmeler arası kayıt/belge erişimi | Sunucuda nesne ve üyelik rolü kontrolü; admin rolü ayrı | Gerçek testte başka işletme kimliğiyle doğrudan API istekleri |
| Yetkisiz admin erişimi | Yalnızca global SUPER_ADMIN rolü ve doğrulanmış oturum | URL gizliliği koruma sayılmaz; yönetici hesaplarının e-postaları da korunmalı |
| Parola denemeleri ve kod tahmini | PostgreSQL rate limit, Turnstile, deneme sınırı, geçici kilit | Dağıtılmış saldırı ve servis maliyeti için platform gözlemi gerekir |
| Hesap ele geçirme / oturum hırsızlığı | E-posta kodu, HttpOnly/SameSite çerezleri, authVersion ile iptal | E-posta hesabının ele geçirilmesi ikinci adımı da tehlikeye sokar |
| Parola kurtarma istismarı | Tek kullanımlık süreli sır, genel yanıt, reset sonrası tüm oturumların iptali | Gerçek teslim ve yarış koşulları senaryoları test edilmeli |
| CSRF, betik çalıştırma ve aşırı büyük istek | Origin denetimi, nonce CSP, gövde sınırı, şema doğrulama | CSP tek başına bütün XSS ve iş mantığı sorunlarını çözmez |
| Zararlı/ifşa edilen yüklemeler | Tür ve boyut denetimi, görsel yeniden kodlama, özel depo, ek olarak indirme | Antivirüs taraması yok; PDF'nin temiz olduğu garanti edilmez |
| Stok veya bakiye tutarsızlığı | Atomik işlemler, muhasebe kilidi, alıcıya bağlı idempotency, değişmez kayıtlar | Gerçek PostgreSQL eşzamanlı işlem testi henüz yapılmadı |
| Sır ve kişisel veri sızıntısı | Alan şifrelemesi, sırların ortamda tutulması, güvenli hata mesajları | Süper admin kullanıcı talebiyle gerekli kişisel verileri görebilir; Vercel/Neon erişimi ayrı korunmalı |
| Uygun olmayan ilaç faaliyeti | Riskli ürün politikası, veteriner/insan ürünü ayrımı, varsayılan kapalı canlı işlem | Resmî izin, takip sistemleri ve mesleki sorumluluklar yazılım bayraklarıyla sağlanmaz |

E-posta, Cloudflare ve barındırma sağlayıcılarında kesinti olduğunda güvenlik doğrulaması atlanmaz; bu durum giriş veya yazma işlevlerinin geçici olarak kullanılamamasına yol açabilir. Yedekleme, veri saklama/imha, olay müdahalesi ve sağlayıcı hesap güvenliği operasyonel sorumluluklardır.
