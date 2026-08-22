import type { FaceShape } from "@optic/core";

/**
 * Face-shape geometry (§15 steps 5–6). Pure maths over normalised facial landmarks.
 * The landmark *detection* (MediaPipe, in the browser) is a separate concern; this
 * module takes the handful of points it needs and computes ratios, so it is fully
 * unit-testable with synthetic inputs and carries no ML dependency.
 *
 * Privacy: only these derived ratios ever leave the analysis step — never pixels.
 */

export interface Point2D {
  x: number;
  y: number;
}

/**
 * The minimal landmark set the classifier needs. Callers map their detector's dense
 * mesh down to these before calling in. Coordinates may be in any consistent unit
 * (pixels or normalised) — only ratios are used.
 */
export interface FaceMeasurements {
  foreheadWidth: number; // temple-to-temple across the brow
  cheekboneWidth: number; // widest zygomatic width
  jawWidth: number; // gonial-to-gonial
  faceHeight: number; // hairline/brow to chin
  jawAngle: number; // degrees; ~90 sharp/square, >130 soft/round
  chinShape: number; // 0 pointed .. 1 rounded/wide
}

export interface FaceShapeScore {
  shape: FaceShape;
  score: number;
}

export interface FaceShapeResult {
  shape: FaceShape;
  confidence: number; // 0..1
  ranking: FaceShapeScore[];
  metrics: {
    widthHeightRatio: number;
    cheekToJaw: number;
    foreheadToJaw: number;
    jawAngle: number;
  };
}

/**
 * Build measurements from a small set of named landmark points. This mirrors what the
 * browser adapter produces from MediaPipe's mesh; kept here so it is testable.
 */
export function measurementsFromPoints(pts: {
  templeLeft: Point2D;
  templeRight: Point2D;
  cheekLeft: Point2D;
  cheekRight: Point2D;
  jawLeft: Point2D;
  jawRight: Point2D;
  chinBottom: Point2D;
  browTop: Point2D;
}): FaceMeasurements {
  const dist = (a: Point2D, b: Point2D) => Math.hypot(a.x - b.x, a.y - b.y);
  const foreheadWidth = dist(pts.templeLeft, pts.templeRight);
  const cheekboneWidth = dist(pts.cheekLeft, pts.cheekRight);
  const jawWidth = dist(pts.jawLeft, pts.jawRight);
  const faceHeight = dist(pts.browTop, pts.chinBottom);

  // Jaw angle from the gonial points to the chin.
  const angle = (a: Point2D, vertex: Point2D, c: Point2D) => {
    const v1 = { x: a.x - vertex.x, y: a.y - vertex.y };
    const v2 = { x: c.x - vertex.x, y: c.y - vertex.y };
    const dot = v1.x * v2.x + v1.y * v2.y;
    const m1 = Math.hypot(v1.x, v1.y);
    const m2 = Math.hypot(v2.x, v2.y);
    if (m1 === 0 || m2 === 0) return 120;
    return (Math.acos(Math.max(-1, Math.min(1, dot / (m1 * m2)))) * 180) / Math.PI;
  };
  const jawAngle = angle(pts.jawLeft, pts.chinBottom, pts.jawRight);

  // Chin roundness proxy: wider jaw relative to cheek → rounder.
  const chinShape = Math.max(0, Math.min(1, jawWidth / Math.max(1, cheekboneWidth)));

  return { foreheadWidth, cheekboneWidth, jawWidth, faceHeight, jawAngle, chinShape };
}

/**
 * Classify a face shape from measurements. Uses well-established visagism heuristics:
 *  - width:height ratio (long vs. wide)
 *  - forehead vs. jaw balance (heart/triangle)
 *  - cheek dominance (diamond)
 *  - jaw angle (square vs. round)
 *
 * Returns a ranked list and a confidence derived from the margin between the top two.
 */
export function classifyFaceShape(m: FaceMeasurements): FaceShapeResult {
  const widthHeightRatio = m.cheekboneWidth / Math.max(1, m.faceHeight);
  const cheekToJaw = m.cheekboneWidth / Math.max(1, m.jawWidth);
  const foreheadToJaw = m.foreheadWidth / Math.max(1, m.jawWidth);
  const cheekToForehead = m.cheekboneWidth / Math.max(1, m.foreheadWidth);

  const scores: Record<FaceShape, number> = {
    oval: 0,
    round: 0,
    square: 0,
    rectangle: 0,
    heart: 0,
    diamond: 0,
    triangle: 0,
  };

  const isLong = widthHeightRatio < 0.72;
  const isWide = widthHeightRatio > 0.82;
  const balancedWidths = Math.abs(foreheadToJaw - 1) < 0.12 && Math.abs(cheekToJaw - 1) < 0.14;
  const sharpJaw = m.jawAngle < 100;
  const softJaw = m.jawAngle > 128;

  // Oval: balanced, gently rounded (non-angular) jaw, cheek slightly widest. The
  // "long" bonus only applies when the jaw is NOT sharp — a long face with an
  // angular jaw is a rectangle, not an oval.
  scores.oval += balancedWidths ? 2 : 0;
  scores.oval += isLong && !isWide && !sharpJaw ? 1.5 : 0;
  scores.oval += cheekToJaw > 1 && cheekToJaw < 1.2 ? 1 : 0;
  scores.oval += softJaw ? 0.5 : 0;
  scores.oval += sharpJaw ? -1 : 0;

  // Round: wide, soft jaw, balanced widths, short.
  scores.round += isWide ? 2 : 0;
  scores.round += softJaw ? 1.5 : 0;
  scores.round += balancedWidths ? 1 : 0;

  // Square: balanced widths, sharp jaw, not long.
  scores.square += balancedWidths ? 1.5 : 0;
  scores.square += sharpJaw ? 2.5 : 0;
  scores.square += !isLong ? 1 : 0;

  // Rectangle: long + angular jaw + balanced widths. The angular jaw is what
  // separates it from oval.
  scores.rectangle += isLong ? 2.5 : 0;
  scores.rectangle += sharpJaw ? 1.5 : 0;
  scores.rectangle += !softJaw ? 0.5 : 0;
  scores.rectangle += balancedWidths ? 1 : 0;

  // Heart: forehead wider than jaw, pointed chin.
  scores.heart += foreheadToJaw > 1.15 ? 2.5 : 0;
  scores.heart += m.chinShape < 0.85 ? 1.5 : 0;
  scores.heart += cheekToJaw > 1.1 ? 0.5 : 0;

  // Diamond: cheekbones widest, forehead & jaw narrower.
  scores.diamond += cheekToForehead > 1.12 && cheekToJaw > 1.12 ? 3 : 0;
  scores.diamond += m.chinShape < 0.9 ? 0.5 : 0;

  // Triangle: jaw wider than forehead.
  scores.triangle += foreheadToJaw < 0.88 ? 2.5 : 0;
  scores.triangle += cheekToJaw < 1 ? 1 : 0;

  const ranking = (Object.entries(scores) as [FaceShape, number][])
    .map(([shape, score]) => ({ shape, score }))
    .sort((a, b) => b.score - a.score);

  const top = ranking[0]!;
  const second = ranking[1]!;
  // Confidence from the margin, scaled; if everything is ~0 fall back to low confidence oval.
  const margin = top.score - second.score;
  const confidence = top.score <= 0 ? 0.2 : Math.max(0.3, Math.min(0.95, 0.5 + margin * 0.18));

  return {
    shape: top.score <= 0 ? "oval" : top.shape,
    confidence: Math.round(confidence * 100) / 100,
    ranking,
    metrics: {
      widthHeightRatio: round2(widthHeightRatio),
      cheekToJaw: round2(cheekToJaw),
      foreheadToJaw: round2(foreheadToJaw),
      jawAngle: Math.round(m.jawAngle),
    },
  };
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
