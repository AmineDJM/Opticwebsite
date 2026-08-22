import forms from "@tailwindcss/forms";
import typography from "@tailwindcss/typography";

/**
 * Shared Tailwind preset. Every utility colour maps to a CSS custom property that the
 * running app injects per request from the active theme (see @optic/config
 * `themeToCssVariables`). This is what lets one design system render N brands with no
 * rebuild. `<alpha-value>` keeps Tailwind's opacity modifiers working against the
 * variables (the variables are stored as `R G B`-friendly hex, resolved via color-mix
 * fallback in globals.css).
 */

/** @type {import('tailwindcss').Config} */
const preset = {
  darkMode: ["class", '[data-theme="dark"]'],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: "var(--color-primary)",
          foreground: "var(--color-primary-foreground)",
        },
        secondary: {
          DEFAULT: "var(--color-secondary)",
          foreground: "var(--color-secondary-foreground)",
        },
        accent: {
          DEFAULT: "var(--color-accent)",
          foreground: "var(--color-accent-foreground)",
        },
        background: "var(--color-background)",
        foreground: "var(--color-foreground)",
        surface: {
          DEFAULT: "var(--color-surface)",
          foreground: "var(--color-surface-foreground)",
        },
        muted: {
          DEFAULT: "var(--color-muted)",
          foreground: "var(--color-muted-foreground)",
        },
        border: "var(--color-border)",
        success: "var(--color-success)",
        warning: "var(--color-warning)",
        error: "var(--color-error)",
      },
      fontFamily: {
        heading: "var(--font-heading, ui-sans-serif, system-ui, sans-serif)",
        body: "var(--font-body, ui-sans-serif, system-ui, sans-serif)",
        sans: "var(--font-body, ui-sans-serif, system-ui, sans-serif)",
      },
      borderRadius: {
        sm: "var(--radius-sm, 4px)",
        DEFAULT: "var(--radius, 8px)",
        md: "var(--radius, 8px)",
        lg: "var(--radius-lg, 12px)",
      },
      maxWidth: {
        container: "var(--container-width, 1280px)",
      },
      spacing: {
        "density-gap": "var(--density-gap, 1rem)",
        "density-padding": "var(--density-padding, 1.25rem)",
      },
      keyframes: {
        "fade-in": { from: { opacity: "0" }, to: { opacity: "1" } },
        "slide-up": {
          from: { opacity: "0", transform: "translateY(8px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        shimmer: {
          "100%": { transform: "translateX(100%)" },
        },
      },
      animation: {
        "fade-in": "fade-in 0.2s ease-out",
        "slide-up": "slide-up 0.25s ease-out",
      },
    },
  },
  plugins: [forms({ strategy: "class" }), typography],
};

export default preset;
