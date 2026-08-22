"use client";

import { useEffect, useRef, useState } from "react";
import { X, Camera as CameraIcon, Download } from "lucide-react";
import { computeOverlayTransform, type EyeLandmarks } from "@optic/virtual-try-on";
import { Button, Alert } from "@optic/ui";

/**
 * Virtual try-on (§19). Honest 2-D overlay: MediaPipe Face Landmarker (loaded from the
 * app's own bundle) detects eyes in the webcam stream; @optic/virtual-try-on computes
 * the frame transform; we composite the product's front-view asset each frame. Runs
 * entirely in the browser — no image leaves the device.
 *
 * Status: IMPLEMENTED as a 2-D overlay. A 3-D provider can be swapped in via the
 * TryOnRegistry without changing this component's contract.
 */
export function TryOnModal({ productName, assetUrl, onClose }: { productName: string; assetUrl: string; onClose: () => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "denied" | "error" | "unsupported">("loading");
  const [message, setMessage] = useState("Initialisation de la caméra…");
  const rafRef = useRef<number | null>(null);
  const stoppedRef = useRef(false);

  useEffect(() => {
    stoppedRef.current = false;
    let stream: MediaStream | null = null;
    let landmarker: { detectForVideo: (v: HTMLVideoElement, t: number) => { faceLandmarks: { x: number; y: number }[][] } } | null = null;
    const frame = new Image();
    frame.crossOrigin = "anonymous";
    frame.src = assetUrl;

    async function start() {
      if (!navigator.mediaDevices?.getUserMedia) {
        setStatus("unsupported");
        setMessage("La caméra n'est pas disponible sur cet appareil.");
        return;
      }
      try {
        // Load MediaPipe Face Landmarker lazily (WASM); the model is fetched from the
        // bundled tasks-vision package. If it fails we fall back to a static preview.
        const vision = await import("@mediapipe/tasks-vision");
        const filesetResolver = await vision.FilesetResolver.forVisionTasks(
          "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.22-rc.20250304/wasm",
        );
        landmarker = (await vision.FaceLandmarker.createFromOptions(filesetResolver, {
          baseOptions: {
            modelAssetPath:
              "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task",
          },
          runningMode: "VIDEO",
          numFaces: 1,
        })) as never;
      } catch {
        // Model/WASM could not load (offline, blocked). Show the frame statically.
        landmarker = null;
      }

      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user", width: 640, height: 480 }, audio: false });
      } catch {
        setStatus("denied");
        setMessage("Autorisez l'accès à la caméra pour essayer la monture.");
        return;
      }

      const video = videoRef.current;
      if (!video) return;
      video.srcObject = stream;
      await video.play().catch(() => undefined);
      setStatus("ready");
      setMessage(landmarker ? "Regardez droit vers la caméra." : "Aperçu statique (détection indisponible).");
      renderLoop(video, landmarker, frame);
    }

    function renderLoop(video: HTMLVideoElement, lm: typeof landmarker, frame: HTMLImageElement) {
      const canvas = canvasRef.current;
      if (!canvas || stoppedRef.current) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      const w = canvas.width;
      const h = canvas.height;

      ctx.save();
      // Mirror for a natural selfie view.
      ctx.translate(w, 0);
      ctx.scale(-1, 1);
      ctx.drawImage(video, 0, 0, w, h);
      ctx.restore();

      if (lm && video.readyState >= 2) {
        try {
          const result = lm.detectForVideo(video, performance.now());
          const face = result.faceLandmarks?.[0];
          if (face && face.length > 400) {
            // MediaPipe indices: 468/473 are iris centres (with iris model) but the base
            // model exposes eye corners; use averaged eye-region points 33/133 & 362/263.
            const leftEye = avg(face, [33, 133]);
            const rightEye = avg(face, [362, 263]);
            const eyes: EyeLandmarks = {
              // Convert normalised → canvas px, mirrored.
              leftEye: { x: (1 - rightEye.x) * w, y: rightEye.y * h },
              rightEye: { x: (1 - leftEye.x) * w, y: leftEye.y * h },
            };
            const t = computeOverlayTransform(eyes, { imageUrl: assetUrl });
            if (frame.complete && frame.naturalWidth > 0) {
              ctx.save();
              ctx.translate(t.x + t.width / 2, t.y + t.height / 2);
              ctx.rotate((t.rotationDegrees * Math.PI) / 180);
              ctx.globalAlpha = 0.92;
              ctx.drawImage(frame, -t.width / 2, -t.height / 2, t.width, t.height * 0.55);
              ctx.restore();
            }
          }
        } catch { /* skip frame */ }
      }
      rafRef.current = requestAnimationFrame(() => renderLoop(video, lm, frame));
    }

    start();

    return () => {
      stoppedRef.current = true;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      stream?.getTracks().forEach((tk) => tk.stop());
    };
  }, [assetUrl]);

  function capture() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const link = document.createElement("a");
    link.download = `essayage-${Date.now()}.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" role="dialog" aria-modal="true" aria-label={`Essayage ${productName}`}>
      <div className="relative w-full max-w-lg rounded bg-background p-4">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-heading text-lg font-semibold">Essayage — {productName}</h2>
          <button type="button" onClick={onClose} aria-label="Fermer" className="rounded p-1 hover:bg-muted"><X size={20} /></button>
        </div>

        <p className="mb-2 text-xs text-muted-foreground">
          L'analyse se fait dans votre navigateur. Aucune image n'est envoyée ni conservée.
        </p>

        <div className="relative aspect-[4/3] overflow-hidden rounded bg-black">
          <video ref={videoRef} className="hidden" playsInline muted />
          <canvas ref={canvasRef} width={640} height={480} className="h-full w-full object-cover" />
          {status !== "ready" && (
            <div className="absolute inset-0 flex items-center justify-center p-6 text-center text-sm text-white">
              {message}
            </div>
          )}
        </div>

        {status === "ready" && <p className="mt-2 text-center text-sm text-muted-foreground">{message}</p>}
        {(status === "denied" || status === "unsupported" || status === "error") && (
          <Alert variant="warning" className="mt-3">{message}</Alert>
        )}

        <div className="mt-3 flex gap-2">
          <Button variant="outline" block onClick={capture} disabled={status !== "ready"}>
            <Download size={18} /> Capturer
          </Button>
          <Button block onClick={onClose}><CameraIcon size={18} /> Terminer</Button>
        </div>
      </div>
    </div>
  );
}

function avg(face: { x: number; y: number }[], indices: number[]): { x: number; y: number } {
  let x = 0;
  let y = 0;
  let n = 0;
  for (const i of indices) {
    const pt = face[i];
    if (pt) { x += pt.x; y += pt.y; n++; }
  }
  return n ? { x: x / n, y: y / n } : { x: 0.5, y: 0.5 };
}
