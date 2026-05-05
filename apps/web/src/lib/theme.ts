// ─── Tenant Theme ──────────────────────────────────────────────────────────────
//
// Utilitários para aplicar o branding de cor de cada clínica como CSS variables
// no document.documentElement. Todos os componentes usam var(--color-*) e
// herdam automaticamente sem necessidade de refatoração.
//
// Variáveis injetadas:
//   --color-primary          cor principal (botões, links, ativo)
//   --color-primary-text     branco ou preto com contraste adequado sobre primary
//   --color-secondary        cor secundária (badges, destaques)
//   --color-secondary-text   contraste sobre secondary
//   --color-sidebar          fundo da sidebar
//   --color-sidebar-text     contraste sobre sidebar
// ─────────────────────────────────────────────────────────────────────────────

// ─── Defaults ─────────────────────────────────────────────────────────────────

export const DEFAULT_PRIMARY   = '#06b6d4'   // cyan-500
export const DEFAULT_SECONDARY = '#0891b2'   // cyan-600
export const DEFAULT_SIDEBAR   = '#ffffff'   // branco

// ─── contrastText ─────────────────────────────────────────────────────────────
//
// Dado um hex (#RRGGBB), retorna '#ffffff' ou '#1a1a1a' para garantir
// contraste legível (WCAG relativo à luminância percebida).
//
export function contrastText(hex: string): string {
  const clean = hex.replace('#', '')
  const r = parseInt(clean.slice(0, 2), 16)
  const g = parseInt(clean.slice(2, 4), 16)
  const b = parseInt(clean.slice(4, 6), 16)
  // Fórmula de luminância percebida (BT.601)
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255
  return luminance > 0.55 ? '#1a1a1a' : '#ffffff'
}

// ─── applyTenantTheme ─────────────────────────────────────────────────────────
//
// Recebe as cores vindas da API (podem ser null → usa defaults) e injeta
// como CSS variables no :root. Idempotente: pode ser chamado múltiplas vezes.
//
export function applyTenantTheme(colors: {
  colorPrimary?:   string | null
  colorSecondary?: string | null
  colorSidebar?:   string | null
}) {
  const root = document.documentElement

  const primary   = colors.colorPrimary   ?? DEFAULT_PRIMARY
  const secondary = colors.colorSecondary ?? DEFAULT_SECONDARY
  const sidebar   = colors.colorSidebar   ?? DEFAULT_SIDEBAR

  root.style.setProperty('--color-primary',        primary)
  root.style.setProperty('--color-primary-text',   contrastText(primary))
  root.style.setProperty('--color-secondary',      secondary)
  root.style.setProperty('--color-secondary-text', contrastText(secondary))
  root.style.setProperty('--color-sidebar',        sidebar)
  root.style.setProperty('--color-sidebar-text',   contrastText(sidebar))
}

// ─── resetTenantTheme ─────────────────────────────────────────────────────────
//
// Remove overrides e volta para os defaults (usado ao sair da área da clínica).
//
export function resetTenantTheme() {
  applyTenantTheme({})
}
