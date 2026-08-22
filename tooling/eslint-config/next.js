import nextPlugin from "@next/eslint-plugin-next";
import { reactConfig } from "./react.js";

/**
 * Next.js apps. Registers the official `@next/next` plugin (so its rules resolve and its
 * recommended checks run) and relaxes a few rules that fight this codebase:
 *
 * - `@next/next/no-img-element` is OFF: we intentionally use `<img>` for SVG placeholders,
 *   blob-URL previews and framework-agnostic UI components; `next/image` is used where it
 *   pays off (product galleries, cards).
 * - `react/no-unescaped-entities` is OFF: the UI is in French, where apostrophes are
 *   pervasive in copy and escaping every one adds noise without value.
 */
export const nextConfig = [
  ...reactConfig,
  {
    files: ["**/*.{ts,tsx}"],
    plugins: { "@next/next": nextPlugin },
    rules: {
      ...nextPlugin.configs.recommended.rules,
      ...nextPlugin.configs["core-web-vitals"].rules,
      "@next/next/no-img-element": "off",
      "react/no-unescaped-entities": "off",
      "jsx-a11y/anchor-is-valid": "off",
    },
  },
];

export default nextConfig;
