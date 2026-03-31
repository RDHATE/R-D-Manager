import { useTheme } from "@/components/theme-provider"

/**
 * Returns a theme-aware color palette.
 * Replace every `const dark = { ... }` in client components with:
 *   const dark = useThemeColors()
 */
export function useThemeColors() {
  const { theme } = useTheme()
  const isDark = theme === "dark"

  return {
    isDark,
    // ── Backgrounds ───────────────────────────────────────────────────
    bg:      isDark ? "#060d1a"                  : "#f8fafc",
    card:    isDark ? "rgba(255,255,255,0.04)"   : "#ffffff",
    panel:   isDark ? "#0a1628"                  : "#f1f5f9",
    surface: isDark ? "#111827"                  : "#f1f5f9",
    hover:   isDark ? "rgba(255,255,255,0.06)"   : "rgba(0,0,0,0.04)",
    input:   isDark ? "rgba(255,255,255,0.05)"   : "#f8fafc",
    inputDisabled: isDark ? "rgba(255,255,255,0.02)" : "#f1f5f9",
    // ── Borders ───────────────────────────────────────────────────────
    border:  isDark ? "rgba(255,255,255,0.08)"   : "#e2e8f0",
    // ── Text ──────────────────────────────────────────────────────────
    text:    isDark ? "#e2e8f0"                  : "#0f172a",
    text2:   isDark ? "#cbd5e1"                  : "#1e293b",
    sub:     isDark ? "#94a3b8"                  : "#64748b",
    muted:   isDark ? "#64748b"                  : "#94a3b8",
    // ── Accent (primary brand color) ─────────────────────────────────
    accent:       isDark ? "#22d3ee"                       : "#0369a1",
    accentBg:     isDark ? "rgba(6,182,212,0.08)"          : "rgba(3,105,161,0.08)",
    accentBorder: isDark ? "rgba(6,182,212,0.2)"           : "rgba(3,105,161,0.2)",
    accentText:   isDark ? "#06b6d4"                       : "#0369a1",
    // ── Card border box-shadow ────────────────────────────────────────
    shadow: isDark ? "none" : "0 1px 4px rgba(0,0,0,0.07)",
  }
}
