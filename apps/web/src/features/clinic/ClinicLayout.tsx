// ─── ClinicLayout ─────────────────────────────────────────────────────────────
//
// Layout principal do painel da clínica.
// Sidebar azul (tema --color-primary) com navegação por contexto de papel.
// ─────────────────────────────────────────────────────────────────────────────

import { Outlet, Link, useNavigate, useLocation, useParams } from '@tanstack/react-router'
import { useAuthStore } from '@/stores/auth.store'
import { clinicAuthApi } from '@/lib/api/clinic.api'
import { clinicTokens } from '@/lib/api/client'

const navItems = [
  {
    label: 'Dashboard',
    path: 'dashboard',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
          d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
      </svg>
    ),
  },
  {
    label: 'Profissionais',
    path: 'professionals',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
          d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
  },
  {
    label: 'Pacientes',
    path: 'patients',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
          d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
      </svg>
    ),
  },
]

export function ClinicLayout() {
  const { user, clearUser } = useAuthStore()
  const navigate = useNavigate()
  const location = useLocation()
  const params = useParams({ strict: false }) as { slug?: string }
  const slug = params.slug ?? clinicTokens.getSlug() ?? ''

  async function handleLogout() {
    try {
      const refreshToken = clinicTokens.getRefresh()
      if (refreshToken) await clinicAuthApi.logout(refreshToken)
    } catch {
      // logout mesmo se falhar
    } finally {
      clearUser()
      void navigate({ to: '/app/$slug/login', params: { slug } })
    }
  }

  const initials = user?.name
    ?.split(' ')
    .slice(0, 2)
    .map((n) => n[0])
    .join('')
    .toUpperCase() ?? 'U'

  return (
    <div className="flex h-screen overflow-hidden">
      {/* ── Sidebar ─────────────────────────────────────────── */}
      <aside
        className="flex flex-col w-64 shrink-0"
        style={{
          background: 'var(--color-primary)',
          color: 'var(--color-text-inverse)',
        }}
      >
        {/* Logo */}
        <div
          className="flex items-center gap-3 px-6 h-16 shrink-0"
          style={{ borderBottom: '1px solid rgba(255,255,255,0.15)' }}
        >
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm"
            style={{ background: 'rgba(255,255,255,0.2)', color: '#fff' }}
          >
            M
          </div>
          <div>
            <p className="text-sm font-semibold text-white">MyAgendix</p>
            <p className="text-xs" style={{ color: 'rgba(255,255,255,0.7)' }}>
              {slug}
            </p>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-1">
          {navItems.map((item) => {
            const fullPath = `/app/${slug}/${item.path}`
            const active = location.pathname.startsWith(fullPath)
            return (
              <Link
                key={item.path}
                to="/app/$slug/$section"
                params={{ slug, section: item.path }}
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors"
                style={{
                  background: active ? 'rgba(255,255,255,0.2)' : 'transparent',
                  color: '#ffffff',
                }}
                onMouseEnter={(e) => {
                  if (!active) (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.12)'
                }}
                onMouseLeave={(e) => {
                  if (!active) (e.currentTarget as HTMLElement).style.background = 'transparent'
                }}
              >
                {item.icon}
                {item.label}
              </Link>
            )
          })}
        </nav>

        {/* Footer — usuário */}
        <div
          className="px-4 py-4 shrink-0"
          style={{ borderTop: '1px solid rgba(255,255,255,0.15)' }}
        >
          <div className="flex items-center gap-3 mb-3">
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
              style={{ background: 'rgba(255,255,255,0.25)', color: '#fff' }}
            >
              {initials}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-white truncate">{user?.name ?? 'Usuário'}</p>
              <p className="text-xs truncate" style={{ color: 'rgba(255,255,255,0.65)' }}>
                {user?.roles?.[0] ?? ''}
              </p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors"
            style={{ color: 'rgba(255,255,255,0.7)' }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.12)'
              ;(e.currentTarget as HTMLElement).style.color = 'white'
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.background = 'transparent'
              ;(e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.7)'
            }}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            Sair
          </button>
        </div>
      </aside>

      {/* ── Conteúdo ─────────────────────────────────────────── */}
      <main className="flex-1 overflow-auto" style={{ background: 'var(--color-bg-subtle)' }}>
        <Outlet />
      </main>
    </div>
  )
}
