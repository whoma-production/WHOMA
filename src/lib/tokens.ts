export const designTokens = {
  color: {
    brandInk: "#1C1C3A",
    brandAccent: "#02A79C",
    surface0: "#FFFFFF",
    surface1: "#F7F7FA",
    surface2: "#EFEFF4",
    surfaceInverse: "#16162E",
    line: "#D8D9E2",
    textStrong: "#191A27",
    textBase: "#2C2D3E",
    textMuted: "#666A7A",
    textInverse: "#F7F8FD",
    success: "#197B4C",
    warning: "#A06A00",
    danger: "#A12828"
  },
  radius: {
    sm: 8,
    md: 12,
    lg: 16,
    xl: 20
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
    16: 64
  },
  shadow: {
    soft: "0 1px 3px rgba(17, 24, 39, 0.06), 0 8px 24px rgba(17, 24, 39, 0.04)",
    lift: "0 2px 10px rgba(17, 24, 39, 0.08), 0 20px 40px rgba(17, 24, 39, 0.07)"
  },
  typeScale: {
    h1: { sizeRem: 2.25, lineHeight: 1.1, weight: 600 },
    h2: { sizeRem: 1.75, lineHeight: 1.15, weight: 600 },
    h3: { sizeRem: 1.25, lineHeight: 1.2, weight: 600 },
    body: { sizeRem: 1, lineHeight: 1.5, weight: 400 },
    small: { sizeRem: 0.875, lineHeight: 1.4, weight: 400 },
    caption: { sizeRem: 0.75, lineHeight: 1.3, weight: 500 }
  }
} as const;
