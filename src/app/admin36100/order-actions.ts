"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { ZodError } from "zod";
import { requireAdmin } from "@/lib/auth/authorization";
import { getCurrentAppUser } from "@/lib/auth/current-user";
import { parseAdminOrderFormData } from "@/modules/orders/admin-order-input";
import { adminResolveOrder } from "@/modules/orders/order-service";

export async function adminOrderAction(formData: FormData) {
  const actor = await getCurrentAppUser();
  const authorization = requireAdmin(actor);

  if (!authorization.allowed || !actor) {
    redirect("/giris");
  }

  try {
    const input = parseAdminOrderFormData(formData);
    await adminResolveOrder({
      actor,
      orderId: input.orderId,
      decision: input.decision,
      reason: input.reason
    });
  } catch (error) {
    if (error instanceof ZodError) {
      throw new Error("INVALID_ADMIN_ORDER_ACTION");
    }

    throw error;
  }

  revalidatePath("/admin36100");
}
