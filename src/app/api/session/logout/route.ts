import { NextResponse } from "next/server";
import { clearAppSessionCookie } from "@/lib/auth/app-session";
import { cookies } from "next/headers";
import { and, eq } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { securityChallenges } from "@/lib/db/schema";
import {
  challengeCookieName,
  challengeSecretHash,
  parseChallengeToken
} from "@/lib/auth/challenges";
import {
  applicationOrigin,
  requireSameOrigin,
  securityErrorResponse
} from "@/lib/security/request-guards";
export const runtime = "nodejs";
export async function POST(request: Request) {
  try {
    requireSameOrigin(request);
    await clearAppSessionCookie();
    const cookieStore = await cookies();
    const challenge = parseChallengeToken(cookieStore.get(challengeCookieName)?.value);
    if (challenge)
      await getDb()
        .update(securityChallenges)
        .set({ consumedAt: new Date() })
        .where(
          and(
            eq(securityChallenges.id, challenge.id),
            eq(securityChallenges.purpose, "LOGIN"),
            eq(securityChallenges.browserHash, challengeSecretHash(challenge.id, challenge.secret))
          )
        );
    cookieStore.delete(challengeCookieName);
    if (request.headers.get("accept")?.includes("application/json")) {
      return NextResponse.json(
        { ok: true, redirectTo: "/giris" },
        { headers: { "Cache-Control": "no-store" } }
      );
    }
    return NextResponse.redirect(new URL("/giris", applicationOrigin()), {
      status: 303,
      headers: { "Cache-Control": "no-store" }
    });
  } catch (error) {
    return securityErrorResponse(error);
  }
}
