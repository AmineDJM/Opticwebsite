/**
 * Image quality control (§15 step 3). Runs before landmark detection to reject
 * unusable frames (no face, off-angle, too dark/bright). Pure decision logic over
 * summary stats the browser extracts from the frame, so it is testable.
 */

export interface FrameQualityInput {
  faceDetected: boolean;
  /** Face bounding box area as a fraction of the frame (0..1). */
  faceAreaRatio: number;
  /** Horizontal centeredness: |cx - 0.5| (0 = centered). */
  horizontalOffset: number;
  /** Estimated yaw in degrees (0 = facing camera). */
  yawDegrees: number;
  /** Average luminance 0..255. */
  brightness: number;
}

export type QualityIssue =
  | "no_face"
  | "face_too_small"
  | "not_centered"
  | "not_frontal"
  | "too_dark"
  | "too_bright";

export interface QualityResult {
  usable: boolean;
  issues: QualityIssue[];
  /** Primary guidance message for the user. */
  hint: string;
}

const HINTS: Record<QualityIssue, string> = {
  no_face: "Aucun visage détecté. Placez votre visage dans le cadre.",
  face_too_small: "Rapprochez-vous de la caméra.",
  not_centered: "Centrez votre visage dans le cadre.",
  not_frontal: "Regardez droit vers la caméra.",
  too_dark: "Placez-vous dans un endroit mieux éclairé.",
  too_bright: "Réduisez la luminosité ou évitez le contre-jour.",
};

export function assessFrameQuality(input: FrameQualityInput): QualityResult {
  const issues: QualityIssue[] = [];
  if (!input.faceDetected) {
    issues.push("no_face");
  } else {
    if (input.faceAreaRatio < 0.08) issues.push("face_too_small");
    if (input.horizontalOffset > 0.18) issues.push("not_centered");
    if (Math.abs(input.yawDegrees) > 18) issues.push("not_frontal");
    if (input.brightness < 60) issues.push("too_dark");
    if (input.brightness > 235) issues.push("too_bright");
  }
  const usable = issues.length === 0;
  return {
    usable,
    issues,
    hint: usable ? "Parfait, ne bougez plus." : HINTS[issues[0]!],
  };
}
