import { describe, expect, it } from "vitest";
import { createSessionToken, hashSessionToken } from "@/lib/auth/app-session";

describe("app session tokens", () => {
  it("hashes session tokens for storage", () => {
    const token = createSessionToken();
    const hash = hashSessionToken(token);

    expect(token).not.toBe(hash);
    expect(hashSessionToken(token)).toBe(hash);
  });
});
