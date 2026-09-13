# Bağımlılık güvenlik taraması

Son tekrar: 10 Eylül 2026 (ilk kayıt: 8 Eylül 2026). Bu kayıt çalışma dizinindeki `package.json` ve `package-lock.json` için alınmıştır; canlı ortamda aynı sürümlerin kullanıldığını tek başına doğrulamaz.

## Doğrulanmış sonuç

| Kapsam | Komut | Çıkış kodu | Bildirilen açık |
| --- | --- | --- | --- |
| Tüm bağımlılıklar | `npm audit --offline=false --json` | 0 | 0 |
| Üretim bağımlılıkları | `npm audit --offline=false --omit=dev --json` | 0 | 0 |

İki çevrimiçi yanıt da `auditReportVersion: 2`, boş `vulnerabilities` nesnesi ve bilgi, düşük, orta, yüksek, kritik kategorilerinin tamamında `0` döndürdü. Tarama resmi npm danışma servisine (`https://registry.npmjs.org/-/npm/v1/security/advisories/bulk`) erişerek yapıldı. İlk sandbox denemeleri ağ kısıtı nedeniyle başarısız oldu; yukarıdaki sonuçlar onaylı ağ erişimiyle yeniden çalıştırılan komutlardan alındı. Başarısız veya çevrimdışı tarama başarılı kabul edilmedi.

Denetlenen `package-lock.json` SHA-256:

```text
C7A47E06469DC362BBA49E695F98B62DB62B8B622F7D44E3E0140AFBB97D8092
```

## Önemli sürümler

| Paket | Kilitlenen sürüm |
| --- | --- |
| Next.js / eslint-config-next | 16.3.4 |
| React / React DOM | 19.2.8 |
| Sharp | 0.35.4 |
| Vercel Blob | 2.8.0 |
| Drizzle ORM | 0.45.2 |
| Drizzle Kit | 0.31.10 |
| file-type | 22.0.2 |
| Nodemailer | 10.0.1 |
| ESLint / TypeScript | 9.39.5 / 6.0.3 |
| esbuild (doğrudan geliştirme bağımlılığı) | 0.28.2 |
| esbuild (`@esbuild-kit/core-utils` geçişli bağımlılığı, override) | 0.25.12 |

Better Auth artık doğrudan bağımlılıklar arasında bulunmuyor; uygulama kendi veritabanı oturumu ve e-posta doğrulaması akışını kullanıyor. Çalışma zamanı hedefi `>=22 <25` Node.js sürümleriyle sınırlandırılmıştır. Bu sonuçlar Gmail/Nodemailer eklendikten sonra yeniden alınmıştır.

ESLint, mevcut Next.js eklentilerinin uyumlu sürüm aralığı nedeniyle 9.39.5'te tutuldu; büyük sürüm yükseltmesi uyumluluk kontrolü olmadan zorlanmadı. Drizzle Kit'in geçişli esbuild bağımlılığına kapsamı yalnızca `@esbuild-kit/core-utils` olan override uygulandı. Bu kararlar kilit dosyasında açıkça görülebilir.

## Kapsam ve sınırlar

`0` sonucu, tarama anında npm danışma veritabanının bu bağımlılık ağacı için bilinen açık bildirmediğini gösterir. Uygulama kodunun, canlı yapılandırmanın, e-posta/CAPTCHA servislerinin veya iş mantığının hatasız olduğunu göstermez. Kod incelemesi, derleme kontrolleri ve ileride yapılacak gerçek uçtan uca testler ayrı değerlendirilmelidir.

Bu denetim sırasında paket yüklenmedi, sürüm değiştirilmedi, gerçek e-posta gönderilmedi, üretim verisi değiştirilmedi ve dağıtım yapılmadı. Bağımlılık kilidi değiştiğinde ve üretim yayını öncesinde çevrimiçi tarama tekrar çalıştırılmalıdır.
