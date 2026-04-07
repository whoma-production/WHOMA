export const designTokens = {
  color: {
    brandInk: "#181917",
    brandAccent: "#2D6660",
    brandBrass: "#9A7C49",
    surface0: "#FFFFFF",
    surface1: "#F5F5F3",
    surface2: "#ECECEB",
    surfaceInverse: "#20211F",
    line: "#D8D7D3",
    textStrong: "#181917",
    textBase: "#2F302D",
    textMuted: "#70706C",
    textInverse: "#F8F8F6",
    success: "#2F6C45",
    warning: "#9B6F2F",
    danger: "#9C4136"
  },
  radius: {
    sm: 6,
    md: 12,
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
    soft: "0 1px 2px rgba(18, 19, 17, 0.05)",
    lift: "0 10px 28px rgba(18, 19, 17, 0.1)"
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
