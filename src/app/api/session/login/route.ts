import { cookies } from "next/headers";
import { challengeCookieName, challengeLifetimeSeconds, startLogin } from "@/lib/auth/challenges";
import { authForm, authSuccess, emailField, field } from "@/lib/auth/route-helpers";
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
      action: "login",
      identifier: email,
      limit: 10,
      windowSeconds: 900
    });
    await requireCaptcha(request, form.get("cf-turnstile-response"), "login");
    const token = await startLogin(request, email, field(form, "password", 128), form.get("next"));
    (await cookies()).set(challengeCookieName, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      path: "/",
      maxAge: challengeLifetimeSeconds
    });
    return authSuccess("/eposta-dogrula");
  } catch (error) {
    return securityErrorResponse(error);
  }
}
