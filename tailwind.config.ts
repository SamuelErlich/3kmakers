import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        base: {
          bg: "#0a0e17",
          surface: "#10151f",
          surface2: "#161c29",
          border: "#232b3a",
          text: "#e8eaf0",
          muted: "#8b93a7",
          faint: "#5a6272",
        },
        accent: {
          from: "#4f6df5",
          to: "#8b5cf6",
          DEFAULT: "#5b6ef5",
          hover: "#6f80ff",
        },
        good: "#22c55e",
        warn: "#f59e0b",
        bad: "#ef4444",
      },
      fontFamily: {
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
      },
      backgroundImage: {
        "accent-gradient": "linear-gradient(90deg, #4f6df5 0%, #8b5cf6 100%)",
      },
    },
  },
  plugins: [],
};
export default config;
