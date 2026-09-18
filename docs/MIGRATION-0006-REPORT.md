# Platform iletişim migration uygulama kaydı

18 Eylül 2026. Kullanıcının açık yetkilendirmesiyle etakas canlı Neon veritabanında `0006_platform_communications` öncesi yedek alındı, migration uygulandı ve bağımsız bağlantıyla doğrulandı.

## Yedek

- PostgreSQL 18 `pg_dump`, custom arşiv biçimi; `--no-owner --no-privileges` ile sahiplik ve ACL aktarımı dışarıda bırakıldı.
- Dosya: `.cache/backups/etakas-before-0006-2026-09-18T20-39-20-639Z.dump` (Git dışında).
- Boyut: 115401 bayt.
- SHA-256: `e1ea708cd92e9f969393a123c51810b3f9174624edd2fddda4d74eba5558fdc1`.
- `pg_restore --list` başarılı. Ayrı bir veritabanına geri yükleme provası yapılmadı.

Yedek hassas uygulama verileri içerir; Git'e veya herkese açık bir konuma eklenmemelidir. Blob nesneleri, Vercel ortam değişkenleri ve şifreleme anahtarları bu arşive dahil değildir.

## Migration

Drizzle migration geçmişi uygulama öncesinde 5 kayıttı ve en son `0005_security_auth` zaman damgasını taşıyordu. Yeni iletişim tabloları henüz yoktu. `npm run db:migrate` yalnızca bekleyen `0006_platform_communications` migration'ını uyguladı ve başarıyla tamamlandı.

Uygulama sonrasında:

- Migration geçmişi 6 kayda çıktı ve son zaman damgası `1789762695614` oldu.
- `conversations`, `conversation_messages`, `support_tickets` ve `support_messages` tabloları oluşturuldu.
- `organizations` tablosuna `gln_encrypted` ve `credit_upper_limit_kurus` kolonları eklendi.
- `notifications` tablosuna `organization_id` ve `is_announcement` kolonları eklendi.
- Yeni tabloların dokuz dış anahtar ilişkisi ve ilgili indeks/kontrol kuralları doğrulandı.
- PostgreSQL uzun bir dış anahtar adını 63 karakterlik tanımlayıcı sınırına göre kısalttı; kısıt başarıyla oluşturuldu.

| Kayıt | Önce | Sonra |
| --- | ---: | ---: |
| Kullanıcı | 1 | 1 |
| İşletme | 1 | 1 |
| Ürün kataloğu | 0 | 0 |
| İlan | 0 | 0 |
| Sipariş | 0 | 0 |
| Bildirim | 0 | 0 |

Yeni görüşme, mesaj, destek talebi ve destek mesajı tabloları migration sonrasında boştu. Mevcut kullanıcı ve işletme kaydı korunmuştur; kimlik veya hassas alan değerleri rapora ya da komut çıktısına yazılmamıştır.

## Yayın sırası

Şema migration'ı uygulama dağıtımından önce tamamlandı. Böylece yeni kod üretime geçtiğinde beklediği tablolar ve kolonlar hazır olacaktır. Kodun GitHub ve Vercel Production yayını ile canlı işlev kontrolleri ayrıca kaydedilmelidir.
