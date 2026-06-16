import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        navy: {
          DEFAULT: "#0A0F1E",
          2: "#111827",
          3: "#1A2235",
        },
        cyan: {
          pulse: "#00E5CC",
          dim: "#00B8A4",
        },
        pulse: {
          white: "#F0F4FF",
          muted: "#8892A4",
          border: "rgba(255,255,255,0.08)",
          card: "rgba(255,255,255,0.04)",
          success: "#4ADE80",
          danger: "#F87171",
        },
      },
      fontFamily: {
        display: ["Space Grotesk", "sans-serif"],
        body: ["Inter", "sans-serif"],
        mono: ["JetBrains Mono", "monospace"],
      },
      borderColor: {
        DEFAULT: "rgba(255,255,255,0.08)",
      },
      backgroundImage: {
        "pulse-glow":
          "radial-gradient(circle, rgba(0,229,204,0.08) 0%, transparent 70%)",
        "card-gradient":
          "linear-gradient(135deg, rgba(255,255,255,0.04), rgba(255,255,255,0.01))",
      },
      animation: {
        "pulse-dot": "pulse-dot 2s infinite",
        "fade-up": "fade-up 0.6s ease forwards",
        "bar-fill": "bar-fill 1s ease forwards",
      },
      keyframes: {
        "pulse-dot": {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.3" },
        },
        "fade-up": {
          "0%": { opacity: "0", transform: "translateY(16px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "bar-fill": {
          "0%": { width: "0%" },
          "100%": { width: "var(--bar-width)" },
        },
      },
    },
  },
  plugins: [],
};

export default config;
