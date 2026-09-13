import { cookies } from "next/headers";
import { setAppSessionCookie } from "@/lib/auth/app-session";
import { challengeCookieName, finishLogin } from "@/lib/auth/challenges";
import { authForm, authSuccess, field } from "@/lib/auth/route-helpers";
import { requireRateLimit, securityErrorResponse } from "@/lib/security/request-guards";
export const runtime = "nodejs";
export async function POST(request: Request) {
  try {
    const form = await authForm(request);
    const cookieStore = await cookies();
    const token = cookieStore.get(challengeCookieName)?.value;
    await requireRateLimit({
      request,
      action: "email-verify",
      identifier: token,
      limit: 10,
      windowSeconds: 600
    });
    const session = await finishLogin(request, token, field(form, "code", 8));
    await setAppSessionCookie(session.token, session.expiresAt);
    cookieStore.delete(challengeCookieName);
    return authSuccess(session.nextPath);
  } catch (error) {
    return securityErrorResponse(error);
  }
}
