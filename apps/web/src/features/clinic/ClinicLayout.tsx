// ─── ClinicLayout ─────────────────────────────────────────────────────────────
//
// Layout do painel da clínica.
// Redesign: sidebar branca com borda, navegação refinada, avatar com iniciais.
// ─────────────────────────────────────────────────────────────────────────────

import React from 'react'
import { Outlet, Link, useNavigate, useLocation, useParams } from '@tanstack/react-router'
import { useAuthStore } from '@/stores/auth.store'
import { clinicAuthApi } from '@/lib/api/clinic.api'
import { clinicTokens } from '@/lib/api/client'

const navItems = [
  {
    label: 'Dashboard',
    path: 'dashboard',
    icon: (
      <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
          d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
      </svg>
    ),
  },
  {
    label: 'Agendamentos',
    path: 'appointments',
    icon: (
      <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
          d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
    ),
  },
  {
    label: 'Profissionais',
    path: 'professionals',
    icon: (
      <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
          d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
  },
  {
    label: 'Pacientes',
    path: 'patients',
    icon: (
      <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
  const [userMenuOpen, setUserMenuOpen] = React.useState(false)

  async function handleLogout() {
    try {
      const refreshToken = clinicTokens.getRefresh()
      if (refreshToken) await clinicAuthApi.logout(refreshToken)
    } catch {
      // logout mesmo se a chamada falhar
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
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', fontFamily: 'var(--font-sans)' }}>

      {/* ── Sidebar ─────────────────────────────────────────────────────── */}
      <aside style={{
        width: '232px',
        flexShrink: 0,
        display: 'flex',
        flexDirection: 'column',
        background: '#ffffff',
        borderRight: '1px solid #eaecef',
        boxShadow: '2px 0 8px rgba(0,0,0,0.03)',
      }}>

        {/* Logo */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          padding: '0 20px',
          height: '60px',
          flexShrink: 0,
          borderBottom: '1px solid #f0f2f5',
        }}>
          <div style={{
            width: '32px', height: '32px',
            borderRadius: '10px',
            background: 'var(--color-primary)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '14px',
            fontWeight: 700,
            color: '#fff',
            flexShrink: 0,
            boxShadow: '0 4px 10px color-mix(in srgb, var(--color-primary) 35%, transparent)',
          }}>
            M
          </div>
          <div style={{ minWidth: 0 }}>
            <p style={{ fontSize: '13px', fontWeight: 700, color: '#1a2530', margin: 0, letterSpacing: '-0.01em' }}>
              MyAgendix
            </p>
            <p style={{ fontSize: '11px', color: '#8a99a6', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              /{slug}
            </p>
          </div>
        </div>

        {/* Nav label */}
        <div style={{ padding: '20px 20px 8px' }}>
          <p style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#b0bbc6', margin: 0 }}>
            Menu
          </p>
        </div>

        {/* Nav items */}
        <nav style={{ flex: 1, padding: '0 12px', display: 'flex', flexDirection: 'column', gap: '2px' }}>
          {navItems.map((item) => {
            const fullPath = `/app/${slug}/${item.path}`
            const active = location.pathname === fullPath || location.pathname.startsWith(fullPath + '/')
            return (
              <Link
                key={item.path}
                to="/app/$slug/$section"
                params={{ slug, section: item.path }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  padding: '9px 12px',
                  borderRadius: '10px',
                  fontSize: '13.5px',
                  fontWeight: active ? 600 : 500,
                  color: active ? 'var(--color-primary)' : '#4a5568',
                  background: active ? 'color-mix(in srgb, var(--color-primary) 10%, white)' : 'transparent',
                  textDecoration: 'none',
                  transition: 'all 0.15s ease',
                  position: 'relative',
                }}
                onMouseEnter={(e) => {
                  if (!active) {
                    (e.currentTarget as HTMLElement).style.background = '#f5f7fa'
                    ;(e.currentTarget as HTMLElement).style.color = '#2d3748'
                  }
                }}
                onMouseLeave={(e) => {
                  if (!active) {
                    (e.currentTarget as HTMLElement).style.background = 'transparent'
                    ;(e.currentTarget as HTMLElement).style.color = '#4a5568'
                  }
                }}
              >
                {/* Indicador ativo */}
                {active && (
                  <span style={{
                    position: 'absolute',
                    left: 0,
                    top: '6px',
                    bottom: '6px',
                    width: '3px',
                    borderRadius: '0 3px 3px 0',
                    background: 'var(--color-primary)',
                  }} />
                )}
                <span style={{ color: active ? 'var(--color-primary)' : 'inherit', display: 'flex' }}>
                  {item.icon}
                </span>
                {item.label}
              </Link>
            )
          })}
        </nav>

        {/* Footer — usuário com dropdown */}
        <div style={{ padding: '16px', borderTop: '1px solid #f0f2f5', flexShrink: 0, position: 'relative' }}>

          {/* Dropdown menu */}
          {userMenuOpen && (
            <>
              {/* overlay invisível para fechar */}
              <div
                style={{ position: 'fixed', inset: 0, zIndex: 40 }}
                onClick={() => setUserMenuOpen(false)}
              />
              <div style={{
                position: 'absolute', bottom: '100%', left: '12px', right: '12px',
                background: '#fff', borderRadius: '12px',
                border: '1px solid #eaecef',
                boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
                zIndex: 50, marginBottom: '6px',
                overflow: 'hidden',
                animation: 'fadeUp 0.15s ease',
              }}>
                {[
                  {
                    label: 'Ver Perfil',
                    icon: <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>,
                    onClick: () => { setUserMenuOpen(false); void navigate({ to: '/app/$slug/profile', params: { slug } }) },
                  },
                  {
                    label: 'Alterar Senha',
                    icon: <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" /></svg>,
                    onClick: () => { setUserMenuOpen(false); void navigate({ to: '/app/$slug/change-password', params: { slug } }) },
                  },
                ].map((item) => (
                  <button
                    key={item.label}
                    onClick={item.onClick}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '10px',
                      width: '100%', padding: '11px 14px',
                      background: 'transparent', border: 'none',
                      cursor: 'pointer', fontSize: '13px', fontWeight: 500,
                      color: '#374151', fontFamily: 'var(--font-sans)',
                      textAlign: 'left',
                    }}
                    onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = '#f8fafc' }}
                    onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'transparent' }}
                  >
                    <span style={{ color: '#94a3b8' }}>{item.icon}</span>
                    {item.label}
                  </button>
                ))}
                <div style={{ borderTop: '1px solid #f0f2f5' }} />
                <button
                  onClick={() => { setUserMenuOpen(false); void handleLogout() }}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '10px',
                    width: '100%', padding: '11px 14px',
                    background: 'transparent', border: 'none',
                    cursor: 'pointer', fontSize: '13px', fontWeight: 500,
                    color: '#e53e3e', fontFamily: 'var(--font-sans)',
                    textAlign: 'left',
                  }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = '#fff1f2' }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'transparent' }}
                >
                  <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                  Sair da conta
                </button>
              </div>
            </>
          )}

          {/* Botão do usuário */}
          <button
            onClick={() => setUserMenuOpen((o) => !o)}
            style={{
              width: '100%', display: 'flex', alignItems: 'center', gap: '10px',
              padding: '10px', borderRadius: '10px',
              background: userMenuOpen ? 'color-mix(in srgb, var(--color-primary) 8%, white)' : '#f8fafc',
              border: `1px solid ${userMenuOpen ? 'color-mix(in srgb, var(--color-primary) 25%, transparent)' : '#eaecef'}`,
              cursor: 'pointer', fontFamily: 'var(--font-sans)',
              transition: 'all 0.15s ease',
            }}
            onMouseEnter={(e) => {
              if (!userMenuOpen) (e.currentTarget as HTMLElement).style.background = '#f1f5f9'
            }}
            onMouseLeave={(e) => {
              if (!userMenuOpen) (e.currentTarget as HTMLElement).style.background = '#f8fafc'
            }}
          >
            <div style={{
              width: '32px', height: '32px', borderRadius: '50%', flexShrink: 0,
              background: 'color-mix(in srgb, var(--color-primary) 15%, white)',
              color: 'var(--color-primary)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '12px', fontWeight: 700,
            }}>
              {initials}
            </div>
            <div style={{ minWidth: 0, flex: 1, textAlign: 'left' }}>
              <p style={{ fontSize: '12px', fontWeight: 600, color: '#1a2530', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {user?.name ?? 'Usuário'}
              </p>
              <p style={{ fontSize: '11px', color: '#8a99a6', margin: '1px 0 0' }}>
                {user?.roles?.[0] ?? ''}
              </p>
            </div>
            <svg width="14" height="14" fill="none" stroke="#94a3b8" viewBox="0 0 24 24"
              style={{ flexShrink: 0, transform: userMenuOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
        </div>
      </aside>

      {/* ── Conteúdo ────────────────────────────────────────────────────── */}
      <main style={{
        flex: 1,
        overflow: 'auto',
        background: '#f8fafc',
      }}>
        <Outlet />
      </main>
    </div>
  )
}
