// ─── Notifications Page ───────────────────────────────────────────────────────
//
// Log de notificações da clínica.
// Status:  PENDING (azul) → SENT (verde) | FAILED (vermelho) → READ (cinza)
// Ações:   FAILED → Reenviar | qualquer → Marcar como lida
// Modal:   "Nova notificação" para envio CUSTOM ou tipado
// ─────────────────────────────────────────────────────────────────────────────

import { useState } from 'react'
import { useParams } from '@tanstack/react-router'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  notificationsApi,
  type NotificationRecord,
  type NotificationStatus,
  type NotificationChannel,
  type NotificationType,
} from '@/lib/api/clinic.api'
import { clinicTokens } from '@/lib/api/client'
import { Button } from '@/components/ui/Button'

// ─── Display config ───────────────────────────────────────────────────────────

const STATUS_LABEL: Record<NotificationStatus, string> = {
  PENDING: 'Pendente',
  SENT:    'Enviado',
  FAILED:  'Falhou',
  READ:    'Lido',
}
const STATUS_COLORS: Record<NotificationStatus, { bg: string; color: string }> = {
  PENDING: { bg: '#eff6ff', color: '#2563eb' },
  SENT:    { bg: '#f0fdf4', color: '#15803d' },
  FAILED:  { bg: '#fff1f2', color: '#be123c' },
  READ:    { bg: '#f8fafc', color: '#94a3b8' },
}

const TYPE_LABEL: Record<NotificationType, string> = {
  APPOINTMENT_CONFIRMATION: 'Confirmação',
  APPOINTMENT_REMINDER:     'Lembrete',
  WAITLIST_VACANCY:         'Vaga disponível',
  CAMPAIGN:                 'Campanha',
  RETENTION_SUGGESTION:     'Retenção',
  CUSTOM:                   'Personalizada',
}

const CHANNEL_LABEL: Record<NotificationChannel, string> = {
  WHATSAPP: 'WhatsApp',
  SMS:      'SMS',
  EMAIL:    'E-mail',
}

const CHANNEL_COLORS: Record<NotificationChannel, { bg: string; color: string }> = {
  WHATSAPP: { bg: '#f0fdf4', color: '#15803d' },
  SMS:      { bg: '#eff6ff', color: '#1d4ed8' },
  EMAIL:    { bg: '#fdf4ff', color: '#7e22ce' },
}

const STATUS_FILTER_OPTIONS: { value: string; label: string }[] = [
  { value: '',        label: 'Todos' },
  { value: 'PENDING', label: 'Pendente' },
  { value: 'SENT',    label: 'Enviado' },
  { value: 'FAILED',  label: 'Falhou' },
  { value: 'READ',    label: 'Lido' },
]

// ─── Channel icon ─────────────────────────────────────────────────────────────

function ChannelIcon({ channel }: { channel: NotificationChannel }) {
  const cfg = CHANNEL_COLORS[channel]
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      padding: '3px 9px', borderRadius: 20, fontSize: 11, fontWeight: 700,
      background: cfg.bg, color: cfg.color,
    }}>
      {channel === 'EMAIL' && (
        <svg width="11" height="11" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
        </svg>
      )}
      {channel === 'WHATSAPP' && (
        <svg width="11" height="11" fill="currentColor" viewBox="0 0 24 24">
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
        </svg>
      )}
      {channel === 'SMS' && (
        <svg width="11" height="11" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
        </svg>
      )}
      {CHANNEL_LABEL[channel]}
    </span>
  )
}

// ─── Status Badge ─────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: NotificationStatus }) {
  const cfg = STATUS_COLORS[status]
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', padding: '3px 10px',
      borderRadius: 20, background: cfg.bg, color: cfg.color,
      fontSize: 11, fontWeight: 700, letterSpacing: '0.02em', whiteSpace: 'nowrap',
    }}>
      {STATUS_LABEL[status]}
    </span>
  )
}

// ─── Skeleton row ─────────────────────────────────────────────────────────────

function SkeletonRow() {
  return (
    <tr style={{ borderBottom: '1px solid #f0f2f5' }}>
      {[120, 80, 100, 200, 80, 100, 70].map((w, i) => (
        <td key={i} style={{ padding: '14px 16px' }}>
          <div className="shimmer" style={{ height: 13, borderRadius: 6, width: w }} />
        </td>
      ))}
    </tr>
  )
}

// ─── Send Notification Modal ──────────────────────────────────────────────────

interface SendModalProps {
  onClose: () => void
  onSuccess: () => void
}

function SendNotificationModal({ onClose, onSuccess }: SendModalProps) {
  const [form, setForm] = useState({
    type:        'CUSTOM' as NotificationType,
    channel:     'EMAIL'  as NotificationChannel,
    recipient:   '',
    content:     '',
    subject:     '',
  })
  const [error, setError] = useState<string | null>(null)

  const mutation = useMutation({
    mutationFn: () => notificationsApi.send({
      type:      form.type,
      channel:   form.channel,
      recipient: form.recipient,
      content:   form.content,
      ...(form.channel === 'EMAIL' && form.subject ? { subject: form.subject } : {}),
    }),
    onSuccess: () => { onSuccess(); onClose() },
    onError: (e: Error) => setError(e.message ?? 'Erro ao enviar notificação'),
  })

  function set(field: string, value: string) {
    setForm(f => ({ ...f, [field]: value }))
    setError(null)
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.recipient || !form.content) {
      setError('Destinatário e conteúdo são obrigatórios')
      return
    }
    mutation.mutate()
  }

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '9px 12px', borderRadius: 10,
    border: '1px solid #e2e8f0', fontSize: 13, color: '#1a2530',
    outline: 'none', boxSizing: 'border-box',
    fontFamily: 'var(--font-sans)', background: '#fff',
  }
  const labelStyle: React.CSSProperties = {
    display: 'block', fontSize: 12, fontWeight: 600,
    color: '#64748b', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.04em',
  }

  const recipientPlaceholder = form.channel === 'EMAIL'
    ? 'email@exemplo.com'
    : form.channel === 'WHATSAPP'
      ? '+55 11 99999-9999'
      : '5511999999999'

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 1000, padding: 16,
    }}>
      <div style={{
        background: '#fff', borderRadius: 20, padding: 32,
        width: '100%', maxWidth: 500,
        boxShadow: '0 20px 60px rgba(0,0,0,0.15)',
        maxHeight: '90vh', overflowY: 'auto',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: '#1a2530' }}>
            Nova notificação
          </h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, color: '#94a3b8', fontSize: 20, lineHeight: 1 }}>×</button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Tipo + Canal */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={labelStyle}>Tipo</label>
              <select style={inputStyle} value={form.type} onChange={e => set('type', e.target.value)}>
                {(Object.entries(TYPE_LABEL) as [NotificationType, string][]).map(([v, l]) => (
                  <option key={v} value={v}>{l}</option>
                ))}
              </select>
            </div>
            <div>
              <label style={labelStyle}>Canal *</label>
              <select style={inputStyle} value={form.channel} onChange={e => set('channel', e.target.value)}>
                <option value="EMAIL">E-mail</option>
                <option value="WHATSAPP">WhatsApp</option>
                <option value="SMS">SMS</option>
              </select>
            </div>
          </div>

          {/* Destinatário */}
          <div>
            <label style={labelStyle}>Destinatário *</label>
            <input
              style={inputStyle}
              placeholder={recipientPlaceholder}
              value={form.recipient}
              onChange={e => set('recipient', e.target.value)}
            />
          </div>

          {/* Assunto — só EMAIL */}
          {form.channel === 'EMAIL' && (
            <div>
              <label style={labelStyle}>Assunto <span style={{ fontWeight: 400, textTransform: 'none' }}>(opcional)</span></label>
              <input
                style={inputStyle}
                placeholder="Assunto do e-mail"
                value={form.subject}
                onChange={e => set('subject', e.target.value)}
              />
            </div>
          )}

          {/* Conteúdo */}
          <div>
            <label style={labelStyle}>Mensagem *</label>
            <textarea
              style={{ ...inputStyle, minHeight: 100, resize: 'vertical', lineHeight: 1.5 }}
              placeholder="Digite a mensagem..."
              value={form.content}
              onChange={e => set('content', e.target.value)}
            />
            <p style={{ margin: '5px 0 0', fontSize: 11, color: '#94a3b8' }}>
              {form.content.length} caractere{form.content.length !== 1 ? 's' : ''}
            </p>
          </div>

          {/* Aviso dry-run */}
          <div style={{
            padding: '10px 14px', background: '#fffbeb', borderRadius: 10,
            border: '1px solid #fde68a', fontSize: 12, color: '#92400e',
            display: 'flex', gap: 8, alignItems: 'flex-start',
          }}>
            <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ flexShrink: 0, marginTop: 1 }}>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <span>
              Em dev sem SMTP/WhatsApp configurado, o envio é simulado (dry-run) e o registro é salvo com status <strong>SENT</strong>.
            </span>
          </div>

          {error && (
            <div style={{ padding: '10px 14px', background: '#fff1f2', borderRadius: 10, color: '#be123c', fontSize: 13 }}>
              {error}
            </div>
          )}

          <div className="r-btn-row" style={{ paddingTop: 4 }}>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? 'Enviando...' : 'Enviar notificação'}
            </Button>
            <Button type="button" variant="ghost" onClick={onClose}>Cancelar</Button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── Notification Row ─────────────────────────────────────────────────────────

interface RowProps {
  notif: NotificationRecord
  onRetry: (id: string) => void
  onMarkRead: (id: string) => void
  isRetrying: boolean
}

function NotificationRow({ notif, onRetry, onMarkRead, isRetrying }: RowProps) {
  const createdAt = new Date(notif.createdAt)
  const dateLabel = createdAt.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })
  const timeLabel = createdAt.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })

  const btnStyle: React.CSSProperties = {
    display: 'inline-flex', alignItems: 'center', padding: '4px 10px',
    borderRadius: 8, background: '#f8fafc', color: '#374151',
    border: '1px solid #e2e8f0', fontSize: 11, fontWeight: 600,
    cursor: 'pointer', whiteSpace: 'nowrap',
  }
  const retryStyle: React.CSSProperties = {
    ...btnStyle, background: '#fff1f2', color: '#be123c', border: '1px solid #fecdd3',
  }

  return (
    <tr style={{ borderBottom: '1px solid #f0f2f5' }}>
      {/* Destinatário */}
      <td style={{ padding: '12px 16px' }}>
        <p style={{ margin: '0 0 2px', fontSize: 13, fontWeight: 600, color: '#1a2530', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {notif.recipient}
        </p>
      </td>

      {/* Canal */}
      <td style={{ padding: '12px 16px' }}>
        <ChannelIcon channel={notif.channel} />
      </td>

      {/* Tipo */}
      <td style={{ padding: '12px 16px', fontSize: 12, color: '#64748b', whiteSpace: 'nowrap' }}>
        {TYPE_LABEL[notif.type]}
      </td>

      {/* Conteúdo (truncado) */}
      <td style={{ padding: '12px 16px', maxWidth: 280 }}>
        <p style={{ margin: 0, fontSize: 12, color: '#4a5568', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {notif.content}
        </p>
        {notif.failedReason && (
          <p style={{ margin: '3px 0 0', fontSize: 11, color: '#be123c' }}>
            ✕ {notif.failedReason}
          </p>
        )}
      </td>

      {/* Status */}
      <td style={{ padding: '12px 16px' }}>
        <StatusBadge status={notif.status} />
      </td>

      {/* Data */}
      <td style={{ padding: '12px 16px', fontSize: 11, color: '#94a3b8', whiteSpace: 'nowrap' }}>
        {dateLabel}<br />{timeLabel}
      </td>

      {/* Ações */}
      <td style={{ padding: '12px 16px' }}>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {notif.status === 'FAILED' && (
            <button
              style={retryStyle}
              disabled={isRetrying}
              onClick={() => onRetry(notif.id)}
            >
              ↺ Reenviar
            </button>
          )}
          {(notif.status === 'SENT' || notif.status === 'PENDING') && (
            <button style={btnStyle} onClick={() => onMarkRead(notif.id)}>
              ✓ Lida
            </button>
          )}
          {notif.status === 'READ' && (
            <span style={{ fontSize: 12, color: '#cbd5e1' }}>—</span>
          )}
        </div>
      </td>
    </tr>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export function NotificationsPage() {
  const params = useParams({ strict: false }) as { slug?: string }
  const slug = params.slug ?? clinicTokens.getSlug() ?? ''
  const qc = useQueryClient()

  // ── Filters ──────────────────────────────────────────────────────────────
  const [statusFilter, setStatusFilter] = useState<string>('')
  const [channelFilter, setChannelFilter] = useState<string>('')
  const [page, setPage] = useState(1)
  const [showSend, setShowSend] = useState(false)

  // ── Query ─────────────────────────────────────────────────────────────────
  const { data, isLoading } = useQuery({
    queryKey: ['notifications', { page, status: statusFilter, channel: channelFilter }],
    queryFn: () => notificationsApi.list({
      page, limit: 25,
      status:  (statusFilter  as NotificationStatus)  || undefined,
      channel: (channelFilter as NotificationChannel) || undefined,
    }),
  })

  function invalidate() {
    qc.invalidateQueries({ queryKey: ['notifications'] })
  }

  // ── Mutations ─────────────────────────────────────────────────────────────
  const retryMutation = useMutation({
    mutationFn: (id: string) => notificationsApi.retry(id),
    onSuccess: invalidate,
  })

  const markReadMutation = useMutation({
    mutationFn: (id: string) => notificationsApi.markRead(id),
    onSuccess: invalidate,
  })

  const entries = data?.data ?? []
  const totalPages = data?.totalPages ?? 1

  // ── Contagem de falhas para badge de alerta ────────────────────────────────
  const { data: failedData } = useQuery({
    queryKey: ['notifications-failed-count'],
    queryFn: () => notificationsApi.list({ status: 'FAILED', limit: 1 }),
    staleTime: 60_000,
  })
  const failedCount = failedData?.total ?? 0

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
      `}</style>

      <div className="r-page" style={{ maxWidth: '1280px', fontFamily: 'var(--font-sans)' }}>

        {/* ── Header ─────────────────────────────────────────────────────────── */}
        <div style={{
          display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
          marginBottom: 28, animation: 'fadeUp 0.35s ease both',
          flexWrap: 'wrap', gap: 16,
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <h1 style={{
                margin: 0, fontSize: 26, fontWeight: 400,
                fontFamily: 'var(--font-display)', fontStyle: 'italic',
                color: '#1a2530', letterSpacing: '-0.02em',
              }}>
                Notificações
              </h1>
              {failedCount > 0 && (
                <span style={{
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                  minWidth: 22, height: 22, borderRadius: 11, padding: '0 6px',
                  background: '#be123c', color: '#fff', fontSize: 11, fontWeight: 700,
                }}>
                  {failedCount}
                </span>
              )}
            </div>
            <p style={{ margin: '4px 0 0', fontSize: 13, color: '#94a3b8' }}>
              {data?.total ?? '—'} notificação{(data?.total ?? 0) !== 1 ? 'ões' : ''} no total
              {failedCount > 0 && (
                <span style={{ color: '#be123c', marginLeft: 8, fontWeight: 600 }}>
                  · {failedCount} com falha
                </span>
              )}
            </p>
          </div>
          <Button onClick={() => setShowSend(true)}>
            <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ marginRight: 6 }}>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5}
                d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
            Nova notificação
          </Button>
        </div>

        {/* ── Filtros ─────────────────────────────────────────────────────────── */}
        <div style={{
          display: 'flex', gap: 8, marginBottom: 20,
          flexWrap: 'wrap', alignItems: 'center',
          animation: 'fadeUp 0.35s ease 0.05s both',
        }}>
          {/* Status pills */}
          {STATUS_FILTER_OPTIONS.map(f => (
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

          {/* Canal select */}
          <select
            value={channelFilter}
            onChange={e => { setChannelFilter(e.target.value); setPage(1) }}
            style={{
              padding: '6px 12px', borderRadius: 20, fontSize: 12, fontWeight: 600,
              border: channelFilter ? '1.5px solid var(--color-primary)' : '1.5px solid #e2e8f0',
              background: channelFilter ? 'var(--color-primary)' : '#fff',
              color: channelFilter ? '#fff' : '#64748b',
              cursor: 'pointer', outline: 'none',
            }}
          >
            <option value="">Todos os canais</option>
            <option value="EMAIL">E-mail</option>
            <option value="WHATSAPP">WhatsApp</option>
            <option value="SMS">SMS</option>
          </select>
        </div>

        {/* ── Tabela ──────────────────────────────────────────────────────────── */}
        <div style={{
          background: '#fff', borderRadius: 16,
          border: '1px solid #f0f2f5',
          boxShadow: '0 1px 6px rgba(0,0,0,0.04)',
          overflow: 'hidden',
          animation: 'fadeUp 0.35s ease 0.1s both',
        }}>
          <div className="r-table-wrap">
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 760 }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '1px solid #f0f2f5' }}>
                  {['Destinatário', 'Canal', 'Tipo', 'Mensagem', 'Status', 'Data', 'Ações'].map(h => (
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
                  Array.from({ length: 6 }).map((_, i) => <SkeletonRow key={i} />)
                ) : entries.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ padding: '56px 16px', textAlign: 'center' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
                        <svg width="40" height="40" fill="none" stroke="#cbd5e1" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                            d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                        </svg>
                        <p style={{ margin: 0, color: '#94a3b8', fontSize: 14 }}>
                          {statusFilter || channelFilter
                            ? 'Nenhuma notificação com esses filtros'
                            : 'Nenhuma notificação ainda'}
                        </p>
                        {!statusFilter && !channelFilter && (
                          <button
                            onClick={() => setShowSend(true)}
                            style={{
                              padding: '8px 18px', borderRadius: 10, fontSize: 13, fontWeight: 600,
                              background: 'var(--color-primary)', color: '#fff', border: 'none', cursor: 'pointer',
                            }}
                          >
                            Enviar primeira notificação
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ) : (
                  entries.map(notif => (
                    <NotificationRow
                      key={notif.id}
                      notif={notif}
                      onRetry={id => retryMutation.mutate(id)}
                      onMarkRead={id => markReadMutation.mutate(id)}
                      isRetrying={retryMutation.isPending}
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

        {/* ── Legenda de canais ────────────────────────────────────────────────── */}
        <div style={{
          marginTop: 16, display: 'flex', gap: 16, flexWrap: 'wrap',
          animation: 'fadeUp 0.35s ease 0.15s both',
        }}>
          {(['EMAIL', 'WHATSAPP', 'SMS'] as NotificationChannel[]).map(ch => {
            const cfg = CHANNEL_COLORS[ch]
            return (
              <div key={ch} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: cfg.color, display: 'inline-block' }} />
                <span style={{ fontSize: 11, color: '#94a3b8' }}>{CHANNEL_LABEL[ch]}</span>
              </div>
            )
          })}
        </div>
      </div>

      {/* ── Modal de envio ────────────────────────────────────────────────────── */}
      {showSend && (
        <SendNotificationModal
          onClose={() => setShowSend(false)}
          onSuccess={invalidate}
        />
      )}
    </>
  )
}
