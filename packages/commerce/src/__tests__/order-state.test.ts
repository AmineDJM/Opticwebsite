import { describe, it, expect } from "vitest";
import {
  canTransition,
  transitionEffect,
  isTerminal,
  revenueTier,
  isRealisedRevenue,
  allowedTransitions,
  releasesStock,
} from "../order-state";

describe("order state machine", () => {
  it("allows valid transitions", () => {
    expect(canTransition("NEW", "CONFIRMED")).toBe(true);
    expect(canTransition("SHIPPED", "DELIVERED")).toBe(true);
    expect(canTransition("SHIPPED", "FAILED_DELIVERY")).toBe(true);
  });
  it("rejects invalid transitions", () => {
    expect(canTransition("NEW", "DELIVERED")).toBe(false);
    expect(canTransition("DELIVERED", "NEW")).toBe(false);
    expect(canTransition("CANCELLED", "CONFIRMED")).toBe(false);
  });
  it("marks terminal states", () => {
    expect(isTerminal("CANCELLED")).toBe(true);
    expect(isTerminal("RETURNED")).toBe(true);
    expect(isTerminal("NEW")).toBe(false);
  });
  it("throws on invalid transition effect", () => {
    expect(() => transitionEffect("NEW", "DELIVERED")).toThrow();
  });
  it("releases stock on cancel from a holding state", () => {
    const eff = transitionEffect("CONFIRMED", "CANCELLED");
    expect(eff.releaseStock).toBe(true);
    expect(eff.timestampField).toBe("cancelledAt");
  });
  it("consumes stock on delivery", () => {
    const eff = transitionEffect("SHIPPED", "DELIVERED");
    expect(eff.consumeStock).toBe(true);
    expect(eff.releaseStock).toBe(false);
    expect(eff.timestampField).toBe("deliveredAt");
  });
  it("recognises revenue only when delivered", () => {
    expect(isRealisedRevenue("DELIVERED")).toBe(true);
    expect(isRealisedRevenue("CONFIRMED")).toBe(false);
    expect(revenueTier("NEW")).toBe("ordered");
    expect(revenueTier("CONFIRMED")).toBe("confirmed");
    expect(revenueTier("CANCELLED")).toBeNull();
  });
  it("failed delivery can be re-attempted", () => {
    expect(allowedTransitions("FAILED_DELIVERY")).toContain("SHIPPED");
    expect(releasesStock("FAILED_DELIVERY")).toBe(true);
  });
});
