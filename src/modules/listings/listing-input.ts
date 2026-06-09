import { z } from "zod";

export const listingSubmissionSchema = z.object({
  organizationId: z.string().uuid(),
  productId: z.string().uuid(),
  lotNumber: z.string().trim().min(2).max(120),
  expiryDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  invoiceDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  invoiceNumber: z.string().trim().min(2).max(120).optional(),
  quantity: z.coerce.number().int().positive().max(100000),
  unitReferenceValueKurus: z.coerce.number().int().nonnegative().max(100000000),
  storageConditions: z.string().trim().max(500).optional()
});

export type ListingSubmissionInput = z.output<typeof listingSubmissionSchema>;

export function parseListingSubmission(input: unknown) {
  return listingSubmissionSchema.parse(input);
}

export function parseListingSubmissionFormData(formData: FormData) {
  return parseListingSubmission({
    organizationId: formData.get("organizationId"),
    productId: formData.get("productId"),
    lotNumber: formData.get("lotNumber"),
    expiryDate: formData.get("expiryDate"),
    invoiceDate: formData.get("invoiceDate") || undefined,
    invoiceNumber: formData.get("invoiceNumber") || undefined,
    quantity: formData.get("quantity"),
    unitReferenceValueKurus: formData.get("unitReferenceValueKurus"),
    storageConditions: formData.get("storageConditions") || undefined
  });
}
