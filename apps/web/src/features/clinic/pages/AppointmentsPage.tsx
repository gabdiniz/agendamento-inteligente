// ─── AppointmentsPage ──────────────────────────────────────────────────────────
//
// Listagem de agendamentos com filtros por data, profissional e status.
// Ações inline: mudar status e cancelar.
// ─────────────────────────────────────────────────────────────────────────────

import { useState } from 'react'
import { Link, useParams } from '@tanstack/react-router'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { appointmentsApi, professionalsApi, type Appointment } from '@/lib/api/clinic.api'

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

// ─── Status config ────────────────────────────────────────────────────────────

const STATUS_LABEL: Record<string, string> = {
  SCHEDULED:       'Agendado',
  PATIENT_PRESENT: 'Paciente Presente',
  IN_PROGRESS:     'Em Atendimento',
  COMPLETED:       'Concluído',
  CANCELED:        'Cancelado',
}

const STATUS_STYLE: Record<string, { bg: string; color: string }> = {
  SCHEDULED:       { bg: '#eff6ff', color: '#1d4ed8' },
  PATIENT_PRESENT: { bg: '#f0fdf4', color: '#15803d' },
  IN_PROGRESS:     { bg: '#faf5ff', color: '#7e22ce' },
  COMPLETED:       { bg: '#f0fdf4', color: '#166534' },
  CANCELED:        { bg: '#fef2f2', color: '#b91c1c' },
}

// Próximas ações possíveis para cada status
const NEXT_ACTIONS: Record<string, Array<{ label: string; status: string; color: string }>> = {
  SCHEDULED: [
    { label: 'Confirmar chegada', status: 'PATIENT_PRESENT', color: '#16a34a' },
  ],
  PATIENT_PRESENT: [
    { label: 'Iniciar atendimento', status: 'IN_PROGRESS', color: '#7c3aed' },
  ],
  IN_PROGRESS: [
    { label: 'Concluir', status: 'COMPLETED', color: '#059669' },
    { label: 'No-show', status: 'CANCELED', color: '#dc2626' },
  ],
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
    <div style={{
      position: 'fixed', inset: 0, zIndex: 50,
      background: 'rgba(0,0,0,0.35)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '16px',
    }}>
      <div style={{
        background: '#fff', borderRadius: '16px',
        boxShadow: '0 20px 60px rgba(0,0,0,0.15)',
        width: '100%', maxWidth: '440px',
        padding: '28px',
        animation: 'fadeUp 0.2s ease',
      }}>
        <h3 style={{ margin: '0 0 6px', fontSize: '17px', fontWeight: 700, color: '#1a2530' }}>
          Cancelar agendamento
        </h3>
        <p style={{ margin: '0 0 20px', fontSize: '13.5px', color: '#64748b' }}>
          {appointment.patient.name} · {formatDate(appointment.scheduledDate)} às {formatTime(appointment.startTime)}
        </p>
        <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#374151', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          Motivo (opcional)
        </label>
        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Ex: Paciente solicitou remarcação..."
          rows={3}
          style={{
            width: '100%', boxSizing: 'border-box',
            padding: '10px 12px',
            border: '1.5px solid #e2e8f0', borderRadius: '10px',
            fontSize: '13.5px', color: '#1a2530',
            fontFamily: 'var(--font-sans)',
            resize: 'vertical', outline: 'none',
          }}
        />
        <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
          <button
            onClick={onClose}
            style={{
              flex: 1, padding: '10px', border: '1.5px solid #e2e8f0',
              borderRadius: '10px', background: '#fff', color: '#4a5568',
              fontSize: '13.5px', fontWeight: 600, cursor: 'pointer',
              fontFamily: 'var(--font-sans)',
            }}
          >
            Voltar
          </button>
          <button
            onClick={() => onConfirm(reason)}
            disabled={loading}
            style={{
              flex: 1, padding: '10px', border: 'none',
              borderRadius: '10px', background: '#dc2626', color: '#fff',
              fontSize: '13.5px', fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.7 : 1,
              fontFamily: 'var(--font-sans)',
            }}
          >
            {loading ? 'Cancelando...' : 'Cancelar agendamento'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Appointment Row ──────────────────────────────────────────────────────────

function AppointmentRow({
  apt,
  slug,
  onStatusChange,
  onCancel,
  loadingId,
}: {
  apt: Appointment
  slug: string
  onStatusChange: (id: string, status: string) => void
  onCancel: (apt: Appointment) => void
  loadingId: string | null
}) {
  const statusStyle = STATUS_STYLE[apt.status] ?? { bg: '#f1f5f9', color: '#475569' }
  const actions = NEXT_ACTIONS[apt.status] ?? []
  const isLoading = loadingId === apt.id

  return (
    <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
      {/* Horário */}
      <td style={{ padding: '14px 16px', whiteSpace: 'nowrap' }}>
        <span style={{
          display: 'inline-block',
          background: '#eff6ff', color: '#1d4ed8',
          borderRadius: '6px', padding: '3px 8px',
          fontSize: '13px', fontWeight: 700, letterSpacing: '0.02em',
          fontVariantNumeric: 'tabular-nums',
        }}>
          {formatTime(apt.startTime)}
        </span>
        <span style={{ display: 'block', fontSize: '11px', color: '#94a3b8', marginTop: '2px' }}>
          até {formatTime(apt.endTime)}
        </span>
      </td>

      {/* Paciente */}
      <td style={{ padding: '14px 16px' }}>
        <p style={{ margin: 0, fontSize: '13.5px', fontWeight: 600, color: '#1a2530' }}>
          {apt.patient.name}
        </p>
        <p style={{ margin: '2px 0 0', fontSize: '12px', color: '#94a3b8' }}>
          {apt.patient.phone}
        </p>
      </td>

      {/* Profissional */}
      <td style={{ padding: '14px 16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{
            width: '28px', height: '28px', borderRadius: '50%', flexShrink: 0,
            background: apt.professional.color
              ? `color-mix(in srgb, ${apt.professional.color} 20%, white)`
              : 'color-mix(in srgb, var(--color-primary) 15%, white)',
            color: apt.professional.color ?? 'var(--color-primary)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '11px', fontWeight: 700,
          }}>
            {apt.professional.name.charAt(0)}
          </div>
          <span style={{ fontSize: '13px', color: '#2d3748' }}>{apt.professional.name}</span>
        </div>
      </td>

      {/* Procedimento */}
      <td style={{ padding: '14px 16px' }}>
        <p style={{ margin: 0, fontSize: '13px', color: '#374151' }}>{apt.procedure.name}</p>
        <p style={{ margin: '2px 0 0', fontSize: '11px', color: '#94a3b8' }}>
          {apt.procedure.durationMinutes} min
        </p>
      </td>

      {/* Status */}
      <td style={{ padding: '14px 16px' }}>
        <span style={{
          display: 'inline-block',
          background: statusStyle.bg, color: statusStyle.color,
          borderRadius: '20px', padding: '4px 10px',
          fontSize: '12px', fontWeight: 600,
        }}>
          {STATUS_LABEL[apt.status] ?? apt.status}
        </span>
      </td>

      {/* Ações */}
      <td style={{ padding: '14px 16px' }}>
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
          {isLoading ? (
            <span style={{ fontSize: '12px', color: '#94a3b8' }}>Salvando...</span>
          ) : (
            <>
              {/* Editar */}
              {apt.status !== 'COMPLETED' && apt.status !== 'CANCELED' && (
                <Link
                  to="/app/$slug/appointments/$id/edit"
                  params={{ slug, id: apt.id }}
                  style={{
                    display: 'inline-flex', alignItems: 'center',
                    padding: '5px 10px', borderRadius: '8px',
                    background: '#f8fafc', color: '#374151',
                    border: '1px solid #e2e8f0',
                    fontSize: '12px', fontWeight: 600, textDecoration: 'none',
                  }}
                >
                  Editar
                </Link>
              )}
              {actions.map((action) => (
                <button
                  key={action.status}
                  onClick={() => onStatusChange(apt.id, action.status)}
                  style={{
                    padding: '5px 10px', border: 'none', borderRadius: '8px',
                    background: `color-mix(in srgb, ${action.color} 12%, white)`,
                    color: action.color,
                    fontSize: '12px', fontWeight: 600, cursor: 'pointer',
                    fontFamily: 'var(--font-sans)',
                    border: `1px solid color-mix(in srgb, ${action.color} 20%, transparent)`,
                  } as React.CSSProperties}
                >
                  {action.label}
                </button>
              ))}
              {(apt.status === 'SCHEDULED' || apt.status === 'PATIENT_PRESENT') && (
                <button
                  onClick={() => onCancel(apt)}
                  style={{
                    padding: '5px 10px', borderRadius: '8px',
                    background: '#fef2f2', color: '#dc2626',
                    border: '1px solid #fecaca',
                    fontSize: '12px', fontWeight: 600, cursor: 'pointer',
                    fontFamily: 'var(--font-sans)',
                  }}
                >
                  Cancelar
                </button>
              )}
            </>
          )}
        </div>
      </td>
    </tr>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export function AppointmentsPage() {
  const params = useParams({ strict: false }) as { slug?: string }
  const slug = params.slug ?? ''
  const qc = useQueryClient()

  // ── Filtros ──────────────────────────────────────────────────────────────
  const [dateFilter, setDateFilter]         = useState(todayISO())
  const [profFilter, setProfFilter]         = useState('')
  const [statusFilter, setStatusFilter]     = useState('')
  const [page, setPage]                     = useState(1)

  // ── Modal cancelar ────────────────────────────────────────────────────────
  const [cancelTarget, setCancelTarget] = useState<Appointment | null>(null)

  // ── Loading de ação ───────────────────────────────────────────────────────
  const [loadingId, setLoadingId] = useState<string | null>(null)

  // ── Queries ───────────────────────────────────────────────────────────────
  const { data: profsData } = useQuery({
    queryKey: ['professionals', slug],
    queryFn: () => professionalsApi.list({ limit: 100 }),
  })

  const { data, isLoading, isError } = useQuery({
    queryKey: ['appointments', slug, dateFilter, profFilter, statusFilter, page],
    queryFn: () => appointmentsApi.list({
      scheduledDate: dateFilter || undefined,
      professionalId: profFilter || undefined,
      status: statusFilter || undefined,
      page,
      limit: 15,
    }),
    placeholderData: (prev) => prev,
  })

  // ── Mutations ─────────────────────────────────────────────────────────────
  const updateStatus = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      appointmentsApi.updateStatus(id, status),
    onMutate: ({ id }) => setLoadingId(id),
    onSettled: () => {
      setLoadingId(null)
      void qc.invalidateQueries({ queryKey: ['appointments', slug] })
    },
  })

  const cancelMutation = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      appointmentsApi.cancel(id, reason || undefined),
    onMutate: () => setLoadingId(cancelTarget?.id ?? null),
    onSettled: () => {
      setLoadingId(null)
      setCancelTarget(null)
      void qc.invalidateQueries({ queryKey: ['appointments', slug] })
    },
  })

  const appointments = data?.data ?? []
  const totalPages   = data?.totalPages ?? 1
  const total        = data?.total ?? 0

  const inputStyle: React.CSSProperties = {
    height: '36px',
    padding: '0 12px',
    border: '1.5px solid #e2e8f0',
    borderRadius: '10px',
    fontSize: '13px',
    color: '#1a2530',
    background: '#fff',
    outline: 'none',
    fontFamily: 'var(--font-sans)',
    cursor: 'pointer',
  }

  return (
    <div style={{ padding: '32px', maxWidth: '1200px', fontFamily: 'var(--font-sans)' }}>

      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '28px' }}>
        <div>
          <h1 style={{
            margin: 0, fontSize: '26px', fontWeight: 400,
            fontFamily: 'var(--font-display)', fontStyle: 'italic',
            color: '#1a2530', letterSpacing: '-0.02em',
          }}>
            Agendamentos
          </h1>
          <p style={{ margin: '4px 0 0', fontSize: '13.5px', color: '#64748b' }}>
            {dateFilter ? `${formatDate(dateFilter)} · ` : ''}{total} registro{total !== 1 ? 's' : ''}
          </p>
        </div>
        <Link
          to="/app/$slug/appointments/new"
          params={{ slug }}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: '6px',
            padding: '9px 18px', borderRadius: '10px',
            background: 'var(--color-primary)', color: '#fff',
            fontSize: '13.5px', fontWeight: 600,
            textDecoration: 'none',
            boxShadow: '0 4px 12px color-mix(in srgb, var(--color-primary) 30%, transparent)',
          }}
        >
          <svg width="15" height="15" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
          </svg>
          Novo agendamento
        </Link>
      </div>

      {/* ── Filtros ──────────────────────────────────────────────────────── */}
      <div style={{
        display: 'flex', gap: '10px', flexWrap: 'wrap',
        padding: '16px', marginBottom: '20px',
        background: '#fff', borderRadius: '14px',
        border: '1px solid #f0f2f5',
        boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
      }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <label style={{ fontSize: '11px', fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            Data
          </label>
          <input
            type="date"
            value={dateFilter}
            onChange={(e) => { setDateFilter(e.target.value); setPage(1) }}
            style={{ ...inputStyle, minWidth: '150px' }}
          />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <label style={{ fontSize: '11px', fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            Profissional
          </label>
          <select
            value={profFilter}
            onChange={(e) => { setProfFilter(e.target.value); setPage(1) }}
            style={{ ...inputStyle, paddingRight: '32px' }}
          >
            <option value="">Todos</option>
            {profsData?.data.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <label style={{ fontSize: '11px', fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            Status
          </label>
          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setPage(1) }}
            style={{ ...inputStyle, paddingRight: '32px' }}
          >
            <option value="">Todos</option>
            {Object.entries(STATUS_LABEL).map(([val, label]) => (
              <option key={val} value={val}>{label}</option>
            ))}
          </select>
        </div>

        {(dateFilter || profFilter || statusFilter) && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', justifyContent: 'flex-end' }}>
            <label style={{ fontSize: '11px', color: 'transparent' }}>_</label>
            <button
              onClick={() => { setDateFilter(''); setProfFilter(''); setStatusFilter(''); setPage(1) }}
              style={{
                ...inputStyle,
                background: '#f8fafc', color: '#64748b',
                border: '1.5px solid #e2e8f0', cursor: 'pointer',
                padding: '0 14px', fontSize: '12.5px',
              }}
            >
              Limpar filtros
            </button>
          </div>
        )}
      </div>

      {/* ── Tabela ───────────────────────────────────────────────────────── */}
      <div style={{
        background: '#fff', borderRadius: '16px',
        border: '1px solid #f0f2f5',
        boxShadow: '0 1px 6px rgba(0,0,0,0.04)',
        overflow: 'hidden',
      }}>
        {isLoading ? (
          <div style={{ padding: '60px', textAlign: 'center', color: '#94a3b8' }}>
            Carregando agendamentos...
          </div>
        ) : isError ? (
          <div style={{ padding: '60px', textAlign: 'center', color: '#dc2626' }}>
            Erro ao carregar. Tente novamente.
          </div>
        ) : appointments.length === 0 ? (
          <div style={{ padding: '72px 32px', textAlign: 'center' }}>
            <svg width="40" height="40" fill="none" stroke="#cbd5e1" viewBox="0 0 24 24" style={{ margin: '0 auto 12px', display: 'block' }}>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <p style={{ margin: 0, fontSize: '14px', color: '#94a3b8' }}>
              Nenhum agendamento encontrado
            </p>
            <p style={{ margin: '4px 0 0', fontSize: '13px', color: '#cbd5e1' }}>
              Ajuste os filtros ou crie um novo agendamento.
            </p>
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #f0f2f5', background: '#fafbfc' }}>
                {['Horário', 'Paciente', 'Profissional', 'Procedimento', 'Status', 'Ações'].map((h) => (
                  <th key={h} style={{
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
                  apt={apt}
                  slug={slug}
                  onStatusChange={(id, status) => updateStatus.mutate({ id, status })}
                  onCancel={setCancelTarget}
                  loadingId={loadingId}
                />
              ))}
            </tbody>
          </table>
        )}

        {/* Paginação */}
        {totalPages > 1 && (
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '14px 20px', borderTop: '1px solid #f0f2f5',
          }}>
            <span style={{ fontSize: '13px', color: '#94a3b8' }}>
              Página {page} de {totalPages}
            </span>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                style={{
                  padding: '7px 14px', borderRadius: '8px', fontSize: '13px', fontWeight: 500,
                  border: '1.5px solid #e2e8f0', background: '#fff', color: '#4a5568',
                  cursor: page === 1 ? 'not-allowed' : 'pointer', opacity: page === 1 ? 0.5 : 1,
                  fontFamily: 'var(--font-sans)',
                }}
              >
                ← Anterior
              </button>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                style={{
                  padding: '7px 14px', borderRadius: '8px', fontSize: '13px', fontWeight: 500,
                  border: '1.5px solid #e2e8f0', background: '#fff', color: '#4a5568',
                  cursor: page === totalPages ? 'not-allowed' : 'pointer',
                  opacity: page === totalPages ? 0.5 : 1,
                  fontFamily: 'var(--font-sans)',
                }}
              >
                Próxima →
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── Modal Cancelar ───────────────────────────────────────────────── */}
      {cancelTarget && (
        <CancelModal
          appointment={cancelTarget}
          onClose={() => setCancelTarget(null)}
          loading={cancelMutation.isPending}
          onConfirm={(reason) => cancelMutation.mutate({ id: cancelTarget.id, reason })}
        />
      )}
    </div>
  )
}
