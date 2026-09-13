# Etakas

Etakas, işletme başvuruları, stok ilanları ve işletmeler arası işlem kayıtları için geliştirilen Next.js uygulamasıdır. İşleten: Sabot Yazılım. Hedef barındırma Vercel, ilişkisel veri deposu Neon PostgreSQL, özel dosya deposu Vercel Blob'dur.

Gerçek ilaç takası varsayılan olarak kapalıdır. Hukuki metinlerin bulunması veya bir ortam değişkeninin açılması, iş modeline resmî izin verildiği anlamına gelmez.

## Çalışmanın durumu

Tamamlanan işler, kalan adımlar ve son kontroller [PROGRESSION.md](PROGRESSION.md) dosyasında tutulur. Çalışma dizinindeki güvenlik değişiklikleri ile canlı site aynı sürüm kabul edilmemelidir; dağıtım durumu bu kayıttan kontrol edilmelidir. Gerçek e-posta, CAPTCHA ve uçtan uca kullanıcı testleri kullanıcının isteğiyle sonraki aşamaya bırakılmıştır.

## Yerel geliştirme

Node.js `>=22 <25` kullanın. `.env.example` dosyasını inceleyin; sırları `.env.local` veya Vercel ortam değişkenlerinde tutun.

```bash
npm ci
npm run dev
```

```bash
npm run lint
npm run typecheck
npm run test
npm run build
```

Veritabanı komutları hedef bağlantıda değişiklik yapar. `npm run db:migrate` öncesinde hedefi ve yedeği doğrulayın. `npm run db:seed` sentetik veri üretir ve yalnızca yerel veritabanına izin verir. `npm run db:bootstrap-admin` ilk süper yöneticiyi oluşturmak içindir; olağan parola kurtarma aracı olarak kullanılmaz.

## Erişim ve başvuru

- `/giris`: İşletme ve süper admin için parola ardından her girişte e-posta kodu.
- `/parolami-unuttum`: E-postayla tek kullanımlık parola kurtarma bağlantısı.
- `/isletme-kaydi`: İşletme başvurusu. Açık adres zorunludur; belge yüklemek isteğe bağlıdır ve önerilir. Kayıt yönetici rolü vermez.
- `/panel`, `/ilanlarim`, `/siparisler`, `/hesabim`: İşletmeye ve üyelik rolüne bağlı alanlar.
- `/admin36100`: Yalnızca sunucuda `SUPER_ADMIN` rolü doğrulanan kullanıcıya açık yönetim alanı. Yol adının bilinmemesi bir güvenlik kontrolü değildir.
- `/hukuki` ve `/sss`: Hukuki metinler, iletişim, platform sınırları ve sık sorulan sorular.

## Yayına hazırlık

Önce [dağıtım sırasını](docs/DEPLOYMENT.md), [e-posta kurulumunu](docs/EMAIL-SETUP.md) ve [yayın kontrol listesini](docs/PRE-PRODUCTION-CHECKLIST.md) izleyin. `0005_security_auth.sql` yeni oturum/doğrulama tablolarını ve alanlarını içerir; yeni koddan önce uygulanmalıdır ve mevcut oturumları kapatır.

Gmail geçici gönderici olarak desteklenir; özel alan adı zorunlu değildir. Gmail hesap parolası kullanılmaz: iki adımlı doğrulama ile oluşturulan ayrı uygulama şifresi gerekir. Alan adı edinildiğinde Resend seçilebilir.

Yeni parolalar 12–128 karakter olmalıdır ve zayıf parola kontrolünden geçmelidir. Eski kısa parolası olan hesaplar e-posta üzerinden parola yenilemeden yeni sürümde giriş yapamaz. E-posta hizmeti yapılandırılmadan canlı sürümü değiştirmek bu hesapları erişimsiz bırakabilir.

Mimari ve sınırlar: [ARCHITECTURE](docs/ARCHITECTURE.md), [SECURITY-CHECKLIST](docs/SECURITY-CHECKLIST.md), [THREAT-MODEL](docs/THREAT-MODEL.md), [DEPENDENCY-AUDIT](docs/DEPENDENCY-AUDIT.md).
