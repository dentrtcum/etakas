# Güvenlik migration uygulama kaydı

13 Eylül 2026. Kullanıcının yetkilendirdiği etakas Neon veritabanında yedekleme ve migration tamamlandı.

## Yedek

- PostgreSQL 17.11 bağlantısı ve önceki dört migration'ın dosya hash değerleri doğrulandı.
- Aynı Neon endpoint'inin doğrudan bağlantısı kullanıldı; pooler hostname'indeki `-pooler` eki kaldırıldı. [Neon yönergesi](https://neon.com/docs/connect/connection-pooling)
- TLS ve sertifika doğrulaması kullanıldı; bağlantı dizesi veya parola çıktılanmadı.
- PostgreSQL 18 `pg_dump`, custom arşiv biçimi; `--no-owner --no-privileges` ile sahiplik/ACL aktarımı dışarıda.
- Dosya: `.cache/backups/etakas-before-0005-2026-09-13T11-27-42-961Z.dump` (Git dışında).
- Boyut: 104851 bayt.
- SHA-256: `91960c00f3a91e6d9e3e6549ad8dff99178fc8541e26c8c34141c0dbf6e4ee5a`.
- `pg_restore --list` başarılı; kullanıcı verisi ve migration tablosu arşivde mevcut. Ayrı bir veritabanına geri yükleme provası yapılmadı.

Yedek hassas uygulama verileri içerir; Git'e veya herkese açık paylaşıma eklenmemelidir. Blob dosyaları, Vercel ayarları ve şifreleme anahtarları bu arşiv kapsamında değildir.

## Migration

`0005_security_auth` hedef/yedek kontrolü, migration kilidi, süre sınırları ve koruma kontrolleriyle tek transaction içinde uygulandı. Commit ardından ayrı bağlantıda beşinci migration kaydı ve güvenlik şeması yeniden doğrulandı.

Migration SHA-256: `2a4ed4268a57406fa1ae985aa8dcddc8f2cfc3e96404c2aca710a15e866f8c72`.

| Kayıt | Önce | Sonra |
| --- | --- | --- |
| Kullanıcı | 1 | 1 |
| İşletme | 1 | 1 |
| Ürün | 0 | 0 |
| İlan | 0 | 0 |
| Sipariş | 0 | 0 |

Kullanıcı kimlik, e-posta, parola özeti ve mevcut doğrulama bilgilerinin korunduğu karşılaştırıldı; değerler çıktılanmadı. Tek süper admin korundu. Güvenlik challenge, rate limit, hukuki kabul tabloları ve alıcı işletme kapsamlı idempotency indeksi mevcut. Migration sonunda eski oturum sayısı sıfırdı.

## Servisler ve yayın sınırları

İlk Gmail SMTP denemesi `EAUTH` verdi. Kullanıcının uygulama şifresini yenilemesinden sonra SMTP kimlik doğrulaması başarılı oldu. Gerçek ileti gönderilmedi; gelen kutusuna teslim veya Vercel çalışma zamanından SMTP bağlantısı henüz kanıtlanmış değildir.

CAPTCHA anahtarları yerelde varlık/biçim kontrolünden geçti. Gmail, CAPTCHA ve hız sınırı değişkenleri Vercel Production listesinde doğrulandı; Secret değerleri geri okunamadığı için yerel ve uzak değerler doğrudan karşılaştırılmadı. Gerçek CAPTCHA tarayıcı token'ı ve hostname/action doğrulaması bekliyor.

Yeni uygulama kodu bu çalışma sırasında GitHub'a gönderilmedi veya Vercel'e dağıtılmadı.
