import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        surface: "var(--color-surface)",
        "surface-warm": "var(--color-surface-warm)",
        "surface-cool": "var(--color-surface-cool)",
        "surface-elevated": "var(--color-surface-elevated)",
        "surface-tint": "var(--color-surface-tint)",
        border: "var(--color-border)",
        "border-warm": "var(--color-border-warm)",
        "border-cool": "var(--color-border-cool)",
        muted: "var(--color-muted)",
        primary: "var(--color-primary)",
        accent: "var(--color-accent)",
        "accent-soft": "var(--color-accent-soft)",
        "accent-teal": "var(--color-accent-teal)",
        "accent-violet": "var(--color-accent-violet)",
      },
      fontFamily: {
        sans: ["var(--font-sans)", "Noto Sans SC", "system-ui", "sans-serif"],
        serif: ["var(--font-serif)", "Noto Serif SC", "serif"],
      },
      fontWeight: {
        normal: "400",
        medium: "500",
        semibold: "600",
        bold: "700",
      },
      backgroundImage: {
        "gradient-accent": "linear-gradient(135deg, var(--color-accent) 0%, var(--color-accent-teal) 100%)",
        "gradient-hero": "var(--gradient-hero)",
      },
      boxShadow: {
        glow: "var(--glow-amber)",
        "glow-teal": "var(--glow-teal)",
      },
      transitionDuration: { 200: "200ms", 300: "300ms" },
      transitionProperty: { smooth: "transform, opacity, box-shadow, border-color" },
    },
  },
  plugins: [],
};

export default config;
