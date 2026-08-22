import { describe, it, expect, vi } from "vitest";
import { AnalyticsBus, ConsoleSink, GA4Sink, createAnalyticsBus, ANALYTICS_EVENTS } from "../index";

describe("analytics bus", () => {
  it("fires first-party sinks regardless of consent", async () => {
    const emit = vi.fn();
    const bus = new AnalyticsBus({ consentGranted: false });
    bus.use({ key: "db", requiresConsent: false, emit });
    await bus.track("view_product", { id: "p1" });
    expect(emit).toHaveBeenCalledOnce();
  });

  it("gates consent-required sinks until consent granted", async () => {
    const send = vi.fn();
    const bus = new AnalyticsBus({ consentGranted: false }).use(new GA4Sink(send));
    await bus.track("page_view");
    expect(send).not.toHaveBeenCalled();
    bus.setConsent(true);
    await bus.track("page_view");
    expect(send).toHaveBeenCalledOnce();
  });

  it("isolates a failing sink", async () => {
    const good = vi.fn();
    const bus = new AnalyticsBus({ consentGranted: true });
    bus.use({ key: "bad", requiresConsent: false, emit: () => { throw new Error("boom"); } });
    bus.use({ key: "good", requiresConsent: false, emit: good });
    await expect(bus.track("search", { q: "aviator" })).resolves.toBeUndefined();
    expect(good).toHaveBeenCalledOnce();
  });

  it("stamps a timestamp", async () => {
    const emit = vi.fn();
    const bus = new AnalyticsBus({ consentGranted: true, now: () => "2026-01-01T00:00:00Z" });
    bus.use({ key: "x", requiresConsent: false, emit });
    await bus.track("order_created");
    expect(emit.mock.calls[0]?.[0]?.timestamp).toBe("2026-01-01T00:00:00Z");
  });

  it("exposes the required event vocabulary", () => {
    expect(ANALYTICS_EVENTS).toContain("visagism_completed");
    expect(ANALYTICS_EVENTS).toContain("quiz_completed");
    expect(ANALYTICS_EVENTS).toContain("begin_checkout");
  });

  it("default bus has a console sink", async () => {
    const bus = createAnalyticsBus(true);
    await expect(bus.track("page_view")).resolves.toBeUndefined();
  });
});
