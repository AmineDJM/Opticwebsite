import { type Theme, themeToCssVariables, cssVariablesToString } from "@optic/config";

/**
 * ThemeStyle injects the active brand's design tokens as CSS custom properties on a
 * scope selector (default `:root`). Rendered once in the app layout from the tenant's
 * Theme row — this is the bridge that makes one design system render N brands with no
 * rebuild. Server component; emits a plain <style> tag.
 */
export function ThemeStyle({ theme, selector = ":root" }: { theme: Theme; selector?: string }) {
  const vars = themeToCssVariables(theme);
  const css = `${selector}{${cssVariablesToString(vars)}}`;
  return <style dangerouslySetInnerHTML={{ __html: css }} />;
}

/** Build the inline style object form (for previews rendered in an element scope). */
export function themeStyleObject(theme: Theme): Record<string, string> {
  return themeToCssVariables(theme);
}
