# Yayın öncesi kontrol listesi

Bu liste kalan operasyonel kabul adımlarını içerir. Başarılı bir derleme, bunların tamamlandığı anlamına gelmez. Gerçek testler kullanıcının isteğiyle sonraki aşamada yapılacaktır.

1. [ ] Uygulanacak commit/çalışma ağacı ve canlı dağıtım arasındaki farkı kaydedin; geri dönüş sürümünü belirleyin.
2. [ ] Neon yedeği/geri yükleme noktası oluşturun; doğru veritabanı ve Vercel projesini doğrulayın.
3. [ ] `DATABASE_URL`, `AUTH_SECRET`, `AUTH_RATE_LIMIT_SECRET`, `ENCRYPTION_KEY`, özel Blob anahtarı ve kanonik HTTPS `APP_URL` değerini güvenli şekilde yapılandırın.
4. [ ] Gmail veya Resend sağlayıcısını [EMAIL-SETUP.md](EMAIL-SETUP.md) uyarınca yapılandırın; Turnstile site/secret anahtarları ve izinli alan adlarını ekleyin.
5. [ ] `0005_security_auth.sql` dahil migration'ları hedef veritabanına uygulayın; eski oturumların kapandığını kabul planına dahil edin.
6. [ ] Yetkilendirilmiş süper admin listesini ve en az bir etkin süper admin kaldığını doğrulayın; eski kısa parolanın e-posta kurtarma akışıyla değiştirilebildiğini doğrulayın. Bootstrap komutunu parola sıfırlamak için kullanmayın.
7. [x] 10 Eylül çalışma ağacı için lint, TypeScript, 121 birim test, build ve çevrimiçi npm audit sonuçları [PROGRESSION.md](../PROGRESSION.md) dosyasına kaydedildi. Kod veya bağımlılıklar değişirse ilgili kontroller tekrarlanmalı.
8. [ ] Önizleme/test ortamında admin ve işletme giriş/kurtarma, CAPTCHA, rate limit, kilit, dosya erişimi, kabul metinleri, mobil görünüm ve klavye erişimini deneyin.
9. [ ] Sipariş/iptal/teslim/iade işlemlerinin eşzamanlı ve tekrarlanan isteklerde stok veya bakiye üretmediğini gerçek veritabanıyla doğrulayın.
10. [ ] Sabot Yazılım bilgilerini ve hukuki metinleri işletmeci onaylasın. Kişisel veri saklama, yurt dışı aktarım ve başvuru prosedürünü belgeleyin; ardından uygun olduğunda `LEGAL_CONTENT_APPROVED=true` yapın.
11. [ ] İlaçlarla ilgili resmî yetkiler, mesleki kısıtlar ve gerekiyorsa takip sistemi entegrasyonları doğrulanana kadar canlı işlemleri kapalı tutun.
12. [ ] Yayın sonrası gizli veri içermeyen hata gözlemi, erişim ve geri dönüş kontrollerini tamamlayın.

Canlı işlem için dört koşul birlikte gerekir: `LIVE_TRADING_ENABLED=true`, `TRADING_MODE=production`, `LEGAL_APPROVAL_CONFIRMED=true`, `LEGAL_CONTENT_APPROVED=true`. Bunlar bir izin belgesi değildir. Mevzuat incelemesi tamamlanmadan sırf arayüzü açmak için işaretlenmemelidir.

Yeni kod, gerekli hizmetler ve migration hazır olmadan üretime gönderilmemelidir. Kullanıcının kapsam dışında bıraktığı antivirüs taraması bu listenin tamamlanmış bir maddesi olarak sunulamaz.
