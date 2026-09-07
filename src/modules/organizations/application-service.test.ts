import { describe, expect, it } from "vitest";
import {
  buildOrganizationAddressInsert,
  buildOrganizationInsert
} from "@/modules/organizations/application-service";
import { decryptField } from "@/lib/encryption/field-crypto";
import type { OrganizationApplication } from "@/modules/organizations/organization-application";

const secret = "local-development-secret-with-at-least-32-chars";

const application: OrganizationApplication = {
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
};

describe("organization application persistence mapping", () => {
  it("encrypts sensitive organization fields before persistence", () => {
    const insert = buildOrganizationInsert(application, secret);

    expect(insert.status).toBe("SUBMITTED");
    expect(insert.legalNameEncrypted).toMatch(/^v1\./);
    expect(insert.taxNumberEncrypted).not.toContain(application.taxNumber);
    expect(insert.ownerIdentityNumberEncrypted).not.toContain(application.ownerIdentityNumber);
    expect(decryptField(insert.legalNameEncrypted, secret)).toBe("Doğrulanmış Eczane");
  });

  it("encrypts address and phone separately", () => {
    const insert = buildOrganizationAddressInsert(
      "00000000-0000-4000-8000-000000000001",
      application,
      secret
    );

    expect(insert.organizationId).toBe("00000000-0000-4000-8000-000000000001");
    expect(insert.addressEncrypted).not.toContain(application.address);
    expect(decryptField(insert.phoneEncrypted, secret)).toBe(application.phone);
  });
});
