import { afterEach, describe, expect, it, vi } from "vitest";
import { createCipheriv, randomBytes, scryptSync } from "node:crypto";
import { decryptField, encryptField, hashField } from "@/lib/encryption/field-crypto";

const secret = "local-development-secret-with-at-least-32-chars";
afterEach(() => vi.unstubAllEnvs());

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

  it("rejects tampered ciphertext, key identifiers and wrong keys", () => {
    const encrypted = encryptField("secret", secret);
    const parts = encrypted.split(".");
    const data = Buffer.from(parts[4], "base64url");
    data[0] ^= 1;
    parts[4] = data.toString("base64url");
    expect(() => decryptField(parts.join("."), secret)).toThrow();
    expect(() => decryptField(encrypted.replace(".primary.", ".unknown."), secret)).toThrow();
    expect(() =>
      decryptField(encrypted, "different-encryption-key-with-at-least-32-chars")
    ).toThrow();
  });

  it("reads existing v1 data after rotation and preserves empty values", () => {
    const iv = randomBytes(12);
    const cipher = createCipheriv(
      "aes-256-gcm",
      scryptSync(secret, "e-takas-field-encryption-v1", 32),
      iv
    );
    const data = Buffer.concat([cipher.update("legacy identity", "utf8"), cipher.final()]);
    const legacy = [
      "v1",
      iv.toString("base64url"),
      cipher.getAuthTag().toString("base64url"),
      data.toString("base64url")
    ].join(".");
    vi.stubEnv("ENCRYPTION_KEY_ID", "newkey");
    vi.stubEnv("ENCRYPTION_PREVIOUS_KEYS", JSON.stringify({ oldkey: secret }));
    expect(decryptField(legacy, "new-encryption-key-with-at-least-32-chars")).toBe(
      "legacy identity"
    );
    expect(decryptField(encryptField("", secret), secret)).toBe("");
  });

  it("uses a named historical key to read v2 fields after rotation", () => {
    vi.stubEnv("ENCRYPTION_KEY_ID", "oldkey");
    const encrypted = encryptField("identity", secret);
    vi.stubEnv("ENCRYPTION_KEY_ID", "newkey");
    vi.stubEnv("ENCRYPTION_PREVIOUS_KEYS", JSON.stringify({ oldkey: secret }));
    expect(decryptField(encrypted, "new-encryption-key-with-at-least-32-chars")).toBe("identity");
  });
});
