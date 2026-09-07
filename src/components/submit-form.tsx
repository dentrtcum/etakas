"use client";
import { useState, type FormEvent, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { LoaderCircle, CircleAlert, CheckCircle2 } from "lucide-react";
const errors: Record<string, string> = {
  UNAUTHENTICATED: "Devam etmek için giriş yapın.",
  FORBIDDEN: "Bu işlem için yetkiniz bulunmuyor.",
  INVALID_ORGANIZATION_APPLICATION:
    "Bilgilerinizi kontrol edin. Zorunlu alanları ve onay kutularını doldurun.",
  EMAIL_ALREADY_REGISTERED: "Bu e-posta zaten kayıtlı. Mevcut hesabınızla giriş yapın.",
  INVALID_LISTING_SUBMISSION: "Barkod, tarih, miktar ve referans değerini kontrol edin.",
  ORGANIZATION_NOT_APPROVED: "İşletmeniz onaylandıktan sonra bu işlemi yapabilirsiniz.",
  PERSISTENCE_NOT_CONFIGURED: "Bağlantı henüz hazır değil. Lütfen daha sonra yeniden deneyin.",
  "Insufficient takas balance.": "Kullanılabilir takas bakiyeniz bu işlem için yeterli değil.",
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
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    const data = new FormData(event.currentTarget);
    setError("");
    setSuccess(false);
    const bytes = [...data.values()].reduce((sum, v) => sum + (v instanceof File ? v.size : 0), 0);
    if (bytes > 4_000_000) {
      setError("Belgelerin toplam boyutu en fazla 4 MB olabilir. Daha küçük dosyalar seçin.");
      return;
    }
    setPending(true);
    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: json
          ? { "Content-Type": "application/json", Accept: "application/json" }
          : { Accept: "application/json" },
        body: json ? JSON.stringify({ ...values, ...Object.fromEntries(data) }) : data
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
      if (redirectTo) router.push(redirectTo);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Bağlantı kurulamadı. Lütfen tekrar deneyin.");
    } finally {
      setPending(false);
    }
  }
  return (
    <form
      onSubmit={submit}
      className={className}
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
