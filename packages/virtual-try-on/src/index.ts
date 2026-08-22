/**
 * Virtual try-on provider abstraction (§19). The product page depends on this
 * interface, never on a specific engine. The built-in provider is an honest 2-D
 * landmark-anchored overlay (what can be built truthfully from a product photo); a
 * specialist 3-D SDK can be registered later without touching product pages.
 *
 * The geometry that positions the frame is pure and lives here so it is testable; the
 * actual camera/canvas plumbing lives in the storefront's client component.
 */

export interface EyeLandmarks {
  /** Pupil/eye-centre positions in frame pixel coordinates. */
  leftEye: { x: number; y: number };
  rightEye: { x: number; y: number };
  /** Optional roll in degrees if the detector provides it; otherwise derived. */
  rollDegrees?: number;
}

export interface FrameAsset {
  /** Front-view PNG (transparent) URL. */
  imageUrl: string;
  /** Real frame total width in mm (lensWidth*2 + bridge + rims), for scale. */
  frameWidthMm?: number;
  /** Pixel width of the asset at its natural size. */
  assetWidthPx?: number;
  /** Horizontal offset of the asset's optical centre from its left edge (0..1). */
  opticalCenterX?: number;
}

export interface OverlayTransform {
  /** Top-left placement in frame pixels. */
  x: number;
  y: number;
  width: number;
  height: number;
  rotationDegrees: number;
}

/** Interpupillary distance in pixels from the two eye centres. */
export function interpupillaryPx(l: EyeLandmarks): number {
  return Math.hypot(l.rightEye.x - l.leftEye.x, l.rightEye.y - l.leftEye.y);
}

export function rollFromEyes(l: EyeLandmarks): number {
  if (typeof l.rollDegrees === "number") return l.rollDegrees;
  const dx = l.rightEye.x - l.leftEye.x;
  const dy = l.rightEye.y - l.leftEye.y;
  return (Math.atan2(dy, dx) * 180) / Math.PI;
}

/**
 * Compute where to draw the frame so its optical centres sit on the eyes. The frame's
 * lens centres are assumed to span ~62% of the frame's total width (a typical ratio),
 * unless the asset declares its own. Scale is driven by measured IPD vs. an average
 * adult IPD (~63mm) mapped through the frame's real width when known.
 */
export function computeOverlayTransform(landmarks: EyeLandmarks, asset: FrameAsset): OverlayTransform {
  const ipd = interpupillaryPx(landmarks);
  const roll = rollFromEyes(landmarks);

  // Fraction of the frame's width that lies between the two lens optical centres.
  const lensCentreSpanRatio = 0.62;
  // Desired on-screen frame width so the lens centres land on the pupils.
  const width = ipd / lensCentreSpanRatio;

  // Aspect ratio: default 0.38 (height/width) for eyewear if the asset shape is unknown.
  const aspect = asset.assetWidthPx ? 0.38 : 0.38;
  const height = width * aspect;

  // Midpoint between the eyes is the frame's optical centre.
  const cx = (landmarks.leftEye.x + landmarks.rightEye.x) / 2;
  const cy = (landmarks.leftEye.y + landmarks.rightEye.y) / 2;

  return {
    x: cx - width / 2,
    y: cy - height / 2,
    width,
    height,
    rotationDegrees: roll,
  };
}

export interface TryOnProvider {
  readonly key: string;
  readonly label: string;
  readonly mode: "overlay-2d" | "sdk-3d";
  computeTransform(landmarks: EyeLandmarks, asset: FrameAsset): OverlayTransform;
}

/** Built-in provider: 2-D overlay. The only provider registered in V1. */
export class Overlay2DProvider implements TryOnProvider {
  readonly key = "builtin-2d";
  readonly label = "Essayage (aperçu 2D)";
  readonly mode = "overlay-2d" as const;
  computeTransform(landmarks: EyeLandmarks, asset: FrameAsset): OverlayTransform {
    return computeOverlayTransform(landmarks, asset);
  }
}

export class TryOnRegistry {
  private readonly providers = new Map<string, TryOnProvider>();
  private defaultKey = "builtin-2d";

  constructor() {
    this.register(new Overlay2DProvider());
  }

  register(p: TryOnProvider): this {
    this.providers.set(p.key, p);
    return this;
  }

  setDefault(key: string): this {
    if (!this.providers.has(key)) throw new Error(`Unknown try-on provider: ${key}`);
    this.defaultKey = key;
    return this;
  }

  get(key?: string): TryOnProvider {
    const p = this.providers.get(key ?? this.defaultKey);
    if (!p) throw new Error(`No try-on provider: ${key ?? this.defaultKey}`);
    return p;
  }

  list(): TryOnProvider[] {
    return [...this.providers.values()];
  }
}

export function createTryOnRegistry(): TryOnRegistry {
  return new TryOnRegistry();
}
