import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";

/**
 * Generates SVG placeholder images for the demo so the storefront is visually
 * complete without shipping real photography. They are deliberately stylised (a frame
 * silhouette on a branded gradient) and clearly not photographs, honouring §43's rule
 * that demo data must be identifiable.
 *
 * Images are written to the local storage dir; Media rows point at `/media/...`.
 */

const STORAGE_DIR = resolve(process.env.STORAGE_LOCAL_DIR ?? "./var/storage");
const PUBLIC_PREFIX = process.env.STORAGE_PUBLIC_URL ?? "/media";

function frameSilhouette(shape: string, _stroke: string): string {
  switch (shape) {
    case "round":
    case "oval":
      return `<circle cx="150" cy="200" r="55" /><circle cx="330" cy="200" r="55" /><path d="M205 195 q35 -20 70 0" /><path d="M95 190 l-35 -15 M385 190 l35 -15" />`;
    case "aviator":
      return `<path d="M95 175 q55 90 100 5 q-50 -25 -100 -5z" /><path d="M285 175 q55 90 100 5 q-50 -25 -100 -5z" /><path d="M195 178 q45 -14 90 0" /><path d="M95 172 l-35 -12 M385 172 l35 -12" />`;
    case "cat_eye":
      return `<path d="M90 175 q40 60 115 30 q-10 -45 -115 -30z" /><path d="M290 175 q40 60 115 30 q-10 -45 -115 -30z" /><path d="M200 185 q40 -12 85 0" /><path d="M92 172 l-32 -10 M405 172 l32 -10" />`;
    default: // rectangle / square / wayfarer / geometric
      return `<rect x="80" y="165" width="130" height="80" rx="14" /><rect x="290" y="165" width="130" height="80" rx="14" /><path d="M210 190 q40 -14 80 0" /><path d="M80 178 l-30 -10 M420 178 l30 -10" />`;
  }
}

export async function writePlaceholderImage(
  key: string,
  opts: { label: string; sublabel?: string; bg: string; accent: string; shape?: string },
): Promise<{ url: string; width: number; height: number; bytes: number }> {
  const shape = opts.shape ?? "rectangle";
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="500" height="500" viewBox="0 0 500 500" role="img" aria-label="${escapeXml(opts.label)}">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="${opts.bg}"/>
      <stop offset="1" stop-color="${shade(opts.bg, -18)}"/>
    </linearGradient>
  </defs>
  <rect width="500" height="500" fill="url(#g)"/>
  <g fill="none" stroke="${opts.accent}" stroke-width="7" stroke-linecap="round" stroke-linejoin="round" opacity="0.92">
    ${frameSilhouette(shape, opts.accent)}
  </g>
  <text x="250" y="360" text-anchor="middle" font-family="system-ui, sans-serif" font-size="26" font-weight="600" fill="#ffffff">${escapeXml(opts.label)}</text>
  ${opts.sublabel ? `<text x="250" y="392" text-anchor="middle" font-family="system-ui, sans-serif" font-size="16" fill="#ffffff" opacity="0.8">${escapeXml(opts.sublabel)}</text>` : ""}
  <text x="250" y="470" text-anchor="middle" font-family="system-ui, sans-serif" font-size="12" fill="#ffffff" opacity="0.55">DÉMO</text>
</svg>`;
  const buf = Buffer.from(svg, "utf8");
  const full = join(STORAGE_DIR, key);
  await mkdir(dirname(full), { recursive: true });
  await writeFile(full, buf);
  return { url: `${PUBLIC_PREFIX}/${key}`, width: 500, height: 500, bytes: buf.byteLength };
}

export async function writeBannerImage(
  key: string,
  opts: { bg: string; accent: string; label?: string },
): Promise<{ url: string; width: number; height: number; bytes: number }> {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1600" height="900" viewBox="0 0 1600 900">
  <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${opts.bg}"/><stop offset="1" stop-color="${shade(opts.bg, -25)}"/></linearGradient></defs>
  <rect width="1600" height="900" fill="url(#g)"/>
  <g fill="none" stroke="${opts.accent}" stroke-width="10" opacity="0.25">
    <circle cx="520" cy="450" r="150"/><circle cx="1080" cy="450" r="150"/><path d="M670 440 q130 -60 260 0"/>
  </g>
  ${opts.label ? `<text x="120" y="470" font-family="system-ui, sans-serif" font-size="72" font-weight="700" fill="#ffffff">${escapeXml(opts.label)}</text>` : ""}
</svg>`;
  const buf = Buffer.from(svg, "utf8");
  const full = join(STORAGE_DIR, key);
  await mkdir(dirname(full), { recursive: true });
  await writeFile(full, buf);
  return { url: `${PUBLIC_PREFIX}/${key}`, width: 1600, height: 900, bytes: buf.byteLength };
}

export async function writeLogo(key: string, name: string, primary: string, accent: string) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="220" height="56" viewBox="0 0 220 56">
  <g fill="none" stroke="${primary}" stroke-width="3.5"><circle cx="20" cy="28" r="13"/><circle cx="52" cy="28" r="13"/><path d="M33 26 q3 -6 6 0"/></g>
  <circle cx="52" cy="28" r="5" fill="${accent}"/>
  <text x="76" y="36" font-family="Georgia, serif" font-size="26" font-weight="600" fill="${primary}">${escapeXml(name)}</text>
</svg>`;
  const buf = Buffer.from(svg, "utf8");
  const full = join(STORAGE_DIR, key);
  await mkdir(dirname(full), { recursive: true });
  await writeFile(full, buf);
  return { url: `${PUBLIC_PREFIX}/${key}`, width: 220, height: 56, bytes: buf.byteLength };
}

function escapeXml(s: string): string {
  return s.replace(/[<>&'"]/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", "'": "&apos;", '"': "&quot;" })[c]!);
}

function shade(hex: string, percent: number): string {
  const n = parseInt(hex.replace("#", ""), 16);
  const clamp = (v: number) => Math.max(0, Math.min(255, v));
  const r = clamp(((n >> 16) & 255) + Math.round(255 * (percent / 100)));
  const g = clamp(((n >> 8) & 255) + Math.round(255 * (percent / 100)));
  const b = clamp((n & 255) + Math.round(255 * (percent / 100)));
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, "0")}`;
}
