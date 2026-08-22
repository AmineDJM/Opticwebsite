import { describe, it, expect } from "vitest";
import {
  computeOverlayTransform,
  interpupillaryPx,
  rollFromEyes,
  createTryOnRegistry,
  Overlay2DProvider,
} from "../index";

describe("virtual try-on geometry", () => {
  const level = { leftEye: { x: 100, y: 200 }, rightEye: { x: 200, y: 200 } };

  it("measures interpupillary distance", () => {
    expect(interpupillaryPx(level)).toBe(100);
  });
  it("derives zero roll for level eyes", () => {
    expect(rollFromEyes(level)).toBe(0);
  });
  it("derives roll for tilted eyes", () => {
    const tilted = { leftEye: { x: 100, y: 200 }, rightEye: { x: 200, y: 300 } };
    expect(Math.round(rollFromEyes(tilted))).toBe(45);
  });
  it("centres the frame between the eyes", () => {
    const t = computeOverlayTransform(level, { imageUrl: "x" });
    expect(t.x + t.width / 2).toBeCloseTo(150, 5);
    expect(t.y + t.height / 2).toBeCloseTo(200, 5);
  });
  it("scales width from IPD", () => {
    const t = computeOverlayTransform(level, { imageUrl: "x" });
    // width = ipd / 0.62
    expect(t.width).toBeCloseTo(100 / 0.62, 3);
  });
});

describe("try-on registry", () => {
  it("registers the built-in 2D provider by default", () => {
    const reg = createTryOnRegistry();
    expect(reg.get().key).toBe("builtin-2d");
    expect(reg.get().mode).toBe("overlay-2d");
    expect(reg.list()).toHaveLength(1);
  });
  it("rejects an unknown default", () => {
    expect(() => createTryOnRegistry().setDefault("nope")).toThrow();
  });
  it("provider computes a transform", () => {
    const p = new Overlay2DProvider();
    const t = p.computeTransform({ leftEye: { x: 0, y: 0 }, rightEye: { x: 62, y: 0 } }, { imageUrl: "x" });
    expect(t.width).toBeGreaterThan(0);
  });
});
