# E-Takas

E-Takas, Türkiye'de doğrulanmış eczaneler ve veteriner klinikleri için tasarlanan kapalı devre B2B ilaç takas koordinasyon platformudur.

Bu repo varsayılan olarak yalnızca demo modunda çalışır. Gerçek takas işlemleri hukuki onay kaydı olmadan üretimde etkinleştirilemez.

## Komutlar

```bash
npm install
npm run db:migrate
npm run db:seed
npm run dev
npm run lint
npm run typecheck
npm run test
npm run test:e2e
npm run build
```

## Güvenli Varsayılanlar

- `.env` dosyaları Git'e eklenmez.
- `.env.example` yalnızca boş veya sahte değerler içerir.
- `TRADING_MODE=demo` ve `LEGAL_APPROVAL_CONFIRMED=false` varsayılandır.
- Production ortamında eksik güvenlik değişkenleri uygulamayı güvenli olmayan şekilde başlatmaz.
- `npm run db:seed` yalnızca sentetik demo verileri üretir ve production ortamında çalışmaz.

## Phase 3 Başlangıç Akışları

- Auth endpointleri: `/api/auth/[...all]`
- Giriş ekranı: `/giris`
- İşletme başvurusu: `/isletme-kaydi`
- Admin panel başlangıcı: `/admin36100`
