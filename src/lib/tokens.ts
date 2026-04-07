export const designTokens = {
  color: {
    brandInk: "#191713",
    brandAccent: "#1F5C58",
    brandBrass: "#A8844A",
    surface0: "#FFFFFF",
    surface1: "#FFFFFF",
    surface2: "#F6F7F9",
    surfaceInverse: "#211D18",
    line: "#D9D0C2",
    textStrong: "#191713",
    textBase: "#2B2722",
    textMuted: "#6B655D",
    textInverse: "#FFFFFF",
    success: "#2B6B46",
    warning: "#996B2C",
    danger: "#9F3C31"
  },
  radius: {
    sm: 6,
    md: 10,
    lg: 14,
    xl: 18
  },
  spacing: {
    1: 4,
    2: 8,
    3: 12,
    4: 16,
    5: 20,
    6: 24,
    8: 32,
    10: 40,
    12: 48,
    16: 64,
    20: 80,
    24: 96,
    28: 112
  },
  shadow: {
    soft: "0 1px 2px rgba(25, 23, 19, 0.05), 0 8px 20px rgba(25, 23, 19, 0.04)",
    lift: "0 2px 6px rgba(25, 23, 19, 0.06), 0 18px 34px rgba(25, 23, 19, 0.05)"
  },
  typeScale: {
    display: { sizeRem: 3.5, lineHeight: 0.98, weight: 500 },
    h1: { sizeRem: 2.75, lineHeight: 1.02, weight: 500 },
    h2: { sizeRem: 2, lineHeight: 1.08, weight: 500 },
    h3: { sizeRem: 1.3, lineHeight: 1.15, weight: 600 },
    body: { sizeRem: 1, lineHeight: 1.65, weight: 400 },
    small: { sizeRem: 0.875, lineHeight: 1.55, weight: 400 },
    caption: { sizeRem: 0.75, lineHeight: 1.35, weight: 600 }
  }
} as const;
