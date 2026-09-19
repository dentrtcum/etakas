import { NextResponse } from "next/server";
import { getCurrentAppUser } from "@/lib/auth/current-user";
import { getNavigationBadgeCounts } from "@/modules/notifications/service";

export async function GET() {
  const actor = await getCurrentAppUser();
  const headers = { "Cache-Control": "private, no-store" };
  if (!actor) return NextResponse.json({ error: "UNAUTHENTICATED" }, { status: 401, headers });
  return NextResponse.json(await getNavigationBadgeCounts(actor.id), { headers });
}
