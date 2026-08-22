import { reactConfig } from "./react.js";

/**
 * Next.js apps.
 *
 * `eslint-config-next` is intentionally not pulled in here so this package stays
 * agnostic of the installed Next.js version; apps compose it themselves when they
 * want the framework-specific rules.
 */
export const nextConfig = [
  ...reactConfig,
  {
    files: ["**/*.{ts,tsx}"],
    rules: {
      // Client components may not reach into server-only modules. The `server-only`
      // package fails the build for real violations; this keeps the feedback local.
      "no-restricted-imports": "off",
    },
  },
  {
    files: ["**/*.tsx"],
    rules: {
      // Next.js <Link> renders an <a>; the plugin's rule for anchors without href
      // produces false positives on it.
      "jsx-a11y/anchor-is-valid": "off",
    },
  },
];

export default nextConfig;
