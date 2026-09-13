import Link from "next/link";
import { headers } from "next/headers";
import type { Metadata } from "next";
import { AuthForm } from "@/components/auth-form";
import { Captcha } from "@/components/captcha";
import { safeNextPath } from "@/lib/security/request-guards";
import { AuthShell } from "../auth-shell";

export const metadata: Metadata = { title: "Giriş yap" };

export default async function LoginPage({
  searchParams
}: {
  searchParams: Promise<{ next?: string; reset?: string }>;
}) {
  const [params, requestHeaders] = await Promise.all([searchParams, headers()]);
  return (
    <AuthShell
      title="Giriş yap"
      description="Hesap bilgilerinizi girin. Ardından e-posta adresinize tek kullanımlık bir doğrulama kodu göndereceğiz."
    >
      {params.reset === "1" && (
        <p className="notice notice-success mb-5" role="status">
          Parolanız yenilendi ve önceki oturumlarınız kapatıldı. Yeni parolanızla giriş
          yapabilirsiniz.
        </p>
      )}
      <AuthForm
        endpoint="/api/session/login"
        label="Doğrulama kodu gönder"
        pendingLabel="Kod gönderiliyor…"
      >
        <input type="hidden" name="next" value={safeNextPath(params.next)} />
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
        <label>
          Parola
          <input
            name="password"
            type="password"
            autoComplete="current-password"
            maxLength={128}
            required
            placeholder="Parolanız"
          />
        </label>
        <Link href="/parolami-unuttum" className="font-bold text-[var(--primary)]">
          Parolamı unuttum
        </Link>
        <Captcha action="login" nonce={requestHeaders.get("x-nonce") ?? undefined} />
      </AuthForm>
      <p className="subtext mt-7 text-center">
        Henüz hesabınız yok mu?{" "}
        <Link className="font-bold text-[var(--primary)]" href="/isletme-kaydi">
          İşletme kaydı
        </Link>
      </p>
    </AuthShell>
  );
}
