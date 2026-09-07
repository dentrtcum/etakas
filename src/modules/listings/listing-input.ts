import { z } from "zod";

export const listingSubmissionSchema = z.object({
  barcode: z
    .string()
    .trim()
    .regex(/^\d{8,14}$/),
  productName: z.string().trim().min(3).max(240).optional(),
  lotNumber: z.string().trim().max(120).optional(),
  expiryDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  quantity: z.coerce.number().int().positive().max(100000),
  unitReferenceValueKurus: z.coerce.number().int().positive().max(100000000),
  storageConditions: z.string().trim().max(500).optional()
});

export type ListingSubmissionInput = z.output<typeof listingSubmissionSchema>;

export function parseListingSubmission(input: unknown) {
  return listingSubmissionSchema.parse(input);
}

export function parseListingSubmissionFormData(formData: FormData) {
  return parseListingSubmission({
    barcode: formData.get("barcode"),
    productName: formData.get("productName") || undefined,
    lotNumber: formData.get("lotNumber") || undefined,
    expiryDate: formData.get("expiryDate"),
    quantity: formData.get("quantity"),
    unitReferenceValueKurus: formData.has("unitReferenceValue")
      ? Math.round(Number(formData.get("unitReferenceValue")) * 100)
      : formData.get("unitReferenceValueKurus"),
    storageConditions: formData.get("storageConditions") || undefined
  });
}
