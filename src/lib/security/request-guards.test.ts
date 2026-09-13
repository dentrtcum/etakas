import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PgDialect } from "drizzle-orm/pg-core";
import {
  applicationOrigin,
  readSecurityForm,
  requireCaptcha,
  requireRateLimit,
  requireSameOrigin,
  requireSameOriginForm,
  safeNextPath,
  securityErrorResponse,
  SecurityError,
  trustedClientIp
} from "./request-guards";

const mocks = vi.hoisted(() => ({ execute: vi.fn() }));
vi.mock("@/lib/db/client", () => ({ getDb: () => ({ execute: mocks.execute }) }));

beforeEach(() => {
  vi.stubEnv("APP_URL", "https://etakas.example");
  vi.stubEnv("AUTH_RATE_LIMIT_SECRET", "isolated-test-pepper-never-used-in-production");
  vi.stubEnv("VERCEL", "1");
  mocks.execute.mockReset().mockResolvedValue([{ count: 1 }]);
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe("request trust boundaries", () => {
  it("rejects cross-site requests even when they spoof the canonical Origin", () => {
    const cases: Record<string, string>[] = [
      {},
      { origin: "https://evil.example" },
      { origin: "https://etakas.example", "sec-fetch-site": "cross-site" }
    ];
    for (const headers of cases) {
      expect(() =>
        requireSameOrigin(new Request("https://etakas.example/api", { headers }))
      ).toThrow("INVALID_ORIGIN");
    }
    expect(() =>
      requireSameOrigin(
        new Request("https://etakas.example/api", {
          headers: { origin: "https://etakas.example", "sec-fetch-site": "same-origin" }
        })
      )
    ).not.toThrow();
  });

  it("allows an origin-less native form only with same-origin fetch metadata", () => {
    expect(() =>
      requireSameOriginForm(
        new Request("https://etakas.example/api/session/logout", {
          method: "POST",
          headers: { "sec-fetch-site": "same-origin" }
        })
      )
    ).not.toThrow();
    const rejectedHeaders: Record<string, string>[] = [
      {},
      { "sec-fetch-site": "cross-site" },
      { origin: "https://evil.example", "sec-fetch-site": "same-origin" }
    ];
    for (const headers of rejectedHeaders) {
      expect(() =>
        requireSameOriginForm(
          new Request("https://etakas.example/api/session/logout", { method: "POST", headers })
        )
      ).toThrow("INVALID_ORIGIN");
    }
  });

  it("does not accept external or ambiguous post-login redirects", () => {
    for (const target of [
      "https://evil.example",
      "//evil.example",
      "/\\evil.example",
      "/\nevil",
      "javascript:alert(1)",
      null,
      ["/panel"]
    ]) {
      expect(safeNextPath(target)).toBe("/panel");
    }
    expect(safeNextPath("/panel/siparisler?durum=acik#fragment")).toBe(
      "/panel/siparisler?durum=acik"
    );
  });

  it("fails closed if production origin is missing or is not HTTPS", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("APP_URL", "");
    expect(() => applicationOrigin()).toThrow("SERVICE_UNAVAILABLE");
    vi.stubEnv("APP_URL", "http://etakas.example");
    expect(() => applicationOrigin()).toThrow("SERVICE_UNAVAILABLE");
  });

  it("only uses a valid platform-owned client IP header", () => {
    const request = new Request("https://etakas.example", {
      headers: {
        "x-forwarded-for": "8.8.8.8",
        "x-real-ip": "8.8.4.4",
        "x-vercel-forwarded-for": "192.0.2.1, 192.0.2.2"
      }
    });
    expect(trustedClientIp(request)).toBe("192.0.2.1");
    expect(
      trustedClientIp(
        new Request("https://etakas.example", { headers: { "x-forwarded-for": "8.8.8.8" } })
      )
    ).toBe("unavailable");
    vi.stubEnv("VERCEL", "");
    expect(trustedClientIp(request)).toBe("unavailable");
  });
});

describe("bounded form parsing and throttling", () => {
  it("serializes raw SQL timestamps for the postgres-js driver", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-09-08T12:00:05Z"));
    await requireRateLimit({
      request: new Request("https://etakas.example"),
      action: "reset",
      windowSeconds: 60
    });
    const query = new PgDialect().sqlToQuery(mocks.execute.mock.calls[0][0]);
    expect(query.params).toContain("2026-09-08T12:01:00.000Z");
    expect(query.params.some((value) => value instanceof Date)).toBe(false);
  });

  it("checks actual streamed bytes when Content-Length is absent or dishonest", async () => {
    for (const length of [undefined, "1"]) {
      const headers: Record<string, string> = {
        "content-type": "application/x-www-form-urlencoded"
      };
      if (length) headers["content-length"] = length;
      await expect(
        readSecurityForm(
          new Request("https://etakas.example", {
            method: "POST",
            headers,
            body: "value=" + "x".repeat(64)
          }),
          32
        )
      ).rejects.toMatchObject({ code: "REQUEST_TOO_LARGE", status: 413 });
    }
    const form = await readSecurityForm(
      new Request("https://etakas.example", {
        method: "POST",
        headers: { "content-type": "application/x-www-form-urlencoded" },
        body: "email=person%40example.com"
      })
    );
    expect(form.get("email")).toBe("person@example.com");
  });

  it("rejects invalid form encodings instead of allowing parsing errors to escape", async () => {
    await expect(
      readSecurityForm(
        new Request("https://etakas.example", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: "{}"
        })
      )
    ).rejects.toMatchObject({ status: 415 });
    await expect(
      readSecurityForm(
        new Request("https://etakas.example", {
          method: "POST",
          headers: { "content-type": "multipart/form-data" },
          body: "broken"
        })
      )
    ).rejects.toMatchObject({ code: "INVALID_REQUEST" });
  });

  it("rejects an exhausted persistent bucket with a bounded Retry-After", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-09-08T12:00:05Z"));
    mocks.execute.mockResolvedValueOnce([{ count: 4 }]);
    await expect(
      requireRateLimit({
        request: new Request("https://etakas.example"),
        action: "reset",
        limit: 3,
        windowSeconds: 60
      })
    ).rejects.toMatchObject({ code: "RATE_LIMITED", status: 429, retryAfter: 55 });
    expect(mocks.execute).toHaveBeenCalledTimes(1);
  });

  it("checks both IP and normalized identity buckets", async () => {
    mocks.execute.mockResolvedValueOnce([{ count: 1 }]).mockResolvedValueOnce([{ count: 4 }]);
    await expect(
      requireRateLimit({
        request: new Request("https://etakas.example"),
        action: "reset",
        identifier: " User@Example.com ",
        limit: 3
      })
    ).rejects.toMatchObject({ code: "RATE_LIMITED" });
    expect(mocks.execute).toHaveBeenCalledTimes(2);
  });

  it("never serializes internal errors or secret values", async () => {
    const response = securityErrorResponse(new Error("postgres password=secret-value"));
    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({ error: "SERVICE_UNAVAILABLE" });
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(
      securityErrorResponse(new SecurityError("RATE_LIMITED", 429, 55)).headers.get("retry-after")
    ).toBe("55");
  });
});

describe("CAPTCHA verification", () => {
  beforeEach(() => {
    vi.stubEnv("TURNSTILE_SECRET_KEY", "unit-test-private-key");
    vi.stubEnv("NEXT_PUBLIC_TURNSTILE_SITE_KEY", "unit-test-site-key");
    vi.stubEnv("TURNSTILE_ALLOWED_HOSTNAMES", "");
  });

  it("requires a successful result for the correct action and hostname", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const request = new Request("https://etakas.example");
    for (const payload of [
      { success: false, action: "login", hostname: "etakas.example" },
      { success: true, action: "register", hostname: "etakas.example" },
      { success: true, action: "login", hostname: "evil.example" }
    ]) {
      fetchMock.mockResolvedValueOnce(Response.json(payload));
      await expect(requireCaptcha(request, "token", "login")).rejects.toMatchObject({
        code: "CAPTCHA_FAILED"
      });
    }
    fetchMock.mockResolvedValueOnce(
      Response.json({ success: true, action: "login", hostname: "etakas.example" })
    );
    await expect(requireCaptcha(request, "token", "login")).resolves.toBeUndefined();
  });

  it("never bypasses verification during an outage or missing configuration", async () => {
    const fetchMock = vi.fn().mockRejectedValue(new Error("unavailable"));
    vi.stubGlobal("fetch", fetchMock);
    await expect(
      requireCaptcha(new Request("https://etakas.example"), "token", "login")
    ).rejects.toMatchObject({ code: "SERVICE_UNAVAILABLE" });
    vi.stubEnv("TURNSTILE_SECRET_KEY", "");
    await expect(
      requireCaptcha(new Request("https://etakas.example"), "token", "login")
    ).rejects.toMatchObject({ code: "SERVICE_UNAVAILABLE" });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("refuses public Turnstile testing secrets in production", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("TURNSTILE_SECRET_KEY", "1x0000000000000000000000000000000AA");
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    await expect(
      requireCaptcha(new Request("https://etakas.example"), "token", "login")
    ).rejects.toMatchObject({ code: "SERVICE_UNAVAILABLE" });
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
