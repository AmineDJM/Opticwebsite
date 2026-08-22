import { describe, it, expect } from "vitest";
import { classifyFaceShape, measurementsFromPoints, type FaceMeasurements } from "../geometry";
import { estimateColorimetry, averageRgb } from "../colorimetry";
import { assessFrameQuality } from "../quality";
import { analyzeAutomatic } from "../index";
import { isValidManualAnswer, MANUAL_STEPS } from "../manual";

// A clearly "round" face: wide (low width:height not long), soft jaw, balanced widths.
const roundFace: FaceMeasurements = {
  foreheadWidth: 100,
  cheekboneWidth: 108,
  jawWidth: 100,
  faceHeight: 120, // ratio 0.9 -> wide
  jawAngle: 140, // soft
  chinShape: 0.95,
};

// A clearly "rectangle" face: long + sharp jaw + balanced.
const rectFace: FaceMeasurements = {
  foreheadWidth: 100,
  cheekboneWidth: 102,
  jawWidth: 100,
  faceHeight: 160, // ratio ~0.64 -> long
  jawAngle: 92, // sharp
  chinShape: 0.9,
};

// Heart: forehead wider than jaw, pointed chin.
const heartFace: FaceMeasurements = {
  foreheadWidth: 130,
  cheekboneWidth: 120,
  jawWidth: 100,
  faceHeight: 140,
  jawAngle: 110,
  chinShape: 0.6,
};

describe("face shape classification", () => {
  it("classifies a round face", () => {
    expect(classifyFaceShape(roundFace).shape).toBe("round");
  });
  it("classifies a rectangle face", () => {
    expect(classifyFaceShape(rectFace).shape).toBe("rectangle");
  });
  it("classifies a heart face", () => {
    expect(classifyFaceShape(heartFace).shape).toBe("heart");
  });
  it("returns a confidence and full ranking", () => {
    const r = classifyFaceShape(roundFace);
    expect(r.confidence).toBeGreaterThan(0);
    expect(r.confidence).toBeLessThanOrEqual(0.95);
    expect(r.ranking).toHaveLength(7);
  });
  it("builds measurements from landmark points", () => {
    const m = measurementsFromPoints({
      templeLeft: { x: 0, y: 0 },
      templeRight: { x: 100, y: 0 },
      cheekLeft: { x: -5, y: 50 },
      cheekRight: { x: 105, y: 50 },
      jawLeft: { x: 10, y: 100 },
      jawRight: { x: 90, y: 100 },
      chinBottom: { x: 50, y: 130 },
      browTop: { x: 50, y: 5 },
    });
    expect(m.cheekboneWidth).toBeGreaterThan(m.jawWidth);
    expect(m.faceHeight).toBeGreaterThan(100);
  });
});

describe("colorimetry", () => {
  it("estimates warm undertone for reddish skin", () => {
    const r = estimateColorimetry({ r: 210, g: 160, b: 130 });
    expect(r.undertone).toBe("warm");
  });
  it("estimates cool undertone for pinkish-blue skin", () => {
    const r = estimateColorimetry({ r: 180, g: 170, b: 185 });
    expect(r.undertone).toBe("cool");
  });
  it("classifies skin tone by luminance", () => {
    expect(estimateColorimetry({ r: 240, g: 235, b: 230 }).skinTone).toBe("fair");
    expect(estimateColorimetry({ r: 90, g: 70, b: 60 }).skinTone).toBe("deep");
  });
  it("keeps confidence modest (never overclaims)", () => {
    expect(estimateColorimetry({ r: 210, g: 160, b: 130 }).confidence).toBeLessThanOrEqual(0.8);
  });
  it("averages rgb samples", () => {
    expect(averageRgb([{ r: 100, g: 100, b: 100 }, { r: 200, g: 200, b: 200 }])).toEqual({ r: 150, g: 150, b: 150 });
  });
});

describe("frame quality control", () => {
  it("accepts a good frame", () => {
    const q = assessFrameQuality({ faceDetected: true, faceAreaRatio: 0.3, horizontalOffset: 0.05, yawDegrees: 3, brightness: 140 });
    expect(q.usable).toBe(true);
  });
  it("rejects no face", () => {
    expect(assessFrameQuality({ faceDetected: false, faceAreaRatio: 0, horizontalOffset: 0, yawDegrees: 0, brightness: 140 }).issues).toContain("no_face");
  });
  it("rejects off-angle and dark frames", () => {
    const q = assessFrameQuality({ faceDetected: true, faceAreaRatio: 0.3, horizontalOffset: 0.05, yawDegrees: 30, brightness: 40 });
    expect(q.usable).toBe(false);
    expect(q.issues).toContain("not_frontal");
    expect(q.issues).toContain("too_dark");
  });
});

describe("analysis → profile bridge", () => {
  it("produces a recommendation profile from automatic analysis", () => {
    const out = analyzeAutomatic({ measurements: roundFace, skinSample: { r: 210, g: 160, b: 130 } });
    expect(out.profile.faceShape).toBe("round");
    expect(out.profile.undertone).toBe("warm");
    expect(out.profile.confidence).toBeGreaterThan(0);
  });
  it("works without a skin sample (face shape only)", () => {
    const out = analyzeAutomatic({ measurements: rectFace });
    expect(out.profile.faceShape).toBe("rectangle");
    expect(out.colorimetry).toBeUndefined();
  });
});

describe("manual questionnaire", () => {
  it("exposes a face-shape step with 7 options", () => {
    const step = MANUAL_STEPS.find((s) => s.key === "faceShape")!;
    expect(step.options).toHaveLength(7);
    expect(step.optional).toBe(false);
  });
  it("validates answers against the vocabulary", () => {
    expect(isValidManualAnswer("faceShape", "round")).toBe(true);
    expect(isValidManualAnswer("faceShape", "banana")).toBe(false);
    expect(isValidManualAnswer("undertone", "warm")).toBe(true);
  });
});
