import { defineConfig } from "vitest/config";

/**
 * Root Vitest config. Uses two projects so pure packages run in Node while the UI
 * package (React components) runs in jsdom, all from a single `vitest run`.
 */
export default defineConfig({
  test: {
    projects: [
      {
        test: {
          name: "node",
          include: ["packages/*/src/**/*.test.ts"],
          exclude: ["**/node_modules/**", "**/dist/**", "**/.next/**", "**/generated/**"],
          environment: "node",
        },
      },
      {
        test: {
          name: "ui",
          root: "./packages/ui",
          include: ["src/**/*.test.tsx"],
          environment: "jsdom",
          globals: true,
        },
        esbuild: { jsx: "automatic" },
      },
    ],
  },
});
