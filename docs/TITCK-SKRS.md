# TİTCK SKRS barkod kataloğu

Etakas, **TİTCK SKRS E-Reçete İlaç ve Diğer Farmasötik Ürünler Listesi** verisini ayrı `titck_skrs_products` tablosunda tutar. İlan barkodu önce bu tabloda, sonra platformun manuel `product_catalog` kayıtlarında aranır. İki kaynakta da bulunmayan barkod için kullanıcı uyarılır; ürün bilgilerini manuel girer ve mevcut katalog akışıyla kaydeder.

TİTCK kaynaklı kayıtlar admin panelindeki düzenlenebilir barkod kataloğunda gösterilmez. İlan gönderilirken resmi ad, ATC ve üretici bilgileri yeniden sunucu tarafında okunur; tarayıcıdan değiştirilen değerler resmi kaydın üzerine yazamaz.

## Resmi kaynak ve yenileme

- Liste sayfası: <https://www.titck.gov.tr/dinamikmodul/43>
- Sağlık Bakanlığı duyurusuna göre liste haftalık güncellenir ve entegrasyon kullanan yazılımların her çarşamba güncel listeyi alması gerekir: <https://kayittescil.saglik.gov.tr/TR-55634/20062019-skrs-ilac-listesi-guncellemesi-hakkinda-tum-sbys-ureticilerine.html>

Yenileme kontrollü bir operasyon işlemidir. TİTCK sayfasındaki en güncel `xlsx` dosyasını indirin, yayın tarihini ve alan adını doğrulayın. Üçüncü taraf kopya kullanmayın.

```powershell
python scripts/titck/normalize_skrs_xlsx.py `
  .cache/titck/skrs-YYYY-MM-DD.xlsx `
  .cache/titck/skrs-YYYY-MM-DD.json `
  --published-at YYYY-MM-DD `
  --source-url "https://titck.gov.tr/...xlsx"
```

Normalizer yalnızca etkin ürün sayfasını okur, GTIN değerlerini 8–14 rakam olarak doğrular ve aynı barkodu tekilleştirir. İçe aktarıcı 1.000'den az kayıt içeren şüpheli dosyaları ve veritabanındaki sürümden eski tarihli dosyaları reddeder.

Hedef veritabanının yedeğini aldıktan sonra:

```powershell
npm run db:migrate
npm run db:import-titck -- .cache/titck/skrs-YYYY-MM-DD.json
```

Aktarım tek transaction içinde upsert yapar. Yeni resmi listede bulunmayan eski TİTCK satırları aynı transaction içinde kaldırılır. Manuel katalog kayıtları, ilanlar ve siparişler bu işlemden etkilenmez.

Doğrulama sorgusu:

```sql
select count(*) as product_count,
       min(source_published_at) as oldest_snapshot,
       max(source_published_at) as newest_snapshot
from titck_skrs_products;
```

İçe aktarılan kaynak dosyası `.cache/` altında tutulur ve Git'e eklenmez. Kaynak URL'si, yayın tarihi, kayıt sayısı ve migration öncesi yedek bilgileri ilgili migration raporuna yazılır.
