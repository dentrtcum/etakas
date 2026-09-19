# Migration 0008 raporu

Tarih: 20 Eylül 2026

## Kapsam

- `titck_skrs_products` resmi barkod kataloğu tablosu oluşturuldu.
- `product_catalog.source` alanı `MANUAL` varsayılanıyla eklendi; mevcut katalog kayıtları manuel kaynak olarak korundu.
- TİTCK kaynaklı operasyon kayıtları adminin düzenlenebilir manuel kataloğundan ayrıldı.

## Kaynak veri

- Kaynak: TİTCK SKRS E-Reçete İlaç ve Diğer Farmasötik Ürünler Listesi.
- Resmi liste sayfası: <https://www.titck.gov.tr/dinamikmodul/43>
- İçe aktarılan resmi dosya tarihi: `2026-09-15`.
- Normalize edilen ve içe aktarılan etkin ürün: `7.945`.
- Kaynak XLSX ve normalize JSON `.cache/titck/` altında tutuldu; Git'e eklenmedi.

## Yedek ve geri yükleme provası

- Yedek: `.cache/backups/etakas-before-0008-2026-09-19T22-27-28-291Z.dump`
- Boyut: `143932` bayt.
- SHA-256: `bfdb45e3ec261a0257b9b1602b5c3435d037404c160168af88907c2fa725b0d7`.
- `pg_restore --list` arşiv doğrulaması geçti.
- Yedek ayrı yerel `restore_0008` veritabanına geri yüklendi: 2 kullanıcı, 2 işletme, 1 ürün, 1 ilan, 1 sipariş ve 7 migration kaydı doğrulandı.

## Canlı uygulama ve doğrulama

- `0008_titck_skrs_catalog` canlı Neon veritabanına başarıyla uygulandı.
- Migration sayısı `7` → `8` oldu.
- Resmi katalogda `7.945` toplam ve `7.945` etkin kayıt; en yeni kaynak tarihi `2026-09-15` olarak doğrulandı.
- Migration ve içe aktarım sonrasında 2 kullanıcı, 2 işletme, 1 manuel ürün, 1 ilan ve 1 sipariş korundu.
- TİTCK aktarımı yalnızca ayrı resmi katalog tablosunu değiştirdi; manuel katalog, kullanıcı, işletme, ilan ve sipariş satırlarını silmedi.

## Yayın

- Özellik commit'i: `2d3fc88`.
- Vercel Production deployment: `dpl_DMUrkTPEFFw7jE2g5ozfEpqNiGmg`.
- Durum: `READY`; build süresi 47 saniye.
- Alan adları: `www.etaks.com.tr`, `etaks.com.tr`, `etakas.vercel.app`.
- Canlı smoke testi ve son 10 dakikalık hata logu taraması temiz sonuçlandı.

Yenileme prosedürü ve koruma kuralları [TITCK-SKRS.md](TITCK-SKRS.md) dosyasındadır.
