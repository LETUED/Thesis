import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        border: "hsl(var(--border))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        "surface-1": "hsl(var(--surface-1))",
        "surface-2": "hsl(var(--surface-2))",
        "on-emphasis": "hsl(var(--on-emphasis))",
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        // 레짐 토큰: 리스크온=emerald, 중립=slate, 리스크오프=amber, 강경계=rose
        "regime-on": {
          DEFAULT: "hsl(var(--regime-on))",
          muted: "hsl(var(--regime-on-muted))",
        },
        "regime-neutral": "hsl(var(--regime-neutral))",
        "regime-off": {
          DEFAULT: "hsl(var(--regime-off))",
          muted: "hsl(var(--regime-off-muted))",
          strong: "hsl(var(--regime-off-strong))",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      transitionDuration: {
        micro: "var(--dur-micro)",
        base: "var(--dur-base)",
      },
    },
  },
  plugins: [],
};

export default config;
