"use server";

import { buildPaletteFromColors, auditPalette } from "@optic/theming";
import { requirePlatform } from "../session.js";

/**
 * Build an accessible palette (§4) from dominant colors the client extracted from the
 * uploaded logo (canvas sampling). Returns the corrected ramp + a contrast audit.
 */
export async function buildPaletteAction(colors: string[], mode: "light" | "dark" = "light") {
  await requirePlatform();
  const clean = colors.filter((c) => /^#[0-9a-fA-F]{6}$/.test(c)).slice(0, 5);
  const ramp = buildPaletteFromColors(clean.length ? clean : ["#1f6feb"], mode);
  return { ramp, audit: auditPalette(ramp) };
}
