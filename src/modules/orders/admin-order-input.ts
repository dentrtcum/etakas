import { z } from "zod";

export const adminOrderInputSchema = z.object({
  orderId: z.string().uuid(),
  decision: z.enum(["FREEZE", "CANCEL", "FORCE_COMPLETE", "REFUND_COMPLETED"]),
  reason: z.string().trim().min(10)
});

export function parseAdminOrderFormData(formData: FormData) {
  return adminOrderInputSchema.parse({
    orderId: formData.get("orderId"),
    decision: formData.get("decision"),
    reason: formData.get("reason")
  });
}
