import Link from "next/link";
import { headers } from "next/headers";
import type { Metadata } from "next";
import { AuthForm } from "@/components/auth-form";
import { Captcha } from "@/components/captcha";
import { AuthShell } from "../auth-shell";

export const metadata: Metadata = { title: "Parolamı unuttum" };

export default async function ForgotPasswordPage({
  searchParams
}: {
  searchParams: Promise<{ sent?: string }>;
}) {
  const [params, requestHeaders] = await Promise.all([searchParams, headers()]);
  return (
    <AuthShell
      title="Parolanızı yenileyin"
      description="Hesabınızın e-posta adresini girin. Parolanızı değiştirebilmeniz için bu adrese tek kullanımlık bir bağlantı göndereceğiz."
    >
      {params.sent === "1" ? (
        <>
          <p className="notice notice-success" role="status">
            Bu e-posta adresiyle kayıtlı bir hesap varsa parola yenileme bağlantısı gönderilecektir.
            Gelen kutunuzu ve istenmeyen posta klasörünü kontrol edin.
          </p>
          <p className="subtext mt-5">
            Bağlantı 20 dakika geçerlidir. Parolanız yenilendiğinde önceki tüm yenileme bağlantıları
            ve oturumlar geçersiz olur.
          </p>
          <Link className="button button-secondary mt-5 w-full" href="/parolami-unuttum">
            Yeni bağlantı iste
          </Link>
        </>
      ) : (
        <AuthForm
          endpoint="/api/session/password-reset/request"
          label="Yenileme bağlantısı gönder"
          pendingLabel="İstek gönderiliyor…"
        >
          <label>
            E-posta adresi
            <input
              name="email"
              type="email"
              autoComplete="username"
              maxLength={320}
              required
              placeholder="ornek@eczane.com"
            />
          </label>
          <Captcha action="password_reset" nonce={requestHeaders.get("x-nonce") ?? undefined} />
        </AuthForm>
      )}
      <p className="subtext mt-7 text-center">
        <Link className="font-bold text-[var(--primary)]" href="/giris">
          Girişe dön
        </Link>
      </p>
    </AuthShell>
  );
}
