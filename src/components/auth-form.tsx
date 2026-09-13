"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState, type FormEvent, type ReactNode } from "react";
import { CircleAlert, LoaderCircle } from "lucide-react";

const messages: Record<string, string> = {
  INVALID_CREDENTIALS:
    "E-posta veya parola hatalı ya da hesabınız geçici olarak kilitli. Bilgilerinizi kontrol edin; art arda başarısız denemeler yaptıysanız 15 dakika bekleyin.",
  PASSWORD_UPGRADE_REQUIRED:
    "Hesabınızın parolası güncel güvenlik koşullarını karşılamıyor. E-posta adresinizi doğrulayarak parolanızı yenileyin.",
  INVALID_CODE:
    "Kod hatalı, süresi dolmuş veya kullanılmış olabilir. E-postadaki son kodu, giriş işlemini başlattığınız tarayıcıda kullanın. Beş başarısız denemeden sonra yeniden giriş başlatmanız gerekir.",
  INVALID_RESET_LINK:
    "Bu parola yenileme bağlantısı geçersiz, kullanılmış veya süresi dolmuş. Yeni bir bağlantı isteyin.",
  WEAK_PASSWORD:
    "En az 12, en fazla 128 karakterden oluşan benzersiz bir parola seçin. Yaygın parolalar, yalnızca rakamlar ve tekrarlanan karakterler kabul edilmez.",
  PASSWORD_MISMATCH: "Girdiğiniz parolalar aynı değil. Lütfen tekrar kontrol edin.",
  CAPTCHA_REQUIRED: "Devam etmek için güvenlik doğrulamasını tamamlayın.",
  CAPTCHA_FAILED: "Güvenlik doğrulaması geçersiz veya süresi dolmuş. Lütfen yeniden doğrulayın.",
  INVALID_ORIGIN: "Bu istek doğrulanamadı. Sayfayı yenileyip tekrar deneyin.",
  INVALID_REQUEST: "Bilgilerinizi kontrol edin ve zorunlu alanları doldurun.",
  SERVICE_UNAVAILABLE: "Giriş hizmeti şu anda kullanılamıyor. Lütfen daha sonra tekrar deneyin."
};

export function AuthForm({
  endpoint,
  children,
  label,
  pendingLabel = "Doğrulanıyor…"
}: {
  endpoint: string;
  children: ReactNode;
  label: string;
  pendingLabel?: string;
}) {
  const router = useRouter();
  const busy = useRef(false);
  const alert = useRef<HTMLDivElement>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [errorCode, setErrorCode] = useState("");

  function reportError(code: string, message: string) {
    setErrorCode(code);
    setError(message);
    requestAnimationFrame(() => alert.current?.focus());
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy.current) return;
    const form = event.currentTarget;
    const data = new FormData(form);
    if (
      data.has("passwordConfirmation") &&
      data.get("password") !== data.get("passwordConfirmation")
    ) {
      reportError("PASSWORD_MISMATCH", messages.PASSWORD_MISMATCH);
      return;
    }
    busy.current = true;
    setPending(true);
    setError("");
    setErrorCode("");
    try {
      const response = await fetch(endpoint, {
        method: "POST",
        body: data,
        headers: { Accept: "application/json" },
        credentials: "same-origin",
        cache: "no-store",
        signal: AbortSignal.timeout(30000)
      });
      const result = (await response.json().catch(() => ({}))) as {
        ok?: boolean;
        error?: string;
        redirectTo?: string;
      };
      if (!response.ok || !result.ok) {
        const code = result.error || "SERVICE_UNAVAILABLE";
        const retryAfter = Number(response.headers.get("Retry-After"));
        const wait =
          Number.isFinite(retryAfter) && retryAfter > 0
            ? `${Math.ceil(retryAfter / 60)} dakika`
            : "bir süre";
        reportError(
          code,
          code === "RATE_LIMITED"
            ? `Çok fazla deneme yaptınız. Lütfen ${wait} bekleyip tekrar deneyin.`
            : messages[code] || "İşlem tamamlanamadı. Lütfen tekrar deneyin."
        );
        form.dispatchEvent(new Event("captcha-reset"));
        return;
      }
      const target = result.redirectTo;
      if (
        !target ||
        !target.startsWith("/") ||
        target.startsWith("//") ||
        /[\\\r\n\u0000]/.test(target)
      ) {
        throw new Error("INVALID_REDIRECT");
      }
      router.replace(target);
      router.refresh();
    } catch {
      reportError(
        "NETWORK_ERROR",
        "Bağlantı kurulamadı veya yanıt zaman aşımına uğradı. İnternet bağlantınızı kontrol edip tekrar deneyin."
      );
      form.dispatchEvent(new Event("captcha-reset"));
    } finally {
      busy.current = false;
      setPending(false);
    }
  }

  return (
    <form action={endpoint} method="post" onSubmit={submit} aria-busy={pending}>
      <fieldset className="form-fields" disabled={pending}>
        {children}
      </fieldset>
      {error && (
        <div ref={alert} tabIndex={-1} role="alert" className="notice notice-error mb-5">
          <CircleAlert size={18} aria-hidden="true" />
          <div>
            <p>{error}</p>
            {(errorCode === "PASSWORD_UPGRADE_REQUIRED" || errorCode === "INVALID_RESET_LINK") && (
              <Link href="/parolami-unuttum" className="font-bold underline">
                Parola yenileme bağlantısı iste
              </Link>
            )}
          </div>
        </div>
      )}
      <button disabled={pending} className="button button-primary w-full" type="submit">
        {pending && <LoaderCircle size={17} className="animate-spin" aria-hidden="true" />}
        <span role="status">{pending ? pendingLabel : label}</span>
      </button>
    </form>
  );
}
