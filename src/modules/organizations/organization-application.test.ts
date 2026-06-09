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
  authorizedPersonName: "Ayşe Yılmaz",
  authorizedPersonTitle: "Eczacı",
  email: "basvuru@example.invalid",
  phone: "+905551112233",
  province: "İstanbul",
  district: "Kadıköy",
  address: "Sentetik Mahallesi Test Caddesi No: 1",
  licenseNumber: "SYN-12345",
  professionalChamber: "Sentetik Eczacı Odası",
  invoiceTitle: "Sentetik Eczane Ltd.",
  kvkkAccepted: true,
  termsAccepted: true
} as const;

describe("organization application", () => {
  it("validates required registration fields", () => {
    expect(validateOrganizationApplication(validApplication)).toMatchObject({
      type: "PHARMACY",
      email: "basvuru@example.invalid"
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
      province: "İstanbul",
      district: "Kadıköy",
      emailDomain: "example.invalid",
      hasLicenseNumber: true,
      kvkkAccepted: true,
      termsAccepted: true
    });
  });

  it("maps organization type to anonymous marketplace alias", () => {
    expect(createPublicAlias("VETERINARY_CLINIC")).toBe("Doğrulanmış Veteriner Kliniği");
  });
});
