import { NextResponse } from "next/server";
import { getCurrentAppUser } from "@/lib/auth/current-user";
import { mutationRoute } from "@/lib/http/mutation";
import { markMessageNotificationsRead } from "@/modules/notifications/service";
import { z } from "zod";

async function handlePost(request: Request) {
  const actor = await getCurrentAppUser();
  if (!actor) return NextResponse.json({ error: "UNAUTHENTICATED" }, { status: 401 });
  const parsed = z.object({ messageIds: z.array(z.string().uuid()).max(500) }).safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "INVALID_REQUEST" }, { status: 400 });
  return NextResponse.json(await markMessageNotificationsRead(actor.id, parsed.data.messageIds));
}

export const POST = mutationRoute("src/app/api/messages/read", handlePost);
