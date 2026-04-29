// ─── Patient Appointments Page ────────────────────────────────────────────────
//
// Histórico completo de agendamentos do paciente.
// Abas: Próximos / Histórico. Cancel inline para agendamentos elegíveis.
// M9 — Avaliação rápida inline para agendamentos COMPLETED sem quickRating.
// Rota: /:slug/minha-conta/agendamentos
// ─────────────────────────────────────────────────────────────────────────────

import { useEffect, useRef, useState } from 'react'
import { useParams } from '@tanstack/react-router'
import { patientPortalApi, type PatientAppointment, type QuickRating } from '@/lib/api/patient-auth.api'
import { QuickRatingCard } from '../components/QuickRatingCard'
import { DetailedRatingCard } from '../components/DetailedRatingCard'

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

function formatDateFull(iso: string) {
  const [y, m, d] = iso.split('-')
  return new Date(Number(y), Number(m) - 1, Number(d)).toLocaleDateString('pt-BR', {
    weekday: 'long', day: 'numeric', month: 'long',
  })
}

// ─── Appointment Card ─────────────────────────────────────────────────────────

function AppointmentCard({
  apt,
  slug,
  onCancel,
  canceling,
  onRated,
  onDetailedRated,
}: {
  apt: PatientAppointment
  slug: string
  onCancel: (id: string) => void
  canceling: string | null
  onRated: (id: string, rating: QuickRating) => void
  onDetailedRated: (id: string, rating: number) => void
}) {
  const sc = STATUS_COLORS[apt.status] ?? STATUS_COLORS['SCHEDULED']!
  const canCancel   = apt.status === 'SCHEDULED'
  const isCanceling = canceling === apt.id

  // ── Estado local para os dois momentos de avaliação ──────────────────────
  const [localQuickRating, setLocalQuickRating] = useState<QuickRating | null>(
    apt.evaluation?.quickRating ?? null,
  )
  const [localDetailedRating, setLocalDetailedRating] = useState<number | null>(
    apt.evaluation?.rating ?? null,
  )
  const [skippedDetailed, setSkippedDetailed] = useState(false)
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Sync externo ao receber atualização do pai
  useEffect(() => {
    if (apt.evaluation?.quickRating  != null && localQuickRating   == null) setLocalQuickRating(apt.evaluation.quickRating)
    if (apt.evaluation?.rating       != null && localDetailedRating == null) setLocalDetailedRating(apt.evaluation.rating)
  }, [apt.evaluation?.quickRating, apt.evaluation?.rating]) // eslint-disable-line

  useEffect(() => () => {
    if (hideTimerRef.current) clearTimeout(hideTimerRef.current)
  }, [])

  const displayQuickRating   = localQuickRating   ?? apt.evaluation?.quickRating
  const displayDetailedRating = localDetailedRating ?? apt.evaluation?.rating

  // Qual card exibir?
  const showQuickRating    = apt.status === 'COMPLETED' && displayQuickRating == null
  const showDetailedRating = apt.status === 'COMPLETED'
    && displayQuickRating != null
    && displayDetailedRating == null
    && !skippedDetailed

  async function handleQuickRating(rating: QuickRating, reasons: string[]) {
    await patientPortalApi.submitQuickRating(slug, apt.id, rating, reasons)
    onRated(apt.id, rating)
    hideTimerRef.current = setTimeout(() => setLocalQuickRating(rating), 1500)
  }

  async function handleDetailedRating(rating: number, comment?: string) {
    await patientPortalApi.submitDetailedRating(slug, apt.id, rating, comment)
    onDetailedRated(apt.id, rating)
    hideTimerRef.current = setTimeout(() => setLocalDetailedRating(rating), 1500)
  }

  return (
    <div style={{
      background:   '#fff',
      borderRadius: '14px',
      border:       '1px solid #ece9e4',
      overflow:     'hidden',
      boxShadow:    '0 1px 3px rgba(0,0,0,0.04)',
    }}>
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '14px 16px',
        borderBottom: '1px solid #f5f0eb',
        gap: '12px',
      }}>
        <div>
          <p style={{ fontSize: '13px', fontWeight: 600, color: '#8a7f75', margin: '0 0 2px', textTransform: 'capitalize' as const }}>
            {formatDateFull(apt.scheduledDate)}
          </p>
          <p style={{ fontSize: '16px', fontWeight: 700, color: '#1a1614', margin: 0 }}>
            {apt.startTime} — {apt.procedure.name}
          </p>
        </div>
        <span style={{
          flexShrink: 0, padding: '4px 12px', borderRadius: '20px',
          fontSize: '11px', fontWeight: 600,
          background: sc.bg, color: sc.color,
        }}>
          {STATUS_LABEL[apt.status] ?? apt.status}
        </span>
      </div>

      {/* Body */}
      <div style={{ padding: '14px 16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '36px', height: '36px', borderRadius: '50%', flexShrink: 0,
              background: 'color-mix(in srgb, var(--color-primary) 15%, white)',
              color: 'var(--color-primary)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '13px', fontWeight: 700,
            }}>
              {apt.professional.name.charAt(0)}
            </div>
            <div>
              <p style={{ fontSize: '13px', fontWeight: 600, color: '#1a1614', margin: 0 }}>
                {apt.professional.name}
              </p>
              {apt.professional.specialty && (
                <p style={{ fontSize: '11px', color: '#b0a899', margin: '1px 0 0' }}>
                  {apt.professional.specialty}
                </p>
              )}
            </div>
          </div>

          {canCancel && (
            <button
              onClick={() => onCancel(apt.id)}
              disabled={isCanceling}
              style={{
                padding: '7px 14px', borderRadius: '8px',
                background: 'transparent', border: '1.5px solid #fecaca',
                color: '#dc2626', fontSize: '12px', fontWeight: 600,
                cursor: isCanceling ? 'wait' : 'pointer',
                opacity: isCanceling ? 0.7 : 1,
                fontFamily: 'var(--font-sans)',
                transition: 'all 0.2s', flexShrink: 0,
              }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = '#fef2f2' }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'transparent' }}
            >
              {isCanceling ? 'Cancelando...' : 'Cancelar'}
            </button>
          )}

          {/* Badge: avaliação completa (com nota numérica) */}
          {apt.status === 'COMPLETED' && displayDetailedRating != null && (
            <span style={{
              display: 'flex', alignItems: 'center', gap: '4px',
              fontSize: '11px', color: '#92400e', fontWeight: 600,
              background: '#fef3c7', padding: '4px 10px', borderRadius: '20px',
              flexShrink: 0,
            }}>
              ⭐ {displayDetailedRating}/5
            </span>
          )}

          {/* Badge: só quick rating enviado (aguardando nota detalhada) */}
          {apt.status === 'COMPLETED' && displayDetailedRating == null && displayQuickRating != null && skippedDetailed && (
            <span style={{
              display: 'flex', alignItems: 'center', gap: '4px',
              fontSize: '11px', color: '#166534', fontWeight: 600,
              background: '#f0fdf4', padding: '4px 10px', borderRadius: '20px',
              flexShrink: 0,
            }}>
              {displayQuickRating === 'POSITIVE' ? '😊'
                : displayQuickRating === 'NEUTRAL' ? '😐'
                : '😞'} Avaliado
            </span>
          )}
        </div>

        {/* Momento 1 — Quick Rating (emoji) */}
        {showQuickRating && (
          <QuickRatingCard
            appointmentId={apt.id}
            professionalName={apt.professional.name}
            onSubmit={handleQuickRating}
          />
        )}

        {/* Momento 2 — Avaliação detalhada (estrelas + comentário) */}
        {showDetailedRating && (
          <DetailedRatingCard
            professionalName={apt.professional.name}
            onSubmit={handleDetailedRating}
            onSkip={() => setSkippedDetailed(true)}
          />
        )}
      </div>
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function PatientAppointmentsPage() {
  const params = useParams({ strict: false }) as { slug?: string }
  const slug = params.slug ?? ''

  type Tab = 'upcoming' | 'past'
  const [tab, setTab]           = useState<Tab>('upcoming')
  const [appointments, setAppointments] = useState<PatientAppointment[]>([])
  const [loading, setLoading]   = useState(true)
  const [canceling, setCanceling] = useState<string | null>(null)
  const [cancelError, setCancelError] = useState<string | null>(null)
  const [confirmId, setConfirmId] = useState<string | null>(null)

  function loadAppointments(t: Tab) {
    setLoading(true)
    setCancelError(null)
    patientPortalApi.listAppointments(slug, {
      upcoming: t === 'upcoming',
      limit: 50,
    })
      .then((res) => setAppointments(res.data ?? []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }

  useEffect(() => { if (slug) loadAppointments(tab) }, [slug, tab]) // eslint-disable-line

  async function handleCancel(id: string) {
    setConfirmId(null)
    setCanceling(id)
    setCancelError(null)
    try {
      const updated = await patientPortalApi.cancelAppointment(slug, id)
      setAppointments((prev) => prev.map((a) => (a.id === id ? updated : a)))
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error
      setCancelError(msg ?? 'Não foi possível cancelar. Tente novamente.')
    } finally {
      setCanceling(null)
    }
  }

  // Após quick rating, atualiza evaluation no state local (sem refetch)
  function handleRated(id: string, quickRating: QuickRating) {
    setAppointments((prev) =>
      prev.map((a) =>
        a.id === id
          ? {
              ...a,
              evaluation: {
                id:                 a.evaluation?.id ?? '',
                quickRating,
                quickRatingReasons: [],
                rating:             a.evaluation?.rating ?? null,
                comment:            a.evaluation?.comment ?? null,
              },
            }
          : a,
      ),
    )
  }

  // Após avaliação detalhada, atualiza rating no state local
  function handleDetailedRated(id: string, rating: number) {
    setAppointments((prev) =>
      prev.map((a) =>
        a.id === id
          ? {
              ...a,
              evaluation: {
                id:                 a.evaluation?.id ?? '',
                quickRating:        a.evaluation?.quickRating ?? null,
                quickRatingReasons: a.evaluation?.quickRatingReasons ?? [],
                rating,
                comment:            a.evaluation?.comment ?? null,
              },
            }
          : a,
      ),
    )
  }

  const tabStyle = (active: boolean): React.CSSProperties => ({
    padding:    '10px 20px',
    borderRadius: '10px',
    fontSize:   '13px',
    fontWeight: active ? 600 : 500,
    color:      active ? 'var(--color-primary)' : '#8a7f75',
    background: active ? 'color-mix(in srgb, var(--color-primary) 10%, white)' : 'transparent',
    border:     active ? '1.5px solid color-mix(in srgb, var(--color-primary) 20%, transparent)' : '1.5px solid #ece9e4',
    cursor:     'pointer',
    fontFamily: 'var(--font-sans)',
    transition: 'all 0.15s',
  })

  return (
    <div style={{
      maxWidth: '640px',
      margin:   '0 auto',
      padding:  'clamp(24px, 5vw, 40px) clamp(16px, 4vw, 32px)',
      animation: 'fadeUp 0.35s ease both',
    }}>
      {/* Header */}
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{
          fontFamily: 'var(--font-display)',
          fontSize:   'clamp(22px, 5vw, 26px)',
          fontStyle:  'italic',
          color:      '#1a1614', margin: '0 0 4px', lineHeight: 1.2,
        }}>
          Meus Agendamentos
        </h1>
        <p style={{ fontSize: '13px', color: '#8a7f75', margin: 0 }}>
          Histórico completo de consultas e procedimentos.
        </p>
      </div>

      {/* Abas */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '20px' }}>
        <button style={tabStyle(tab === 'upcoming')} onClick={() => setTab('upcoming')}>
          Próximos
        </button>
        <button style={tabStyle(tab === 'past')} onClick={() => setTab('past')}>
          Histórico
        </button>
      </div>

      {/* Erro de cancelamento */}
      {cancelError && (
        <div style={{
          marginBottom: '16px', padding: '12px 14px', borderRadius: '10px',
          background: '#fff5f5', border: '1.5px solid #fecaca',
          fontSize: '13px', color: '#b91c1c',
          display: 'flex', gap: '8px', alignItems: 'center',
        }}>
          <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ flexShrink: 0 }}>
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          {cancelError}
        </div>
      )}

      {/* Lista */}
      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {[1, 2, 3].map((i) => (
            <div key={i} style={{
              background: '#fff', borderRadius: '14px', border: '1px solid #ece9e4',
              height: '100px', animation: 'pulse 1.5s ease-in-out infinite',
            }} />
          ))}
        </div>
      ) : appointments.length === 0 ? (
        <div style={{
          background: '#fff', borderRadius: '14px',
          border: '1.5px dashed #e5e1db',
          padding: '40px 24px', textAlign: 'center',
        }}>
          <svg width="40" height="40" fill="none" stroke="#c8c0b8" viewBox="0 0 24 24" style={{ margin: '0 auto 12px', display: 'block' }}>
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          <p style={{ fontSize: '14px', fontWeight: 500, color: '#8a7f75', margin: '0 0 4px' }}>
            {tab === 'upcoming' ? 'Nenhum agendamento próximo' : 'Nenhum histórico encontrado'}
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {[...appointments].reverse().map((apt) => (
            <AppointmentCard
              key={apt.id}
              apt={apt}
              slug={slug}
              onCancel={(id) => setConfirmId(id)}
              canceling={canceling}
              onRated={handleRated}
              onDetailedRated={handleDetailedRated}
            />
          ))}
        </div>
      )}

      {/* Modal confirmação cancelamento */}
      {confirmId && (
        <>
          <div
            style={{ position: 'fixed', inset: 0, background: 'rgba(26,22,20,0.5)', zIndex: 100, backdropFilter: 'blur(2px)' }}
            onClick={() => setConfirmId(null)}
          />
          <div style={{
            position: 'fixed', top: '50%', left: '50%',
            transform: 'translate(-50%, -50%)',
            background: '#fff', borderRadius: '20px',
            padding: '28px', width: '90%', maxWidth: '360px',
            zIndex: 101, boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
            animation: 'scaleIn 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
          }}>
            <div style={{
              width: '48px', height: '48px', borderRadius: '50%',
              background: '#fef2f2', margin: '0 auto 16px',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <svg width="22" height="22" fill="none" stroke="#dc2626" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h3 style={{
              fontFamily: 'var(--font-display)',
              fontSize: '20px', fontStyle: 'italic',
              textAlign: 'center', color: '#1a1614',
              margin: '0 0 8px',
            }}>Cancelar agendamento?</h3>
            <p style={{ fontSize: '13px', color: '#8a7f75', textAlign: 'center', margin: '0 0 24px', lineHeight: 1.6 }}>
              Esta ação não pode ser desfeita. Deseja confirmar o cancelamento?
            </p>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                onClick={() => setConfirmId(null)}
                style={{
                  flex: 1, padding: '11px', borderRadius: '10px',
                  background: 'transparent', border: '1.5px solid #ece9e4',
                  color: '#5a4f47', fontSize: '14px', fontWeight: 500,
                  cursor: 'pointer', fontFamily: 'var(--font-sans)',
                }}
              >
                Manter
              </button>
              <button
                onClick={() => void handleCancel(confirmId)}
                style={{
                  flex: 1, padding: '11px', borderRadius: '10px',
                  background: '#dc2626', border: 'none',
                  color: '#fff', fontSize: '14px', fontWeight: 600,
                  cursor: 'pointer', fontFamily: 'var(--font-sans)',
                }}
              >
                Cancelar
              </button>
            </div>
          </div>
        </>
      )}

      <style>{`
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(10px) }
          to   { opacity: 1; transform: translateY(0) }
        }
        @keyframes pulse {
          0%, 100% { opacity: 1 } 50% { opacity: 0.5 }
        }
        @keyframes scaleIn {
          from { opacity: 0; transform: translate(-50%, -50%) scale(0.92) }
          to   { opacity: 1; transform: translate(-50%, -50%) scale(1) }
        }
      `}</style>
    </div>
  )
}
