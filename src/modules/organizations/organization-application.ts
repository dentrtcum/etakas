import { z } from "zod";
import { passwordPolicySchema } from "@/lib/auth/password";
import { LEGAL_VERSION } from "@/lib/legal/version";
import { isValidProvinceDistrict } from "@/lib/turkey-locations";

export const organizationApplicationSchema = z
  .object({
    type: z.enum(["PHARMACY", "VETERINARY_CLINIC", "VETERINARY_POLYCLINIC", "ANIMAL_HOSPITAL"]),
    pharmacyName: z.string().trim().min(3).max(160),
    authorizedPersonName: z.string().trim().min(3).max(160),
    gln: z
      .string()
      .trim()
      .regex(/^\d{13}$/),
    email: z.string().trim().email().max(320),
    password: passwordPolicySchema,
    phone: z.string().trim().min(10).max(32),
    province: z.string().trim().min(2).max(80),
    district: z.string().trim().min(2).max(80),
    address: z.string().trim().min(10).max(500),
    privacyAcknowledged: z.literal(true),
    termsAccepted: z.literal(true),
    legalVersion: z.literal(LEGAL_VERSION)
  })
  .superRefine((application, context) => {
    if (!isValidProvinceDistrict(application.province, application.district)) {
      context.addIssue({
        code: "custom",
        path: ["district"],
        message: "Geçerli bir il ve ilçe seçin."
      });
    }
  });

export type OrganizationApplication = z.output<typeof organizationApplicationSchema>;

export function validateOrganizationApplication(input: unknown) {
  return organizationApplicationSchema.parse(input);
}

export function createPublicAlias(type: OrganizationApplication["type"], pharmacyName?: string) {
  if (pharmacyName?.trim()) return pharmacyName.trim();
  switch (type) {
    case "PHARMACY":
      return "Doğrulanmış Eczane";
    case "VETERINARY_CLINIC":
      return "Doğrulanmış Veteriner Kliniği";
    case "VETERINARY_POLYCLINIC":
      return "Doğrulanmış Veteriner Polikliniği";
    case "ANIMAL_HOSPITAL":
      return "Doğrulanmış Hayvan Hastanesi";
  }
}

export function toSafeApplicationAuditSummary(application: OrganizationApplication) {
  return {
    type: application.type,
    province: application.province,
    district: application.district,
    emailDomain: application.email.split("@")[1] ?? "unknown",
    hasGln: application.gln.length === 13,
    privacyAcknowledged: application.privacyAcknowledged,
    termsAccepted: application.termsAccepted,
    legalVersion: application.legalVersion
  };
}
