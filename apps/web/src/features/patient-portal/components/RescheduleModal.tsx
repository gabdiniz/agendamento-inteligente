// ─── RescheduleModal ──────────────────────────────────────────────────────────
//
// Modal para o paciente remarcar um agendamento cancelado.
// Mantém o mesmo profissional e procedimento — apenas data e horário mudam.
//
// Fluxo: escolher data → carregar slots disponíveis → confirmar
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useEffect } from 'react'
import { patientPortalApi, type PatientAppointment } from '@/lib/api/patient-auth.api'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function todayISO(): string {
  return new Date().toISOString().slice(0, 10)
}

function addDays(dateStr: string, n: number): string {
  const d = new Date(`${dateStr}T12:00:00`)
  d.setDate(d.getDate() + n)
  return d.toISOString().slice(0, 10)
}

function formatDateLabel(dateStr: string): string {
  return new Intl.DateTimeFormat('pt-BR', {
    weekday: 'short', day: 'numeric', month: 'short',
  }).format(new Date(`${dateStr}T12:00:00`))
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface Props {
  slug: string
  appointment: PatientAppointment
  onClose: () => void
  onSuccess: (newAppointment: PatientAppointment) => void
}

// ─── Component ────────────────────────────────────────────────────────────────

export function RescheduleModal({ slug, appointment, onClose, onSuccess }: Props) {
  const [date,      setDate]      = useState(todayISO())
  const [slots,     setSlots]     = useState<{ startTime: string; endTime: string }[]>([])
  const [loadingSlots, setLoadingSlots] = useState(false)
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null)
  const [submitting,   setSubmitting]   = useState(false)
  const [error,        setError]        = useState<string | null>(null)

  // Busca slots toda vez que a data muda
  useEffect(() => {
    setSlots([])
    setSelectedSlot(null)
    setError(null)
    setLoadingSlots(true)
    patientPortalApi
      .getAvailableSlots(slug, {
        professionalId: appointment.professional.id,
        procedureId:    appointment.procedure.id,
        date,
      })
      .then(setSlots)
      .catch(() => setError('Nao foi possivel carregar os horarios. Tente novamente.'))
      .finally(() => setLoadingSlots(false))
  }, [date, slug, appointment.professional.id, appointment.procedure.id])

  async function handleConfirm() {
    if (!selectedSlot) return
    setSubmitting(true)
    setError(null)
    try {
      const newAppointment = await patientPortalApi.rescheduleAppointment(slug, appointment.id, {
        scheduledDate: date,
        startTime:     selectedSlot,
      })
      onSuccess(newAppointment)
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string; error?: string } } })?.response?.data?.message
        ?? (err as { response?: { data?: { error?: string } } })?.response?.data?.error
      setError(msg ?? 'Nao foi possivel remarcar. Tente novamente.')
      setSubmitting(false)
    }
  }

  // ─── Render ───────────────────────────────────────────────────────────────

  const base = (import.meta.env.VITE_API_URL as string) ?? ''

  const btnBase: React.CSSProperties = {
    border: 'none', borderRadius: '10px', padding: '10px 18px',
    fontSize: '13px', fontWeight: 700, cursor: 'pointer',
    fontFamily: 'var(--font-sans)', transition: 'opacity 0.15s',
  }

  return (
    <>
      <style>{`
        @keyframes rmFadeIn  { from { opacity: 0 } to { opacity: 1 } }
        @keyframes rmSlideUp { from { opacity: 0; transform: translateY(20px) } to { opacity: 1; transform: translateY(0) } }
        @keyframes spin      { to { transform: rotate(360deg) } }
      `}</style>

      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0,
          background: 'rgba(15,23,42,0.50)',
          backdropFilter: 'blur(3px)',
          zIndex: 1200,
          animation: 'rmFadeIn 0.2s ease both',
        }}
      />

      {/* Modal */}
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          position: 'fixed', inset: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 1201, padding: '16px', pointerEvents: 'none',
        }}
      >
        <div style={{
          background: '#fff', borderRadius: '20px',
          boxShadow: '0 24px 80px rgba(0,0,0,0.20)',
          width: '100%', maxWidth: '460px',
          maxHeight: '90vh', overflowY: 'auto',
          pointerEvents: 'auto',
          animation: 'rmSlideUp 0.28s cubic-bezier(0.16,1,0.3,1) both',
        }}>

          {/* Header */}
          <div style={{ padding: '24px 24px 0', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
            <div>
              <h3 style={{ margin: 0, fontSize: '17px', fontWeight: 700, color: '#1a2530' }}>
                Remarcar agendamento
              </h3>
              <p style={{ margin: '5px 0 0', fontSize: '13px', color: '#64748b' }}>
                Escolha uma nova data e horario
              </p>
            </div>
            <button onClick={onClose} style={{
              width: '30px', height: '30px', borderRadius: '50%',
              background: '#f1f5f9', border: 'none', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#64748b', flexShrink: 0,
            }}>
              <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div style={{ padding: '20px 24px 28px' }}>

            {/* Info do profissional e procedimento */}
            <div style={{
              display: 'flex', alignItems: 'center', gap: '12px',
              padding: '12px 14px', borderRadius: '12px',
              background: '#f8fafc', border: '1px solid #e2e8f0',
              marginBottom: '20px',
            }}>
              {appointment.professional.avatarUrl ? (
                <img
                  src={`${base}${appointment.professional.avatarUrl}`}
                  alt={appointment.professional.name}
                  style={{ width: '38px', height: '38px', borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }}
                />
              ) : (
                <div style={{
                  width: '38px', height: '38px', borderRadius: '50%', flexShrink: 0,
                  background: 'var(--color-primary)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: '#fff', fontSize: '15px', fontWeight: 700,
                }}>
                  {appointment.professional.name.slice(0, 1).toUpperCase()}
                </div>
              )}
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: '13px', fontWeight: 700, color: '#1a2530', lineHeight: 1.3 }}>
                  {appointment.professional.name}
                </div>
                <div style={{ fontSize: '12px', color: '#64748b', lineHeight: 1.3 }}>
                  {appointment.procedure.name} &middot; {appointment.procedure.durationMinutes} min
                </div>
              </div>
            </div>

            {/* Seletor de data */}
            <div style={{ marginBottom: '16px' }}>
              <p style={{ margin: '0 0 8px', fontSize: '12px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Nova data
              </p>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <button
                  onClick={() => { if (date > todayISO()) setDate(addDays(date, -1)) }}
                  disabled={date <= todayISO()}
                  style={{
                    width: '34px', height: '34px', borderRadius: '8px',
                    border: '1.5px solid #e2e8f0', background: '#fff',
                    cursor: date <= todayISO() ? 'not-allowed' : 'pointer',
                    opacity: date <= todayISO() ? 0.4 : 1,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#374151',
                  }}
                >
                  <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
                <input
                  type="date"
                  value={date}
                  min={todayISO()}
                  onChange={(e) => e.target.value && setDate(e.target.value)}
                  style={{
                    flex: 1, padding: '8px 10px', borderRadius: '8px',
                    border: '1.5px solid #e2e8f0', fontSize: '13px',
                    fontFamily: 'var(--font-sans)', outline: 'none', color: '#1a2530',
                  }}
                />
                <button
                  onClick={() => setDate(addDays(date, 1))}
                  style={{
                    width: '34px', height: '34px', borderRadius: '8px',
                    border: '1.5px solid #e2e8f0', background: '#fff',
                    cursor: 'pointer', display: 'flex', alignItems: 'center',
                    justifyContent: 'center', color: '#374151',
                  }}
                >
                  <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </div>
              <p style={{ margin: '5px 0 0', fontSize: '12px', color: '#94a3b8', textAlign: 'center' }}>
                {formatDateLabel(date)}
              </p>
            </div>

            {/* Slots disponíveis */}
            <div style={{ marginBottom: '20px' }}>
              <p style={{ margin: '0 0 10px', fontSize: '12px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Horarios disponiveis
              </p>

              {loadingSlots ? (
                <div style={{ display: 'flex', justifyContent: 'center', padding: '20px' }}>
                  <div style={{
                    width: '22px', height: '22px', borderRadius: '50%',
                    border: '2px solid #e2e8f0', borderTopColor: 'var(--color-primary)',
                    animation: 'spin 0.8s linear infinite',
                  }} />
                </div>
              ) : slots.length === 0 ? (
                <div style={{
                  textAlign: 'center', padding: '20px 0',
                  fontSize: '13px', color: '#94a3b8',
                }}>
                  Nenhum horario disponivel neste dia.
                  <br />
                  <span style={{ fontSize: '12px' }}>Tente outra data.</span>
                </div>
              ) : (
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(80px, 1fr))',
                  gap: '8px',
                }}>
                  {slots.map((slot) => {
                    const isSelected = selectedSlot === slot.startTime
                    return (
                      <button
                        key={slot.startTime}
                        onClick={() => setSelectedSlot(slot.startTime)}
                        style={{
                          padding: '9px 4px',
                          borderRadius: '10px',
                          border: isSelected ? '2px solid var(--color-primary)' : '1.5px solid #e2e8f0',
                          background: isSelected ? 'var(--color-primary)' : '#fff',
                          color: isSelected ? '#fff' : '#374151',
                          fontSize: '13px', fontWeight: isSelected ? 700 : 500,
                          cursor: 'pointer', fontFamily: 'var(--font-sans)',
                          transition: 'all 0.15s',
                        }}
                      >
                        {slot.startTime.slice(0, 5)}
                      </button>
                    )
                  })}
                </div>
              )}
            </div>

            {/* Erro */}
            {error && (
              <div style={{
                padding: '10px 14px', borderRadius: '10px',
                background: '#fef2f2', border: '1px solid #fca5a5',
                fontSize: '13px', color: '#b91c1c', marginBottom: '16px',
              }}>
                {error}
              </div>
            )}

            {/* Botões */}
            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={onClose} style={{ ...btnBase, flex: 1, background: '#f1f5f9', color: '#374151' }}>
                Cancelar
              </button>
              <button
                onClick={handleConfirm}
                disabled={!selectedSlot || submitting}
                style={{
                  ...btnBase, flex: 2,
                  background: selectedSlot && !submitting ? 'var(--color-primary)' : '#cbd5e1',
                  color: '#fff',
                  cursor: selectedSlot && !submitting ? 'pointer' : 'not-allowed',
                }}
              >
                {submitting ? 'Remarcando...' : 'Confirmar remarcacao'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
