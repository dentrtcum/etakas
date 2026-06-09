import { z } from "zod";

export const listingReviewInputSchema = z.object({
  listingId: z.string().uuid(),
  decision: z.enum(["APPROVE", "REQUEST_CHANGES", "REJECT", "REMOVE"]),
  reason: z.string().trim().min(10)
});

export type ListingReviewInput = z.output<typeof listingReviewInputSchema>;

export function parseListingReviewFormData(formData: FormData) {
  return listingReviewInputSchema.parse({
    listingId: formData.get("listingId"),
    decision: formData.get("decision"),
    reason: formData.get("reason")
  });
}
