import { NextResponse, type NextRequest } from "next/server";
import { ZodError } from "zod";
import { requireAdmin } from "@/lib/auth/authorization";
import { getCurrentAppUser } from "@/lib/auth/current-user";
import { adminOrderInputSchema } from "@/modules/orders/admin-order-input";
import { adminResolveOrder, OrderFlowError } from "@/modules/orders/order-service";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const actor = await getCurrentAppUser();
  const authorization = requireAdmin(actor);

  if (!authorization.allowed) {
    return NextResponse.json({ error: authorization.reason }, { status: 403 });
  }

  if (!actor) {
    return NextResponse.json({ error: "UNAUTHENTICATED" }, { status: 401 });
  }

  try {
    const input = adminOrderInputSchema.parse(await request.json());
    return NextResponse.json(
      await adminResolveOrder({
        actor,
        orderId: input.orderId,
        decision: input.decision,
        reason: input.reason
      })
    );
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json({ error: "INVALID_ADMIN_ORDER_ACTION" }, { status: 400 });
    }

    if (error instanceof OrderFlowError) {
      return NextResponse.json({ error: error.message }, { status: 409 });
    }

    throw error;
  }
}
