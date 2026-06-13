import { z } from "zod";

export const listingSubmissionSchema = z.object({
  barcode: z.string().trim().regex(/^\d{8,14}$/),
  expiryDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
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
    barcode: formData.get("barcode"),
    expiryDate: formData.get("expiryDate"),
    quantity: formData.get("quantity"),
    unitReferenceValueKurus: formData.get("unitReferenceValueKurus"),
    storageConditions: formData.get("storageConditions") || undefined
  });
}
