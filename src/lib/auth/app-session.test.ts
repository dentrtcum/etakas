import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  appSessionCookieName,
  clearAppSessionCookie,
  createSessionToken,
  getSessionUserIdFromCookie,
  hashSessionToken,
  setAppSessionCookie
} from "@/lib/auth/app-session";

const mocks = vi.hoisted(() => ({
  get: vi.fn(),
  set: vi.fn(),
  remove: vi.fn(),
  db: vi.fn(),
  where: vi.fn()
}));
vi.mock("next/headers", () => ({
  cookies: async () => ({ get: mocks.get, set: mocks.set, delete: mocks.remove })
}));
vi.mock("@/lib/db/client", () => ({ getDb: mocks.db }));
beforeEach(() => {
  vi.clearAllMocks();
  mocks.get.mockReturnValue(undefined);
  mocks.db.mockReturnValue({ delete: () => ({ where: mocks.where }) });
  mocks.where.mockResolvedValue(undefined);
});
afterEach(() => vi.unstubAllEnvs());

describe("app session tokens", () => {
  it("hashes session tokens for storage", () => {
    const token = createSessionToken();
    const hash = hashSessionToken(token);

    expect(token).not.toBe(hash);
    expect(hashSessionToken(token)).toBe(hash);
  });

  it("creates unpredictable fixed-size tokens", () => {
    const tokens = Array.from({ length: 100 }, createSessionToken);
    expect(new Set(tokens).size).toBe(100);
    for (const token of tokens) expect(token).toMatch(/^[A-Za-z0-9_-]{43}$/);
  });

  it("sets the session cookie as HttpOnly and HTTPS-only in production", async () => {
    vi.stubEnv("NODE_ENV", "production");
    const expiresAt = new Date(Date.now() + 100000);
    await setAppSessionCookie("session-token", expiresAt);
    expect(mocks.set).toHaveBeenCalledWith(appSessionCookieName, "session-token", {
      httpOnly: true,
      sameSite: "lax",
      secure: true,
      path: "/",
      expires: expiresAt
    });
  });

  it("does not query the database for missing or malformed session tokens", async () => {
    for (const value of [undefined, "short", "x".repeat(4096), ";invalid-cookie-value"]) {
      mocks.get.mockReturnValue(value ? { value } : undefined);
      expect(await getSessionUserIdFromCookie()).toBeNull();
    }
    expect(mocks.db).not.toHaveBeenCalled();
  });

  it("clears the browser cookie even when no session exists", async () => {
    await clearAppSessionCookie();
    expect(mocks.remove).toHaveBeenCalledWith(appSessionCookieName);
    expect(mocks.db).not.toHaveBeenCalled();
  });
});
