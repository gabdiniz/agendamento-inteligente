import { Outlet, Link, useNavigate, useLocation } from '@tanstack/react-router'
import { useSuperAdminAuthStore } from '@/stores/super-admin-auth.store'
import { superAdminApi } from '@/lib/api/super-admin.api'
import { saTokens } from '@/lib/api/super-admin-client'

const navItems = [
  {
    label: 'Clínicas',
    path: '/super-admin/tenants',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
          d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-2 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
      </svg>
    ),
  },
]

export function SuperAdminLayout() {
  const { admin, clearAdmin } = useSuperAdminAuthStore()
  const navigate = useNavigate()
  const location = useLocation()

  async function handleLogout() {
    try {
      const refreshToken = saTokens.getRefresh()
      if (refreshToken) await superAdminApi.logout(refreshToken)
    } catch {
      // logout mesmo se a API falhar
    } finally {
      clearAdmin()
      void navigate({ to: '/super-admin/login' })
    }
  }

  return (
    <div className="flex h-screen overflow-hidden">
      {/* ── Sidebar ─────────────────────────────────────────── */}
      <aside
        className="flex flex-col w-64 shrink-0"
        style={{ background: 'var(--admin-color-sidebar-bg)', color: 'var(--admin-color-sidebar-text)' }}
      >
        {/* Logo */}
        <div
          className="flex items-center gap-3 px-6 h-16 border-b shrink-0"
          style={{ borderColor: 'var(--admin-800)' }}
        >
          <div
            className="w-8 h-8 rounded-[--radius-md] flex items-center justify-center text-white font-bold text-sm"
            style={{ background: 'var(--admin-color-primary)' }}
          >
            SA
          </div>
          <div>
            <p className="text-sm font-semibold" style={{ color: 'var(--admin-color-sidebar-text)' }}>
              MyAgendix
            </p>
            <p className="text-xs" style={{ color: 'var(--admin-color-sidebar-muted)' }}>
              Super Admin
            </p>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-1">
          {navItems.map((item) => {
            const active = location.pathname.startsWith(item.path)
            return (
              <Link
                key={item.path}
                to={item.path}
                className="flex items-center gap-3 px-3 py-2.5 rounded-[--radius-md] text-sm font-medium transition-colors"
                style={{
                  background: active ? 'var(--admin-color-sidebar-active)' : 'transparent',
                  color: active ? '#ffffff' : 'var(--admin-color-sidebar-text)',
                }}
                onMouseEnter={(e) => {
                  if (!active) (e.currentTarget as HTMLElement).style.background = 'var(--admin-color-sidebar-hover)'
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

        {/* Footer — usuário logado */}
        <div
          className="px-4 py-4 border-t shrink-0"
          style={{ borderColor: 'var(--admin-800)' }}
        >
          <div className="flex items-center gap-3 mb-3">
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold"
              style={{ background: 'var(--admin-color-primary)', color: '#fff' }}
            >
              {admin?.name?.charAt(0).toUpperCase() ?? 'A'}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium truncate" style={{ color: 'var(--admin-color-sidebar-text)' }}>
                {admin?.name ?? 'Super Admin'}
              </p>
              <p className="text-xs truncate" style={{ color: 'var(--admin-color-sidebar-muted)' }}>
                {admin?.email ?? ''}
              </p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-[--radius-md] text-sm transition-colors"
            style={{ color: 'var(--admin-color-sidebar-muted)' }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.background = 'var(--admin-color-sidebar-hover)'
              ;(e.currentTarget as HTMLElement).style.color = 'white'
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.background = 'transparent'
              ;(e.currentTarget as HTMLElement).style.color = 'var(--admin-color-sidebar-muted)'
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

      {/* ── Conteúdo principal ───────────────────────────────── */}
      <main className="flex-1 overflow-auto" style={{ background: 'var(--color-bg-subtle)' }}>
        <Outlet />
      </main>
    </div>
  )
}
