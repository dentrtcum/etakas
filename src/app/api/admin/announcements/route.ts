import { NextResponse } from "next/server";
import { ZodError, z } from "zod";
import { mutationRoute } from "@/lib/http/mutation";
import { getCurrentAppUser } from "@/lib/auth/current-user";
import { requireAdmin } from "@/lib/auth/authorization";
import { sendAdminAnnouncement } from "@/modules/notifications/service";

const schema = z.object({
  organizationId: z.union([z.string().uuid(), z.literal("")]).optional(),
  title: z.string().trim().min(3).max(180),
  body: z.string().trim().min(3).max(4000)
});
async function handlePost(request: Request) {
  const actor = await getCurrentAppUser();
  if (!actor || !requireAdmin(actor).allowed) return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  try {
    const input = schema.parse(await request.json());
    return NextResponse.json(await sendAdminAnnouncement({ actor, ...input, organizationId: input.organizationId || undefined }));
  } catch (error) {
    if (error instanceof ZodError) return NextResponse.json({ error: "INVALID_ANNOUNCEMENT" }, { status: 400 });
    throw error;
  }
}
export const POST = mutationRoute("src/app/api/admin/announcements", handlePost);
