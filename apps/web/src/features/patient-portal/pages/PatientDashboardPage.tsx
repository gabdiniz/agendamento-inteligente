// ─── Patient Dashboard Page ───────────────────────────────────────────────────
//
// Visão geral do paciente: boas-vindas + próximos agendamentos.
// Rota: /:slug/minha-conta (index)
// ─────────────────────────────────────────────────────────────────────────────

import { useEffect, useState } from 'react'
import { useParams, Link } from '@tanstack/react-router'
import { usePatientAuthStore } from '@/stores/patient-auth.store'
import { patientPortalApi, type PatientAppointment, type PatientLoyalty, type PatientTier } from '@/lib/api/patient-auth.api'

// ─── Status helpers ───────────────────────────────────────────────────────────

const STATUS_LABEL: Record<string, string> = {
  SCHEDULED:       'Agendado',
  PATIENT_PRESENT: 'Paciente presente',
  IN_PROGRESS:     'Em andamento',
  COMPLETED:       'Concluído',
  CANCELED:        'Cancelado',
}

const STATUS_COLORS: Record<string, { bg: string; color: string }> = {
  SCHEDULED:       { bg: 'color-mix(in srgb, var(--color-primary) 12%, white)', color: 'var(--color-primary)' },
  PATIENT_PRESENT: { bg: '#eff6ff', color: '#1d4ed8' },
  IN_PROGRESS:     { bg: '#fef3c7', color: '#92400e' },
  COMPLETED:       { bg: '#f0fdf4', color: '#166534' },
  CANCELED:        { bg: '#fef2f2', color: '#b91c1c' },
}

function formatDate(iso: string) {
  const [y, m, d] = iso.split('-')
  return new Date(Number(y), Number(m) - 1, Number(d)).toLocaleDateString('pt-BR', {
    weekday: 'short', day: 'numeric', month: 'short',
  })
}

// ─── Gamificação: helpers de tier ─────────────────────────────────────────────

const TIER_CONFIG: Record<PatientTier, { label: string; emoji: string; color: string; bg: string; border: string }> = {
  BRONZE: { label: 'Bronze', emoji: '🥉', color: '#92400e', bg: '#fef3c7', border: '#fde68a' },
  SILVER: { label: 'Prata',  emoji: '🥈', color: '#374151', bg: '#f3f4f6', border: '#d1d5db' },
  GOLD:   { label: 'Ouro',   emoji: '🥇', color: '#92400e', bg: '#fffbeb', border: '#fcd34d' },
}

const TIER_THRESHOLDS: Record<PatientTier, number> = { BRONZE: 0, SILVER: 150, GOLD: 400 }

function getTierProgress(tier: PatientTier, lifetimePoints: number) {
  if (tier === 'GOLD') {
    return { progress: 100, earned: lifetimePoints, needed: 0, nextTier: null as PatientTier | null }
  }
  if (tier === 'SILVER') {
    const earned = lifetimePoints - 150
    const needed = 250  // 400 - 150
    return { progress: Math.min(100, Math.round((earned / needed) * 100)), earned, needed, nextTier: 'GOLD' as PatientTier }
  }
  // BRONZE
  const needed = 150
  return { progress: Math.min(100, Math.round((lifetimePoints / needed) * 100)), earned: lifetimePoints, needed, nextTier: 'SILVER' as PatientTier }
}

// ─── LoyaltyCard ──────────────────────────────────────────────────────────────

function LoyaltyCard({ loyalty, justEarned }: { loyalty: PatientLoyalty; justEarned: boolean }) {
  const tier  = loyalty.tier
  const cfg   = TIER_CONFIG[tier]
  const prog  = getTierProgress(tier, loyalty.lifetimePoints)

  return (
    <div style={{
      background: '#fff',
      borderRadius: '16px',
      border: `1.5px solid ${cfg.border}`,
      padding: '18px 20px',
      marginBottom: '28px',
      position: 'relative' as const,
      overflow: 'hidden' as const,
      animation: justEarned ? 'pointsBounce 0.6s cubic-bezier(0.34, 1.56, 0.64, 1)' : undefined,
    }}>
      {/* Fundo decorativo */}
      <div aria-hidden style={{
        position: 'absolute', top: '-20px', right: '-20px',
        width: '100px', height: '100px', borderRadius: '50%',
        background: cfg.bg, opacity: 0.6, pointerEvents: 'none',
      }} />

      <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '14px', position: 'relative' as const }}>
        {/* Badge de tier */}
        <div style={{
          width: '48px', height: '48px', borderRadius: '14px', flexShrink: 0,
          background: cfg.bg, border: `2px solid ${cfg.border}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '24px',
        }}>
          {cfg.emoji}
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
            <span style={{ fontSize: '22px', fontWeight: 800, color: '#1a1614', lineHeight: 1 }}>
              {loyalty.loyaltyPoints}
            </span>
            <span style={{ fontSize: '12px', color: '#8a7f75', fontWeight: 500 }}>pontos</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px' }}>
            <span style={{
              fontSize: '11px', fontWeight: 700,
              letterSpacing: '0.05em', textTransform: 'uppercase' as const,
              color: cfg.color, background: cfg.bg,
              padding: '2px 8px', borderRadius: '20px',
              border: `1px solid ${cfg.border}`,
            }}>
              {cfg.label}
            </span>
            {prog.nextTier && (
              <span style={{ fontSize: '11px', color: '#b0a899' }}>
                faltam {prog.needed - prog.earned} pts para {TIER_CONFIG[prog.nextTier].label}
              </span>
            )}
            {!prog.nextTier && (
              <span style={{ fontSize: '11px', color: cfg.color, fontWeight: 600 }}>Nível máximo! 🎉</span>
            )}
          </div>
        </div>
      </div>

      {/* Barra de progresso */}
      {prog.nextTier && (
        <div>
          <div style={{
            width: '100%', height: '6px', borderRadius: '20px',
            background: '#f0ece7', overflow: 'hidden',
          }}>
            <div style={{
              height: '100%', borderRadius: '20px',
              background: `linear-gradient(90deg, var(--color-primary), color-mix(in srgb, var(--color-primary) 70%, white))`,
              width: `${prog.progress}%`,
              transition: 'width 1s cubic-bezier(0.34, 1.56, 0.64, 1)',
            }} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px' }}>
            <span style={{ fontSize: '10px', color: '#b0a899' }}>{TIER_CONFIG[tier].label}</span>
            <span style={{ fontSize: '10px', color: '#b0a899' }}>{TIER_CONFIG[prog.nextTier].label}</span>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Component ────────────────────────────────────────────────────────────────

export function PatientDashboardPage() {
  const params = useParams({ strict: false }) as { slug?: string }
  const slug = params.slug ?? ''
  const { patient, updatePatient } = usePatientAuthStore()

  const [upcoming, setUpcoming]     = useState<PatientAppointment[]>([])
  const [loyalty, setLoyalty]       = useState<PatientLoyalty | null>(patient?.loyalty ?? null)
  const [justEarned, setJustEarned] = useState(false)
  const [loading, setLoading]       = useState(true)

  const firstName = patient?.name?.split(' ')[0] ?? 'Paciente'

  useEffect(() => {
    if (!slug) return

    // Busca agendamentos e perfil (com loyalty) em paralelo
    Promise.all([
      patientPortalApi.listAppointments(slug, { upcoming: true, limit: 3 }),
      patientPortalApi.getProfile(slug),
    ])
      .then(([apts, profile]) => {
        setUpcoming(apts.data ?? [])
        if (profile.loyalty) {
          const prev = loyalty?.loyaltyPoints ?? 0
          if (profile.loyalty.loyaltyPoints > prev) setJustEarned(true)
          setLoyalty(profile.loyalty)
          updatePatient({ loyalty: profile.loyalty })
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug])

  return (
    <div style={{
      maxWidth: '640px',
      margin: '0 auto',
      padding: 'clamp(24px, 5vw, 40px) clamp(16px, 4vw, 32px)',
      animation: 'fadeUp 0.35s ease both',
    }}>
      {/* Saudação */}
      <div style={{ marginBottom: '32px' }}>
        <h1 style={{
          fontFamily: 'var(--font-display)',
          fontSize: 'clamp(22px, 5vw, 28px)',
          fontStyle: 'italic',
          color: '#1a1614',
          margin: '0 0 6px',
          lineHeight: 1.2,
        }}>
          Olá, {firstName} 👋
        </h1>
        <p style={{ fontSize: '14px', color: '#8a7f75', margin: 0 }}>
          Aqui estão seus próximos agendamentos.
        </p>
      </div>

      {/* Quick actions */}
      <div style={{ display: 'flex', gap: '12px', marginBottom: '32px', flexWrap: 'wrap' as const }}>
        <Link
          to="/$slug"
          params={{ slug }}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: '8px',
            padding: '11px 20px', borderRadius: '12px',
            background: 'var(--color-primary)', color: '#fff',
            textDecoration: 'none', fontSize: '14px', fontWeight: 600,
            boxShadow: '0 4px 12px color-mix(in srgb, var(--color-primary) 35%, transparent)',
            transition: 'all 0.2s',
          }}
        >
          <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Novo agendamento
        </Link>

        <Link
          to="/$slug/minha-conta/$section"
          params={{ slug, section: 'agendamentos' }}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: '8px',
            padding: '11px 20px', borderRadius: '12px',
            background: '#fff', color: '#5a4f47',
            textDecoration: 'none', fontSize: '14px', fontWeight: 500,
            border: '1.5px solid #ece9e4',
            transition: 'all 0.2s',
          }}
        >
          Ver histórico
        </Link>
      </div>

      {/* Loyalty card */}
      {loyalty && <LoyaltyCard loyalty={loyalty} justEarned={justEarned} />}

      {/* Próximos agendamentos */}
      <div>
        <h2 style={{
          fontSize: '13px', fontWeight: 700,
          letterSpacing: '0.06em', textTransform: 'uppercase' as const,
          color: '#b0a899', margin: '0 0 14px',
        }}>
          Próximos agendamentos
        </h2>

        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {[1, 2].map((i) => (
              <div key={i} style={{
                background: '#fff', borderRadius: '14px',
                border: '1px solid #ece9e4',
                padding: '16px', height: '80px',
                animation: 'pulse 1.5s ease-in-out infinite',
              }} />
            ))}
          </div>
        ) : upcoming.length === 0 ? (
          <div style={{
            background: '#fff', borderRadius: '14px',
            border: '1.5px dashed #e5e1db',
            padding: '32px', textAlign: 'center',
          }}>
            <svg width="40" height="40" fill="none" stroke="#c8c0b8" viewBox="0 0 24 24" style={{ margin: '0 auto 12px', display: 'block' }}>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <p style={{ fontSize: '14px', fontWeight: 500, color: '#8a7f75', margin: '0 0 4px' }}>
              Nenhum agendamento próximo
            </p>
            <p style={{ fontSize: '12px', color: '#c0b4aa', margin: 0 }}>
              Que tal agendar agora?
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {upcoming.map((apt) => {
              const sc = STATUS_COLORS[apt.status] ?? STATUS_COLORS.SCHEDULED!
              return (
                <div
                  key={apt.id}
                  style={{
                    background: '#fff',
                    borderRadius: '14px',
                    border: '1px solid #ece9e4',
                    padding: '16px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '14px',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                    transition: 'box-shadow 0.2s',
                  }}
                >
                  {/* Data pill */}
                  <div style={{
                    flexShrink: 0, textAlign: 'center',
                    width: '52px',
                    background: 'color-mix(in srgb, var(--color-primary) 8%, white)',
                    borderRadius: '10px', padding: '8px 4px',
                  }}>
                    <p style={{ fontSize: '20px', fontWeight: 700, color: 'var(--color-primary)', margin: 0, lineHeight: 1 }}>
                      {apt.scheduledDate.split('-')[2]}
                    </p>
                    <p style={{ fontSize: '10px', fontWeight: 600, color: 'color-mix(in srgb, var(--color-primary) 70%, #555)', margin: '3px 0 0', textTransform: 'uppercase' as const, letterSpacing: '0.04em' }}>
                      {new Date(apt.scheduledDate + 'T12:00:00').toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '')}
                    </p>
                  </div>

                  {/* Info */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: '14px', fontWeight: 600, color: '#1a1614', margin: '0 0 3px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {apt.procedure.name}
                    </p>
                    <p style={{ fontSize: '12px', color: '#8a7f75', margin: 0 }}>
                      {apt.professional.name} · {apt.startTime}
                    </p>
                  </div>

                  {/* Status */}
                  <span style={{
                    flexShrink: 0, padding: '4px 10px', borderRadius: '20px',
                    fontSize: '11px', fontWeight: 600,
                    background: sc.bg, color: sc.color,
                  }}>
                    {STATUS_LABEL[apt.status] ?? apt.status}
                  </span>
                </div>
              )
            })}

            {upcoming.length >= 3 && (
              <Link
                to="/$slug/minha-conta/$section"
                params={{ slug, section: 'agendamentos' }}
                style={{
                  textAlign: 'center', fontSize: '13px',
                  color: 'var(--color-primary)', fontWeight: 600,
                  textDecoration: 'none', padding: '12px',
                  display: 'block',
                }}
              >
                Ver todos os agendamentos →
              </Link>
            )}
          </div>
        )}
      </div>

      <style>{`
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(10px) }
          to   { opacity: 1; transform: translateY(0) }
        }
        @keyframes pulse {
          0%, 100% { opacity: 1 }
          50%       { opacity: 0.5 }
        }
        @keyframes pointsBounce {
          0%   { transform: scale(1) }
          30%  { transform: scale(1.04) }
          60%  { transform: scale(0.97) }
          100% { transform: scale(1) }
        }
      `}</style>
    </div>
  )
}
