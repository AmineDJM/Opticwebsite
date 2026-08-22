/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Internal packages ship TypeScript source; Next transpiles them.
  transpilePackages: [
    "@optic/ui",
    "@optic/core",
    "@optic/config",
    "@optic/theming",
    "@optic/i18n",
    "@optic/database",
    "@optic/auth",
    "@optic/commerce",
    "@optic/catalog",
    "@optic/recommendation",
    "@optic/visagism",
    "@optic/quiz-engine",
    "@optic/virtual-try-on",
    "@optic/analytics",
    "@optic/storage",
  ],
  // Self-contained server for independent hosting / export (§1).
  output: "standalone",
  outputFileTracingRoot: new URL("../../", import.meta.url).pathname,
  images: {
    // Local media is served by our own route; SVG placeholders and remote CDNs both work.
    remotePatterns: [{ protocol: "https", hostname: "**" }],
    dangerouslyAllowSVG: true,
    contentDispositionType: "attachment",
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
  },
  serverExternalPackages: ["@prisma/client", ".prisma/client"],
  eslint: { ignoreDuringBuilds: true },
  // Internal packages import sibling modules with explicit `.js` specifiers (ESM
  // correct). Teach webpack to resolve those to the `.ts`/`.tsx` sources it transpiles.
  webpack: (config) => {
    config.resolve.extensionAlias = {
      ".js": [".ts", ".tsx", ".js"],
      ".mjs": [".mts", ".mjs"],
    };
    return config;
  },
};

export default nextConfig;
