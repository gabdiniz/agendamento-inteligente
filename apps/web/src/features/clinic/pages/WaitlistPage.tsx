// ─── Waitlist Page ────────────────────────────────────────────────────────────
//
// Lista de espera da clínica.
// Status flow: WAITING → NOTIFIED → CONFIRMED | EXPIRED | REMOVED
// Ações possíveis por status:
//   WAITING  → Confirmar vaga | Remover
//   NOTIFIED → Confirmar vaga | Expirar | Remover
//   outros   → somente leitura
// ─────────────────────────────────────────────────────────────────────────────

import { useState } from 'react'
import { useParams } from '@tanstack/react-router'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  waitlistApi,
  proceduresApi,
  professionalsApi,
  type WaitlistEntry,
  type Procedure,
  type Professional,
} from '@/lib/api/clinic.api'
import { clinicTokens } from '@/lib/api/client'
import { Button } from '@/components/ui/Button'

// ─── Status config ────────────────────────────────────────────────────────────

const STATUS_LABELS: Record<string, string> = {
  WAITING:   'Aguardando',
  NOTIFIED:  'Notificado',
  CONFIRMED: 'Confirmado',
  EXPIRED:   'Expirado',
  REMOVED:   'Removido',
}

const STATUS_COLORS: Record<string, { bg: string; color: string }> = {
  WAITING:   { bg: '#eff6ff', color: '#2563eb' },
  NOTIFIED:  { bg: '#fff7ed', color: '#c2410c' },
  CONFIRMED: { bg: '#f0fdf4', color: '#15803d' },
  EXPIRED:   { bg: '#f8fafc', color: '#94a3b8' },
  REMOVED:   { bg: '#fff1f2', color: '#be123c' },
}

const STATUS_FILTERS = [
  { value: '', label: 'Todos' },
  { value: 'WAITING',   label: 'Aguardando' },
  { value: 'NOTIFIED',  label: 'Notificado' },
  { value: 'CONFIRMED', label: 'Confirmado' },
  { value: 'EXPIRED',   label: 'Expirado' },
  { value: 'REMOVED',   label: 'Removido' },
]

// ─── Helpers ──────────────────────────────────────────────────────────────────

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins  = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days  = Math.floor(diff / 86400000)
  if (days > 0)  return `${days}d atrás`
  if (hours > 0) return `${hours}h atrás`
  return `${mins}min atrás`
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '—'
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })
}

// ─── Shimmer skeleton ─────────────────────────────────────────────────────────

function SkeletonRow() {
  return (
    <tr style={{ borderBottom: '1px solid #f0f2f5' }}>
      {[200, 140, 120, 110, 80, 90, 80].map((w, i) => (
        <td key={i} style={{ padding: '14px 16px' }}>
          <div className="shimmer" style={{ height: 13, borderRadius: 6, width: w }} />
        </td>
      ))}
    </tr>
  )
}

// ─── Status Badge ─────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_COLORS[status] ?? { bg: '#f8fafc', color: '#64748b' }
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center',
      padding: '3px 10px', borderRadius: 20,
      background: cfg.bg, color: cfg.color,
      fontSize: 11, fontWeight: 700, letterSpacing: '0.02em',
      whiteSpace: 'nowrap',
    }}>
      {STATUS_LABELS[status] ?? status}
    </span>
  )
}

// ─── Add to Waitlist Modal ────────────────────────────────────────────────────

interface AddModalProps {
  procedures: Procedure[]
  professionals: Professional[]
  onClose: () => void
  onSuccess: () => void
}

function AddWaitlistModal({ procedures, professionals, onClose, onSuccess }: AddModalProps) {
  const [form, setForm] = useState({
    patientPhone: '',
    patientName: '',
    patientEmail: '',
    procedureId: '',
    professionalId: '',
    preferredDateFrom: '',
    preferredDateTo: '',
  })
  const [error, setError] = useState<string | null>(null)

  const mutation = useMutation({
    mutationFn: () => waitlistApi.create({
      patientPhone: form.patientPhone,
      patientName: form.patientName,
      ...(form.patientEmail ? { patientEmail: form.patientEmail } : {}),
      procedureId: form.procedureId,
      ...(form.professionalId ? { professionalId: form.professionalId } : {}),
      ...(form.preferredDateFrom ? { preferredDateFrom: form.preferredDateFrom } : {}),
      ...(form.preferredDateTo   ? { preferredDateTo: form.preferredDateTo } : {}),
    }),
    onSuccess: () => { onSuccess(); onClose() },
    onError: (e: Error) => setError(e.message ?? 'Erro ao adicionar à lista'),
  })

  function set(field: string, value: string) {
    setForm(f => ({ ...f, [field]: value }))
    setError(null)
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.patientPhone || !form.patientName || !form.procedureId) {
      setError('Preencha telefone, nome e procedimento')
      return
    }
    mutation.mutate()
  }

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '9px 12px', borderRadius: 10,
    border: '1px solid #e2e8f0', fontSize: 13, color: '#1a2530',
    outline: 'none', boxSizing: 'border-box',
    fontFamily: 'var(--font-sans)',
    background: '#fff',
  }
  const labelStyle: React.CSSProperties = {
    display: 'block', fontSize: 12, fontWeight: 600,
    color: '#64748b', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.04em',
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 1000, padding: '16px',
    }}>
      <div style={{
        background: '#fff', borderRadius: 20, padding: '32px',
        width: '100%', maxWidth: 520,
        boxShadow: '0 20px 60px rgba(0,0,0,0.15)',
        maxHeight: '90vh', overflowY: 'auto',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: '#1a2530' }}>
            Adicionar à lista de espera
          </h2>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, color: '#94a3b8', fontSize: 20, lineHeight: 1 }}
          >×</button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Paciente */}
          <div style={{ padding: '16px', background: '#f8fafc', borderRadius: 12, display: 'flex', flexDirection: 'column', gap: 12 }}>
            <p style={{ margin: 0, fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Dados do paciente
            </p>
            <div>
              <label style={labelStyle}>Telefone *</label>
              <input style={inputStyle} placeholder="(11) 99999-9999" value={form.patientPhone}
                onChange={e => set('patientPhone', e.target.value)} />
            </div>
            <div>
              <label style={labelStyle}>Nome *</label>
              <input style={inputStyle} placeholder="Nome completo" value={form.patientName}
                onChange={e => set('patientName', e.target.value)} />
            </div>
            <div>
              <label style={labelStyle}>E-mail <span style={{ fontWeight: 400, textTransform: 'none' }}>(opcional)</span></label>
              <input style={inputStyle} type="email" placeholder="email@exemplo.com" value={form.patientEmail}
                onChange={e => set('patientEmail', e.target.value)} />
            </div>
          </div>

          {/* Procedimento e profissional */}
          <div>
            <label style={labelStyle}>Procedimento *</label>
            <select style={inputStyle} value={form.procedureId} onChange={e => set('procedureId', e.target.value)}>
              <option value="">Selecione...</option>
              {procedures.filter(p => p.isActive).map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label style={labelStyle}>Profissional <span style={{ fontWeight: 400, textTransform: 'none' }}>(opcional — qualquer)</span></label>
            <select style={inputStyle} value={form.professionalId} onChange={e => set('professionalId', e.target.value)}>
              <option value="">Qualquer profissional</option>
              {professionals.filter(p => p.isActive).map(p => (
                <option key={p.id} value={p.id}>{p.name}{p.specialty ? ` — ${p.specialty}` : ''}</option>
              ))}
            </select>
          </div>

          {/* Período preferido */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={labelStyle}>A partir de <span style={{ fontWeight: 400, textTransform: 'none' }}>(opcional)</span></label>
              <input style={inputStyle} type="date" value={form.preferredDateFrom}
                onChange={e => set('preferredDateFrom', e.target.value)} />
            </div>
            <div>
              <label style={labelStyle}>Até <span style={{ fontWeight: 400, textTransform: 'none' }}>(opcional)</span></label>
              <input style={inputStyle} type="date" value={form.preferredDateTo}
                min={form.preferredDateFrom || undefined}
                onChange={e => set('preferredDateTo', e.target.value)} />
            </div>
          </div>

          {error && (
            <div style={{ padding: '10px 14px', background: '#fff1f2', borderRadius: 10, color: '#be123c', fontSize: 13 }}>
              {error}
            </div>
          )}

          <div className="r-btn-row" style={{ paddingTop: 4 }}>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? 'Adicionando...' : 'Adicionar à lista'}
            </Button>
            <Button type="button" variant="ghost" onClick={onClose}>Cancelar</Button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── Confirm Vacancy Modal ────────────────────────────────────────────────────

interface ConfirmModalProps {
  entry: WaitlistEntry
  onClose: () => void
  onSuccess: () => void
}

function ConfirmModal({ entry, onClose, onSuccess }: ConfirmModalProps) {
  const [appointmentId, setAppointmentId] = useState('')
  const [error, setError] = useState<string | null>(null)

  const mutation = useMutation({
    mutationFn: () => waitlistApi.confirm(entry.id, appointmentId || undefined),
    onSuccess: () => { onSuccess(); onClose() },
    onError: (e: Error) => setError(e.message ?? 'Erro ao confirmar'),
  })

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 1000, padding: '16px',
    }}>
      <div style={{
        background: '#fff', borderRadius: 20, padding: '32px',
        width: '100%', maxWidth: 420,
        boxShadow: '0 20px 60px rgba(0,0,0,0.15)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: '#1a2530' }}>Confirmar vaga</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, color: '#94a3b8', fontSize: 20, lineHeight: 1 }}>×</button>
        </div>

        <p style={{ margin: '0 0 20px', fontSize: 14, color: '#64748b', lineHeight: 1.5 }}>
          Confirmar vaga para <strong style={{ color: '#1a2530' }}>{entry.patient.name}</strong>?
          <br />Procedimento: <strong style={{ color: '#1a2530' }}>{entry.procedure.name}</strong>
        </p>

        <div style={{ marginBottom: 16 }}>
          <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#64748b', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            ID do agendamento <span style={{ fontWeight: 400, textTransform: 'none' }}>(opcional)</span>
          </label>
          <input
            value={appointmentId}
            onChange={e => { setAppointmentId(e.target.value); setError(null) }}
            placeholder="Cole aqui o ID do agendamento criado..."
            style={{
              width: '100%', padding: '9px 12px', borderRadius: 10,
              border: '1px solid #e2e8f0', fontSize: 13, color: '#1a2530',
              outline: 'none', boxSizing: 'border-box', fontFamily: 'var(--font-sans)',
            }}
          />
          <p style={{ margin: '6px 0 0', fontSize: 11, color: '#94a3b8' }}>
            Se deixar vazio, o status muda para CONFIRMADO sem vincular agendamento.
          </p>
        </div>

        {error && (
          <div style={{ padding: '10px 14px', background: '#fff1f2', borderRadius: 10, color: '#be123c', fontSize: 13, marginBottom: 16 }}>
            {error}
          </div>
        )}

        <div className="r-btn-row">
          <Button onClick={() => mutation.mutate()} disabled={mutation.isPending}>
            {mutation.isPending ? 'Confirmando...' : 'Confirmar vaga'}
          </Button>
          <Button variant="ghost" onClick={onClose}>Cancelar</Button>
        </div>
      </div>
    </div>
  )
}

// ─── Table Row ────────────────────────────────────────────────────────────────

interface RowProps {
  entry: WaitlistEntry
  onConfirm: (e: WaitlistEntry) => void
  onExpire: (e: WaitlistEntry) => void
  onRemove: (e: WaitlistEntry) => void
}

function WaitlistRow({ entry, onConfirm, onExpire, onRemove }: RowProps) {
  const isActionable = entry.status === 'WAITING' || entry.status === 'NOTIFIED'
  const canConfirm = isActionable
  const canExpire  = entry.status === 'NOTIFIED'
  const canRemove  = isActionable

  const btnStyle: React.CSSProperties = {
    display: 'inline-flex', alignItems: 'center',
    padding: '4px 10px', borderRadius: 8,
    background: '#f8fafc', color: '#374151',
    border: '1px solid #e2e8f0',
    fontSize: 11, fontWeight: 600,
    cursor: 'pointer', whiteSpace: 'nowrap',
  }
  const dangerStyle: React.CSSProperties = { ...btnStyle, background: '#fff1f2', color: '#be123c', border: '1px solid #fecdd3' }
  const warnStyle: React.CSSProperties   = { ...btnStyle, background: '#fff7ed', color: '#c2410c', border: '1px solid #fed7aa' }

  const period = (entry.preferredDateFrom || entry.preferredDateTo)
    ? `${formatDate(entry.preferredDateFrom)} → ${formatDate(entry.preferredDateTo)}`
    : '—'

  return (
    <tr style={{ borderBottom: '1px solid #f0f2f5' }}>
      {/* Paciente */}
      <td style={{ padding: '12px 16px' }}>
        <p style={{ margin: '0 0 2px', fontSize: 13, fontWeight: 600, color: '#1a2530' }}>
          {entry.patient.name}
        </p>
        <p style={{ margin: 0, fontSize: 11, color: '#94a3b8' }}>{entry.patient.phone}</p>
      </td>

      {/* Procedimento */}
      <td style={{ padding: '12px 16px', fontSize: 13, color: '#4a5568' }}>
        {entry.procedure.name}
      </td>

      {/* Profissional */}
      <td style={{ padding: '12px 16px', fontSize: 13, color: '#4a5568' }}>
        {entry.professional?.name ?? (
          <span style={{ color: '#94a3b8', fontStyle: 'italic' }}>Qualquer</span>
        )}
      </td>

      {/* Período preferido */}
      <td style={{ padding: '12px 16px', fontSize: 12, color: '#64748b', whiteSpace: 'nowrap' }}>
        {period}
      </td>

      {/* Tempo na fila */}
      <td style={{ padding: '12px 16px', fontSize: 12, color: '#94a3b8', whiteSpace: 'nowrap' }}>
        {timeAgo(entry.createdAt)}
      </td>

      {/* Status */}
      <td style={{ padding: '12px 16px' }}>
        <StatusBadge status={entry.status} />
      </td>

      {/* Ações */}
      <td style={{ padding: '12px 16px' }}>
        {isActionable ? (
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {canConfirm && (
              <button style={btnStyle} onClick={() => onConfirm(entry)}>
                ✓ Confirmar
              </button>
            )}
            {canExpire && (
              <button style={warnStyle} onClick={() => onExpire(entry)}>
                Expirar
              </button>
            )}
            {canRemove && (
              <button style={dangerStyle} onClick={() => onRemove(entry)}>
                Remover
              </button>
            )}
          </div>
        ) : (
          <span style={{ fontSize: 12, color: '#cbd5e1' }}>—</span>
        )}
      </td>
    </tr>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export function WaitlistPage() {
  const params = useParams({ strict: false }) as { slug?: string }
  const slug = params.slug ?? clinicTokens.getSlug() ?? ''
  const qc = useQueryClient()

  // ── Filters ──────────────────────────────────────────────────────────────
  const [statusFilter, setStatusFilter] = useState('')
  const [page, setPage] = useState(1)

  // ── Modal state ───────────────────────────────────────────────────────────
  const [showAdd, setShowAdd] = useState(false)
  const [confirmEntry, setConfirmEntry] = useState<WaitlistEntry | null>(null)
  const [removeTarget, setRemoveTarget] = useState<WaitlistEntry | null>(null)

  // ── Queries ───────────────────────────────────────────────────────────────
  const { data, isLoading } = useQuery({
    queryKey: ['waitlist', { page, status: statusFilter }],
    queryFn: () => waitlistApi.list({ page, limit: 20, status: statusFilter || undefined }),
  })

  const { data: proceduresData } = useQuery({
    queryKey: ['procedures-all'],
    queryFn: () => proceduresApi.list({ limit: 100 }),
    staleTime: 60_000,
  })

  const { data: professionalsData } = useQuery({
    queryKey: ['professionals-all'],
    queryFn: () => professionalsApi.list({ limit: 100 }),
    staleTime: 60_000,
  })

  function invalidate() {
    qc.invalidateQueries({ queryKey: ['waitlist'] })
  }

  // ── Expire mutation ───────────────────────────────────────────────────────
  const expireMutation = useMutation({
    mutationFn: (id: string) => waitlistApi.expire(id),
    onSuccess: invalidate,
  })

  // ── Remove mutation ───────────────────────────────────────────────────────
  const removeMutation = useMutation({
    mutationFn: (id: string) => waitlistApi.remove(id),
    onSuccess: () => { setRemoveTarget(null); invalidate() },
  })

  const entries = data?.data ?? []
  const totalPages = data?.totalPages ?? 1

  const procedures   = proceduresData?.data   ?? []
  const professionals = professionalsData?.data ?? []

  // ── Counts for filter pills ───────────────────────────────────────────────
  // Reutiliza a query sem filtro de status pra calcular contagens seria caro.
  // Optamos por mostrar só o total da página atual + label claro.

  return (
    <>
      <style>{`
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(12px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .shimmer {
          background: linear-gradient(90deg, #f0f2f5 25%, #e2e8f0 50%, #f0f2f5 75%);
          background-size: 200% 100%;
          animation: shimmer 1.4s infinite;
        }
        @keyframes shimmer {
          from { background-position: 200% 0; }
          to   { background-position: -200% 0; }
        }
        .wl-action-btn:hover { filter: brightness(0.95); }
      `}</style>

      <div className="r-page" style={{ maxWidth: '1280px', fontFamily: 'var(--font-sans)' }}>

        {/* ── Header ────────────────────────────────────────────────────────── */}
        <div style={{
          display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
          marginBottom: '28px', animation: 'fadeUp 0.35s ease both',
          flexWrap: 'wrap', gap: '16px',
        }}>
          <div>
            <h1 style={{
              margin: 0, fontSize: '26px', fontWeight: 400,
              fontFamily: 'var(--font-display)', fontStyle: 'italic',
              color: '#1a2530', letterSpacing: '-0.02em',
            }}>
              Lista de Espera
            </h1>
            <p style={{ margin: '4px 0 0', fontSize: '13px', color: '#94a3b8' }}>
              {data?.total ?? '—'} {(data?.total ?? 0) === 1 ? 'entrada' : 'entradas'} no total
            </p>
          </div>
          <Button onClick={() => setShowAdd(true)}>
            <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ marginRight: 6 }}>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
            </svg>
            Adicionar à lista
          </Button>
        </div>

        {/* ── Filtros de status ──────────────────────────────────────────────── */}
        <div style={{
          display: 'flex', gap: '8px', marginBottom: '20px', flexWrap: 'wrap',
          animation: 'fadeUp 0.35s ease 0.05s both',
        }}>
          {STATUS_FILTERS.map(f => (
            <button
              key={f.value}
              onClick={() => { setStatusFilter(f.value); setPage(1) }}
              style={{
                padding: '6px 14px', borderRadius: 20, fontSize: 12, fontWeight: 600,
                cursor: 'pointer', transition: 'all 0.15s',
                border: statusFilter === f.value ? '1.5px solid var(--color-primary)' : '1.5px solid #e2e8f0',
                background: statusFilter === f.value ? 'var(--color-primary)' : '#fff',
                color: statusFilter === f.value ? '#fff' : '#64748b',
              }}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* ── Tabela ────────────────────────────────────────────────────────── */}
        <div style={{
          background: '#fff', borderRadius: '16px',
          border: '1px solid #f0f2f5',
          boxShadow: '0 1px 6px rgba(0,0,0,0.04)',
          overflow: 'hidden',
          animation: 'fadeUp 0.35s ease 0.1s both',
        }}>
          <div className="r-table-wrap">
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 760 }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '1px solid #f0f2f5' }}>
                  {['Paciente', 'Procedimento', 'Profissional', 'Período preferido', 'Na fila há', 'Status', 'Ações'].map(h => (
                    <th key={h} style={{
                      padding: '12px 16px', textAlign: 'left',
                      fontSize: 11, fontWeight: 700, color: '#94a3b8',
                      textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap',
                    }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} />)
                ) : entries.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ padding: '48px 16px', textAlign: 'center' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
                        <svg width="40" height="40" fill="none" stroke="#cbd5e1" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <p style={{ margin: 0, color: '#94a3b8', fontSize: 14 }}>
                          {statusFilter ? `Nenhuma entrada com status "${STATUS_LABELS[statusFilter]}"` : 'Nenhuma entrada na lista de espera'}
                        </p>
                        {!statusFilter && (
                          <button
                            onClick={() => setShowAdd(true)}
                            style={{
                              padding: '8px 18px', borderRadius: 10, fontSize: 13, fontWeight: 600,
                              background: 'var(--color-primary)', color: '#fff', border: 'none', cursor: 'pointer',
                            }}
                          >
                            Adicionar primeiro paciente
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ) : (
                  entries.map(entry => (
                    <WaitlistRow
                      key={entry.id}
                      entry={entry}
                      onConfirm={setConfirmEntry}
                      onExpire={e => expireMutation.mutate(e.id)}
                      onRemove={setRemoveTarget}
                    />
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Paginação */}
          {totalPages > 1 && (
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '14px 20px', borderTop: '1px solid #f0f2f5',
              fontSize: 13, color: '#64748b',
            }}>
              <span>Página {page} de {totalPages}</span>
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  disabled={page <= 1}
                  onClick={() => setPage(p => p - 1)}
                  style={{
                    padding: '6px 14px', borderRadius: 8, fontSize: 12, fontWeight: 600,
                    border: '1px solid #e2e8f0', background: '#fff', color: '#374151',
                    cursor: page <= 1 ? 'not-allowed' : 'pointer', opacity: page <= 1 ? 0.5 : 1,
                  }}
                >← Anterior</button>
                <button
                  disabled={page >= totalPages}
                  onClick={() => setPage(p => p + 1)}
                  style={{
                    padding: '6px 14px', borderRadius: 8, fontSize: 12, fontWeight: 600,
                    border: '1px solid #e2e8f0', background: '#fff', color: '#374151',
                    cursor: page >= totalPages ? 'not-allowed' : 'pointer', opacity: page >= totalPages ? 0.5 : 1,
                  }}
                >Próxima →</button>
              </div>
            </div>
          )}
        </div>

        {/* ── Legenda de status ──────────────────────────────────────────────── */}
        <div style={{
          marginTop: '16px', display: 'flex', gap: '16px', flexWrap: 'wrap',
          animation: 'fadeUp 0.35s ease 0.15s both',
        }}>
          {Object.entries(STATUS_LABELS).map(([key, label]) => {
            const cfg = STATUS_COLORS[key]
            return (
              <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{
                  width: 8, height: 8, borderRadius: '50%',
                  background: cfg?.color ?? '#94a3b8', display: 'inline-block',
                }} />
                <span style={{ fontSize: 11, color: '#94a3b8' }}>{label}</span>
              </div>
            )
          })}
        </div>
      </div>

      {/* ── Modais ────────────────────────────────────────────────────────────── */}

      {showAdd && (
        <AddWaitlistModal
          procedures={procedures}
          professionals={professionals}
          onClose={() => setShowAdd(false)}
          onSuccess={invalidate}
        />
      )}

      {confirmEntry && (
        <ConfirmModal
          entry={confirmEntry}
          onClose={() => setConfirmEntry(null)}
          onSuccess={invalidate}
        />
      )}

      {/* Remove confirmation */}
      {removeTarget && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 1000, padding: '16px',
        }}>
          <div style={{
            background: '#fff', borderRadius: 20, padding: '32px',
            width: '100%', maxWidth: 400,
            boxShadow: '0 20px 60px rgba(0,0,0,0.15)',
          }}>
            <h2 style={{ margin: '0 0 12px', fontSize: 18, fontWeight: 700, color: '#1a2530' }}>
              Remover da lista?
            </h2>
            <p style={{ margin: '0 0 24px', fontSize: 14, color: '#64748b', lineHeight: 1.5 }}>
              <strong style={{ color: '#1a2530' }}>{removeTarget.patient.name}</strong> será removido(a)
              da lista de espera para <strong style={{ color: '#1a2530' }}>{removeTarget.procedure.name}</strong>.
              Esta ação não pode ser desfeita.
            </p>
            <div className="r-btn-row">
              <Button
                onClick={() => removeMutation.mutate(removeTarget.id)}
                disabled={removeMutation.isPending}
                style={{ background: '#be123c', borderColor: '#be123c' }}
              >
                {removeMutation.isPending ? 'Removendo...' : 'Remover'}
              </Button>
              <Button variant="ghost" onClick={() => setRemoveTarget(null)}>Cancelar</Button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
