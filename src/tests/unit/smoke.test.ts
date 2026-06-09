import { describe, expect, it } from "vitest";

describe("project scaffold", () => {
  it("keeps trading disabled by default", () => {
    expect(process.env.TRADING_MODE ?? "demo").toBe("demo");
  });
});
