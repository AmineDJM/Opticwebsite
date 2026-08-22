import { baseConfig } from "@optic/eslint-config/base";

export default [
  ...baseConfig,
  {
    ignores: [
      "apps/**",
      "packages/**",
      "e2e/**",
      "tooling/**",
      "**/node_modules/**",
      "**/.next/**",
      "**/dist/**",
    ],
  },
];
