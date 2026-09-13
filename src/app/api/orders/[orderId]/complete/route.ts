import { mutationRoute } from "@/lib/http/mutation";
import { NextResponse, type NextRequest } from "next/server";
import { getCurrentAppUser } from "@/lib/auth/current-user";
import { confirmBuyerDelivery, OrderFlowError } from "@/modules/orders/order-service";

export const runtime = "nodejs";

async function handlePost(
  _request: NextRequest,
  context: { params: Promise<{ orderId: string }> }
) {
  const actor = await getCurrentAppUser();

  if (!actor) {
    return NextResponse.json({ error: "UNAUTHENTICATED" }, { status: 401 });
  }

  try {
    return NextResponse.json(await confirmBuyerDelivery(actor, (await context.params).orderId));
  } catch (error) {
    if (error instanceof OrderFlowError) {
      return NextResponse.json({ error: error.message }, { status: 409 });
    }

    throw error;
  }
}

export const POST = mutationRoute("src/app/api/orders/[orderId]/complete", handlePost);
