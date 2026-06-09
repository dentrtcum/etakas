import { describe, expect, it } from "vitest";
import { hashPassword, verifyPassword } from "@/lib/auth/password";

describe("password hashing", () => {
  it("verifies scrypt password hashes", () => {
    const hash = hashPassword("VerySafeDemo123!");

    expect(hash).not.toContain("VerySafeDemo123!");
    expect(verifyPassword("VerySafeDemo123!", hash)).toBe(true);
    expect(verifyPassword("WrongPassword123!", hash)).toBe(false);
  });

  it("rejects short passwords", () => {
    expect(() => hashPassword("short")).toThrow("at least 12");
  });
});
