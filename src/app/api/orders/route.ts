import { NextResponse, type NextRequest } from "next/server";
import { ZodError } from "zod";
import { getCurrentAppUser } from "@/lib/auth/current-user";
import { parseOrderCreation } from "@/modules/orders/order-input";
import { createOrderReservation, OrderFlowError } from "@/modules/orders/order-service";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const actor = await getCurrentAppUser();

  if (!actor) {
    return NextResponse.json({ error: "UNAUTHENTICATED" }, { status: 401 });
  }

  try {
    const result = await createOrderReservation(actor, parseOrderCreation(await request.json()));
    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json({ error: "INVALID_ORDER_REQUEST" }, { status: 400 });
    }

    if (error instanceof OrderFlowError) {
      return NextResponse.json({ error: error.message }, { status: 409 });
    }

    throw error;
  }
}
