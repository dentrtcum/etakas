import { NextResponse } from "next/server";
import { ZodError, z } from "zod";
import { mutationRoute } from "@/lib/http/mutation";
import { getCurrentAppUser } from "@/lib/auth/current-user";
import { requireAdmin } from "@/lib/auth/authorization";
import { replyToSupportTicket } from "@/modules/communications/service";

const inputSchema = z.object({
  ticketId: z.string().uuid(),
  body: z.string().trim().min(1).max(4000),
  close: z.coerce.boolean().default(false)
});

async function handlePost(request: Request) {
  const actor = await getCurrentAppUser();
  if (!actor || !requireAdmin(actor).allowed) return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  try {
    const input = inputSchema.parse(await request.json());
    return NextResponse.json(await replyToSupportTicket(actor, input.ticketId, input.body, input.close));
  } catch (error) {
    if (error instanceof ZodError) return NextResponse.json({ error: "INVALID_SUPPORT_REPLY" }, { status: 400 });
    throw error;
  }
}

export const POST = mutationRoute("src/app/api/admin/support", handlePost);
