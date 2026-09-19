"use client";
import { useRef, useState, type FormEvent, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { LoaderCircle, CircleAlert, CheckCircle2 } from "lucide-react";
const errors: Record<string, string> = {
  IDEMPOTENCY_CONFLICT: "Önceki bakiye işlemi farklı bilgilerle kaydedilmiş. Hesap hareketlerini kontrol edip sayfayı yenileyin.",
  INVALID_ORIGIN: "Güvenlik doğrulaması başarısız. Sayfayı yenileyip tekrar deneyin.",
  RATE_LIMITED: "Kısa sürede çok fazla işlem yaptınız. Bir süre bekleyip tekrar deneyin.",
  CAPTCHA_REQUIRED: "Lütfen güvenlik doğrulamasını tamamlayın.",
  CAPTCHA_FAILED: "Güvenlik doğrulaması geçersiz veya süresi dolmuş. Yeniden tamamlayın.",
  SERVICE_UNAVAILABLE: "Hizmet şu anda kullanılamıyor. Lütfen daha sonra tekrar deneyin.",
  LEGAL_CONTENT_NOT_READY: "Başvurular henüz açılmadı. Lütfen daha sonra tekrar deneyin.",
  TRADING_NOT_ENABLED: "Gerçek takas işlemleri hazırlık aşaması tamamlanana kadar kapalıdır.",
  INVALID_FILE_TYPE: "Yalnızca JPEG, PNG, WebP görseli veya PDF belgesi yükleyin.",
  INVALID_IMAGE: "Görsel okunamadı veya boyutları çok büyük. Farklı bir görsel seçin.",
  INVALID_FILE_SIZE: "Belgelerin toplam boyutu 4 MB sınırını aşmamalıdır.",
  DOCUMENT_LIMIT_REACHED: "Belge sınırına ulaşıldı. Lütfen destek ile iletişime geçin.",
  "Listing images are required.": "Ürün ve ambalaj görsellerini ekleyin.",
  UNAUTHENTICATED: "Devam etmek için giriş yapın.",
  FORBIDDEN: "Bu işlem için yetkiniz bulunmuyor.",
  INVALID_ORGANIZATION_APPLICATION:
    "Bilgilerinizi kontrol edin. Zorunlu alanları ve onay kutularını doldurun.",
  EMAIL_ALREADY_REGISTERED: "Bu e-posta zaten kayıtlı. Mevcut hesabınızla giriş yapın.",
  INVALID_LISTING_SUBMISSION: "Barkod, tarih, miktar ve referans değerini kontrol edin.",
  ORGANIZATION_NOT_APPROVED: "İşletmeniz onaylandıktan sonra bu işlemi yapabilirsiniz.",
  PERSISTENCE_NOT_CONFIGURED: "Bağlantı henüz hazır değil. Lütfen daha sonra yeniden deneyin.",
  "Insufficient takas balance.":
    "Bu alım hesabınızın alt kredi sınırını aşar. Limit artışı için yöneticiyle iletişime geçin.",
  "Buyer lower credit limit would be exceeded.":
    "Bu işlem hesabınızın alt kredi sınırını aşar. Limit artışı için yöneticiyle iletişime geçin.",
  "Seller upper credit limit would be exceeded.":
    "Satıcı işletmenin üst kredi sınırı bu işlemle aşılacağı için işlem yapılamadı. Limit artışı için yöneticiyle iletişime geçin.",
  CREDIT_LIMIT_CONFLICT:
    "Yeni sınırlar mevcut bakiye veya bekleyen işlemlerle çelişiyor. Önce bakiyeyi ya da açık işlemleri düzenleyin.",
  BALANCE_LIMIT_EXCEEDED:
    "Bu bakiye değişikliği hesabın alt veya üst sınırını aşar. Önce kredi sınırlarını güncelleyin.",
  LEDGER_ACCOUNT_MISSING: "İşletmenin takas hesabı bulunamadı. Hesap kurulumunu kontrol edin.",
  BARCODE_ALREADY_EXISTS: "Bu barkod katalogda başka bir ürüne bağlı.",
  INVALID_MESSAGE: "Mesaj alanını kontrol edin.",
  INVALID_SUPPORT_REQUEST: "Şikayet veya talep bilgilerini kontrol edin.",
  "Insufficient listing stock.": "İstenen miktar için yeterli stok bulunmuyor.",
  "Listing is not active.": "Bu ilan artık işlem için uygun değil.",
  "Only approved organizations can submit listings.":
    "İlan göndermek için işletmenizin onaylanması gerekiyor.",
  "Expired products cannot be listed.": "Son kullanma tarihi gelecekte olmalıdır.",
  "High-risk products are blocked by default.": "Bu ürün kategorisi ilan vermeye uygun değil.",
  "Product is expired or unavailable.": "Ürünün süresi dolmuş veya ürün kullanıma kapatılmış.",
  "Order cannot be completed from current status.":
    "Siparişin güncel durumu tamamlamaya uygun değil."
};
export function SubmitForm({
  endpoint,
  children,
  label,
  redirectTo,
  json = false,
  values = {},
  className = "",
  successMessage = "İşlem kaydedildi."
}: {
  endpoint: string;
  children?: ReactNode;
  label: string;
  redirectTo?: string;
  json?: boolean;
  values?: Record<string, unknown>;
  className?: string;
  successMessage?: string;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const adjustmentKey = useRef<string | null>(null);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    const form = event.currentTarget;
    const data = new FormData(form);
    setError("");
    setSuccess(false);
    const bytes = [...data.values()].reduce((sum, v) => sum + (v instanceof File ? v.size : 0), 0);
    if (bytes > 4_000_000) {
      setError("Belgelerin toplam boyutu en fazla 4 MB olabilir. Daha küçük dosyalar seçin.");
      return;
    }
    setPending(true);
    try {
      const payload = { ...values, ...Object.fromEntries(data) };
      if (endpoint === "/api/admin/credit-limits" && values.operation === "ADJUST_BALANCE") {
        adjustmentKey.current ??= crypto.randomUUID();
        payload.idempotencyKey = adjustmentKey.current;
      }
      const response = await fetch(endpoint, {
        method: "POST",
        headers: json
          ? { "Content-Type": "application/json", Accept: "application/json" }
          : { Accept: "application/json" },
        body: json ? JSON.stringify(payload) : data
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok)
        throw new Error(
          errors[result.error] ??
            (response.status === 413
              ? "Dosyalar çok büyük. Toplam boyutu 4 MB altında tutun."
              : "İşlem tamamlanamadı. Bilgileri ve işlem durumunu kontrol edip tekrar deneyin.")
        );
      setSuccess(true);
      window.dispatchEvent(new Event("notifications-updated"));
      adjustmentKey.current = null;
      if (redirectTo) router.push(redirectTo);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Bağlantı kurulamadı. Lütfen tekrar deneyin.");
    } finally {
      setPending(false);
      form.dispatchEvent(new Event("captcha-reset"));
    }
  }
  return (
    <form
      onSubmit={submit}
      className={className}
      aria-busy={pending}
      encType={json ? undefined : "multipart/form-data"}
    >
      <fieldset disabled={pending} className="form-fields">
        {children}
      </fieldset>
      {error && (
        <p role="alert" className="notice notice-error">
          <CircleAlert size={18} />
          {error}
        </p>
      )}
      {success && !redirectTo && (
        <p role="status" className="notice notice-success">
          <CheckCircle2 size={18} />
          {successMessage}
        </p>
      )}
      <button disabled={pending} className="button button-primary" type="submit">
        {pending && <LoaderCircle size={17} className="animate-spin" />}
        {pending ? "Kaydediliyor…" : label}
      </button>
    </form>
  );
}
