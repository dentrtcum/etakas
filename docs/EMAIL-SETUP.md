# Hesap e-postalarının kurulumu

8 Eylül 2026. Gönderim kodu hazırdır; bir adresin iletişim metinlerinde bulunması, o hesaptan e-posta göndermeye yetki vermez. Bu çalışma sırasında gerçek e-posta gönderilmedi.

## Alan adı alınana kadar Gmail

Uygulama, açıkça `EMAIL_PROVIDER=gmail` seçilince Gmail SMTP kullanır. `.env.example` bu seçeneği gösterir. `EMAIL_PROVIDER` boş bırakılırsa kod geriye uyumluluk için Resend seçer; Gmail otomatik olarak tahmin edilmez.

1. `ahmetnayki77@gmail.com` Google hesabında iki adımlı doğrulamayı etkinleştirin.
2. Google hesabının [Uygulama şifreleri](https://myaccount.google.com/apppasswords) bölümünden Etakas için ayrı bir uygulama şifresi oluşturun.
3. Vercel projesinin ilgili ortamına aşağıdaki değişkenleri girin. Uygulama şifresini Vercel'de hassas değer olarak saklayın; sohbet, Git, ekran görüntüsü veya uygulama formu üzerinden paylaşmayın.

```dotenv
EMAIL_PROVIDER=gmail
GMAIL_USER=ahmetnayki77@gmail.com
GMAIL_APP_PASSWORD=
EMAIL_FROM=
```

`GMAIL_APP_PASSWORD`, Google'ın ürettiği uygulama şifresidir; Google hesap parolası veya Etakas giriş parolası değildir. Kopyalama sırasında gelen boşluklar kod tarafından kaldırılır. `EMAIL_FROM` Gmail modunda boş kalabilir; doluysa `GMAIL_USER` ile aynı adres olmalıdır. Gönderici adı Etakas'tır.

Google uygulama şifresi oluşturmak için iki adımlı doğrulama ister; bazı kurumsal hesaplarda, yalnız güvenlik anahtarı kullanılan kurulumlarda veya Advanced Protection altında bu seçenek bulunmayabilir. Google hesap parolası değiştiğinde uygulama şifreleri iptal edilir. [Google: uygulama şifreleri](https://support.google.com/accounts/answer/185833)

Gmail bağlantısı yalnızca `smtp.gmail.com:465` adresine TLS ile yapılır; sertifika doğrulaması açıktır. SMTP kullanıcı bilgileri yalnızca sunucuda kullanılır. Kayıtlara kod, parola kurtarma bağlantısı veya sağlayıcının ham hata yanıtı yazılmaz. Gmail'in gönderim sınırları ve olağan dışı bağlantı denetimleri vardır; bu yöntem geçici, düşük hacimli kullanım için seçilmiştir. [Nodemailer: Gmail kullanımı](https://nodemailer.com/usage/using-gmail/)

## Alan adı alındıktan sonra Resend

Alan adını Resend'de doğrulayın ve hizmetin verdiği DNS kayıtlarını uygulayın. Gmail adresini Resend göndereni gibi göstermek alan adı doğrulamasının yerine geçmez. [Resend: alan adları](https://resend.com/docs/dashboard/domains/introduction)

```dotenv
EMAIL_PROVIDER=resend
RESEND_API_KEY=
EMAIL_FROM=
```

`EMAIL_FROM` doğrulanmış alan adındaki posta adresi olmalıdır. Sağlayıcı değişimi sonrasında yeni Vercel dağıtımı gerekir. Kullanılmayan Gmail uygulama şifresini Google'dan iptal edin ve Vercel ortamından kaldırın.

## Yayından önce yapılacaklar

- CAPTCHA anahtarlarını ve kanonik HTTPS `APP_URL` değerini de yapılandırın. Posta sağlayıcısının hazır olması tek başına giriş akışını etkinleştirmez.
- Veritabanı yedeği sonrası `0005_security_auth.sql` dahil migration'ları uygulayın. Bu migration eski oturumları kapatır.
- Kullanıcı tarafından sonraya bırakılan gerçek test aşamasında işletme ve süper admin için kod teslimini, yanlış/süresi geçmiş kodu, kurtarma bağlantısını ve istenmeyen posta klasörünü kontrol edin.
- SMTP veya API'nin iletiyi kabul etmesi, alıcının gelen kutusuna ulaştığını kanıtlamaz. SMTP aynı iletiyi tek kez teslim etmeyi garanti etmez; sabit `Message-ID` bu garantinin yerine geçmez.

E-posta yapılandırılmadığında üretimde doğrulamayı atlatan giriş veya konsola kod yazdıran bir yedek yol yoktur. Hazırlık kontrolleri yalnızca yapılandırmanın varlığını kontrol eder; gönderim ya da gelen kutusuna teslim doğrulaması yapmaz.
