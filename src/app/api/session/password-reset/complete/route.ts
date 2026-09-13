import { finishPasswordReset } from "@/lib/auth/challenges";
import { authForm, authSuccess, field } from "@/lib/auth/route-helpers";
import {
  requireCaptcha,
  requireRateLimit,
  securityErrorResponse,
  SecurityError
} from "@/lib/security/request-guards";
export const runtime = "nodejs";
export async function POST(request: Request) {
  try {
    const form = await authForm(request);
    const token = field(form, "token", 100);
    await requireRateLimit({
      request,
      action: "password-reset-complete",
      identifier: token,
      limit: 5,
      windowSeconds: 1200
    });
    await requireCaptcha(request, form.get("cf-turnstile-response"), "password_reset_complete");
    const password = field(form, "password", 128);
    if (password !== field(form, "passwordConfirmation", 128))
      throw new SecurityError("PASSWORD_MISMATCH", 400);
    await finishPasswordReset(request, token, password);
    return authSuccess("/giris?reset=1");
  } catch (error) {
    return securityErrorResponse(error);
  }
}
