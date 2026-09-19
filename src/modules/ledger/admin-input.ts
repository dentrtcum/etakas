import { z } from "zod";

export const creditAdminInputSchema = z
  .object({
    organizationId: z.string().uuid().optional(),
    applyToAll: z.boolean().default(false),
    operation: z.enum(["SET_LIMITS", "ADJUST_BALANCE"]).default("SET_LIMITS"),
    lowerLimit: z.coerce.number().min(-1_000_000).max(0).optional(),
    upperLimit: z
      .union([z.literal(""), z.coerce.number().min(0).max(1_000_000)])
      .optional(),
    balanceDelta: z.coerce.number().min(-1_000_000).max(1_000_000).optional(),
    idempotencyKey: z.string().uuid().optional(),
    reason: z.string().trim().min(10).max(2000)
  })
  .superRefine((input, context) => {
    if (!input.applyToAll && !input.organizationId) {
      context.addIssue({ code: "custom", message: "Organization is required." });
    }
    if (input.operation === "SET_LIMITS" && input.lowerLimit === undefined) {
      context.addIssue({ code: "custom", message: "Lower limit is required." });
    }
    if (
      input.operation === "ADJUST_BALANCE" &&
      (!input.idempotencyKey || input.applyToAll ||
        !input.balanceDelta ||
        Math.round(input.balanceDelta * 100) === 0)
    ) {
      context.addIssue({
        code: "custom",
        message: "A single organization and non-zero balance change are required."
      });
    }
  });
