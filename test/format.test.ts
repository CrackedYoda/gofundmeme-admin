import { describe, expect, it } from "vitest";
import { ago, every, sol, toBaseUnits, usdc } from "../src/format";

describe("format", () => {
  it("converts typed USDC to base units exactly", () => {
    expect(toBaseUnits("412.5", 6)).toBe("412500000");
    expect(toBaseUnits("25", 6)).toBe("25000000");
    expect(toBaseUnits(".1", 6)).toBe("100000");
    expect(toBaseUnits("0.0000009", 6)).toBe("0");
    expect(toBaseUnits("", 6)).toBeNull();
    expect(toBaseUnits("-1", 6)).toBeNull();
    expect(toBaseUnits("1e3", 6)).toBeNull();
  });
  it("shows API base units", () => {
    expect(sol("1800000000")).toBe("1.8 SOL");
    expect(usdc("275000000")).toBe("275.00 USDC");
  });
  it("describes schedules and times", () => {
    expect(every(30)).toBe("30s");
    expect(every(600)).toBe("10m");
    expect(every(86_400)).toBe("1d");
    expect(every(null)).toBe("on demand");
    expect(ago(null)).toBe("never");
    expect(ago("2026-10-05T11:56:00Z", Date.parse("2026-10-05T12:00:00Z"))).toBe("4m ago");
  });
});
