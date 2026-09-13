import { describe, expect, it } from "vitest";
import { scryptSync } from "node:crypto";
import {
  hashPassword,
  hashPasswordAsync,
  passwordPolicySchema,
  verifyPassword,
  verifyPasswordAsync
} from "@/lib/auth/password";

describe("password hashing", () => {
  it("verifies scrypt password hashes", () => {
    const hash = hashPassword("VerySafeDemo123!");

    expect(hash).not.toContain("VerySafeDemo123!");
    expect(verifyPassword("VerySafeDemo123!", hash)).toBe(true);
    expect(verifyPassword("WrongPassword123!", hash)).toBe(false);
  });

  it("rejects short passwords", () => {
    expect(() => hashPassword("short")).toThrow();
  });

  it("enforces length and common-password restrictions without blocking passphrases", () => {
    for (const value of [
      "Ahmet1234",
      "password123456",
      "1234567890123456",
      "aaaaaaaaaaaaa",
      "x".repeat(129)
    ]) {
      expect(passwordPolicySchema.safeParse(value).success).toBe(false);
    }
    expect(passwordPolicySchema.safeParse("Dört farklı sözcük ile uzun parola!").success).toBe(
      true
    );
  });

  it("salts each asynchronous hash and rejects malformed hashes or missing accounts", async () => {
    const value = "Birbirinden farklı üç sözcük!";
    const first = await hashPasswordAsync(value);
    const second = await hashPasswordAsync(value);
    expect(first).toMatch(/^scrypt\$v2\$/);
    expect(first).not.toBe(second);
    expect(await verifyPasswordAsync(value, first)).toBe(true);
    expect(await verifyPasswordAsync("wrong", first)).toBe(false);
    for (const hash of [null, "", "scrypt$short$invalid", "scrypt$v9$salt$hash"]) {
      expect(await verifyPasswordAsync(value, hash)).toBe(false);
    }
    expect(await verifyPasswordAsync("x".repeat(129), first)).toBe(false);
  });

  it("can verify legacy hashes without permitting weak passwords for new credentials", async () => {
    const salt = Buffer.from("0123456789abcdef").toString("base64url");
    const password = "Ahmet1234";
    const hash = `scrypt$${salt}$${scryptSync(password, salt, 64).toString("base64url")}`;
    expect(verifyPassword(password, hash)).toBe(true);
    expect(await verifyPasswordAsync(password, hash)).toBe(true);
    expect(passwordPolicySchema.safeParse(password).success).toBe(false);
  });
});
