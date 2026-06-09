import { z } from "zod";

export const orderCreationSchema = z.object({
  buyerOrganizationId: z.string().uuid(),
  listingId: z.string().uuid(),
  quantity: z.coerce.number().int().positive().max(100000),
  idempotencyKey: z.string().trim().min(16).max(200)
});

export type OrderCreationInput = z.output<typeof orderCreationSchema>;

export function parseOrderCreation(input: unknown) {
  return orderCreationSchema.parse(input);
}

export const orderActionSchema = z.object({
  orderId: z.string().uuid()
});

export function parseOrderAction(input: unknown) {
  return orderActionSchema.parse(input);
}
