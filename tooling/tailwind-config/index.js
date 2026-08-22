import preset from "./preset.js";

/**
 * Build a Tailwind config for an app. Point `content` at the app plus the shared UI
 * package sources so utility classes used inside @optic/ui are not purged.
 */
export function createTailwindConfig({ content = [] } = {}) {
  return {
    presets: [preset],
    content: [
      "./src/**/*.{ts,tsx,mdx}",
      "../../packages/ui/src/**/*.{ts,tsx}",
      ...content,
    ],
  };
}

export { preset };
export default createTailwindConfig;
