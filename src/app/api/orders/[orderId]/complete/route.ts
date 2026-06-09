import { NextResponse, type NextRequest } from "next/server";
import { getCurrentAppUser } from "@/lib/auth/current-user";
import { completeOrder, OrderFlowError } from "@/modules/orders/order-service";

export const runtime = "nodejs";

export async function POST(_request: NextRequest, context: { params: Promise<{ orderId: string }> }) {
  const actor = await getCurrentAppUser();

  if (!actor) {
    return NextResponse.json({ error: "UNAUTHENTICATED" }, { status: 401 });
  }

  try {
    return NextResponse.json(await completeOrder((await context.params).orderId, actor.id));
  } catch (error) {
    if (error instanceof OrderFlowError) {
      return NextResponse.json({ error: error.message }, { status: 409 });
    }

    throw error;
  }
}
