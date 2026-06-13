import { describe, expect, it } from "vitest";
import {
  createPublicAlias,
  toSafeApplicationAuditSummary,
  validateOrganizationApplication
} from "@/modules/organizations/organization-application";

const validApplication = {
  type: "PHARMACY",
  legalName: "Sentetik Eczane Ltd.",
  taxNumber: "1234567890",
  authorizedPersonName: "Ayse Yilmaz",
  authorizedPersonTitle: "Eczaci",
  ownerIdentityNumber: "12345678901",
  email: "basvuru@example.invalid",
  password: "very-secure-password",
  phone: "+905551112233",
  province: "Istanbul",
  district: "Kadikoy",
  address: "Sentetik Mahallesi Test Caddesi No: 1",
  licenseNumber: "SYN-12345",
  professionalChamber: "Sentetik Eczaci Odasi",
  invoiceTitle: "Sentetik Eczane Ltd.",
  kvkkAccepted: true,
  termsAccepted: true
} as const;

describe("organization application", () => {
  it("validates required registration fields", () => {
    expect(validateOrganizationApplication(validApplication)).toMatchObject({
      type: "PHARMACY",
      email: "basvuru@example.invalid",
      ownerIdentityNumber: "12345678901"
    });
  });

  it("requires KVKK and terms acceptance", () => {
    expect(() =>
      validateOrganizationApplication({ ...validApplication, kvkkAccepted: false })
    ).toThrow();
  });

  it("creates privacy-safe audit summaries", () => {
    expect(toSafeApplicationAuditSummary(validateOrganizationApplication(validApplication))).toEqual({
      type: "PHARMACY",
      province: "Istanbul",
      district: "Kadikoy",
      emailDomain: "example.invalid",
      hasLicenseNumber: true,
      hasOwnerIdentityNumber: true,
      hasProfessionalChamber: true,
      kvkkAccepted: true,
      termsAccepted: true
    });
  });

  it("maps organization type to anonymous marketplace alias", () => {
    expect(createPublicAlias("VETERINARY_CLINIC")).toBe("Doğrulanmış Veteriner Kliniği");
  });
});
