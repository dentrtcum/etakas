import { NextResponse } from "next/server";
import { getCurrentAppUser } from "@/lib/auth/current-user";
import { mutationRoute } from "@/lib/http/mutation";
import { markMessageNotificationsRead } from "@/modules/notifications/service";

async function handlePost() {
  const actor = await getCurrentAppUser();
  if (!actor) return NextResponse.json({ error: "UNAUTHENTICATED" }, { status: 401 });
  return NextResponse.json(await markMessageNotificationsRead(actor.id));
}

export const POST = mutationRoute("src/app/api/messages/read", handlePost);
