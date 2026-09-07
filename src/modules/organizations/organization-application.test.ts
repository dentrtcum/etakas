import { describe, expect, it } from "vitest";
import {
  createPublicAlias,
  toSafeApplicationAuditSummary,
  validateOrganizationApplication
} from "@/modules/organizations/organization-application";

const validApplication = {
  type: "PHARMACY",
  taxNumber: "1234567890",
  authorizedPersonName: "Ayse Yilmaz",
  ownerIdentityNumber: "12345678901",
  email: "basvuru@example.invalid",
  password: "very-secure-password",
  phone: "+905551112233",
  province: "Istanbul",
  district: "Kadikoy",
  address: "Sentetik Mahallesi Test Caddesi No: 1",
  kvkkAccepted: true,
  termsAccepted: true
} as const;

describe("organization application", () => {
  it("accepts the simplified form without retired fields and requires an address", () => {
    const input = validApplication;
    expect(validateOrganizationApplication(input).email).toBe(input.email);
    expect(() => validateOrganizationApplication({ ...input, address: "" })).toThrow();
  });
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
    expect(
      toSafeApplicationAuditSummary(validateOrganizationApplication(validApplication))
    ).toEqual({
      type: "PHARMACY",
      province: "Istanbul",
      district: "Kadikoy",
      emailDomain: "example.invalid",
      hasOwnerIdentityNumber: true,
      kvkkAccepted: true,
      termsAccepted: true
    });
  });

  it("maps organization type to anonymous marketplace alias", () => {
    expect(createPublicAlias("VETERINARY_CLINIC")).toBe("Doğrulanmış Veteriner Kliniği");
  });
});
