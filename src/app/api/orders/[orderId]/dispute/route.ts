import { NextResponse, type NextRequest } from "next/server";
import { z, ZodError } from "zod";
import { getCurrentAppUser } from "@/lib/auth/current-user";
import { openOrderDispute, OrderFlowError } from "@/modules/orders/order-service";

export const runtime = "nodejs";

const disputeSchema = z.object({
  reason: z.string().trim().min(10)
});

export async function POST(request: NextRequest, context: { params: Promise<{ orderId: string }> }) {
  const actor = await getCurrentAppUser();

  if (!actor) {
    return NextResponse.json({ error: "UNAUTHENTICATED" }, { status: 401 });
  }

  try {
    const input = disputeSchema.parse(await request.json());
    return NextResponse.json(await openOrderDispute(actor, (await context.params).orderId, input.reason));
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json({ error: "INVALID_DISPUTE" }, { status: 400 });
    }

    if (error instanceof OrderFlowError) {
      return NextResponse.json({ error: error.message }, { status: 409 });
    }

    throw error;
  }
}
