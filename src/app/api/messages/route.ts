import { NextResponse } from "next/server";
import { ZodError, z } from "zod";
import { mutationRoute } from "@/lib/http/mutation";
import { getCurrentAppUser } from "@/lib/auth/current-user";
import { sendOrganizationMessage } from "@/modules/communications/service";

const inputSchema = z.object({
  organizationId: z.string().uuid(),
  recipientOrganizationId: z.string().uuid().optional(),
  conversationId: z.string().uuid().optional(),
  body: z.string().trim().min(1).max(4000)
}).refine((input) => Boolean(input.recipientOrganizationId || input.conversationId));

async function handlePost(request: Request) {
  const actor = await getCurrentAppUser();
  if (!actor) return NextResponse.json({ error: "UNAUTHENTICATED" }, { status: 401 });
  try {
    const input = inputSchema.parse(await request.json());
    return NextResponse.json(await sendOrganizationMessage({ actor, ...input }), { status: 201 });
  } catch (error) {
    if (error instanceof ZodError) return NextResponse.json({ error: "INVALID_MESSAGE" }, { status: 400 });
    throw error;
  }
}

export const POST = mutationRoute("src/app/api/messages", handlePost);
