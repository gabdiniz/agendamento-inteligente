// ─── ClinicLayout ─────────────────────────────────────────────────────────────
//
// Layout responsivo do painel da clínica.
// Desktop  (>1024px): sidebar fixa 232px
// Tablet   (768–1024px): sidebar colapsável via botão na topbar
// Mobile   (<768px): sidebar em overlay com backdrop, hambúrguer na topbar
// ─────────────────────────────────────────────────────────────────────────────

import React, { useEffect, useState, useCallback } from 'react'
import { Outlet, Link, useNavigate, useLocation, useParams } from '@tanstack/react-router'
import { useAuthStore } from '@/stores/auth.store'
import { clinicAuthApi } from '@/lib/api/clinic.api'
import { clinicTokens } from '@/lib/api/client'

// ─── Constants ────────────────────────────────────────────────────────────────

const BREAKPOINT_DESKTOP = 1024
const BREAKPOINT_TABLET  = 768

const navItems = [
  {
    label: 'Dashboard', path: 'dashboard',
    icon: <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>,
  },
  {
    label: 'Agendamentos', path: 'appointments',
    icon: <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>,
  },
  {
    label: 'Profissionais', path: 'professionals',
    icon: <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>,
  },
  {
    label: 'Pacientes', path: 'patients',
    icon: <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>,
  },
  {
    label: 'Lista de Espera', path: 'waitlist',
    icon: <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>,
  },
  {
    label: 'Notificações', path: 'notifications',
    icon: <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>,
  },
]

// ─── Hook: screen width ───────────────────────────────────────────────────────

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

// ─── NavLink helper ───────────────────────────────────────────────────────────

function NavItem({
  to, params: linkParams, active, icon, label, onClick,
}: {
  to: string
  params: Record<string, string>
  active: boolean
  icon: React.ReactNode
  label: string
  onClick?: () => void
}) {
  return (
    <Link
      to={to as '/app/$slug/$section'}
      params={linkParams as { slug: string; section: string }}
      onClick={onClick}
      style={{
        display: 'flex', alignItems: 'center', gap: '10px',
        padding: '9px 12px', borderRadius: '10px',
        fontSize: '13.5px', fontWeight: active ? 600 : 500,
        color: active ? 'var(--color-primary)' : '#4a5568',
        background: active ? 'color-mix(in srgb, var(--color-primary) 10%, white)' : 'transparent',
        textDecoration: 'none', transition: 'all 0.15s ease',
        position: 'relative', flexShrink: 0,
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
      {active && (
        <span style={{
          position: 'absolute', left: 0, top: '6px', bottom: '6px',
          width: '3px', borderRadius: '0 3px 3px 0', background: 'var(--color-primary)',
        }} />
      )}
      <span style={{ color: active ? 'var(--color-primary)' : 'inherit', display: 'flex', flexShrink: 0 }}>
        {icon}
      </span>
      {label}
    </Link>
  )
}

// ─── Hamburger button ─────────────────────────────────────────────────────────

function HamburgerBtn({ open, onClick }: { open: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      aria-label={open ? 'Fechar menu' : 'Abrir menu'}
      style={{
        display: 'flex', flexDirection: 'column', gap: '5px',
        justifyContent: 'center', alignItems: 'center',
        width: '40px', height: '40px', borderRadius: '10px',
        background: 'transparent', border: '1px solid #eaecef',
        cursor: 'pointer', flexShrink: 0,
      }}
    >
      {[0, 1, 2].map((i) => (
        <span key={i} style={{
          display: 'block', height: '2px', borderRadius: '2px',
          background: '#4a5568', transition: 'all 0.2s ease',
          width: i === 1 ? (open ? '14px' : '20px') : '20px',
          transformOrigin: 'center',
          transform: open
            ? i === 0 ? 'translateY(7px) rotate(45deg)'
            : i === 2 ? 'translateY(-7px) rotate(-45deg)'
            : 'scaleX(0)'
            : 'none',
        }} />
      ))}
    </button>
  )
}

// ─── Sidebar content ──────────────────────────────────────────────────────────

function SidebarContent({
  slug, location, onNav, userMenuOpen, setUserMenuOpen,
  user, initials, handleLogout, navigate,
}: {
  slug: string
  location: { pathname: string }
  onNav?: () => void
  userMenuOpen: boolean
  setUserMenuOpen: (v: boolean) => void
  user: { name?: string; roles?: string[] } | null
  initials: string
  handleLogout: () => void
  navigate: ReturnType<typeof useNavigate>
}) {
  const configPath = `/app/${slug}/configuracoes/procedimentos`
  const configActive = location.pathname.startsWith(configPath)

  return (
    <>
      {/* Logo */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: '10px',
        padding: '0 20px', height: '60px', flexShrink: 0,
        borderBottom: '1px solid #f0f2f5',
      }}>
        <div style={{
          width: '32px', height: '32px', borderRadius: '10px',
          background: 'var(--color-primary)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '14px', fontWeight: 700, color: '#fff', flexShrink: 0,
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
      <nav style={{ flex: 1, padding: '0 12px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '2px' }}>
        {navItems.map((item) => {
          const fullPath = `/app/${slug}/${item.path}`
          const active = location.pathname === fullPath || location.pathname.startsWith(fullPath + '/')
          return (
            <NavItem
              key={item.path}
              to="/app/$slug/$section"
              params={{ slug, section: item.path }}
              active={active}
              icon={item.icon}
              label={item.label}
              onClick={onNav}
            />
          )
        })}

        {/* ── Configurações */}
        <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid #f0f2f5' }}>
          <p style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#b0bbc6', margin: '0 0 6px 12px' }}>
            Configurações
          </p>
          <NavItem
            to="/app/$slug/configuracoes/procedimentos"
            params={{ slug }}
            active={configActive}
            icon={
              <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
                  d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            }
            label="Procedimentos"
            onClick={onNav}
          />
        </div>
      </nav>

      {/* Footer — usuário com dropdown */}
      <div style={{ padding: '16px', borderTop: '1px solid #f0f2f5', flexShrink: 0, position: 'relative' }}>
        {userMenuOpen && (
          <>
            <div style={{ position: 'fixed', inset: 0, zIndex: 40 }} onClick={() => setUserMenuOpen(false)} />
            <div style={{
              position: 'absolute', bottom: '100%', left: '12px', right: '12px',
              background: '#fff', borderRadius: '12px',
              border: '1px solid #eaecef',
              boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
              zIndex: 50, marginBottom: '6px',
              overflow: 'hidden', animation: 'fadeUp 0.15s ease',
            }}>
              {[
                {
                  label: 'Ver Perfil',
                  icon: <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>,
                  action: () => { setUserMenuOpen(false); void navigate({ to: '/app/$slug/profile', params: { slug } }) },
                },
                {
                  label: 'Alterar Senha',
                  icon: <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" /></svg>,
                  action: () => { setUserMenuOpen(false); void navigate({ to: '/app/$slug/change-password', params: { slug } }) },
                },
              ].map((item) => (
                <button key={item.label} onClick={item.action}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '10px',
                    width: '100%', padding: '11px 14px',
                    background: 'transparent', border: 'none', cursor: 'pointer',
                    fontSize: '13px', fontWeight: 500, color: '#374151',
                    fontFamily: 'var(--font-sans)', textAlign: 'left',
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
                onClick={() => { setUserMenuOpen(false); handleLogout() }}
                style={{
                  display: 'flex', alignItems: 'center', gap: '10px',
                  width: '100%', padding: '11px 14px',
                  background: 'transparent', border: 'none', cursor: 'pointer',
                  fontSize: '13px', fontWeight: 500, color: '#e53e3e',
                  fontFamily: 'var(--font-sans)', textAlign: 'left',
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

        <button
          onClick={() => setUserMenuOpen(!userMenuOpen)}
          style={{
            width: '100%', display: 'flex', alignItems: 'center', gap: '10px',
            padding: '10px', borderRadius: '10px',
            background: userMenuOpen ? 'color-mix(in srgb, var(--color-primary) 8%, white)' : '#f8fafc',
            border: `1px solid ${userMenuOpen ? 'color-mix(in srgb, var(--color-primary) 25%, transparent)' : '#eaecef'}`,
            cursor: 'pointer', fontFamily: 'var(--font-sans)', transition: 'all 0.15s ease',
          }}
          onMouseEnter={(e) => { if (!userMenuOpen) (e.currentTarget as HTMLElement).style.background = '#f1f5f9' }}
          onMouseLeave={(e) => { if (!userMenuOpen) (e.currentTarget as HTMLElement).style.background = '#f8fafc' }}
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
    </>
  )
}

// ─── Main Layout ──────────────────────────────────────────────────────────────

export function ClinicLayout() {
  const { user, clearUser } = useAuthStore()
  const navigate   = useNavigate()
  const location   = useLocation()
  const params     = useParams({ strict: false }) as { slug?: string }
  const slug       = params.slug ?? clinicTokens.getSlug() ?? ''
  const screenWidth = useScreenWidth()

  const isMobile  = screenWidth < BREAKPOINT_TABLET
  const isTablet  = screenWidth >= BREAKPOINT_TABLET && screenWidth < BREAKPOINT_DESKTOP
  const isDesktop = screenWidth >= BREAKPOINT_DESKTOP

  // Sidebar aberta por padrão só no desktop
  const [sidebarOpen, setSidebarOpen] = useState(isDesktop)
  const [userMenuOpen, setUserMenuOpen] = useState(false)

  // Fecha sidebar ao redimensionar para mobile
  useEffect(() => {
    if (isMobile) setSidebarOpen(false)
    if (isDesktop) setSidebarOpen(true)
  }, [isMobile, isDesktop])

  // Fecha sidebar ao navegar no mobile/tablet
  const closeSidebarOnNav = useCallback(() => {
    if (!isDesktop) setSidebarOpen(false)
  }, [isDesktop])

  const initials = user?.name
    ?.split(' ').slice(0, 2).map((n) => n[0]).join('').toUpperCase() ?? 'U'

  async function handleLogout() {
    try {
      const refreshToken = clinicTokens.getRefresh()
      if (refreshToken) await clinicAuthApi.logout(refreshToken)
    } catch { /* logout mesmo se falhar */ } finally {
      clearUser()
      void navigate({ to: '/app/$slug/login', params: { slug } })
    }
  }

  const showTopbar   = !isDesktop          // tablet + mobile
  const sidebarFixed = !isDesktop          // tablet + mobile: sidebar vira overlay
  const showBackdrop = sidebarFixed && sidebarOpen

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', fontFamily: 'var(--font-sans)' }}>

      {/* ── Backdrop (mobile/tablet quando sidebar aberta) ────────────────── */}
      {showBackdrop && (
        <div
          onClick={() => setSidebarOpen(false)}
          style={{
            position: 'fixed', inset: 0, zIndex: 60,
            background: 'rgba(15,20,30,0.45)',
            backdropFilter: 'blur(2px)',
            animation: 'fadeIn 0.2s ease',
          }}
        />
      )}

      {/* ── Sidebar ──────────────────────────────────────────────────────── */}
      <aside style={{
        width: '232px',
        flexShrink: 0,
        display: 'flex',
        flexDirection: 'column',
        background: '#ffffff',
        borderRight: '1px solid #eaecef',
        boxShadow: sidebarFixed ? '4px 0 24px rgba(0,0,0,0.12)' : '2px 0 8px rgba(0,0,0,0.03)',
        // Em mobile/tablet: sidebar é position fixed e fora do fluxo
        ...(sidebarFixed ? {
          position: 'fixed',
          top: 0,
          left: 0,
          bottom: 0,
          zIndex: 70,
          transform: sidebarOpen ? 'translateX(0)' : 'translateX(-100%)',
          transition: 'transform 0.28s cubic-bezier(0.4, 0, 0.2, 1)',
          willChange: 'transform',
        } : {}),
      }}>
        <SidebarContent
          slug={slug}
          location={location}
          onNav={closeSidebarOnNav}
          userMenuOpen={userMenuOpen}
          setUserMenuOpen={setUserMenuOpen}
          user={user}
          initials={initials}
          handleLogout={handleLogout}
          navigate={navigate}
        />
      </aside>

      {/* ── Coluna principal ─────────────────────────────────────────────── */}
      <div style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        minWidth: 0,
      }}>

        {/* ── Topbar (mobile + tablet) ──────────────────────────────────── */}
        {showTopbar && (
          <header style={{
            height: '56px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            padding: '0 16px',
            background: '#fff',
            borderBottom: '1px solid #eaecef',
            flexShrink: 0,
            zIndex: 10,
          }}>
            <HamburgerBtn open={sidebarOpen} onClick={() => setSidebarOpen((o) => !o)} />
            {/* Logo inline na topbar */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{
                width: '28px', height: '28px', borderRadius: '8px',
                background: 'var(--color-primary)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '13px', fontWeight: 700, color: '#fff',
              }}>
                M
              </div>
              <span style={{ fontSize: '13px', fontWeight: 700, color: '#1a2530' }}>
                MyAgendix
              </span>
            </div>

            {/* Espaço */}
            <div style={{ flex: 1 }} />

            {/* Avatar compacto */}
            <button
              onClick={() => setUserMenuOpen(!userMenuOpen)}
              style={{
                width: '36px', height: '36px', borderRadius: '50%',
                background: 'color-mix(in srgb, var(--color-primary) 15%, white)',
                color: 'var(--color-primary)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '12px', fontWeight: 700,
                border: '1.5px solid color-mix(in srgb, var(--color-primary) 25%, transparent)',
                cursor: 'pointer',
              }}
            >
              {initials}
            </button>

            {/* Mini dropdown quando avatar clicado na topbar */}
            {userMenuOpen && (
              <>
                <div style={{ position: 'fixed', inset: 0, zIndex: 40 }} onClick={() => setUserMenuOpen(false)} />
                <div style={{
                  position: 'absolute', top: '52px', right: '12px',
                  background: '#fff', borderRadius: '12px',
                  border: '1px solid #eaecef',
                  boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
                  zIndex: 50, minWidth: '180px',
                  overflow: 'hidden', animation: 'fadeUp 0.15s ease',
                }}>
                  <div style={{ padding: '12px 14px 10px', borderBottom: '1px solid #f0f2f5' }}>
                    <p style={{ margin: 0, fontSize: '13px', fontWeight: 600, color: '#1a2530' }}>{user?.name}</p>
                    <p style={{ margin: '2px 0 0', fontSize: '11px', color: '#94a3b8' }}>{user?.roles?.[0]}</p>
                  </div>
                  {[
                    { label: 'Ver Perfil',    action: () => { setUserMenuOpen(false); void navigate({ to: '/app/$slug/profile', params: { slug } }) } },
                    { label: 'Alterar Senha', action: () => { setUserMenuOpen(false); void navigate({ to: '/app/$slug/change-password', params: { slug } }) } },
                  ].map((item) => (
                    <button key={item.label} onClick={item.action}
                      style={{
                        display: 'block', width: '100%', padding: '10px 14px',
                        background: 'transparent', border: 'none', cursor: 'pointer',
                        fontSize: '13px', fontWeight: 500, color: '#374151',
                        fontFamily: 'var(--font-sans)', textAlign: 'left',
                      }}
                      onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = '#f8fafc' }}
                      onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'transparent' }}
                    >
                      {item.label}
                    </button>
                  ))}
                  <div style={{ borderTop: '1px solid #f0f2f5' }} />
                  <button
                    onClick={() => { setUserMenuOpen(false); void handleLogout() }}
                    style={{
                      display: 'block', width: '100%', padding: '10px 14px',
                      background: 'transparent', border: 'none', cursor: 'pointer',
                      fontSize: '13px', fontWeight: 500, color: '#e53e3e',
                      fontFamily: 'var(--font-sans)', textAlign: 'left',
                    }}
                    onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = '#fff1f2' }}
                    onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'transparent' }}
                  >
                    Sair da conta
                  </button>
                </div>
              </>
            )}
          </header>
        )}

        {/* ── Conteúdo da página ───────────────────────────────────────── */}
        <main style={{ flex: 1, overflow: 'auto', background: '#f8fafc' }}>
          <Outlet />
        </main>
      </div>
    </div>
  )
}
