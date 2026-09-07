import { z } from "zod";

export const organizationApplicationSchema = z.object({
  type: z.enum(["PHARMACY", "VETERINARY_CLINIC", "VETERINARY_POLYCLINIC", "ANIMAL_HOSPITAL"]),
  taxNumber: z.string().trim().min(10).max(20),
  authorizedPersonName: z.string().trim().min(3).max(160),
  ownerIdentityNumber: z
    .string()
    .trim()
    .regex(/^\d{11}$/),
  email: z.string().trim().email().max(320),
  password: z.string().min(8).max(160),
  phone: z.string().trim().min(10).max(32),
  province: z.string().trim().min(2).max(80),
  district: z.string().trim().min(2).max(80),
  address: z.string().trim().min(10).max(500),
  kvkkAccepted: z.literal(true),
  termsAccepted: z.literal(true)
});

export type OrganizationApplication = z.output<typeof organizationApplicationSchema>;

export function validateOrganizationApplication(input: unknown) {
  return organizationApplicationSchema.parse(input);
}

export function createPublicAlias(type: OrganizationApplication["type"]) {
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
    hasOwnerIdentityNumber: application.ownerIdentityNumber.length === 11,
    kvkkAccepted: application.kvkkAccepted,
    termsAccepted: application.termsAccepted
  };
}
