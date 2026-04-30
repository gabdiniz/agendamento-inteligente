// ─── AppointmentsPage ──────────────────────────────────────────────────────────
//
// Duas views: Lista (tabela filtrada) e Agenda (FullCalendar timeGridWeek).
// Compartilham o filtro de profissional e o botão de novo agendamento.
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useCallback, useRef } from 'react'
import { Link, useNavigate, useParams } from '@tanstack/react-router'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import FullCalendar from '@fullcalendar/react'
import timeGridPlugin from '@fullcalendar/timegrid'
import dayGridPlugin from '@fullcalendar/daygrid'
import interactionPlugin from '@fullcalendar/interaction'
import type { DateSelectArg, EventClickArg, DatesSetArg, EventContentArg, EventDropArg } from '@fullcalendar/core'
import ptBrLocale from '@fullcalendar/core/locales/pt-br'

import { appointmentsApi, professionalsApi, type Appointment, type AppointmentStatusEntry } from '@/lib/api/clinic.api'
import { clinicTokens } from '@/lib/api/client'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function todayISO() {
  return new Date().toISOString().slice(0, 10)
}

function formatDate(iso: string) {
  const [y, m, d] = iso.split('-')
  return `${d}/${m}/${y}`
}

function formatTime(t: string) {
  return t.slice(0, 5)
}

function isoToWeekRange(iso: string): { start: string; end: string } {
  const d = new Date(`${iso}T00:00:00`)
  const day = d.getDay() // 0=Dom
  const mon = new Date(d); mon.setDate(d.getDate() - ((day + 6) % 7))
  const sun = new Date(mon); sun.setDate(mon.getDate() + 6)
  return {
    start: mon.toISOString().slice(0, 10),
    end: sun.toISOString().slice(0, 10),
  }
}

// ─── Status config ────────────────────────────────────────────────────────────

const STATUS_LABEL: Record<string, string> = {
  SCHEDULED:       'Agendado',
  PATIENT_PRESENT: 'Paciente Presente',
  IN_PROGRESS:     'Em Atendimento',
  COMPLETED:       'Concluído',
  CANCELED:        'Cancelado',
}

const STATUS_STYLE: Record<string, { bg: string; color: string; border: string }> = {
  SCHEDULED:       { bg: '#eff6ff', color: '#1d4ed8', border: '#bfdbfe' },
  PATIENT_PRESENT: { bg: '#f0fdf4', color: '#15803d', border: '#bbf7d0' },
  IN_PROGRESS:     { bg: '#faf5ff', color: '#7e22ce', border: '#e9d5ff' },
  COMPLETED:       { bg: '#f0fdf4', color: '#166534', border: '#bbf7d0' },
  CANCELED:        { bg: '#fef2f2', color: '#b91c1c', border: '#fecaca' },
}

const NEXT_ACTIONS: Record<string, Array<{ label: string; status: string; color: string }>> = {
  SCHEDULED: [
    { label: 'Confirmar chegada', status: 'PATIENT_PRESENT', color: '#16a34a' },
  ],
  PATIENT_PRESENT: [
    { label: 'Iniciar atendimento', status: 'IN_PROGRESS', color: '#7c3aed' },
  ],
  IN_PROGRESS: [
    { label: 'Concluir', status: 'COMPLETED', color: '#059669' },
  ],
}

// ─── Status Timeline ──────────────────────────────────────────────────────────

function formatDateTime(iso: string) {
  const d = new Date(iso)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)} às ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

const TIMELINE_DOT: Record<string, { bg: string; border: string; icon: string }> = {
  SCHEDULED:       { bg: '#dbeafe', border: '#3b82f6', icon: '📅' },
  PATIENT_PRESENT: { bg: '#dcfce7', border: '#22c55e', icon: '🚶' },
  IN_PROGRESS:     { bg: '#f3e8ff', border: '#a855f7', icon: '⚕️' },
  COMPLETED:       { bg: '#d1fae5', border: '#10b981', icon: '✓'  },
  CANCELED:        { bg: '#fee2e2', border: '#ef4444', icon: '✕'  },
}

function StatusTimeline({ entries, loading }: { entries?: AppointmentStatusEntry[]; loading: boolean }) {
  if (loading) {
    return (
      <div style={{ padding: '12px 0 4px' }}>
        {[1, 2].map((i) => (
          <div key={i} style={{ display: 'flex', gap: '12px', alignItems: 'flex-start', marginBottom: '16px' }}>
            <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: '#f1f5f9', flexShrink: 0 }} />
            <div style={{ flex: 1 }}>
              <div style={{ height: '11px', width: '60%', background: '#f1f5f9', borderRadius: '4px', marginBottom: '6px' }} />
              <div style={{ height: '10px', width: '40%', background: '#f1f5f9', borderRadius: '4px' }} />
            </div>
          </div>
        ))}
      </div>
    )
  }

  if (!entries || entries.length === 0) return null

  return (
    <div style={{ padding: '4px 0' }}>
      {entries.map((entry, idx) => {
        const dot = TIMELINE_DOT[entry.status] ?? { bg: '#f1f5f9', border: '#94a3b8', icon: '•' }
        const isLast = idx === entries.length - 1
        return (
          <div key={entry.id} style={{ display: 'flex', gap: '12px', alignItems: 'flex-start', position: 'relative' }}>
            {/* Linha vertical conectora */}
            {!isLast && (
              <div style={{
                position: 'absolute',
                left: '13px', top: '28px',
                width: '2px', height: 'calc(100% - 4px)',
                background: '#e2e8f0',
              }} />
            )}

            {/* Dot */}
            <div style={{
              width: '28px', height: '28px', borderRadius: '50%', flexShrink: 0,
              background: dot.bg,
              border: `2px solid ${dot.border}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '11px', fontWeight: 700, color: dot.border,
              zIndex: 1,
            }}>
              {dot.icon}
            </div>

            {/* Conteúdo */}
            <div style={{ flex: 1, paddingBottom: isLast ? 0 : '18px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                <span style={{ fontSize: '12.5px', fontWeight: 700, color: '#1a2530' }}>
                  {STATUS_LABEL[entry.status] ?? entry.status}
                </span>
                <span style={{ fontSize: '11px', color: '#94a3b8', whiteSpace: 'nowrap' }}>
                  {formatDateTime(entry.changedAt)}
                </span>
              </div>
              <p style={{ margin: '2px 0 0', fontSize: '11.5px', color: '#64748b' }}>
                {entry.changedByUser ? entry.changedByUser.name : 'Sistema'}
              </p>
              {entry.notes && (
                <p style={{ margin: '4px 0 0', fontSize: '11.5px', color: '#78716c', fontStyle: 'italic', lineHeight: 1.4 }}>
                  "{entry.notes}"
                </p>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ─── Cancel Modal ─────────────────────────────────────────────────────────────

function CancelModal({
  appointment,
  onConfirm,
  onClose,
  loading,
}: {
  appointment: Appointment
  onConfirm: (reason: string) => void
  onClose: () => void
  loading: boolean
}) {
  const [reason, setReason] = useState('')
  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 200,
        background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px',
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div style={{
        background: '#fff', borderRadius: '18px',
        boxShadow: '0 24px 64px rgba(0,0,0,0.18)',
        width: '100%', maxWidth: '440px', padding: '32px',
        animation: 'fadeUp 0.2s ease',
      }}>
        <h3 style={{ margin: '0 0 6px', fontSize: '17px', fontWeight: 700, color: '#1a2530' }}>
          Cancelar agendamento
        </h3>
        <p style={{ margin: '0 0 18px', fontSize: '13px', color: '#64748b', lineHeight: 1.5 }}>
          {appointment.patient.name} · {formatDate(appointment.scheduledDate)} às {formatTime(appointment.startTime)}
        </p>
        <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#374151', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '6px' }}>
          Motivo (opcional)
        </label>
        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          rows={3}
          placeholder="Ex: paciente solicitou cancelamento"
          style={{
            width: '100%', boxSizing: 'border-box', padding: '10px 12px',
            border: '1.5px solid #e2e8f0', borderRadius: '10px',
            fontSize: '13px', color: '#1a2530', background: '#fff',
            fontFamily: 'var(--font-sans)', resize: 'vertical', outline: 'none',
          }}
        />
        <div className="r-btn-row" style={{ marginTop: '20px' }}>
          <button onClick={onClose} disabled={loading} style={{
            flex: 1, height: '42px', borderRadius: '10px',
            border: '1.5px solid #e2e8f0', background: '#fff', color: '#4a5568',
            fontSize: '14px', fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font-sans)',
          }}>
            Manter
          </button>
          <button onClick={() => onConfirm(reason)} disabled={loading} style={{
            flex: 1, height: '42px', borderRadius: '10px',
            border: 'none', background: '#dc2626', color: '#fff',
            fontSize: '14px', fontWeight: 600,
            cursor: loading ? 'not-allowed' : 'pointer',
            opacity: loading ? 0.7 : 1, fontFamily: 'var(--font-sans)',
          }}>
            {loading ? 'Cancelando...' : 'Confirmar cancelamento'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Event Detail Modal (calendário) ─────────────────────────────────────────

function EventDetailModal({
  appointment,
  onClose,
  onStatusChange,
  onCancel,
  onEdit,
  loading,
}: {
  appointment: Appointment
  onClose: () => void
  onStatusChange: (status: string) => void
  onCancel: () => void
  onEdit: () => void
  loading: boolean
}) {
  const st = STATUS_STYLE[appointment.status] ?? STATUS_STYLE['SCHEDULED']!
  const nextActions = NEXT_ACTIONS[appointment.status] ?? []
  const canCancel = !['COMPLETED', 'CANCELED'].includes(appointment.status)

  // Busca o detalhe completo (com statusHistory) ao abrir o modal
  const { data: detail, isLoading: detailLoading } = useQuery({
    queryKey: ['appointment-detail', appointment.id],
    queryFn:  () => appointmentsApi.get(appointment.id),
    staleTime: 0,
  })

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 200,
        background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px',
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div style={{
        background: '#fff', borderRadius: '18px',
        boxShadow: '0 24px 64px rgba(0,0,0,0.18)',
        width: '100%', maxWidth: '420px',
        maxHeight: '90vh', overflowY: 'auto',
        animation: 'fadeUp 0.2s ease',
      }}>
        {/* Faixa colorida do procedimento */}
        <div style={{
          height: '5px',
          background: appointment.procedure.color ?? 'var(--color-primary)',
        }} />

        <div style={{ padding: '24px 28px 28px' }}>
          {/* Cabeçalho */}
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '20px' }}>
            <div style={{ flex: 1 }}>
              <p style={{ margin: '0 0 3px', fontSize: '11px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.07em' }}>
                {appointment.procedure.name}
              </p>
              <h3 style={{ margin: '0 0 4px', fontSize: '18px', fontWeight: 700, color: '#1a2530' }}>
                {appointment.patient.name}
              </h3>
              <p style={{ margin: 0, fontSize: '13px', color: '#64748b' }}>
                {appointment.professional.name}
                {appointment.professional.specialty ? ` · ${appointment.professional.specialty}` : ''}
              </p>
            </div>
            <button
              onClick={onClose}
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                color: '#94a3b8', padding: '4px', flexShrink: 0,
              }}
            >
              <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Informações */}
          <div style={{
            display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px',
            padding: '16px', borderRadius: '12px', background: '#f8fafc',
            marginBottom: '20px',
          }}>
            {[
              ['Data', formatDate(appointment.scheduledDate)],
              ['Horário', `${formatTime(appointment.startTime)} – ${formatTime(appointment.endTime)}`],
              ['Duração', `${appointment.procedure.durationMinutes} min`],
              ['Contato', appointment.patient.phone || '—'],
            ].map(([label, value]) => (
              <div key={label}>
                <p style={{ margin: '0 0 1px', fontSize: '10px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</p>
                <p style={{ margin: 0, fontSize: '13px', fontWeight: 600, color: '#1a2530' }}>{value}</p>
              </div>
            ))}
          </div>

          {/* Status badge */}
          <div style={{ marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{
              display: 'inline-block', borderRadius: '20px',
              padding: '5px 12px',
              background: st.bg, color: st.color,
              border: `1px solid ${st.border}`,
              fontSize: '12px', fontWeight: 700,
            }}>
              {STATUS_LABEL[appointment.status] ?? appointment.status}
            </span>
          </div>

          {appointment.notes && (
            <div style={{ marginBottom: '20px', padding: '12px 14px', borderRadius: '10px', background: '#fffbeb', border: '1px solid #fde68a' }}>
              <p style={{ margin: 0, fontSize: '12.5px', color: '#92400e', lineHeight: 1.5 }}>
                {appointment.notes}
              </p>
            </div>
          )}

          {/* Timeline de status */}
          <div style={{ marginBottom: '20px' }}>
            <p style={{ margin: '0 0 10px', fontSize: '10px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.07em' }}>
              Histórico
            </p>
            <StatusTimeline
              entries={detail?.statusHistory}
              loading={detailLoading}
            />
          </div>

          {/* Ações */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {/* Próximas ações de status */}
            {nextActions.map((action) => (
              <button
                key={action.status}
                onClick={() => onStatusChange(action.status)}
                disabled={loading}
                style={{
                  height: '40px', border: 'none', borderRadius: '10px',
                  background: action.color, color: '#fff',
                  fontSize: '13px', fontWeight: 600,
                  cursor: loading ? 'not-allowed' : 'pointer',
                  opacity: loading ? 0.7 : 1,
                  fontFamily: 'var(--font-sans)',
                }}
              >
                {loading ? '...' : action.label}
              </button>
            ))}

            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                onClick={onEdit}
                style={{
                  flex: 1, height: '38px', border: '1.5px solid #e2e8f0',
                  borderRadius: '10px', background: '#fff', color: '#374151',
                  fontSize: '13px', fontWeight: 600, cursor: 'pointer',
                  fontFamily: 'var(--font-sans)',
                }}
              >
                Editar
              </button>
              {canCancel && (
                <button
                  onClick={onCancel}
                  disabled={loading}
                  style={{
                    flex: 1, height: '38px', border: '1.5px solid #fecaca',
                    borderRadius: '10px', background: '#fef2f2', color: '#b91c1c',
                    fontSize: '13px', fontWeight: 600,
                    cursor: loading ? 'not-allowed' : 'pointer',
                    fontFamily: 'var(--font-sans)',
                  }}
                >
                  Cancelar
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── List Row ─────────────────────────────────────────────────────────────────

function AppointmentRow({
  appointment,
  slug,
  onStatusChange,
  onCancelClick,
  isLoading,
}: {
  appointment: Appointment
  slug: string
  onStatusChange: (id: string, status: string) => void
  onCancelClick: (apt: Appointment) => void
  isLoading: boolean
}) {
  const st = STATUS_STYLE[appointment.status] ?? STATUS_STYLE['SCHEDULED']!
  const nextActions = NEXT_ACTIONS[appointment.status] ?? []

  return (
    <tr style={{ borderBottom: '1px solid #f0f2f5', transition: 'background 0.1s' }}>
      {/* Procedimento — dot colorido */}
      <td style={{ padding: '13px 16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{
            width: '9px', height: '9px', borderRadius: '50%', flexShrink: 0,
            background: appointment.procedure.color ?? 'var(--color-primary)',
          }} />
          <span style={{ fontSize: '12.5px', fontWeight: 600, color: '#374151' }}>
            {appointment.procedure.name}
          </span>
        </div>
      </td>

      {/* Paciente */}
      <td style={{ padding: '13px 16px' }}>
        <p style={{ margin: '0 0 1px', fontSize: '13px', fontWeight: 600, color: '#1a2530' }}>
          {appointment.patient.name}
        </p>
        <p style={{ margin: 0, fontSize: '11px', color: '#94a3b8' }}>
          {appointment.patient.phone}
        </p>
      </td>

      {/* Profissional */}
      <td className="r-hide-mobile" style={{ padding: '13px 16px', fontSize: '13px', color: '#374151' }}>
        {appointment.professional.name}
      </td>

      {/* Data · Hora */}
      <td style={{ padding: '13px 16px' }}>
        <p style={{ margin: '0 0 1px', fontSize: '12.5px', fontWeight: 600, color: '#374151', fontVariantNumeric: 'tabular-nums' }}>
          {formatDate(appointment.scheduledDate)}
        </p>
        <p style={{ margin: 0, fontSize: '11.5px', color: '#94a3b8', fontVariantNumeric: 'tabular-nums' }}>
          {formatTime(appointment.startTime)} – {formatTime(appointment.endTime)}
        </p>
      </td>

      {/* Status */}
      <td className="r-hide-mobile" style={{ padding: '13px 16px' }}>
        <span style={{
          display: 'inline-block', borderRadius: '20px', padding: '4px 10px',
          background: st.bg, color: st.color, border: `1px solid ${st.border}`,
          fontSize: '11.5px', fontWeight: 700,
        }}>
          {STATUS_LABEL[appointment.status] ?? appointment.status}
        </span>
      </td>

      {/* Ações */}
      <td style={{ padding: '13px 16px' }}>
        <div style={{ display: 'flex', gap: '5px', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
          {nextActions.map((action) => (
            <button
              key={action.status}
              onClick={() => onStatusChange(appointment.id, action.status)}
              disabled={isLoading}
              style={{
                padding: '4px 9px', borderRadius: '7px', border: 'none',
                background: action.color + '18', color: action.color,
                fontSize: '11.5px', fontWeight: 700,
                cursor: isLoading ? 'not-allowed' : 'pointer',
                fontFamily: 'var(--font-sans)',
              }}
            >
              {action.label}
            </button>
          ))}
          <Link
            to="/app/$slug/appointments/$id/edit"
            params={{ slug, id: appointment.id }}
            style={{
              display: 'inline-flex', alignItems: 'center',
              padding: '4px 9px', borderRadius: '7px',
              background: '#f8fafc', color: '#374151',
              border: '1px solid #e2e8f0',
              fontSize: '11.5px', fontWeight: 600, textDecoration: 'none',
            }}
          >
            Editar
          </Link>
          {!['COMPLETED', 'CANCELED'].includes(appointment.status) && (
            <button
              onClick={() => onCancelClick(appointment)}
              disabled={isLoading}
              style={{
                padding: '4px 9px', borderRadius: '7px',
                background: '#fef2f2', color: '#dc2626',
                border: '1px solid #fecaca',
                fontSize: '11.5px', fontWeight: 600,
                cursor: isLoading ? 'not-allowed' : 'pointer',
                fontFamily: 'var(--font-sans)',
              }}
            >
              Cancelar
            </button>
          )}
        </div>
      </td>
    </tr>
  )
}

// ─── Calendar Event Content ────────────────────────────────────────────────────
// Renderiza o conteúdo dos eventos do calendário de forma customizada

function CalendarEventContent({ eventInfo }: { eventInfo: EventContentArg }) {
  const apt = eventInfo.event.extendedProps['appointment'] as Appointment | undefined
  if (!apt) return <div>{eventInfo.event.title}</div>

  return (
    <div style={{
      padding: '2px 5px',
      overflow: 'hidden',
      height: '100%',
      cursor: 'pointer',
    }}>
      <div style={{ fontSize: '11px', fontWeight: 700, lineHeight: 1.2, color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {formatTime(apt.startTime)} {apt.patient.name}
      </div>
      <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.85)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {apt.procedure.name}
      </div>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

type ViewMode = 'list' | 'calendar'

export function AppointmentsPage() {
  const params   = useParams({ strict: false }) as { slug?: string }
  const slug     = params.slug ?? clinicTokens.getSlug() ?? ''
  const navigate = useNavigate()
  const qc       = useQueryClient()

  // ── View mode ─────────────────────────────────────────────────────────────
  const [viewMode, setViewMode] = useState<ViewMode>('list')

  // ── Filtros compartilhados ────────────────────────────────────────────────
  const [profFilter, setProfFilter] = useState('')

  // ── Filtros da lista ──────────────────────────────────────────────────────
  const [dateFilter, setDateFilter]     = useState(todayISO())
  const [statusFilter, setStatusFilter] = useState('')
  const [page, setPage]                 = useState(1)

  // ── Estado do calendário ──────────────────────────────────────────────────
  const [calRange, setCalRange] = useState(() => isoToWeekRange(todayISO()))
  const calRef = useRef<InstanceType<typeof FullCalendar>>(null)

  // ── Modais ────────────────────────────────────────────────────────────────
  const [cancelTarget,      setCancelTarget]      = useState<Appointment | null>(null)
  const [detailAppointment, setDetailAppointment] = useState<Appointment | null>(null)

  // ── Loading ────────────────────────────────────────────────────────────────
  const [loadingId, setLoadingId] = useState<string | null>(null)

  // ── Drag-to-reschedule ───────────────────────────────────────────────────
  const [dragError, setDragError] = useState<string | null>(null)

  // ── Queries ───────────────────────────────────────────────────────────────
  const { data: profsData } = useQuery({
    queryKey: ['professionals', slug],
    queryFn: () => professionalsApi.list({ limit: 100 }),
  })

  // Query para a lista
  const { data: listData, isLoading: listLoading, isError } = useQuery({
    queryKey: ['appointments-list', slug, dateFilter, profFilter, statusFilter, page],
    queryFn: () => appointmentsApi.list({
      scheduledDate: dateFilter || undefined,
      professionalId: profFilter || undefined,
      status: statusFilter || undefined,
      page,
      limit: 15,
    }),
    placeholderData: (prev) => prev,
    enabled: viewMode === 'list',
  })

  // Query para o calendário (range)
  const { data: calData, isLoading: calLoading } = useQuery({
    queryKey: ['appointments-cal', slug, calRange.start, calRange.end, profFilter],
    queryFn: () => appointmentsApi.list({
      startDate: calRange.start,
      endDate: calRange.end,
      professionalId: profFilter || undefined,
      limit: 500,   // sem paginação para o calendário
      page: 1,
    }),
    enabled: viewMode === 'calendar',
    placeholderData: (prev) => prev,
  })

  // ── Mutations ─────────────────────────────────────────────────────────────
  const updateStatus = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      appointmentsApi.updateStatus(id, status),
    onMutate: ({ id }) => setLoadingId(id),
    onSettled: () => {
      setLoadingId(null)
      void qc.invalidateQueries({ queryKey: ['appointments-list', slug] })
      void qc.invalidateQueries({ queryKey: ['appointments-cal', slug] })
    },
    onSuccess: (updated) => {
      // Atualiza o modal de detalhe se estiver aberto
      if (detailAppointment?.id === updated.id) {
        setDetailAppointment(updated)
      }
    },
  })

  const cancelMutation = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      appointmentsApi.cancel(id, reason || undefined),
    onMutate: () => setLoadingId(cancelTarget?.id ?? null),
    onSettled: () => {
      setLoadingId(null)
      setCancelTarget(null)
      setDetailAppointment(null)
      void qc.invalidateQueries({ queryKey: ['appointments-list', slug] })
      void qc.invalidateQueries({ queryKey: ['appointments-cal', slug] })
    },
  })

  // ── Calendar handlers ─────────────────────────────────────────────────────

  const handleDatesSet = useCallback((arg: DatesSetArg) => {
    // FullCalendar passa start/end da janela visível
    const start = arg.start.toISOString().slice(0, 10)
    // end é exclusivo no FC, então subtraímos 1 dia
    const endExclusive = new Date(arg.end)
    endExclusive.setDate(endExclusive.getDate() - 1)
    const end = endExclusive.toISOString().slice(0, 10)
    setCalRange({ start, end })
  }, [])

  const handleEventClick = useCallback((arg: EventClickArg) => {
    const apt = arg.event.extendedProps['appointment'] as Appointment | undefined
    if (apt) setDetailAppointment(apt)
  }, [])

  const handleDateSelect = useCallback((arg: DateSelectArg) => {
    // Clique em slot vazio → vai para criar novo agendamento com a data pre-preenchida
    const dateStr = arg.startStr.slice(0, 10)
    void navigate({
      to: '/app/$slug/appointments/new',
      params: { slug },
      search: { date: dateStr } as Record<string, string>,
    })
  }, [navigate, slug])

  const handleEventDrop = useCallback(async (info: EventDropArg) => {
    const apt = info.event.extendedProps['appointment'] as Appointment | undefined
    if (!apt) { info.revert(); return }

    const newStart = info.event.start
    if (!newStart) { info.revert(); return }

    // FullCalendar trata strings sem timezone como horário local
    const pad = (n: number) => String(n).padStart(2, '0')
    const newDate = `${newStart.getFullYear()}-${pad(newStart.getMonth() + 1)}-${pad(newStart.getDate())}`
    const newTime = `${pad(newStart.getHours())}:${pad(newStart.getMinutes())}`

    try {
      await appointmentsApi.update(apt.id, { scheduledDate: newDate, startTime: newTime })
      void qc.invalidateQueries({ queryKey: ['appointments-cal', slug] })
      void qc.invalidateQueries({ queryKey: ['appointments-list', slug] })
    } catch {
      info.revert()
      setDragError('Não foi possível reagendar. Verifique conflitos de agenda.')
      setTimeout(() => setDragError(null), 5000)
    }
  }, [qc, slug])

  // ── FullCalendar events ────────────────────────────────────────────────────

  const DRAGGABLE_STATUSES = ['SCHEDULED', 'PATIENT_PRESENT']

  const calendarEvents = (calData?.data ?? []).map((apt) => ({
    id: apt.id,
    title: apt.patient.name,
    start: `${apt.scheduledDate}T${apt.startTime}`,
    end: `${apt.scheduledDate}T${apt.endTime}`,
    backgroundColor: apt.procedure.color ?? 'var(--color-primary)',
    borderColor: apt.procedure.color ?? 'var(--color-primary)',
    textColor: '#fff',
    classNames: apt.status === 'CANCELED' ? ['fc-event-canceled'] : [],
    editable: DRAGGABLE_STATUSES.includes(apt.status),  // drag só em statuses ativos
    extendedProps: { appointment: apt },
  }))

  // ── Dados da lista ────────────────────────────────────────────────────────
  const appointments = listData?.data ?? []
  const totalPages   = listData?.totalPages ?? 1
  const total        = listData?.total ?? 0

  const professionals = profsData?.data ?? []

  // ── Input style ────────────────────────────────────────────────────────────
  const inputStyle: React.CSSProperties = {
    height: '36px',
    padding: '0 12px',
    border: '1.5px solid #e2e8f0',
    borderRadius: '8px',
    fontSize: '13px',
    color: '#1a2530',
    background: '#fff',
    outline: 'none',
    fontFamily: 'var(--font-sans)',
    cursor: 'pointer',
  }

  return (
    <div className="r-page" style={{ maxWidth: viewMode === 'calendar' ? '100%' : '1200px', fontFamily: 'var(--font-sans)' }}>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg) } }
        @keyframes fadeUp { from { opacity: 0; transform: translateY(8px) } to { opacity: 1; transform: none } }

        /* ── FullCalendar overrides ─────────────────────────────────── */
        .fc { font-family: var(--font-sans); }
        .fc .fc-toolbar-title {
          font-family: var(--font-display);
          font-style: italic;
          font-size: 20px;
          font-weight: 400;
          color: #1a2530;
          letter-spacing: -0.02em;
        }
        .fc .fc-button {
          background: #fff;
          border: 1.5px solid #e2e8f0;
          color: #374151;
          border-radius: 8px;
          font-family: var(--font-sans);
          font-size: 12.5px;
          font-weight: 600;
          padding: 5px 10px;
          box-shadow: none;
          text-transform: none;
          transition: background 0.15s, border-color 0.15s;
        }
        .fc .fc-button:hover { background: #f8fafc; }
        .fc .fc-button-primary:not(.fc-button-active):not(.fc-today-button) { background: #fff; }
        .fc .fc-button-active,
        .fc .fc-button-primary.fc-button-active {
          background: var(--color-primary) !important;
          border-color: var(--color-primary) !important;
          color: #fff !important;
        }
        .fc .fc-today-button {
          background: color-mix(in srgb, var(--color-primary) 10%, white) !important;
          border-color: color-mix(in srgb, var(--color-primary) 25%, white) !important;
          color: var(--color-primary) !important;
          font-weight: 700 !important;
        }
        .fc .fc-today-button:disabled {
          opacity: 1;
          background: color-mix(in srgb, var(--color-primary) 10%, white) !important;
        }
        .fc .fc-col-header-cell-cushion {
          font-size: 12px;
          font-weight: 700;
          color: #64748b;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          text-decoration: none;
          padding: 8px 4px;
        }
        .fc .fc-daygrid-day-number,
        .fc .fc-daygrid-day-top a { text-decoration: none; color: #374151; font-size: 13px; }
        .fc .fc-timegrid-slot { height: 40px; }
        .fc .fc-timegrid-slot-label-cushion { font-size: 11px; color: #94a3b8; font-weight: 600; }
        .fc .fc-scrollgrid { border-radius: 12px; overflow: hidden; border: 1px solid #f0f2f5 !important; }
        .fc .fc-scrollgrid td, .fc .fc-scrollgrid th { border-color: #f0f2f5 !important; }
        .fc .fc-event { border-radius: 6px !important; border-width: 0 !important; box-shadow: 0 1px 4px rgba(0,0,0,0.12); cursor: pointer; }
        .fc .fc-event:hover { opacity: 0.9; box-shadow: 0 2px 8px rgba(0,0,0,0.2); }
        .fc .fc-event[draggable="true"] { cursor: grab; }
        .fc .fc-event[draggable="true"]:active { cursor: grabbing; }
        .fc .fc-event.fc-event-dragging { opacity: 0.75 !important; box-shadow: 0 8px 24px rgba(0,0,0,0.2) !important; transform: scale(1.02); }
        .fc-event-canceled { opacity: 0.4 !important; cursor: default !important; }
        .fc .fc-now-indicator-line { border-color: var(--color-primary); }
        .fc .fc-now-indicator-arrow { border-top-color: var(--color-primary); }
        .fc .fc-highlight { background: color-mix(in srgb, var(--color-primary) 12%, white) !important; }
        .fc .fc-day-today { background: color-mix(in srgb, var(--color-primary) 4%, white) !important; }
        .fc .fc-toolbar.fc-header-toolbar { margin-bottom: 16px; flex-wrap: wrap; gap: 8px; }
        @media (max-width: 600px) {
          .fc .fc-toolbar.fc-header-toolbar { flex-direction: column; align-items: stretch; }
          .fc .fc-toolbar-chunk { display: flex; justify-content: center; }
          .fc .fc-toolbar-title { font-size: 16px; }
        }
      `}</style>

      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{
            margin: 0, fontSize: 'clamp(20px, 4vw, 26px)', fontWeight: 400,
            fontFamily: 'var(--font-display)', fontStyle: 'italic',
            color: '#1a2530', letterSpacing: '-0.02em',
          }}>
            Agendamentos
          </h1>
          {viewMode === 'list' && (
            <p style={{ margin: '4px 0 0', fontSize: '13.5px', color: '#64748b' }}>
              {dateFilter ? `${formatDate(dateFilter)} · ` : ''}{total} registro{total !== 1 ? 's' : ''}
            </p>
          )}
        </div>

        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
          {/* Toggle lista/calendário */}
          <div style={{
            display: 'flex',
            background: '#f1f5f9',
            borderRadius: '10px',
            padding: '3px',
            gap: '2px',
          }}>
            {([
              { key: 'list',     icon: (
                <svg width="15" height="15" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                </svg>
              ), label: 'Lista' },
              { key: 'calendar', icon: (
                <svg width="15" height="15" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              ), label: 'Agenda' },
            ] as const).map(({ key, icon, label }) => (
              <button
                key={key}
                onClick={() => setViewMode(key)}
                style={{
                  display: 'flex', alignItems: 'center', gap: '5px',
                  padding: '6px 12px', borderRadius: '8px',
                  border: 'none',
                  background: viewMode === key ? '#fff' : 'transparent',
                  color: viewMode === key ? 'var(--color-primary)' : '#64748b',
                  fontSize: '12.5px', fontWeight: 600,
                  cursor: 'pointer',
                  boxShadow: viewMode === key ? '0 1px 4px rgba(0,0,0,0.08)' : 'none',
                  transition: 'all 0.15s',
                  fontFamily: 'var(--font-sans)',
                }}
              >
                {icon}
                {label}
              </button>
            ))}
          </div>

          {/* Botão novo */}
          <Link
            to="/app/$slug/appointments/new"
            params={{ slug }}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: '6px',
              padding: '8px 16px', borderRadius: '10px',
              background: 'var(--color-primary)', color: '#fff',
              fontSize: '13px', fontWeight: 600,
              textDecoration: 'none',
              boxShadow: '0 4px 12px color-mix(in srgb, var(--color-primary) 30%, transparent)',
            }}
          >
            <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
            </svg>
            Novo
          </Link>
        </div>
      </div>

      {/* ── Filtros ──────────────────────────────────────────────────────── */}
      <div className="r-filters" style={{ marginBottom: '20px' }}>
        {/* Profissional (compartilhado) */}
        <div>
          <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#374151', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '5px' }}>
            Profissional
          </label>
          <select
            value={profFilter}
            onChange={(e) => { setProfFilter(e.target.value); setPage(1) }}
            style={{ ...inputStyle, minWidth: '160px' }}
          >
            <option value="">Todos</option>
            {professionals.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </div>

        {/* Filtros exclusivos da lista */}
        {viewMode === 'list' && (
          <>
            <div>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#374151', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '5px' }}>
                Data
              </label>
              <input
                type="date"
                value={dateFilter}
                onChange={(e) => { setDateFilter(e.target.value); setPage(1) }}
                style={inputStyle}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#374151', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '5px' }}>
                Status
              </label>
              <select
                value={statusFilter}
                onChange={(e) => { setStatusFilter(e.target.value); setPage(1) }}
                style={{ ...inputStyle, minWidth: '140px' }}
              >
                <option value="">Todos</option>
                {Object.entries(STATUS_LABEL).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </div>
            {(dateFilter || profFilter || statusFilter) && (
              <button
                onClick={() => { setDateFilter(todayISO()); setProfFilter(''); setStatusFilter(''); setPage(1) }}
                style={{ ...inputStyle, border: 'none', background: 'transparent', color: '#94a3b8', fontSize: '12px', cursor: 'pointer', alignSelf: 'flex-end', marginBottom: '1px' }}
              >
                ✕ Limpar
              </button>
            )}
          </>
        )}
      </div>

      {/* ────────────────────────────────────────────────────────────────── */}
      {/*  VIEW: LISTA                                                       */}
      {/* ────────────────────────────────────────────────────────────────── */}
      {viewMode === 'list' && (
        <div style={{ background: '#fff', borderRadius: '16px', border: '1px solid #f0f2f5', boxShadow: '0 1px 6px rgba(0,0,0,0.04)', overflow: 'hidden' }}>
          {listLoading ? (
            <div style={{ padding: '60px', textAlign: 'center', color: '#94a3b8' }}>
              <div style={{ width: '32px', height: '32px', border: '2px solid #eaecef', borderTopColor: 'var(--color-primary)', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 12px' }} />
              <p style={{ fontSize: '13px', margin: 0 }}>Carregando agendamentos...</p>
            </div>
          ) : isError ? (
            <div style={{ padding: '60px', textAlign: 'center', color: '#dc2626' }}>
              <p style={{ fontSize: '14px', margin: 0 }}>Erro ao carregar. Tente novamente.</p>
            </div>
          ) : appointments.length === 0 ? (
            <div style={{ padding: '72px 32px', textAlign: 'center' }}>
              <svg width="40" height="40" fill="none" stroke="#cbd5e1" viewBox="0 0 24 24" style={{ margin: '0 auto 12px', display: 'block' }}>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <p style={{ margin: '0 0 4px', fontSize: '14px', color: '#94a3b8', fontWeight: 600 }}>Nenhum agendamento encontrado</p>
              <p style={{ margin: 0, fontSize: '13px', color: '#cbd5e1' }}>Ajuste os filtros ou crie um novo agendamento.</p>
            </div>
          ) : (
            <>
              <div className="r-table-wrap">
                <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '700px' }}>
                  <thead>
                    <tr style={{ background: '#fafbfc', borderBottom: '1px solid #f0f2f5' }}>
                      {['Procedimento', 'Paciente', 'Profissional', 'Data · Hora', 'Status', ''].map((h, i) => (
                        <th key={h + i} className={i === 2 || i === 4 ? 'r-hide-mobile' : ''} style={{
                          padding: '11px 16px', textAlign: 'left',
                          fontSize: '11px', fontWeight: 700,
                          color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.07em',
                        }}>
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {appointments.map((apt) => (
                      <AppointmentRow
                        key={apt.id}
                        appointment={apt}
                        slug={slug}
                        onStatusChange={(id, status) => updateStatus.mutate({ id, status })}
                        onCancelClick={setCancelTarget}
                        isLoading={loadingId === apt.id}
                      />
                    ))}
                  </tbody>
                </table>
              </div>

              {totalPages > 1 && (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 20px', borderTop: '1px solid #f0f2f5' }}>
                  <span style={{ fontSize: '13px', color: '#94a3b8' }}>Página {page} de {totalPages}</span>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}
                      style={{ padding: '7px 14px', borderRadius: '8px', fontSize: '13px', fontWeight: 500, border: '1.5px solid #e2e8f0', background: '#fff', color: '#4a5568', cursor: page === 1 ? 'not-allowed' : 'pointer', opacity: page === 1 ? 0.5 : 1, fontFamily: 'var(--font-sans)' }}>
                      ← Anterior
                    </button>
                    <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                      style={{ padding: '7px 14px', borderRadius: '8px', fontSize: '13px', fontWeight: 500, border: '1.5px solid #e2e8f0', background: '#fff', color: '#4a5568', cursor: page === totalPages ? 'not-allowed' : 'pointer', opacity: page === totalPages ? 0.5 : 1, fontFamily: 'var(--font-sans)' }}>
                      Próxima →
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* ────────────────────────────────────────────────────────────────── */}
      {/*  VIEW: CALENDÁRIO                                                  */}
      {/* ────────────────────────────────────────────────────────────────── */}
      {viewMode === 'calendar' && (
        <div style={{
          background: '#fff', borderRadius: '16px',
          border: '1px solid #f0f2f5',
          boxShadow: '0 1px 6px rgba(0,0,0,0.04)',
          padding: '20px',
          position: 'relative',
        }}>
          {/* Banner de erro do drag */}
          {dragError && (
            <div style={{
              position: 'absolute', top: '16px', left: '50%', transform: 'translateX(-50%)',
              zIndex: 20, display: 'flex', alignItems: 'center', gap: '8px',
              padding: '10px 16px', borderRadius: '10px',
              background: '#fef2f2', border: '1px solid #fecaca',
              boxShadow: '0 4px 16px rgba(220,38,38,0.15)',
              animation: 'fadeUp 0.2s ease',
              whiteSpace: 'nowrap',
            }}>
              <svg width="14" height="14" fill="none" stroke="#dc2626" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
              </svg>
              <span style={{ fontSize: '13px', color: '#b91c1c', fontWeight: 600 }}>{dragError}</span>
              <button
                onClick={() => setDragError(null)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#dc2626', padding: '0 0 0 4px', lineHeight: 1 }}
              >✕</button>
            </div>
          )}

          {calLoading && (
            <div style={{
              position: 'absolute', top: '16px', right: '16px', zIndex: 10,
              display: 'flex', alignItems: 'center', gap: '6px',
              padding: '6px 12px', borderRadius: '8px',
              background: '#fff', border: '1px solid #f0f2f5',
              boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
            }}>
              <div style={{ width: '12px', height: '12px', border: '1.5px solid #e2e8f0', borderTopColor: 'var(--color-primary)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
              <span style={{ fontSize: '12px', color: '#64748b' }}>Carregando...</span>
            </div>
          )}
          <FullCalendar
            ref={calRef}
            plugins={[timeGridPlugin, dayGridPlugin, interactionPlugin]}
            initialView="timeGridWeek"
            locale={ptBrLocale}
            headerToolbar={{
              left: 'prev,next today',
              center: 'title',
              right: 'dayGridMonth,timeGridWeek,timeGridDay',
            }}
            buttonText={{
              today: 'Hoje',
              month: 'Mês',
              week: 'Semana',
              day: 'Dia',
            }}
            events={calendarEvents}
            eventContent={(eventInfo) => <CalendarEventContent eventInfo={eventInfo} />}
            eventClick={handleEventClick}
            editable={true}
            eventDrop={handleEventDrop}
            selectable={true}
            select={handleDateSelect}
            datesSet={handleDatesSet}
            slotMinTime="06:00:00"
            slotMaxTime="22:00:00"
            allDaySlot={false}
            nowIndicator={true}
            height="auto"
            aspectRatio={1.8}
            expandRows={true}
            slotDuration="00:30:00"
            slotLabelInterval="01:00:00"
            eventMinHeight={28}
            dayMaxEvents={4}
            moreLinkText={(n) => `+${n} mais`}
            noEventsText="Nenhum agendamento neste período"
          />
        </div>
      )}

      {/* ── Modal cancelar (lista) ────────────────────────────────────────── */}
      {cancelTarget && (
        <CancelModal
          appointment={cancelTarget}
          onClose={() => setCancelTarget(null)}
          loading={cancelMutation.isPending}
          onConfirm={(reason) => cancelMutation.mutate({ id: cancelTarget.id, reason })}
        />
      )}

      {/* ── Modal detalhe (calendário) ────────────────────────────────────── */}
      {detailAppointment && (
        <EventDetailModal
          appointment={detailAppointment}
          onClose={() => setDetailAppointment(null)}
          loading={!!loadingId}
          onStatusChange={(status) => {
            updateStatus.mutate({ id: detailAppointment.id, status })
          }}
          onCancel={() => setCancelTarget(detailAppointment)}
          onEdit={() => {
            setDetailAppointment(null)
            void navigate({ to: '/app/$slug/appointments/$id/edit', params: { slug, id: detailAppointment.id } })
          }}
        />
      )}
    </div>
  )
}
