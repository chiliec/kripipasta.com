import type { Config } from "tailwindcss";

export default {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        surface: {
          DEFAULT: "#141418",
          raised: "#17171d",
          card: "#1c1c24",
          muted: "#191920",
          deep: "#151519",
        },
        accent: {
          DEFAULT: "#B85450",
          bright: "#CA6E6A",
          soft: "#E29A96",
          dim: "#A85C57",
          deep: "#6E2C2A",
        },
        ink: "#ECECEF",
      },
      fontFamily: {
        serif: ["var(--font-serif)", "Georgia", "serif"],
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "ui-monospace", "monospace"],
      },
    },
  },
  plugins: [],
} satisfies Config;
