import { describe, expect, it } from "vitest";
import { LEGAL_VERSION } from "@/lib/legal/version";
import {
  createPublicAlias,
  toSafeApplicationAuditSummary,
  validateOrganizationApplication
} from "@/modules/organizations/organization-application";

const validApplication = {
  type: "PHARMACY",
  pharmacyName: "Örnek Eczanesi",
  authorizedPersonName: "Ayse Yilmaz",
  gln: "1234567890123",
  email: "basvuru@example.invalid",
  password: "very-secure-password",
  phone: "+905551112233",
  province: "İstanbul",
  district: "Kadıköy",
  address: "Sentetik Mahallesi Test Caddesi No: 1",
  privacyAcknowledged: true,
  termsAccepted: true,
  legalVersion: LEGAL_VERSION
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
      pharmacyName: "Örnek Eczanesi",
      gln: "1234567890123"
    });
  });

  it("rejects a district that does not belong to the selected province", () => {
    expect(() =>
      validateOrganizationApplication({ ...validApplication, district: "Çankaya" })
    ).toThrow("Geçerli bir il ve ilçe seçin.");
  });

  it("requires privacy acknowledgment and the current terms version", () => {
    expect(() =>
      validateOrganizationApplication({ ...validApplication, privacyAcknowledged: false })
    ).toThrow();
    expect(() =>
      validateOrganizationApplication({ ...validApplication, termsAccepted: false })
    ).toThrow();
    expect(() =>
      validateOrganizationApplication({ ...validApplication, legalVersion: "stale-version" })
    ).toThrow();
  });

  it("creates privacy-safe audit summaries", () => {
    expect(
      toSafeApplicationAuditSummary(validateOrganizationApplication(validApplication))
    ).toEqual({
      type: "PHARMACY",
      province: "İstanbul",
      district: "Kadıköy",
      emailDomain: "example.invalid",
      hasGln: true,
      privacyAcknowledged: true,
      termsAccepted: true,
      legalVersion: LEGAL_VERSION
    });
  });

  it("maps organization type to anonymous marketplace alias", () => {
    expect(createPublicAlias("VETERINARY_CLINIC")).toBe("Doğrulanmış Veteriner Kliniği");
    expect(createPublicAlias("PHARMACY", "Örnek Eczanesi")).toBe("Örnek Eczanesi");
  });
});
