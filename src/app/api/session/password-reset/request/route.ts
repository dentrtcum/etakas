import { requestPasswordReset } from "@/lib/auth/challenges";
import { authForm, authSuccess, emailField } from "@/lib/auth/route-helpers";
import {
  requireCaptcha,
  requireRateLimit,
  securityErrorResponse
} from "@/lib/security/request-guards";
export const runtime = "nodejs";
export async function POST(request: Request) {
  try {
    const form = await authForm(request);
    const email = emailField(form);
    await requireRateLimit({
      request,
      action: "password-reset",
      identifier: email,
      limit: 3,
      windowSeconds: 1800
    });
    await requireCaptcha(request, form.get("cf-turnstile-response"), "password_reset");
    await requestPasswordReset(request, email);
    return authSuccess("/parolami-unuttum?sent=1");
  } catch (error) {
    return securityErrorResponse(error);
  }
}
