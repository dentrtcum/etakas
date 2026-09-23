# Süper admin rehberi

Yönetim alanı `/admin36100` adresindedir. E-posta/parola girişi ardından her seferinde e-posta kodu istenir. Sunucu yalnızca `user_roles` tablosunda global `SUPER_ADMIN` rolü bulunan kullanıcıya yetki verir. Bir işletmenin sahibi olmak veya işletme başvurusu yapmak bu yetkiyi sağlamaz.

## Kullanıcı güvenliği

Kullanıcı güvenliği bölümünde gerekçe belirterek oturumları iptal etme, hesabı kilitleme/kilidi kaldırma ve kayıtlı adrese parola kurtarma e-postası gönderme işlemleri yapılabilir. Yönetici kullanıcının mevcut parolasını göremez veya onun yerine e-posta kodunu doğrulayamaz. Parola yenileme bağlantısını hesap sahibi kullanır; yönetici bir başka alıcı adresi girerek bağlantıyı yönlendiremez.

Geçici deneme kilidi ile yöneticinin koyduğu kalıcı kilit ayrıdır. Parola kurtarma kalıcı kilidi kaldırmaz. Bir süper adminin kendi hesabını veya sistemde kalan son süper admini kilitlemesi engellenir. Admin işlemleri gerekçesiyle denetim kaydına yazılır.

## İşletme, ilan ve siparişler

İşletme başvuruları incelenebilir, onaylanabilir, reddedilebilir, ek belge istenebilir veya askıya alınabilir. Belgeler başvuruda isteğe bağlıdır; bu, mevzuattan doğan yetkilerin aranmayacağı anlamına gelmez. Süper admin inceleme için kişisel bilgilere ve özel belgelere erişebilir.

İlanlar onay, değişiklik talebi, ret veya kaldırma kararına tabidir. Başvurunun veya ilanın onaylanması resmî kurum onayı yerine geçmez. Yüklenen dosyalarda antivirüs taraması yapılmadığından belge indirme konusunda işletim sistemi korumaları kullanılmalıdır.

Siparişler otomatik tamamlanmaz: satıcı teslim beyanı verir, alıcı teslimi onaylar. Yönetici gerekçeli itiraz, iptal, zorunlu tamamlama ve iade akışlarını yönetebilir. Canlı işlem kapıları yöneticinin zorunlu tamamlama işleminde de uygulanır. Muhasebe kayıtları doğrudan silinerek/düzenlenerek düzeltilmez; ilgili ters kayıt akışı kullanılır.

## İlk kurulum

`db:bootstrap-admin` ilk yönetici kurulumuna ayrılmıştır. Olağan parola yenileme e-postalı kurtarma akışıyla yapılmalıdır. İlk giriş öncesi migration, e-posta ve CAPTCHA kurulumu tamamlanmalıdır; ayrıntılar [DEPLOYMENT.md](DEPLOYMENT.md) dosyasındadır.
