import type { Config } from "tailwindcss";

export default {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: "#0E0E10",
        s1: "#141418",
        s2: "#1A1A20",
        s3: "#212129",
        line: "rgba(255,255,255,0.09)",
        line2: "rgba(255,255,255,0.16)",
        ink: "#ECECEF",
        tx2: "rgba(236,236,239,0.66)",
        tx3: "rgba(236,236,239,0.42)",
        crimson: {
          DEFAULT: "#B85450",
          2: "#CA6E6A",
          deep: "#6E2C2A",
        },
      },
      fontFamily: {
        serif: ["var(--font-serif)", "Georgia", "serif"],
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "ui-monospace", "monospace"],
      },
      maxWidth: {
        shell: "1320px",
        prose: "64ch",
      },
    },
  },
  plugins: [],
} satisfies Config;
