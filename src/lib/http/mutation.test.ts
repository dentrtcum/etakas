import { describe, expect, it, vi } from "vitest";
vi.mock("@/lib/db/client", () => ({ getDb: vi.fn() }));
vi.mock("@/lib/env", () => ({ assertProductionSafety: vi.fn() }));
import { boundedRequest } from "./mutation";

describe("mutation body boundary", () => {
  it("rejects oversized JSON regardless of missing or dishonest Content-Length", async () => {
    for (const headers of [
      { "content-type": "application/json" },
      { "content-type": "application/json", "content-length": "1" }
    ] as Record<string, string>[]) {
      await expect(boundedRequest(new Request("https://example.invalid/api", {
        method: "POST", headers, body: JSON.stringify({ value: "x".repeat(16384) })
      }))).rejects.toMatchObject({ code: "REQUEST_TOO_LARGE", status: 413 });
    }
  });
  it("keeps a valid body and its authentication headers available to the handler", async () => {
    const bounded = await boundedRequest(new Request("https://example.invalid/api", {
      method: "POST", headers: { "content-type": "application/json", cookie: "session=opaque-test-value" },
      body: JSON.stringify({ quantity: 3 })
    }));
    expect(await bounded.json()).toEqual({ quantity: 3 });
    expect(bounded.headers.get("cookie")).toBe("session=opaque-test-value");
  });
  it("rejects unsupported body encodings before a handler parses them", async () => {
    await expect(boundedRequest(new Request("https://example.invalid/api", {
      method: "POST", headers: { "content-type": "text/plain" }, body: "untrusted"
    }))).rejects.toMatchObject({ status: 415 });
  });
});
