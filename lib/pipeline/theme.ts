/**
 * Pipeline dashboard design tokens.
 * Fonts are loaded via IBM Plex Sans/Mono in app/(pipeline)/layout.tsx,
 * which sets --pipeline-font and --pipeline-mono CSS variables.
 */
export const T = {
  bg: "#0A0C10",
  surface: "#12151C",
  surfaceHover: "#181C26",
  card: "#161A24",
  cardBorder: "#1E2330",
  accent: "#3B82F6",
  accentSoft: "rgba(59,130,246,0.12)",
  accentGlow: "rgba(59,130,246,0.25)",
  green: "#10B981",
  greenSoft: "rgba(16,185,129,0.12)",
  amber: "#F59E0B",
  amberSoft: "rgba(245,158,11,0.12)",
  red: "#EF4444",
  redSoft: "rgba(239,68,68,0.12)",
  purple: "#8B5CF6",
  purpleSoft: "rgba(139,92,246,0.12)",
  text: "#E2E8F0",
  textMuted: "#94A3B8",
  textDim: "#64748B",
  border: "#1E293B",
  focus: "rgba(59,130,246,0.35)",
  font: "var(--pipeline-font), -apple-system, sans-serif",
  mono: "var(--pipeline-mono), 'Menlo', monospace",
} as const;
