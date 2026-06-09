import { describe, expect, it } from "vitest";
import { decryptField, encryptField, hashField } from "@/lib/encryption/field-crypto";

const secret = "local-development-secret-with-at-least-32-chars";

describe("field crypto", () => {
  it("encrypts and decrypts sensitive fields", () => {
    const encrypted = encryptField("SERIAL-123", secret);

    expect(encrypted).not.toContain("SERIAL-123");
    expect(decryptField(encrypted, secret)).toBe("SERIAL-123");
  });

  it("creates stable keyed hashes for duplicate checks", () => {
    expect(hashField("SERIAL-123", secret)).toBe(hashField("SERIAL-123", secret));
    expect(hashField("SERIAL-123", secret)).not.toBe(hashField("SERIAL-124", secret));
  });
});
