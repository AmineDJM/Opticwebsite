import { describe, it, expect } from "vitest";
import { generateOrderNumber, generateToken, sessionKey } from "../ids";

describe("ids", () => {
  it("formats order number with prefix and date", () => {
    const d = new Date(Date.UTC(2026, 7, 22));
    const n = generateOrderNumber("Aura Optique", d);
    expect(n).toMatch(/^AURA-260822-[ACDEFGHJKLMNPQRSTUVWXYZ2345679]{5}$/);
  });
  it("avoids ambiguous characters in the suffix", () => {
    for (let i = 0; i < 50; i++) {
      const suffix = generateOrderNumber("X").split("-")[2]!;
      expect(suffix).not.toMatch(/[IO01B8]/);
    }
  });
  it("generates url-safe tokens", () => {
    expect(generateToken()).toMatch(/^[A-Za-z0-9_-]+$/);
  });
  it("prefixes session keys", () => {
    expect(sessionKey()).toMatch(/^sk_[0-9a-f]{24}$/);
  });
});
