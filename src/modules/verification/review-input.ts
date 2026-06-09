import { z } from "zod";

export const organizationReviewInputSchema = z.object({
  organizationId: z.string().uuid(),
  decision: z.enum([
    "START_REVIEW",
    "REQUEST_ADDITIONAL_DOCUMENT",
    "APPROVE",
    "REJECT",
    "SUSPEND",
    "REOPEN_REVIEW",
    "CLOSE"
  ]),
  reason: z.string().trim().min(10)
});

export type OrganizationReviewInput = z.output<typeof organizationReviewInputSchema>;

export function parseOrganizationReviewFormData(formData: FormData) {
  return organizationReviewInputSchema.parse({
    organizationId: formData.get("organizationId"),
    decision: formData.get("decision"),
    reason: formData.get("reason")
  });
}
