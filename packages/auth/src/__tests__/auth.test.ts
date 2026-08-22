import { describe, it, expect } from "vitest";
import { hashPassword, verifyPassword, needsRehash } from "../password";
import { issueSession, hashToken, tokensMatch, isExpired } from "../session";
import { can, canAll, SYSTEM_ROLES, WILDCARD } from "../rbac";
import { RateLimiter, nextLockState, isLocked, MAX_LOGIN_ATTEMPTS } from "../rate-limit";

describe("password", () => {
  it("hashes and verifies", async () => {
    const hash = await hashPassword("correct horse battery");
    expect(hash.startsWith("scrypt$")).toBe(true);
    expect(await verifyPassword("correct horse battery", hash)).toBe(true);
    expect(await verifyPassword("wrong", hash)).toBe(false);
  });
  it("rejects short passwords", async () => {
    await expect(hashPassword("short")).rejects.toThrow();
  });
  it("flags malformed hashes for rehash", () => {
    expect(needsRehash("garbage")).toBe(true);
  });
  it("produces different hashes for the same password (random salt)", async () => {
    const a = await hashPassword("same-password-xyz");
    const b = await hashPassword("same-password-xyz");
    expect(a).not.toBe(b);
  });
});

describe("session", () => {
  it("stores only the hash and matches tokens", () => {
    const s = issueSession();
    expect(s.tokenHash).toBe(hashToken(s.token));
    expect(s.tokenHash).not.toBe(s.token);
    expect(tokensMatch(s.token, s.tokenHash)).toBe(true);
    expect(tokensMatch("other", s.tokenHash)).toBe(false);
  });
  it("detects expiry", () => {
    expect(isExpired(new Date(Date.now() - 1000))).toBe(true);
    expect(isExpired(new Date(Date.now() + 10000))).toBe(false);
  });
});

describe("rbac", () => {
  it("wildcard grants everything", () => {
    expect(can([WILDCARD], "order:write")).toBe(true);
  });
  it("checks specific permissions", () => {
    expect(can(["order:read"], "order:read")).toBe(true);
    expect(can(["order:read"], "order:write")).toBe(false);
    expect(canAll(["order:read", "order:write"], ["order:read", "order:write"])).toBe(true);
  });
  it("ships 8 system roles including super_admin", () => {
    expect(SYSTEM_ROLES).toHaveLength(8);
    const superAdmin = SYSTEM_ROLES.find((r) => r.key === "super_admin");
    expect(superAdmin?.permissions).toContain(WILDCARD);
  });
  it("read_only role has only read permissions", () => {
    const ro = SYSTEM_ROLES.find((r) => r.key === "read_only")!;
    expect(ro.permissions.every((p) => p.endsWith(":read"))).toBe(true);
  });
});

describe("rate limit", () => {
  it("allows up to the limit then blocks", () => {
    const rl = new RateLimiter(3, 1000);
    const t = 1000;
    expect(rl.check("k", t).allowed).toBe(true);
    expect(rl.check("k", t).allowed).toBe(true);
    expect(rl.check("k", t).allowed).toBe(true);
    expect(rl.check("k", t).allowed).toBe(false);
  });
  it("recovers after the window", () => {
    const rl = new RateLimiter(1, 1000);
    expect(rl.check("k", 0).allowed).toBe(true);
    expect(rl.check("k", 500).allowed).toBe(false);
    expect(rl.check("k", 1500).allowed).toBe(true);
  });
  it("locks after max login attempts", () => {
    let state = { failedAttempts: 0, lockedUntil: null as Date | null };
    for (let i = 0; i < MAX_LOGIN_ATTEMPTS; i++) state = nextLockState(state.failedAttempts);
    expect(isLocked(state.lockedUntil)).toBe(true);
  });
});
