/**
 * CalSnap design system — extracted from the reference screenshots.
 * Warm cream canvas, white cards with large radii and soft shadows,
 * salmon-orange accent, charcoal dark elements, lime scanner accents.
 *
 * Token structure is dark-mode ready: `light` ships now, a `dark`
 * palette can drop into `palettes` later without touching screens.
 */

const light = {
  // Core
  ink: "#191B18",
  muted: "#7E817A",
  faint: "#ADAFA8",
  canvas: "#F3F0EA",
  surface: "#FFFFFF",
  line: "#ECE8E1",
  dark: "#1E1F1D",

  // Accent (salmon-orange)
  peach: "#F2965B",
  peachSoft: "#FBEADD",
  arcTrack: "#E9E5DC",

  // Nutrition
  green: "#55A63F",
  greenDark: "#39662C",
  greenSoft: "#EAF3DF",
  lime: "#B6EC4F",
  yellow: "#F5A731",
  red: "#E4502E",
  blue: "#5CA8DC",
};

export const palettes = {
  light,
  // Dark palette placeholder — mirror of `light`, tuned values TBD.
  dark: { ...light },
};

export const colors = palettes.light;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
};

export const type = {
  display: { fontSize: 34, fontWeight: "800" as const, letterSpacing: -0.8, color: colors.ink },
  title1: { fontSize: 30, fontWeight: "800" as const, letterSpacing: -0.7, color: colors.ink },
  title2: { fontSize: 22, fontWeight: "800" as const, letterSpacing: -0.4, color: colors.ink },
  title3: { fontSize: 18, fontWeight: "800" as const, letterSpacing: -0.3, color: colors.ink },
  body: { fontSize: 15, fontWeight: "500" as const, color: colors.ink },
  footnote: { fontSize: 13, fontWeight: "500" as const, color: colors.muted },
  caption: { fontSize: 11, fontWeight: "600" as const, color: colors.muted },
};

export const shadows = {
  /** Standard card elevation */
  card: {
    shadowColor: "#3A352C",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.07,
    shadowRadius: 18,
    elevation: 3,
  },
  /** Floating chips / prominent surfaces */
  floating: {
    shadowColor: "#3A352C",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.12,
    shadowRadius: 24,
    elevation: 6,
  },
  /** Barely-there lift for small controls */
  subtle: {
    shadowColor: "#3A352C",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
};

/** Back-compat alias — existing screens spread `...shadow`. */
export const shadow = shadows.card;

export const radius = { sm: 14, md: 22, lg: 30, xl: 36, pill: 999 };
