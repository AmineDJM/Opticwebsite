import { describe, it, expect } from "vitest";
import {
  applyPercentage,
  formatMoney,
  parseMoneyToCents,
  roundCents,
  sumCents,
  clampCents,
} from "../money";

describe("money", () => {
  it("rounds half up", () => {
    expect(roundCents(150.5)).toBe(151);
    expect(roundCents(150.4)).toBe(150);
  });

  it("applies percentage and rounds", () => {
    expect(applyPercentage(10000, 10)).toBe(1000);
    expect(applyPercentage(999, 15)).toBe(150); // 149.85 -> 150
  });

  it("sums cents without float drift", () => {
    expect(sumCents([1010, 2020, 3030])).toBe(6060);
  });

  it("clamps", () => {
    expect(clampCents(-5, 0)).toBe(0);
    expect(clampCents(500, 0, 300)).toBe(300);
  });

  it("formats DZD with no decimals and symbol after", () => {
    expect(formatMoney(1500000, "DZD")).toContain("DA");
    expect(formatMoney(1500000, "DZD")).not.toContain(".");
  });

  it("formats EUR with symbol before", () => {
    expect(formatMoney(1050, "EUR", "en-US")).toBe("€10.50");
  });

  it("parses money input to cents", () => {
    expect(parseMoneyToCents("1 500", "DZD")).toBe(150000);
    expect(parseMoneyToCents("10,50", "EUR")).toBe(1050);
    expect(parseMoneyToCents("abc", "DZD")).toBeNull();
    expect(parseMoneyToCents("", "DZD")).toBeNull();
  });
});
