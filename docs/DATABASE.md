# Database

The database is PostgreSQL. Dates are stored in UTC and displayed in `Europe/Istanbul`.

## Principles

- Ledger entries are append-only.
- Balance is derived from ledger entries, with optional summaries only for performance.
- Stock reservations and balance holds are created in the same transaction as orders.
- Serial and karekod values are encrypted and also stored as keyed hashes for uniqueness checks.
- Constraints prevent negative quantities, invalid statuses and inconsistent order amounts.
- Production must use a high-entropy encryption secret; encrypted fields are not searchable except through approved keyed hashes.

## Initial Schema

The first migration creates the requested core entities: users, sessions, organizations, memberships, organization documents/reviews, product catalog, batches, package serials, listings, order flow, inventory reservations, balance holds, ledger accounts/transactions/entries, delivery confirmations, disputes, notifications, audit logs, policy/system settings, legal acceptances, login events and admin approvals.

Ledger, audit and transaction rows are protected with database triggers that reject update and delete operations. Application-level corrections must use reversal or compensating transactions.

`user_roles` stores global admin roles separately from `organization_members`, because admin privileges are platform-level and must not depend on a business membership row.

The development seed uses fixed synthetic UUIDs and `onConflictDoNothing()` so it can be rerun without duplicating users, roles, organizations, ledger accounts, catalog products, batches or listings.

## Güvenlik migration'ı

`0005_security_auth.sql`; kullanıcı kilidi/oturum sürümü, oturum e-posta doğrulama zamanı, tek kullanımlık doğrulama kayıtları, dağıtık rate limit ve sürümlemeli hukuki kabul kayıtlarını ekler. Sipariş idempotency anahtarı alıcı işletmeye göre benzersiz hâle gelir. İşletmenin sunduğu ürün adı parti üzerinde saklanır. Migration eski oturumları siler; yeni kod yayından önce uygulanmalıdır.

`disabled_at` yöneticinin koyduğu kalıcı kilittir; `locked_until` yanlış girişlerden doğan geçici kilittir. Parola kurtarma kalıcı kilidi kaldırmaz. `auth_version` artışı önceki oturum ve challenge kayıtlarının kullanılmasını engeller.

## Anahtarlar ve saklama

Yeni şifreli alan biçimi `v2.<anahtar-kimliği>.<iv>.<tag>.<veri>` şeklindedir. `ENCRYPTION_PREVIOUS_KEYS` eski anahtar kimliklerini karşılayan JSON nesnesidir; kendisi de sırdır. Mevcut v1 kayıtlar geriye uyumlu çözülür. Anahtar kaybolursa veritabanı yedeği tek başına şifreli alanları geri getiremez.

Anahtar değişiminden önce temsili kayıtlarla çözme doğrulanmalı, alanlar kontrollü işlenmeli ve HMAC tabanlı tekillik/arama özetleri için ayrıca yeniden üretim planı hazırlanmalıdır. Eski anahtarı halka içinde tutmak bu özetleri değiştirmez. Bu çalışma üretimde anahtar rotasyonu yapmamıştır.

Rate limit kovaları için istek sırasında sınırlı temizlik vardır. Oturum, challenge, giriş olayı ve hukuki kabul kayıtları için üretim saklama/imha süreleri işletmeci tarafından belirlenmelidir; kanuni saklama gerekçesi olmayan kayıtlar süresiz tutulmamalıdır. Muhasebe ve denetim kayıtlarının değişmezliği, kişisel veri saklama yükümlülüğünün ayrıca değerlendirilmesini ortadan kaldırmaz.
