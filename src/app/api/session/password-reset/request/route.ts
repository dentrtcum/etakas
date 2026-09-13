import { requestPasswordReset } from "@/lib/auth/challenges";
import { authForm, authSuccess, emailField } from "@/lib/auth/route-helpers";
import {
  requireCaptcha,
  requireRateLimit,
  SecurityError,
  securityErrorResponse
} from "@/lib/security/request-guards";
export const runtime = "nodejs";
export async function POST(request: Request) {
  let stage = "parse-form";
  try {
    const form = await authForm(request);
    const email = emailField(form);
    stage = "rate-limit";
    await requireRateLimit({
      request,
      action: "password-reset",
      identifier: email,
      limit: 3,
      windowSeconds: 1800
    });
    stage = "captcha";
    await requireCaptcha(request, form.get("cf-turnstile-response"), "password_reset");
    stage = "password-reset";
    await requestPasswordReset(request, email);
    return authSuccess("/parolami-unuttum?sent=1");
  } catch (error) {
    console.error("[password-reset-request] failed", {
      stage,
      code: error instanceof SecurityError ? error.code : "UNEXPECTED",
      errorType: error instanceof Error ? error.name : "UnknownError"
    });
    return securityErrorResponse(error);
  }
}
