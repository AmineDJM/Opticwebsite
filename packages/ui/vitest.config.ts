import { defineConfig } from "vitest/config";

export default defineConfig({
  // JSX is transformed by vitest's esbuild using the automatic runtime; the React
  // plugin (fast-refresh/babel) is unnecessary for unit tests and its version is
  // coupled to Vite's, so we avoid it here.
  esbuild: { jsx: "automatic" },
  test: {
    environment: "jsdom",
    globals: true,
    include: ["src/**/*.test.{ts,tsx}"],
  },
});
