# E-Takas

E-Takas, Türkiye'de doğrulanmış eczaneler ve veteriner klinikleri için tasarlanan kapalı devre B2B ilaç takas koordinasyon platformudur.

Bu repo varsayılan olarak yalnızca demo modunda çalışır. Gerçek takas işlemleri hukuki onay kaydı olmadan üretimde etkinleştirilemez.

## Komutlar

```bash
npm install
npm run db:migrate
npm run db:seed
npm run db:bootstrap-admin
npm run dev
npm run lint
npm run typecheck
npm run test
npm run test:e2e
npm run build
```

## Vercel ve Veritabanı Kurulumu

Vercel deploy sonrası `/kurulum` sayfası ve `/api/setup/status` endpointi şu durumları gösterir:

- Vercel environment variable eksikleri
- PostgreSQL bağlantısı
- Migration tabloları
- Super admin kullanıcısı

Minimum production env değerleri:

```env
DATABASE_URL=
AUTH_SECRET=
APP_URL=
ENCRYPTION_KEY=
CRON_SECRET=
TRADING_MODE=demo
LEGAL_APPROVAL_CONFIRMED=false
INITIAL_ADMIN_EMAIL=
INITIAL_ADMIN_PASSWORD=
```

## Güvenli Varsayılanlar

- `.env` dosyaları Git'e eklenmez.
- `.env.example` yalnızca boş veya sahte değerler içerir.
- `TRADING_MODE=demo` ve `LEGAL_APPROVAL_CONFIRMED=false` varsayılandır.
- Production ortamında eksik güvenlik değişkenleri uygulamayı güvenli olmayan şekilde başlatmaz.
- `npm run db:seed` yalnızca sentetik demo verileri üretir ve production ortamında çalışmaz.
- `npm run db:bootstrap-admin` production için `INITIAL_ADMIN_EMAIL` ve `INITIAL_ADMIN_PASSWORD` ile ilk super admin kullanıcısını oluşturur veya parolasını günceller.

## Demo Kullanıcıları

`npm run db:seed` sonrasında local/demo ortamında kullanılabilecek sentetik hesaplar:

- `admin@example.invalid` / `AdminDemo123!`
- `superadmin@example.invalid` / `SuperAdminDemo123!`
- `eczane@example.invalid` / `EczaneDemo123!`
- `klinik@example.invalid` / `KlinikDemo123!`

## Phase 3 Başlangıç Akışları

- Auth endpointleri: `/api/auth/[...all]`
- Giriş ekranı: `/giris`
- İşletme başvurusu: `/isletme-kaydi`
- Admin panel başlangıcı: `/admin36100`
- İlan oluşturma başlangıcı: `/ilan-olustur`

## Ürün ve İlan Akışı

- İşletme ilanları `/api/listings` üzerinden `PENDING_REVIEW` durumuyla admin incelemesine gönderilir.
- Admin ilan kararları `/api/admin/listing-reviews` veya `/admin36100` paneli üzerinden verilir.
- Soğuk zincir, biyolojik ve standart dışı kontrol kategorileri varsayılan olarak ilana kapalıdır.

## Marketplace ve Sipariş

- Marketplace API: `/api/marketplace/listings?organizationId=...`
- Sipariş rezervasyonu: `POST /api/orders`
- Teslim beyanı: `POST /api/orders/:orderId/handover`
- İptal: `POST /api/orders/:orderId/cancel`
- Tamamlama: `POST /api/orders/:orderId/complete`
- Cron otomatik tamamlama: `POST /api/cron/complete-orders` ve `Authorization: Bearer $CRON_SECRET`
