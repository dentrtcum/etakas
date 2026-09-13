# Legal Compliance

E-Takas is designed as a regulated B2B health inventory coordination system. This document is not legal advice.

## Default Legal Position

- Live trading is disabled by default.
- `TRADING_MODE=demo` and `LEGAL_APPROVAL_CONFIRMED=false` are the safe defaults.
- `LIVE_TRADING_ENABLED=false` and `LEGAL_CONTENT_APPROVED=false` also default to closed. All four settings must allow live trading before an order can proceed.
- Production trading cannot be enabled unless legal approval is explicitly recorded in configuration and documentation.
- If live exchange is not legally supportable, the product must operate only as a stock request and inter-business communication coordination platform.

## High-Risk Areas

- Human medicine transfer between pharmacies.
- Veterinary product transfer authority across pharmacies, clinics and veterinary suppliers.
- Cold chain, narcotic, psychotropic, controlled prescription, biological and vaccine products.
- Serial, invoice, license, address, tax and contact data retention under KVKK.
- Any accounting interpretation of Takas Kredisi.

## Hazırlanan metinler ve kabul akışı

Sabot Yazılım işletmeci bilgileriyle `/hukuki` altında kullanım koşulları, gizlilik politikası, KVKK aydınlatma metni, çerez politikası, açık rıza bilgilendirmesi, ticari elektronik ileti bilgilendirmesi ve platform kuralları/sorumluluklar sayfaları hazırlandı. `/sss` işleyişi açıklar. Kaynak bağlantıları ilgili metnin sonunda bulunur.

Başvuru sırasında kullanım koşullarının kabulü ile aydınlatmanın okunduğu bilgisi ayrı alınır; kullanıcı ilgili metni formdan açabilir. Kayıtlar metin sürümüyle tutulur. Genel, her işlem için zorunlu açık rıza veya pazarlama izni alınmaz. Şu anda isteğe bağlı analitik/reklam çerezi ve pazarlama gönderimi uygulanmamıştır; çerez kontrolü bu durumu dürüstçe gösterir.

`LEGAL_CONTENT_APPROVED`, işletmecinin metinleri inceleme kaydıdır. Varsayılan false olduğundan başvuru sunucuda durdurulur. Bu bayrak, yurt dışına aktarım koşullarını, resmî ilaç faaliyeti izinlerini veya mesleki yetkileri tek başına sağlamaz. Gerçek aktarım bölgeleri, sağlayıcı sözleşmeleri, saklama süreleri ve yetki belgeleri yayın öncesi tamamlanmalıdır.
