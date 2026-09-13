# Backup and Restore

Use managed PostgreSQL backups from the selected provider. Production restore procedures must verify ledger consistency, stock consistency and audit log continuity before reopening trading workflows.

Yayın öncesi hedef veritabanını, geri yükleme noktasını ve uygulama sürümünü birlikte kaydedin. `0005_security_auth.sql` eski oturumları kapatır; geri dönüş planında yalnızca uygulama sürümü değil şema uyumu da değerlendirilmelidir.

Veritabanı yedeği özel Blob dosyalarını veya şifreleme anahtarlarını içermez. Dosyalar, depo erişimi ve `ENCRYPTION_KEY`/önceki anahtarlar ayrı güvenli saklama planına dahil edilmelidir. Yedek sırlarını depo, günlük veya sohbet içine kopyalamayın.

Geri yükleme provası üretimden ayrı, erişimi sınırlı ortamda yapılmalı; şifreli örnek alanlar çözülebilmeli, belge referansları çalışmalı, stok ve muhasebe toplamları karşılaştırılmalıdır. Bu çalışma sırasında gerçek yedek/geri yükleme provası yapılmadı.
