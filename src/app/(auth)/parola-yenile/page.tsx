import Link from "next/link";
import { headers } from "next/headers";
import type { Metadata } from "next";
import { AuthForm } from "@/components/auth-form";
import { Captcha } from "@/components/captcha";
import { parseChallengeToken } from "@/lib/auth/challenges";
import { AuthShell } from "../auth-shell";

export const metadata: Metadata = { title: "Yeni parola oluştur", referrer: "no-referrer" };

export default async function ResetPasswordPage({
  searchParams
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const [params, requestHeaders] = await Promise.all([searchParams, headers()]);
  return (
    <AuthShell
      title="Yeni parolanızı belirleyin"
      description="E-posta bağlantısını kullanarak hesabınız için yeni bir parola oluşturun. Parola değiştiğinde tüm mevcut oturumlarınız kapatılır."
    >
      {parseChallengeToken(params.token) ? (
        <AuthForm
          endpoint="/api/session/password-reset/complete"
          label="Parolayı yenile"
          pendingLabel="Parola yenileniyor…"
        >
          <input type="hidden" name="token" value={params.token} />
          <label>
            Yeni parola
            <input
              name="password"
              type="password"
              autoComplete="new-password"
              minLength={12}
              maxLength={128}
              required
              aria-describedby="password-help"
            />
          </label>
          <p id="password-help" className="subtext">
            12–128 karakter kullanın. Uzun ve benzersiz bir parola seçin; yaygın parolalar, yalnızca
            rakamlar ve tekrarlanan karakterler kabul edilmez. Parola yöneticisi kullanabilir,
            parolanızı yapıştırabilirsiniz.
          </p>
          <label>
            Yeni parola (tekrar)
            <input
              name="passwordConfirmation"
              type="password"
              autoComplete="new-password"
              minLength={12}
              maxLength={128}
              required
            />
          </label>
          <Captcha
            action="password_reset_complete"
            nonce={requestHeaders.get("x-nonce") ?? undefined}
          />
        </AuthForm>
      ) : (
        <>
          <p className="notice notice-error mb-5" role="alert">
            Parola yenileme bağlantısı geçersiz veya eksik. E-postadaki tam bağlantıyı açın ya da
            yeni bir bağlantı isteyin.
          </p>
          <Link className="button button-primary w-full" href="/parolami-unuttum">
            Yeni bağlantı iste
          </Link>
        </>
      )}
    </AuthShell>
  );
}
