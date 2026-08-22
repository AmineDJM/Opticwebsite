/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: [
    "@optic/ui", "@optic/core", "@optic/config", "@optic/theming", "@optic/i18n",
    "@optic/database", "@optic/auth", "@optic/commerce", "@optic/catalog",
    "@optic/recommendation", "@optic/visagism", "@optic/quiz-engine",
    "@optic/virtual-try-on", "@optic/analytics", "@optic/storage", "@optic/exporter",
  ],
  // Standalone output is opt-in (Docker sets OPTIC_STANDALONE=1). By default we use
  // the normal server so `next start` works for dev, E2E and simple deployments.
  output: process.env.OPTIC_STANDALONE ? "standalone" : undefined,
  outputFileTracingRoot: new URL("../../", import.meta.url).pathname,
  serverExternalPackages: ["@prisma/client", ".prisma/client", "archiver"],
  eslint: { ignoreDuringBuilds: true },
  webpack: (config) => {
    config.resolve.extensionAlias = { ".js": [".ts", ".tsx", ".js"], ".mjs": [".mts", ".mjs"] };
    return config;
  },
};
export default nextConfig;
