import config from "@optic/eslint-config/next";

export default [
  ...config,
  { ignores: [".next/**", "next-env.d.ts", "public/**"] },
];
