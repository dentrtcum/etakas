import { NextResponse, type NextRequest } from "next/server";
import { serverEnv } from "@/lib/env";
import { completeEligibleOrders } from "@/modules/orders/order-service";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const authorization = request.headers.get("authorization");
  const expected = serverEnv.CRON_SECRET ? `Bearer ${serverEnv.CRON_SECRET}` : null;

  if (!expected || authorization !== expected) {
    return NextResponse.json({ error: "UNAUTHORIZED_CRON" }, { status: 401 });
  }

  const completed = await completeEligibleOrders();
  return NextResponse.json({ completed: completed.length });
}
