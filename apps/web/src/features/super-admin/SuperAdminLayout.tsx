// ─── SuperAdminLayout ────────────────────────────────────────────────────────
//
// Layout responsivo do painel do Super Admin.
// Mesmo comportamento do ClinicLayout: hambúrguer no mobile/tablet.
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useEffect } from 'react'
import { Link, Outlet, useLocation, useNavigate } from '@tanstack/react-router'
import { saTokens } from '@/lib/api/super-admin-client'
import { superAdminApi } from '@/lib/api/super-admin.api'
import { useSuperAdminAuthStore } from '@/stores/super-admin-auth.store'

const BREAKPOINT_DESKTOP = 1024

function useScreenWidth() {
  const [width, setWidth] = useState(() =>
    typeof window !== 'undefined' ? window.innerWidth : BREAKPOINT_DESKTOP + 1
  )
  useEffect(() => {
    const handler = () => setWidth(window.innerWidth)
    window.addEventListener('resize', handler, { passive: true })
    return () => window.removeEventListener('resize', handler)
  }, [])
  return width
}

const navItems = [
  {
    label: 'Clínicas',
    path: '/super-admin/tenants',
    icon: (
      <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
          d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-2 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
      </svg>
    ),
  },
  {
    label: 'Planos',
    path: '/super-admin/plans',
    icon: (
      <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
          d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
      </svg>
    ),
  },
]

export function SuperAdminLayout() {
  const { admin, clearAdmin } = useSuperAdminAuthStore()
  const navigate    = useNavigate()
  const location    = useLocation()
  const screenWidth = useScreenWidth()

  const isDesktop = screenWidth >= BREAKPOINT_DESKTOP
  const [sidebarOpen, setSidebarOpen] = useState(isDesktop)

  useEffect(() => {
    if (isDesktop) setSidebarOpen(true)
    else setSidebarOpen(false)
  }, [isDesktop])

  async function handleLogout() {
    try {
      const refreshToken = saTokens.getRefresh()
      if (refreshToken) await superAdminApi.logout(refreshToken)
    } catch { /* logout mesmo se falhar */ } finally {
      clearAdmin()
      void navigate({ to: '/super-admin/login' })
    }
  }

  const sidebarFixed = !isDesktop
  const showBackdrop = sidebarFixed && sidebarOpen
  const initial = admin?.name?.charAt(0).toUpperCase() ?? 'A'

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', fontFamily: 'var(--font-sans)' }}>

      {/* Backdrop */}
      {showBackdrop && (
        <div
          onClick={() => setSidebarOpen(false)}
          style={{
            position: 'fixed', inset: 0, zIndex: 60,
            background: 'rgba(15,20,30,0.45)', backdropFilter: 'blur(2px)',
            animation: 'fadeIn 0.2s ease',
          }}
        />
      )}

      {/* ── Sidebar ──────────────────────────────────────────────────────── */}
      <aside style={{
        width: '240px', flexShrink: 0,
        display: 'flex', flexDirection: 'column',
        background: 'var(--admin-color-sidebar-bg)',
        borderRight: '1px solid var(--admin-200)',
        ...(sidebarFixed ? {
          position: 'fixed', top: 0, left: 0, bottom: 0, zIndex: 70,
          transform: sidebarOpen ? 'translateX(0)' : 'translateX(-100%)',
          transition: 'transform 0.28s cubic-bezier(0.4, 0, 0.2, 1)',
          willChange: 'transform',
          boxShadow: '4px 0 24px rgba(0,0,0,0.12)',
        } : {}),
      }}>

        {/* Logo */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: '12px',
          padding: '0 20px', height: '60px', flexShrink: 0,
          borderBottom: '1px solid var(--admin-200)',
        }}>
          <div style={{
            width: '32px', height: '32px', borderRadius: '10px',
            background: 'var(--admin-color-primary)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '11px', fontWeight: 700, color: '#fff', flexShrink: 0,
            letterSpacing: '0.05em',
          }}>
            SA
          </div>
          <div>
            <p style={{ fontSize: '13px', fontWeight: 700, margin: 0, color: 'var(--admin-color-sidebar-text)' }}>
              MyAgendix
            </p>
            <p style={{ fontSize: '11px', margin: 0, color: 'var(--admin-color-sidebar-muted)' }}>
              Super Admin
            </p>
          </div>
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, padding: '16px 12px', display: 'flex', flexDirection: 'column', gap: '2px' }}>
          {navItems.map((item) => {
            const active = location.pathname.startsWith(item.path)
            return (
              <Link
                key={item.path}
                to={item.path as '/super-admin/tenants'}
                onClick={() => { if (!isDesktop) setSidebarOpen(false) }}
                style={{
                  display: 'flex', alignItems: 'center', gap: '10px',
                  padding: '9px 12px', borderRadius: '10px',
                  fontSize: '13.5px', fontWeight: active ? 600 : 500,
                  color: active ? 'var(--admin-900)' : 'var(--admin-color-sidebar-text)',
                  background: active ? 'var(--admin-color-sidebar-active)' : 'transparent',
                  textDecoration: 'none', transition: 'all 0.15s ease',
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

        {/* Footer */}
        <div style={{ padding: '16px', borderTop: '1px solid var(--admin-200)', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
            <div style={{
              width: '32px', height: '32px', borderRadius: '50%', flexShrink: 0,
              background: 'var(--admin-color-primary)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '12px', fontWeight: 700, color: '#fff',
            }}>
              {initial}
            </div>
            <div style={{ minWidth: 0, flex: 1 }}>
              <p style={{ margin: 0, fontSize: '12px', fontWeight: 600, color: 'var(--admin-color-sidebar-text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {admin?.name ?? 'Super Admin'}
              </p>
              <p style={{ margin: '1px 0 0', fontSize: '11px', color: 'var(--admin-color-sidebar-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {admin?.email ?? ''}
              </p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            style={{
              display: 'flex', alignItems: 'center', gap: '8px',
              width: '100%', padding: '8px 10px', borderRadius: '8px',
              background: 'transparent', border: 'none', cursor: 'pointer',
              fontSize: '13px', fontWeight: 500, color: 'var(--admin-color-sidebar-muted)',
              fontFamily: 'var(--font-sans)', transition: 'all 0.15s ease',
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.background = 'var(--admin-color-sidebar-hover)'
              ;(e.currentTarget as HTMLElement).style.color = 'var(--admin-900)'
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.background = 'transparent'
              ;(e.currentTarget as HTMLElement).style.color = 'var(--admin-color-sidebar-muted)'
            }}
          >
            <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            Sair
          </button>
        </div>
      </aside>

      {/* ── Coluna principal ─────────────────────────────────────────────── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0 }}>

        {/* Topbar (mobile + tablet) */}
        {!isDesktop && (
          <header style={{
            height: '56px', display: 'flex', alignItems: 'center', gap: '12px',
            padding: '0 16px', background: 'var(--admin-color-sidebar-bg)',
            borderBottom: '1px solid var(--admin-200)', flexShrink: 0, zIndex: 10,
          }}>
            <button
              onClick={() => setSidebarOpen((o) => !o)}
              aria-label="Menu"
              style={{
                display: 'flex', flexDirection: 'column', gap: '5px',
                justifyContent: 'center', alignItems: 'center',
                width: '40px', height: '40px', borderRadius: '10px',
                background: 'transparent', border: '1px solid var(--admin-200)',
                cursor: 'pointer', flexShrink: 0,
              }}
            >
              {[0, 1, 2].map((i) => (
                <span key={i} style={{
                  display: 'block', height: '2px', borderRadius: '2px',
                  background: 'var(--admin-color-sidebar-text)', transition: 'all 0.2s ease',
                  width: i === 1 ? (sidebarOpen ? '14px' : '20px') : '20px',
                  transform: sidebarOpen
                    ? i === 0 ? 'translateY(7px) rotate(45deg)'
                    : i === 2 ? 'translateY(-7px) rotate(-45deg)'
                    : 'scaleX(0)' : 'none',
                }} />
              ))}
            </button>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{
                width: '28px', height: '28px', borderRadius: '8px',
                background: 'var(--admin-color-primary)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '11px', fontWeight: 700, color: '#fff',
              }}>
                SA
              </div>
              <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--admin-color-sidebar-text)' }}>
                Super Admin
              </span>
            </div>
          </header>
        )}

        {/* Conteúdo */}
        <main style={{ flex: 1, overflow: 'auto', background: 'var(--sa-bg)' }}>
          <Outlet />
        </main>
      </div>
    </div>
  )
}
