import { z } from "zod";
import { hexColorSchema } from "@optic/core";

/**
 * Theme schema — the serialisable design tokens for one brand. Written by the
 * generator, rendered as CSS custom properties at request time. Every visual
 * decision the storefront makes reads from here; nothing is hardcoded per brand.
 */

export const colorRampSchema = z.object({
  primary: hexColorSchema,
  primaryForeground: hexColorSchema,
  secondary: hexColorSchema,
  secondaryForeground: hexColorSchema,
  accent: hexColorSchema,
  accentForeground: hexColorSchema,
  background: hexColorSchema,
  foreground: hexColorSchema,
  surface: hexColorSchema,
  surfaceForeground: hexColorSchema,
  muted: hexColorSchema,
  mutedForeground: hexColorSchema,
  border: hexColorSchema,
  success: hexColorSchema,
  warning: hexColorSchema,
  error: hexColorSchema,
});
export type ColorRamp = z.infer<typeof colorRampSchema>;

export const typographySchema = z.object({
  headingFont: z.string(),
  bodyFont: z.string(),
  headingWeight: z.number().int().min(300).max(900).default(600),
  bodyWeight: z.number().int().min(300).max(700).default(400),
  /** Type scale ratio (1.2 = minor third, 1.25 = major third, …). */
  scale: z.number().min(1.1).max(1.4).default(1.25),
});
export type Typography = z.infer<typeof typographySchema>;

export const buttonStyleSchema = z.enum(["solid", "soft", "outline", "pill"]);
export const cardStyleSchema = z.enum(["flat", "bordered", "elevated"]);
export const headerStyleSchema = z.enum(["classic", "centered", "minimal"]);
export const footerStyleSchema = z.enum(["rich", "simple", "minimal"]);
export const densitySchema = z.enum(["comfortable", "compact"]);

export const layoutSchema = z.object({
  radius: z.number().min(0).max(32).default(8),
  density: densitySchema.default("comfortable"),
  buttonStyle: buttonStyleSchema.default("solid"),
  cardStyle: cardStyleSchema.default("bordered"),
  headerStyle: headerStyleSchema.default("classic"),
  footerStyle: footerStyleSchema.default("rich"),
  containerWidth: z.number().int().min(1024).max(1600).default(1280),
});
export type Layout = z.infer<typeof layoutSchema>;

export const themeSchema = z.object({
  preset: z.string().default("modern"),
  colors: colorRampSchema,
  typography: typographySchema,
  layout: layoutSchema,
  customTokens: z.record(z.string(), z.string()).optional(),
});
export type Theme = z.infer<typeof themeSchema>;

/**
 * Serialise a theme to the CSS custom properties consumed by the Tailwind config
 * and every component. This is the single bridge between theme *data* and rendered
 * *style*. Output is a plain string safe to inline in a <style> tag.
 */
export function themeToCssVariables(theme: Theme): Record<string, string> {
  const { colors, typography, layout } = theme;
  const vars: Record<string, string> = {
    "--color-primary": colors.primary,
    "--color-primary-foreground": colors.primaryForeground,
    "--color-secondary": colors.secondary,
    "--color-secondary-foreground": colors.secondaryForeground,
    "--color-accent": colors.accent,
    "--color-accent-foreground": colors.accentForeground,
    "--color-background": colors.background,
    "--color-foreground": colors.foreground,
    "--color-surface": colors.surface,
    "--color-surface-foreground": colors.surfaceForeground,
    "--color-muted": colors.muted,
    "--color-muted-foreground": colors.mutedForeground,
    "--color-border": colors.border,
    "--color-success": colors.success,
    "--color-warning": colors.warning,
    "--color-error": colors.error,
    "--font-heading": typography.headingFont,
    "--font-body": typography.bodyFont,
    "--font-weight-heading": String(typography.headingWeight),
    "--font-weight-body": String(typography.bodyWeight),
    "--type-scale": String(typography.scale),
    "--radius": `${layout.radius}px`,
    "--radius-sm": `${Math.max(0, layout.radius - 4)}px`,
    "--radius-lg": `${layout.radius + 4}px`,
    "--container-width": `${layout.containerWidth}px`,
    "--density-gap": layout.density === "compact" ? "0.75rem" : "1rem",
    "--density-padding": layout.density === "compact" ? "0.75rem" : "1.25rem",
  };
  if (theme.customTokens) {
    for (const [k, v] of Object.entries(theme.customTokens)) {
      vars[k.startsWith("--") ? k : `--${k}`] = v;
    }
  }
  return vars;
}

export function cssVariablesToString(vars: Record<string, string>): string {
  return Object.entries(vars)
    .map(([k, v]) => `${k}:${v};`)
    .join("");
}
