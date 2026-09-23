# Assumptions

- The existing Next.js App Router project is maintained in `c:\e-takas`; production and the working tree can be at different revisions.
- All monetary-like values are integer kuruş reference values and are labeled as Takas Kredisi or Referans Değer.
- Real businesses, licenses, invoices, serials, API keys and admin passwords are never committed or seeded.
- Drizzle ORM is used because explicit SQL constraints and transaction control are critical for ledger and inventory integrity.
- Missing production security settings fail closed.

## Geçerli kapsam kararları

- Süper admin rolü yalnızca açık yönetim kararıyla verilir; işletme kaydı yönetici rolü vermez. Yetkilendirilmiş süper adminler gerekli kişisel verilere erişebilir.
- Admin ve işletme girişlerinde e-posta kodu zorunludur. TOTP, uygulanmış bir koruma olarak varsayılmaz.
- Alan adı edinilene kadar Gmail uygulama şifresiyle geçici gönderim desteklenir; sırlar sohbette istenmez.
- Dosya antivirüs taraması kullanıcı isteğiyle kapsam dışıdır. Gerçek e-posta/CAPTCHA/uçtan uca testler sonraki aşamadadır.
- Hukuki metinler hazırlanmıştır; işletmeci onayı ve düzenlenen faaliyete ilişkin uzman incelemesi tamamlanmış sayılmaz.
