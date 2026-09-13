import { describe, expect, it, vi } from "vitest";
vi.mock("@/lib/env", () => ({ serverEnv: {} }));
vi.mock("@/lib/db/client", () => ({ getDb: vi.fn() }));
vi.mock("@vercel/blob", () => ({ put: vi.fn(), del: vi.fn() }));
import { validateUpload } from "./blob-storage";

describe("uploaded file validation", () => {
  it("does not trust the filename or browser MIME type", async () => {
    const file = new File(["<html><script>alert(1)</script></html>"], "evidence.pdf", { type: "application/pdf" });
    await expect(validateUpload(file, "other")).rejects.toMatchObject({ code: "INVALID_FILE_TYPE" });
  });
  it("does not allow a PDF to masquerade as a required product photo", async () => {
    const file = new File(["%PDF-1.7\nsynthetic test file"], "photo.png", { type: "image/png" });
    await expect(validateUpload(file, "image")).rejects.toMatchObject({ code: "INVALID_FILE_TYPE" });
  });
  it("rejects empty and oversized files before storage access", async () => {
    for (const file of [new File([], "empty.pdf"), new File([new Uint8Array(4_000_001)], "large.pdf")]) {
      await expect(validateUpload(file, "other")).rejects.toMatchObject({ code: "INVALID_FILE_SIZE", status: 413 });
    }
  });
});
