import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          ink: "var(--color-brand-ink)",
          accent: "var(--color-brand-accent)"
        },
        surface: {
          0: "var(--color-surface-0)",
          1: "var(--color-surface-1)",
          2: "var(--color-surface-2)",
          inverse: "var(--color-surface-inverse)"
        },
        line: "var(--color-line)",
        text: {
          strong: "var(--color-text-strong)",
          base: "var(--color-text-base)",
          muted: "var(--color-text-muted)",
          inverse: "var(--color-text-inverse)"
        },
        state: {
          success: "var(--color-success)",
          warning: "var(--color-warning)",
          danger: "var(--color-danger)"
        }
      },
      borderRadius: {
        sm: "var(--radius-sm)",
        md: "var(--radius-md)",
        lg: "var(--radius-lg)",
        xl: "var(--radius-xl)"
      },
      boxShadow: {
        soft: "var(--shadow-soft)",
        lift: "var(--shadow-lift)"
      },
      spacing: {
        18: "4.5rem",
        22: "5.5rem"
      },
      fontFamily: {
        sans: ["var(--font-ui)", "system-ui", "sans-serif"]
      }
    }
  },
  plugins: []
};

export default config;
