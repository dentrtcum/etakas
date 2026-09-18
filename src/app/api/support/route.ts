import { NextResponse } from "next/server";
import { ZodError, z } from "zod";
import { mutationRoute } from "@/lib/http/mutation";
import { getCurrentAppUser } from "@/lib/auth/current-user";
import {
  createSupportTicket,
  replyToOwnSupportTicket
} from "@/modules/communications/service";

const inputSchema = z.object({
  organizationId: z.string().uuid(),
  ticketId: z.string().uuid().optional(),
  kind: z.enum(["COMPLAINT", "REQUEST"]).optional(),
  subject: z.string().trim().min(3).max(180).optional(),
  body: z.string().trim().min(1).max(4000)
}).superRefine((input, context) => {
  if (!input.ticketId && (!input.kind || !input.subject)) {
    context.addIssue({ code: "custom", message: "New tickets require kind and subject." });
  }
});

async function handlePost(request: Request) {
  const actor = await getCurrentAppUser();
  if (!actor) return NextResponse.json({ error: "UNAUTHENTICATED" }, { status: 401 });
  try {
    const input = inputSchema.parse(await request.json());
    if (input.ticketId) {
      return NextResponse.json(
        await replyToOwnSupportTicket(actor, input.organizationId, input.ticketId, input.body)
      );
    }
    return NextResponse.json(await createSupportTicket({
      actor,
      organizationId: input.organizationId,
      kind: input.kind!,
      subject: input.subject!,
      body: input.body
    }), { status: 201 });
  } catch (error) {
    if (error instanceof ZodError) return NextResponse.json({ error: "INVALID_SUPPORT_REQUEST" }, { status: 400 });
    throw error;
  }
}

export const POST = mutationRoute("src/app/api/support", handlePost);
