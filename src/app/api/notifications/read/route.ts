import { NextResponse } from "next/server";
import { z } from "zod";
import { mutationRoute } from "@/lib/http/mutation";
import { getCurrentAppUser } from "@/lib/auth/current-user";
import { markNotificationRead } from "@/modules/notifications/service";

async function handlePost(request: Request) {
  const actor = await getCurrentAppUser();
  if (!actor) return NextResponse.json({ error: "UNAUTHENTICATED" }, { status: 401 });
  const parsed = z.object({ notificationId: z.string().uuid() }).safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "INVALID_NOTIFICATION" }, { status: 400 });
  return NextResponse.json(await markNotificationRead(actor.id, parsed.data.notificationId));
}

export const POST = mutationRoute("src/app/api/notifications/read", handlePost);
