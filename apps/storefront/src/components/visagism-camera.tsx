"use client";

import { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import { Button, Alert } from "@optic/ui";
import { measurementsFromPoints, assessFrameQuality, analyzeAutomatic } from "@optic/visagism";

/**
 * Camera visagism (§15). MediaPipe Face Landmarker runs in-browser on the webcam
 * stream; on capture we map its mesh to the handful of points @optic/visagism needs,
 * classify the face shape and estimate colorimetry, and emit a RecommendationProfile.
 * The image is analysed and discarded — nothing is uploaded (§17, privacy by design).
 *
 * Status: IMPLEMENTED (in-browser). Falls back to a clear message if the model can't
 * load; the manual path always remains available.
 */
export function VisagismCamera({
  onProfile,
  onCancel,
}: {
  onProfile: (profile: { faceShape: string; undertone?: string; skinTone?: string; confidence: number }, metrics: Record<string, number>) => void;
  onCancel: () => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const landmarkerRef = useRef<{ detectForVideo: (v: HTMLVideoElement, t: number) => { faceLandmarks: { x: number; y: number }[][] } } | null>(null);
  const rafRef = useRef<number | null>(null);
  const latestFaceRef = useRef<{ x: number; y: number }[] | null>(null);
  const stoppedRef = useRef(false);

  const [status, setStatus] = useState<"init" | "ready" | "error" | "denied" | "unsupported">("init");
  const [hint, setHint] = useState("Initialisation…");
  const [analyzing, setAnalyzing] = useState(false);

  useEffect(() => {
    stoppedRef.current = false;
    let stream: MediaStream | null = null;

    async function start() {
      if (!navigator.mediaDevices?.getUserMedia) {
        setStatus("unsupported");
        return;
      }
      try {
        const vision = await import("@mediapipe/tasks-vision");
        const resolver = await vision.FilesetResolver.forVisionTasks(
          "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.22-rc.20250304/wasm",
        );
        landmarkerRef.current = (await vision.FaceLandmarker.createFromOptions(resolver, {
          baseOptions: { modelAssetPath: "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task" },
          runningMode: "VIDEO",
          numFaces: 1,
        })) as never;
      } catch {
        setStatus("error");
        setHint("La détection faciale n'a pas pu se charger. Utilisez le choix manuel.");
        return;
      }

      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user", width: 640, height: 480 }, audio: false });
      } catch {
        setStatus("denied");
        return;
      }
      const video = videoRef.current;
      if (!video) return;
      video.srcObject = stream;
      await video.play().catch(() => undefined);
      setStatus("ready");
      loop();
    }

    function loop() {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const lm = landmarkerRef.current;
      if (!video || !canvas || !lm || stoppedRef.current) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      ctx.save();
      ctx.translate(canvas.width, 0);
      ctx.scale(-1, 1);
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      ctx.restore();

      if (video.readyState >= 2) {
        try {
          const res = lm.detectForVideo(video, performance.now());
          const face = res.faceLandmarks?.[0];
          if (face && face.length > 400) {
            latestFaceRef.current = face;
            // Quality feedback from bounding metrics.
            const xs = face.map((p) => p.x);
            const ys = face.map((p) => p.y);
            const w = Math.max(...xs) - Math.min(...xs);
            const h = Math.max(...ys) - Math.min(...ys);
            const cx = (Math.min(...xs) + Math.max(...xs)) / 2;
            const q = assessFrameQuality({ faceDetected: true, faceAreaRatio: w * h, horizontalOffset: Math.abs(cx - 0.5), yawDegrees: estimateYaw(face), brightness: 140 });
            setHint(q.hint);
          } else {
            latestFaceRef.current = null;
            setHint("Placez votre visage dans le cadre.");
          }
        } catch { /* skip */ }
      }
      rafRef.current = requestAnimationFrame(loop);
    }

    start();
    return () => {
      stoppedRef.current = true;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  function analyze() {
    const face = latestFaceRef.current;
    if (!face) {
      setHint("Aucun visage détecté. Regardez droit vers la caméra.");
      return;
    }
    setAnalyzing(true);
    try {
      // Map MediaPipe indices → the named points the geometry module needs.
      const pt = (i: number) => ({ x: face[i]!.x, y: face[i]!.y });
      const measurements = measurementsFromPoints({
        templeLeft: pt(127),
        templeRight: pt(356),
        cheekLeft: pt(234),
        cheekRight: pt(454),
        jawLeft: pt(172),
        jawRight: pt(397),
        chinBottom: pt(152),
        browTop: pt(10),
      });

      // Sample cheek colour from the canvas for colorimetry.
      let skinSample: { r: number; g: number; b: number } | undefined;
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext("2d");
      if (canvas && ctx) {
        const cheek = face[234]!;
        const px = Math.round((1 - cheek.x) * canvas.width);
        const py = Math.round(cheek.y * canvas.height);
        try {
          const d = ctx.getImageData(Math.max(0, px - 3), Math.max(0, py - 3), 6, 6).data;
          let r = 0, g = 0, b = 0, n = 0;
          for (let i = 0; i < d.length; i += 4) { r += d[i]!; g += d[i + 1]!; b += d[i + 2]!; n++; }
          skinSample = { r: Math.round(r / n), g: Math.round(g / n), b: Math.round(b / n) };
        } catch { /* canvas may be tainted; skip colour */ }
      }

      const analysis = analyzeAutomatic({ measurements, skinSample });
      onProfile(
        {
          faceShape: analysis.profile.faceShape,
          undertone: analysis.profile.undertone,
          skinTone: analysis.profile.skinTone,
          confidence: analysis.profile.confidence,
        },
        {
          widthHeightRatio: analysis.faceShape.metrics.widthHeightRatio,
          jawAngle: analysis.faceShape.metrics.jawAngle,
          confidence: analysis.profile.confidence,
        },
      );
    } finally {
      // The frame/landmarks are discarded here — nothing persists locally either.
      latestFaceRef.current = null;
      setAnalyzing(false);
    }
  }

  return (
    <div className="mx-auto max-w-lg">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="font-heading text-xl font-semibold">Analyse par photo</h2>
        <button onClick={onCancel} aria-label="Fermer" className="rounded p-1 hover:bg-muted"><X size={20} /></button>
      </div>
      <p className="mb-3 text-xs text-muted-foreground">L&apos;analyse se fait entièrement dans votre navigateur. Aucune image n&apos;est envoyée ni conservée.</p>

      <div className="relative aspect-[4/3] overflow-hidden rounded bg-black">
        <video ref={videoRef} className="hidden" playsInline muted />
        <canvas ref={canvasRef} width={640} height={480} className="h-full w-full object-cover" />
        {status !== "ready" && (
          <div className="absolute inset-0 flex items-center justify-center p-6 text-center text-sm text-white">
            {status === "init" && "Initialisation de la caméra…"}
            {status === "denied" && "Autorisez l'accès à la caméra pour continuer, ou revenez au choix manuel."}
            {status === "unsupported" && "La caméra n'est pas disponible sur cet appareil."}
            {status === "error" && hint}
          </div>
        )}
      </div>

      {status === "ready" && <p className="mt-2 text-center text-sm text-muted-foreground">{hint}</p>}
      {(status === "denied" || status === "error" || status === "unsupported") && (
        <Alert variant="warning" className="mt-3">Vous pouvez utiliser le choix manuel à la place.</Alert>
      )}

      <div className="mt-4 flex gap-2">
        <Button variant="outline" block onClick={onCancel}>Retour</Button>
        <Button block onClick={analyze} disabled={status !== "ready"} loading={analyzing}>Analyser mon visage</Button>
      </div>
    </div>
  );
}

function estimateYaw(face: { x: number; y: number }[]): number {
  // Rough yaw from nose-tip horizontal offset relative to eye midpoint.
  const nose = face[1];
  const leftEye = face[33];
  const rightEye = face[263];
  if (!nose || !leftEye || !rightEye) return 0;
  const mid = (leftEye.x + rightEye.x) / 2;
  const eyeSpan = Math.abs(rightEye.x - leftEye.x) || 0.1;
  return ((nose.x - mid) / eyeSpan) * 60;
}
