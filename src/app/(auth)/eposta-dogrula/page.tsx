import Link from "next/link";
import { cookies } from "next/headers";
import type { Metadata } from "next";
import { AuthForm } from "@/components/auth-form";
import { challengeCookieName, parseChallengeToken } from "@/lib/auth/challenges";
import { AuthShell } from "../auth-shell";

export const metadata: Metadata = { title: "E-posta doğrulama" };

export default async function VerifyEmailPage() {
  const challenge = (await cookies()).get(challengeCookieName)?.value;
  return (
    <AuthShell
      title="E-postanızı doğrulayın"
      description="Giriş için e-posta adresinize gönderdiğimiz 8 haneli kodu girin. Kod 10 dakika geçerlidir ve yalnızca bu tarayıcıda kullanılabilir."
    >
      {parseChallengeToken(challenge) ? (
        <>
          <AuthForm endpoint="/api/session/verify" label="Doğrula ve giriş yap">
            <label htmlFor="verification-code">Doğrulama kodu</label>
            <input
              id="verification-code"
              name="code"
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              pattern="[0-9]{8}"
              minLength={8}
              maxLength={8}
              required
              placeholder="8 haneli kod"
              aria-describedby="verification-help"
            />
            <p id="verification-help" className="subtext">
              Gelen kutunuzu ve istenmeyen posta klasörünü kontrol edin. Beş hatalı kod denemesi
              hesabı geçici olarak kilitler.
            </p>
          </AuthForm>
          <p className="subtext mt-7">
            Kod ulaşmadıysa veya süresi dolduysa{" "}
            <Link className="font-bold text-[var(--primary)]" href="/giris">
              girişi yeniden başlatın
            </Link>
            . Yeni kod, önceki kodu geçersiz kılar.
          </p>
        </>
      ) : (
        <>
          <p className="notice notice-error mb-5" role="alert">
            Doğrulama oturumunuz bulunamadı veya süresi doldu. Lütfen yeniden giriş yapın.
          </p>
          <Link className="button button-primary w-full" href="/giris">
            Giriş yap
          </Link>
        </>
      )}
    </AuthShell>
  );
}
