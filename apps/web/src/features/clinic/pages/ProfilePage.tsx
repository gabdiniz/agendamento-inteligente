// ─── ProfilePage ──────────────────────────────────────────────────────────────

import { useParams } from '@tanstack/react-router'
import { useNavigate } from '@tanstack/react-router'
import { useAuthStore } from '@/stores/auth.store'
import { clinicTokens } from '@/lib/api/client'

const ROLE_LABEL: Record<string, string> = {
  GESTOR:      'Gestor',
  RECEPCAO:    'Recepção',
  PROFISSIONAL:'Profissional',
}

export function ProfilePage() {
  const params   = useParams({ strict: false }) as { slug?: string }
  const slug     = params.slug ?? clinicTokens.getSlug() ?? ''
  const navigate = useNavigate()
  const user     = useAuthStore((s) => s.user)

  const initials = user?.name
    ?.split(' ').slice(0, 2).map((n) => n[0]).join('').toUpperCase() ?? 'U'

  return (
    <div style={{ padding: '32px', maxWidth: '560px', fontFamily: 'var(--font-sans)' }}>

      <div style={{ marginBottom: '28px' }}>
        <button
          onClick={() => void navigate({ to: '/app/$slug/dashboard', params: { slug } })}
          style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: 'none', border: 'none', cursor: 'pointer', fontSize: '13px', color: '#64748b', padding: 0, marginBottom: '12px', fontFamily: 'var(--font-sans)' }}
        >
          <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Voltar
        </button>
        <h1 style={{ margin: 0, fontSize: '26px', fontWeight: 400, fontFamily: 'var(--font-display)', fontStyle: 'italic', color: '#1a2530', letterSpacing: '-0.02em' }}>
          Meu Perfil
        </h1>
      </div>

      <div style={{ background: '#fff', borderRadius: '16px', border: '1px solid #f0f2f5', boxShadow: '0 1px 6px rgba(0,0,0,0.04)', padding: '32px' }}>
        {/* Avatar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px', marginBottom: '28px', paddingBottom: '28px', borderBottom: '1px solid #f0f2f5' }}>
          <div style={{
            width: '64px', height: '64px', borderRadius: '50%',
            background: 'color-mix(in srgb, var(--color-primary) 15%, white)',
            color: 'var(--color-primary)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '22px', fontWeight: 700, flexShrink: 0,
          }}>
            {initials}
          </div>
          <div>
            <p style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: '#1a2530' }}>{user?.name}</p>
            <p style={{ margin: '3px 0 0', fontSize: '13px', color: '#94a3b8' }}>
              {user?.roles?.map((r) => ROLE_LABEL[r] ?? r).join(', ')}
            </p>
          </div>
        </div>

        {/* Campos */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {[
            { label: 'Nome', value: user?.name },
            { label: 'E-mail', value: user?.email },
            { label: 'Telefone', value: user?.phone ?? '—' },
            { label: 'Perfil de acesso', value: user?.roles?.map((r) => ROLE_LABEL[r] ?? r).join(', ') },
          ].map(({ label, value }) => (
            <div key={label}>
              <p style={{ margin: '0 0 3px', fontSize: '11px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                {label}
              </p>
              <p style={{ margin: 0, fontSize: '14px', color: '#1a2530' }}>{value}</p>
            </div>
          ))}
        </div>

        {/* Link alterar senha */}
        <div style={{ marginTop: '28px', paddingTop: '20px', borderTop: '1px solid #f0f2f5' }}>
          <button
            onClick={() => void navigate({ to: '/app/$slug/change-password', params: { slug } })}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: '8px',
              padding: '9px 16px', borderRadius: '10px',
              border: '1.5px solid #e2e8f0', background: '#fff',
              color: '#374151', fontSize: '13px', fontWeight: 600,
              cursor: 'pointer', fontFamily: 'var(--font-sans)',
            }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = '#f8fafc' }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = '#fff' }}
          >
            <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
            </svg>
            Alterar senha
          </button>
        </div>
      </div>
    </div>
  )
}
