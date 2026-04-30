// ─── PatientPortalLayout ──────────────────────────────────────────────────────
//
// Layout responsivo do portal do paciente.
// Estética "Private Practice" — creme, warm tones, consistente com BookingPage.
// Desktop: sidebar 220px | Mobile: hamburger + overlay
// ─────────────────────────────────────────────────────────────────────────────

import { useEffect, useState, useCallback } from 'react'
import { Outlet, Link, useNavigate, useLocation, useParams } from '@tanstack/react-router'
import { usePatientAuthStore } from '@/stores/patient-auth.store'
import { patientAuthApi, patientPortalApi } from '@/lib/api/patient-auth.api'
import { patientTokens } from '@/lib/api/patient-client'
import { applyTenantTheme, resetTenantTheme } from '@/lib/theme'

// ─── Nav items ────────────────────────────────────────────────────────────────

const navItems = [
  {
    label: 'Início',
    path: '',
    icon: (
      <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
          d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
      </svg>
    ),
  },
  {
    label: 'Agendamentos',
    path: 'agendamentos',
    icon: (
      <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
          d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
    ),
  },
  {
    label: 'Meu Perfil',
    path: 'perfil',
    icon: (
      <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
          d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
      </svg>
    ),
  },
  {
    label: 'Segurança',
    path: 'seguranca',
    icon: (
      <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
          d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
      </svg>
    ),
  },
]

// ─── Helpers ──────────────────────────────────────────────────────────────────

function useScreenWidth() {
  const [w, setW] = useState(() => (typeof window !== 'undefined' ? window.innerWidth : 1200))
  useEffect(() => {
    const h = () => setW(window.innerWidth)
    window.addEventListener('resize', h, { passive: true })
    return () => window.removeEventListener('resize', h)
  }, [])
  return w
}

function initials(name: string | null | undefined) {
  if (!name) return 'P'
  return name.split(' ').slice(0, 2).map((n) => n[0]).join('').toUpperCase()
}

// ─── Sidebar ──────────────────────────────────────────────────────────────────

function Sidebar({
  slug,
  pathname,
  patient,
  tenantName,
  onNav,
  onLogout,
}: {
  slug: string
  pathname: string
  patient: { name?: string; email?: string } | null
  tenantName: string | null
  onNav?: () => void
  onLogout: () => void
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: '10px',
        padding: '0 20px', height: '60px', flexShrink: 0,
        borderBottom: '1px solid #ece9e4',
      }}>
        <div style={{
          width: '32px', height: '32px', borderRadius: '10px',
          background: 'var(--color-primary)', color: '#fff',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '14px', fontWeight: 700, flexShrink: 0,
          boxShadow: '0 4px 10px color-mix(in srgb, var(--color-primary) 35%, transparent)',
        }}>M</div>
        <div style={{ minWidth: 0 }}>
          <p style={{ fontSize: '13px', fontWeight: 700, color: '#1a1614', margin: 0, letterSpacing: '-0.01em' }}>
            {tenantName ?? 'MyAgendix'}
          </p>
          <p style={{ fontSize: '11px', color: '#b0a899', margin: 0 }}>Portal do paciente</p>
        </div>
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, padding: '16px 12px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '2px' }}>
        <p style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#c8c0b8', margin: '0 0 8px 8px' }}>
          Menu
        </p>

        {navItems.map((item) => {
          const fullPath = `/${slug}/minha-conta${item.path ? `/${item.path}` : ''}`
          const active = item.path === ''
            ? (pathname === `/${slug}/minha-conta` || pathname === `/${slug}/minha-conta/`)
            : pathname.startsWith(fullPath)

          return (
            <Link
              key={item.path}
              to={item.path === '' ? '/$slug/minha-conta' : '/$slug/minha-conta/$section'}
              params={item.path === '' ? { slug } : { slug, section: item.path }}
              onClick={onNav}
              style={{
                display: 'flex', alignItems: 'center', gap: '10px',
                padding: '9px 12px', borderRadius: '10px',
                fontSize: '13.5px', fontWeight: active ? 600 : 500,
                color: active ? 'var(--color-primary)' : '#5a4f47',
                background: active ? 'color-mix(in srgb, var(--color-primary) 10%, white)' : 'transparent',
                textDecoration: 'none', transition: 'all 0.15s ease',
                position: 'relative',
              }}
              onMouseEnter={(e) => { if (!active) (e.currentTarget as HTMLElement).style.background = '#f5f0eb' }}
              onMouseLeave={(e) => { if (!active) (e.currentTarget as HTMLElement).style.background = 'transparent' }}
            >
              {active && (
                <span style={{
                  position: 'absolute', left: 0, top: '6px', bottom: '6px',
                  width: '3px', borderRadius: '0 3px 3px 0', background: 'var(--color-primary)',
                }} />
              )}
              <span style={{ color: active ? 'var(--color-primary)' : '#8a7f75', display: 'flex', flexShrink: 0 }}>
                {item.icon}
              </span>
              {item.label}
            </Link>
          )
        })}

        {/* Link para agendar */}
        <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid #ece9e4' }}>
          <Link
            to="/$slug"
            params={{ slug }}
            onClick={onNav}
            style={{
              display: 'flex', alignItems: 'center', gap: '10px',
              padding: '9px 12px', borderRadius: '10px',
              fontSize: '13.5px', fontWeight: 500,
              color: '#5a4f47', textDecoration: 'none',
              transition: 'all 0.15s ease',
            }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = '#f5f0eb' }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'transparent' }}
          >
            <span style={{ color: '#8a7f75', display: 'flex', flexShrink: 0 }}>
              <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
                  d="M12 4v16m8-8H4" />
              </svg>
            </span>
            Novo agendamento
          </Link>
        </div>
      </nav>

      {/* Footer — usuário */}
      <div style={{ padding: '14px', borderTop: '1px solid #ece9e4', flexShrink: 0 }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: '10px',
          padding: '10px', borderRadius: '10px',
          background: '#faf8f5', marginBottom: '8px',
        }}>
          <div style={{
            width: '32px', height: '32px', borderRadius: '50%', flexShrink: 0,
            background: 'color-mix(in srgb, var(--color-primary) 15%, white)',
            color: 'var(--color-primary)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '12px', fontWeight: 700,
          }}>
            {initials(patient?.name)}
          </div>
          <div style={{ minWidth: 0, flex: 1 }}>
            <p style={{ fontSize: '12px', fontWeight: 600, color: '#1a1614', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {patient?.name ?? 'Paciente'}
            </p>
            <p style={{ fontSize: '11px', color: '#b0a899', margin: '1px 0 0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {patient?.email ?? ''}
            </p>
          </div>
        </div>

        <button
          onClick={onLogout}
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '7px',
            width: '100%', padding: '9px', borderRadius: '10px',
            background: 'transparent', border: '1.5px solid #ece9e4',
            cursor: 'pointer', fontSize: '13px', fontWeight: 500,
            color: '#8a7f75', fontFamily: 'var(--font-sans)',
            transition: 'all 0.15s',
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLElement).style.background = '#fff1f2'
            ;(e.currentTarget as HTMLElement).style.color = '#e53e3e'
            ;(e.currentTarget as HTMLElement).style.borderColor = '#fecaca'
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLElement).style.background = 'transparent'
            ;(e.currentTarget as HTMLElement).style.color = '#8a7f75'
            ;(e.currentTarget as HTMLElement).style.borderColor = '#ece9e4'
          }}
        >
          <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
          Sair
        </button>
      </div>
    </div>
  )
}

// ─── Main Layout ──────────────────────────────────────────────────────────────

export function PatientPortalLayout() {
  const params = useParams({ strict: false }) as { slug?: string }
  const slug = params.slug ?? ''
  const navigate = useNavigate()
  const location = useLocation()
  const screenWidth = useScreenWidth()

  const isMobile = screenWidth < 768
  const [sidebarOpen, setSidebarOpen] = useState(!isMobile)

  const { patient, tenantName, setPatient, clearPatient } = usePatientAuthStore()

  useEffect(() => {
    if (isMobile) setSidebarOpen(false)
    else setSidebarOpen(true)
  }, [isMobile])

  // Busca dados do paciente e aplica o tema da clínica
  // Sempre executa no mount: garante que as cores cheguem mesmo quando o
  // paciente já está no store (ex: pós-login, onde me() ainda não foi chamado).
  useEffect(() => {
    if (!slug) return
    patientPortalApi.me(slug)
      .then((data) => {
        setPatient(data, patientTokens.getAccess(slug)!, patientTokens.getRefresh(slug)!, slug, data.tenantName, data.tenantLogoUrl)
        applyTenantTheme({
          colorPrimary:   data.tenantColorPrimary,
          colorSecondary: data.tenantColorSecondary,
          colorSidebar:   data.tenantColorSidebar,
        })
      })
      .catch(() => {
        // Token inválido — redireciona para login
        clearPatient(slug)
        void navigate({ to: '/$slug/minha-conta/login', params: { slug } })
      })
    return () => resetTenantTheme()
  }, [slug]) // eslint-disable-line

  const closeSidebarOnNav = useCallback(() => {
    if (isMobile) setSidebarOpen(false)
  }, [isMobile])

  async function handleLogout() {
    try {
      const refreshToken = patientTokens.getRefresh(slug)
      if (refreshToken) await patientAuthApi.logout(slug, refreshToken)
    } catch { /* logout mesmo se falhar */ } finally {
      clearPatient(slug)
      void navigate({ to: '/$slug/minha-conta/login', params: { slug } })
    }
  }

  const sidebarFixed = isMobile
  const showBackdrop = sidebarFixed && sidebarOpen

  return (
    <div style={{
      display: 'flex', height: '100vh', overflow: 'hidden',
      fontFamily: 'var(--font-sans)',
      background: '#faf8f5',
    }}>
      {/* Backdrop */}
      {showBackdrop && (
        <div
          onClick={() => setSidebarOpen(false)}
          style={{
            position: 'fixed', inset: 0, zIndex: 60,
            background: 'rgba(26,22,20,0.45)',
            backdropFilter: 'blur(2px)',
            animation: 'fadeIn 0.2s ease',
          }}
        />
      )}

      {/* Sidebar */}
      <aside style={{
        width: '220px', flexShrink: 0,
        background: '#ffffff',
        borderRight: '1px solid #ece9e4',
        boxShadow: sidebarFixed ? '4px 0 24px rgba(0,0,0,0.10)' : '2px 0 8px rgba(0,0,0,0.03)',
        ...(sidebarFixed ? {
          position: 'fixed' as const,
          top: 0, left: 0, bottom: 0,
          zIndex: 70,
          transform: sidebarOpen ? 'translateX(0)' : 'translateX(-100%)',
          transition: 'transform 0.28s cubic-bezier(0.4, 0, 0.2, 1)',
        } : {}),
      }}>
        <Sidebar
          slug={slug}
          pathname={location.pathname}
          patient={patient}
          tenantName={tenantName}
          onNav={closeSidebarOnNav}
          onLogout={handleLogout}
        />
      </aside>

      {/* Coluna principal */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0 }}>
        {/* Topbar mobile */}
        {isMobile && (
          <header style={{
            height: '56px', display: 'flex', alignItems: 'center', gap: '12px',
            padding: '0 16px', background: '#fff',
            borderBottom: '1px solid #ece9e4', flexShrink: 0, zIndex: 10,
          }}>
            <button
              onClick={() => setSidebarOpen((o) => !o)}
              aria-label="Menu"
              style={{
                display: 'flex', flexDirection: 'column', gap: '5px',
                justifyContent: 'center', alignItems: 'center',
                width: '40px', height: '40px', borderRadius: '10px',
                background: 'transparent', border: '1px solid #ece9e4',
                cursor: 'pointer', flexShrink: 0,
              }}
            >
              {[0, 1, 2].map((i) => (
                <span key={i} style={{
                  display: 'block', height: '2px', borderRadius: '2px',
                  background: '#5a4f47', transition: 'all 0.2s ease',
                  width: i === 1 ? (sidebarOpen ? '14px' : '20px') : '20px',
                  transform: sidebarOpen
                    ? i === 0 ? 'translateY(7px) rotate(45deg)' : i === 2 ? 'translateY(-7px) rotate(-45deg)' : 'scaleX(0)'
                    : 'none',
                }} />
              ))}
            </button>

            <div style={{
              width: '28px', height: '28px', borderRadius: '8px',
              background: 'var(--color-primary)', color: '#fff',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '12px', fontWeight: 700, flexShrink: 0,
            }}>M</div>
            <span style={{ fontSize: '13px', fontWeight: 700, color: '#1a1614' }}>
              {tenantName ?? 'Minha Conta'}
            </span>

            <div style={{ flex: 1 }} />
            <div style={{
              width: '34px', height: '34px', borderRadius: '50%',
              background: 'color-mix(in srgb, var(--color-primary) 15%, white)',
              color: 'var(--color-primary)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '12px', fontWeight: 700, flexShrink: 0,
              border: '1.5px solid color-mix(in srgb, var(--color-primary) 25%, transparent)',
            }}>
              {initials(patient?.name)}
            </div>
          </header>
        )}

        {/* Conteúdo */}
        <main style={{ flex: 1, overflow: 'auto', background: '#faf8f5' }}>
          <Outlet />
        </main>
      </div>

      <style>{`
        @keyframes fadeIn { from { opacity: 0 } to { opacity: 1 } }
      `}</style>
    </div>
  )
}
