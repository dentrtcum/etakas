import { NextResponse } from "next/server";
import { getSetupStatus } from "@/lib/setup/status";
import { getCurrentAppUser } from "@/lib/auth/current-user";
import { requireAdmin } from "@/lib/auth/authorization";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  if (!requireAdmin(await getCurrentAppUser()).allowed) {
    return new Response(null, { status: 404, headers: { "Cache-Control": "private, no-store" } });
  }
  const status = await getSetupStatus();
  return NextResponse.json(
    {
      ok:
        status.env.databaseUrl &&
        status.env.authSecret &&
        status.env.encryptionKey &&
        status.env.emailConfigured &&
        status.env.captchaConfigured &&
        status.env.rateLimitSecret &&
        status.database.connected &&
        status.database.migrationsApplied &&
        status.storage.connected &&
        status.data.superAdminExists,
      ...status
    },
    { headers: { "Cache-Control": "private, no-store" } }
  );
}
