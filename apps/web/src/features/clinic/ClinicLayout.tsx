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
import { clinicTokens, BASE_URL } from '@/lib/api/client'
import { useFeature } from '@/hooks/useFeature'
import { applyTenantTheme } from '@/lib/theme'

// ─── Constants ────────────────────────────────────────────────────────────────

const BREAKPOINT_DESKTOP = 1024
const BREAKPOINT_TABLET  = 768

// featureSlug: se definido, o item só aparece quando o tenant tem essa feature.
// undefined = sempre visível (core da plataforma).
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
    featureSlug: 'waitlist',
    icon: <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>,
  },
  {
    label: 'Notificações', path: 'notifications',
    featureSlug: 'whatsapp',
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
        color: active ? 'var(--color-primary)' : 'color-mix(in srgb, var(--color-sidebar-text, #4a5568) 80%, transparent)',
        background: active ? 'color-mix(in srgb, var(--color-primary) 12%, var(--color-sidebar, white))' : 'transparent',
        textDecoration: 'none', transition: 'all 0.15s ease',
        position: 'relative', flexShrink: 0,
      }}
      onMouseEnter={(e) => {
        if (!active) {
          (e.currentTarget as HTMLElement).style.background = 'color-mix(in srgb, var(--color-sidebar-text, #4a5568) 8%, var(--color-sidebar, white))'
          ;(e.currentTarget as HTMLElement).style.color = 'var(--color-sidebar-text, #2d3748)'
        }
      }}
      onMouseLeave={(e) => {
        if (!active) {
          (e.currentTarget as HTMLElement).style.background = 'transparent'
          ;(e.currentTarget as HTMLElement).style.color = 'color-mix(in srgb, var(--color-sidebar-text, #4a5568) 80%, transparent)'
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
  user: { name?: string; roles?: string[]; tenantLogoUrl?: string | null; tenantName?: string | null } | null
  initials: string
  handleLogout: () => void
  navigate: ReturnType<typeof useNavigate>
}) {
  const isGestor = user?.roles?.includes('GESTOR') ?? false

  // Feature gating — graceful: retorna true se ainda não carregado
  const canWaitlist = useFeature('waitlist')
  const canWhatsapp = useFeature('whatsapp')

  const visibleNavItems = navItems.filter(item => {
    if (!item.featureSlug) return true
    if (item.featureSlug === 'waitlist') return canWaitlist
    if (item.featureSlug === 'whatsapp') return canWhatsapp
    return true
  })

  const configPath          = `/app/${slug}/configuracoes/procedimentos`
  const configActive        = location.pathname.startsWith(configPath)

  const portalConfigPath    = `/app/${slug}/configuracoes/portal-paciente`
  const portalConfigActive  = location.pathname.startsWith(portalConfigPath)

  const identityPath   = `/app/${slug}/configuracoes/identidade-visual`
  const identityActive = location.pathname.startsWith(identityPath)

  const usersPath     = `/app/${slug}/usuarios`
  const usersActive   = location.pathname.startsWith(usersPath)

  const waPath        = `/app/${slug}/whatsapp`
  const waActive      = location.pathname.startsWith(waPath)

  return (
    <>
      {/* Logo */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: '10px',
        padding: '0 20px', height: '60px', flexShrink: 0,
        borderBottom: '1px solid #f0f2f5',
      }}>
        {user?.tenantLogoUrl ? (
          <img
            src={user.tenantLogoUrl.startsWith('http') ? user.tenantLogoUrl : `${BASE_URL}${user.tenantLogoUrl}`}
            alt="Logo da clínica"
            style={{
              width: '32px', height: '32px', borderRadius: '10px',
              objectFit: 'contain', background: '#f8fafc',
              border: '1px solid #eaecef', flexShrink: 0,
            }}
          />
        ) : (
          <div style={{
            width: '32px', height: '32px', borderRadius: '10px',
            background: 'var(--color-primary)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '14px', fontWeight: 700, color: '#fff', flexShrink: 0,
            boxShadow: '0 4px 10px color-mix(in srgb, var(--color-primary) 35%, transparent)',
          }}>
            M
          </div>
        )}
        <div style={{ minWidth: 0 }}>
          <p style={{ fontSize: '13px', fontWeight: 700, color: '#1a2530', margin: 0, letterSpacing: '-0.01em', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {user?.tenantName ?? 'MyAgendix'}
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
        {visibleNavItems.map((item) => {
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
          {isGestor && (
            <NavItem
              to="/app/$slug/configuracoes/portal-paciente"
              params={{ slug }}
              active={portalConfigActive}
              icon={
                <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
                    d="M5.121 17.804A13.937 13.937 0 0112 16c2.5 0 4.847.655 6.879 1.804M15 10a3 3 0 11-6 0 3 3 0 016 0zm6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              }
              label="Portal do Paciente"
              onClick={onNav}
            />
          )}
          {isGestor && (
            <NavItem
              to="/app/$slug/configuracoes/identidade-visual"
              params={{ slug }}
              active={identityActive}
              icon={
                <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
                    d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
                </svg>
              }
              label="Identidade Visual"
              onClick={onNav}
            />
          )}
          {isGestor && (
            <NavItem
              to="/app/$slug/$section"
              params={{ slug, section: 'usuarios' }}
              active={usersActive}
              icon={
                <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
                    d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              }
              label="Usuários"
              onClick={onNav}
            />
          )}
          {isGestor && canWhatsapp && (
            <NavItem
              to="/app/$slug/$section"
              params={{ slug, section: 'whatsapp' }}
              active={waActive}
              icon={
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                </svg>
              }
              label="WhatsApp"
              onClick={onNav}
            />
          )}
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
  const { user, setUser, clearUser } = useAuthStore()
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

  // Re-hidrata o usuário a cada montagem (necessário após F5 — Zustand não persiste)
  useEffect(() => {
    if (!slug) return
    clinicAuthApi.me()
      .then((data) => {
        const access  = clinicTokens.getAccess()
        const refresh = clinicTokens.getRefresh()
        if (access && refresh) {
          setUser(data, access, refresh, slug)
        }
      })
      .catch(() => {
        clearUser()
        void navigate({ to: '/app/$slug/login', params: { slug } })
      })
  }, [slug]) // eslint-disable-line

  // Injeta CSS vars de branding da clínica (dispara quando user muda)
  useEffect(() => {
    applyTenantTheme({
      colorPrimary:   user?.tenantColorPrimary,
      colorSecondary: user?.tenantColorSecondary,
      colorSidebar:   user?.tenantColorSidebar,
    })
  }, [user?.tenantColorPrimary, user?.tenantColorSecondary, user?.tenantColorSidebar])

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
        background: 'var(--color-sidebar, #ffffff)',
        borderRight: '1px solid rgba(0,0,0,0.06)',
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
              {user?.tenantLogoUrl ? (
                <img
                  src={user.tenantLogoUrl.startsWith('http') ? user.tenantLogoUrl : `${BASE_URL}${user.tenantLogoUrl}`}
                  alt="Logo da clínica"
                  style={{
                    width: '28px', height: '28px', borderRadius: '8px',
                    objectFit: 'contain', background: '#f8fafc',
                    border: '1px solid #eaecef', flexShrink: 0,
                  }}
                />
              ) : (
                <div style={{
                  width: '28px', height: '28px', borderRadius: '8px',
                  background: 'var(--color-primary)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '13px', fontWeight: 700, color: '#fff',
                }}>
                  M
                </div>
              )}
              <span style={{ fontSize: '13px', fontWeight: 700, color: '#1a2530', maxWidth: '140px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {user?.tenantName ?? 'MyAgendix'}
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
