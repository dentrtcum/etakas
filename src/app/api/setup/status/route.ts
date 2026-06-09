import { NextResponse } from "next/server";
import { getSetupStatus } from "@/lib/setup/status";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const status = await getSetupStatus();
  return NextResponse.json({
    ok:
      status.env.databaseUrl &&
      status.env.authSecret &&
      status.env.encryptionKey &&
      status.env.cronSecret &&
      status.database.connected &&
      status.database.migrationsApplied &&
      status.data.superAdminExists,
    ...status
  });
}
