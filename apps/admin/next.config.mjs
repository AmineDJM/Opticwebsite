/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: [
    "@optic/ui", "@optic/core", "@optic/config", "@optic/theming", "@optic/i18n",
    "@optic/database", "@optic/auth", "@optic/commerce", "@optic/catalog",
    "@optic/recommendation", "@optic/visagism", "@optic/quiz-engine",
    "@optic/virtual-try-on", "@optic/analytics", "@optic/storage",
  ],
  output: "standalone",
  outputFileTracingRoot: new URL("../../", import.meta.url).pathname,
  serverExternalPackages: ["@prisma/client", ".prisma/client"],
  eslint: { ignoreDuringBuilds: true },
  webpack: (config) => {
    config.resolve.extensionAlias = { ".js": [".ts", ".tsx", ".js"], ".mjs": [".mts", ".mjs"] };
    return config;
  },
};
export default nextConfig;
