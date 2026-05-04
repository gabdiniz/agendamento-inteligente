// ─── Patients Page ────────────────────────────────────────────────────────────

import { useState } from 'react'
import { Link, useParams } from '@tanstack/react-router'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { patientsApi, type Patient } from '@/lib/api/clinic.api'
import { clinicTokens } from '@/lib/api/client'

// ─── Template padrão de convite ───────────────────────────────────────────────
const DEFAULT_INVITE_MESSAGE =
  'Olá, {{nome}}! 👋\n\nVocê foi cadastrado em nossa clínica e agora pode agendar seus atendimentos de forma prática pelo nosso portal online:\n\n🔗 {{link}}\n\nAcesse, crie sua senha e aproveite! Em caso de dúvidas, estamos à disposição. 😊'

// ─── Modal de Convite ─────────────────────────────────────────────────────────

function InviteModal({
  patient,
  slug,
  onClose,
}: {
  patient: Patient
  slug: string
  onClose: () => void
}) {
  const [channel, setChannel] = useState<'WHATSAPP' | 'EMAIL'>('WHATSAPP')
  const [message, setMessage] = useState(DEFAULT_INVITE_MESSAGE)
  const [status, setStatus] = useState<'idle' | 'sending' | 'success' | 'error'>('idle')
  const [errorMsg, setErrorMsg] = useState('')

  const inviteLink = `${window.location.origin}/${slug}`

  async function handleSend() {
    setStatus('sending')
    setErrorMsg('')
    try {
      await patientsApi.sendInvite(patient.id, { channel, inviteLink, message })
      setStatus('success')
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        'Erro ao enviar convite. Tente novamente.'
      setErrorMsg(msg)
      setStatus('error')
    }
  }

  const canSendWhatsApp = Boolean(patient.phone)
  const canSendEmail = Boolean(patient.email)

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.45)',
          zIndex: 1000, backdropFilter: 'blur(2px)',
          animation: 'fadeIn 0.15s ease',
        }}
      />
      {/* Modal */}
      <div style={{
        position: 'fixed', top: '50%', left: '50%',
        transform: 'translate(-50%, -50%)',
        zIndex: 1001, width: '100%', maxWidth: '520px',
        background: '#fff', borderRadius: '18px',
        boxShadow: '0 24px 64px rgba(0,0,0,0.18)',
        padding: '28px 28px 24px',
        animation: 'slideUp 0.2s ease',
        fontFamily: 'var(--font-sans)',
      }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '20px' }}>
          <div>
            <h2 style={{
              margin: 0, fontSize: '20px', fontWeight: 400,
              fontFamily: 'var(--font-display)', fontStyle: 'italic',
              color: '#1a2530', letterSpacing: '-0.02em',
            }}>
              Enviar convite
            </h2>
            <p style={{ margin: '4px 0 0', fontSize: '13px', color: '#64748b' }}>
              Para <strong style={{ color: '#1a2530' }}>{patient.name}</strong>
            </p>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              padding: '4px', color: '#94a3b8', borderRadius: '8px',
              display: 'flex', alignItems: 'center',
            }}
          >
            <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {status === 'success' ? (
          /* ── Sucesso ── */
          <div style={{ textAlign: 'center', padding: '16px 0 8px' }}>
            <div style={{
              width: '52px', height: '52px', borderRadius: '50%',
              background: '#ebfbee', display: 'flex', alignItems: 'center',
              justifyContent: 'center', margin: '0 auto 14px',
            }}>
              <svg width="26" height="26" fill="none" stroke="#2f9e44" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <p style={{ margin: '0 0 6px', fontSize: '15px', fontWeight: 700, color: '#1a2530' }}>
              Convite enviado!
            </p>
            <p style={{ margin: '0 0 20px', fontSize: '13px', color: '#64748b' }}>
              {channel === 'WHATSAPP'
                ? `Mensagem enviada para ${patient.phone} via WhatsApp.`
                : `E-mail enviado para ${patient.email}.`}
            </p>
            <button
              onClick={onClose}
              style={{
                padding: '9px 24px', borderRadius: '10px',
                background: 'var(--color-primary)', color: '#fff',
                border: 'none', fontSize: '13.5px', fontWeight: 600,
                cursor: 'pointer', fontFamily: 'var(--font-sans)',
              }}
            >
              Fechar
            </button>
          </div>
        ) : (
          <>
            {/* ── Canal ── */}
            <div style={{ marginBottom: '18px' }}>
              <label style={{
                display: 'block', fontSize: '11px', fontWeight: 700,
                color: '#374151', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '10px',
              }}>
                Canal de envio
              </label>
              <div style={{ display: 'flex', gap: '10px' }}>
                {/* WhatsApp */}
                <button
                  type="button"
                  onClick={() => { if (canSendWhatsApp) setChannel('WHATSAPP') }}
                  disabled={!canSendWhatsApp}
                  style={{
                    flex: 1, padding: '12px 14px', borderRadius: '12px',
                    border: channel === 'WHATSAPP' ? '2px solid #25D366' : '1.5px solid #e2e8f0',
                    background: channel === 'WHATSAPP' ? '#f0fdf4' : '#fafbfc',
                    cursor: canSendWhatsApp ? 'pointer' : 'not-allowed',
                    opacity: canSendWhatsApp ? 1 : 0.5,
                    display: 'flex', alignItems: 'center', gap: '10px',
                    fontFamily: 'var(--font-sans)',
                    transition: 'all 0.15s',
                  }}
                >
                  {/* WhatsApp icon */}
                  <svg width="22" height="22" viewBox="0 0 32 32" fill="none">
                    <circle cx="16" cy="16" r="16" fill="#25D366"/>
                    <path d="M22.9 9.1A9.66 9.66 0 0016 6.4a9.6 9.6 0 00-8.3 14.4L6 26l5.3-1.7A9.6 9.6 0 0016 25.6a9.6 9.6 0 009.6-9.6 9.54 9.54 0 00-2.7-6.9zm-6.9 14.8a8 8 0 01-4.1-1.1l-.3-.2-3.1 1 1-3-.2-.3a8 8 0 1114.8-4.3 8 8 0 01-8.1 7.9zm4.4-6c-.2-.1-1.4-.7-1.6-.8s-.4-.1-.5.1-.6.8-.8 1-.3.1-.5 0a6.7 6.7 0 01-2-1.2 7.4 7.4 0 01-1.4-1.7c-.1-.3 0-.4.1-.5l.4-.5.2-.4v-.3l-.7-1.8c-.2-.5-.4-.4-.5-.4h-.5a.9.9 0 00-.6.3 2.7 2.7 0 00-.8 2 4.8 4.8 0 001 2.5 10.9 10.9 0 004.1 3.6 13.4 13.4 0 001.4.5 3.3 3.3 0 001.5.1 2.5 2.5 0 001.6-1.1 2 2 0 00.1-1.1c0-.1-.2-.2-.5-.3z" fill="#fff"/>
                  </svg>
                  <div style={{ textAlign: 'left' }}>
                    <div style={{ fontSize: '13px', fontWeight: 700, color: '#1a2530' }}>WhatsApp</div>
                    <div style={{ fontSize: '11px', color: '#64748b' }}>
                      {canSendWhatsApp ? patient.phone : 'Sem telefone cadastrado'}
                    </div>
                  </div>
                  {channel === 'WHATSAPP' && (
                    <div style={{ marginLeft: 'auto', width: '18px', height: '18px', borderRadius: '50%', background: '#25D366', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <svg width="10" height="10" fill="none" stroke="#fff" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                  )}
                </button>

                {/* Email */}
                <button
                  type="button"
                  onClick={() => { if (canSendEmail) setChannel('EMAIL') }}
                  disabled={!canSendEmail}
                  style={{
                    flex: 1, padding: '12px 14px', borderRadius: '12px',
                    border: channel === 'EMAIL' ? '2px solid var(--color-primary)' : '1.5px solid #e2e8f0',
                    background: channel === 'EMAIL' ? 'var(--color-primary-light, #eff6ff)' : '#fafbfc',
                    cursor: canSendEmail ? 'pointer' : 'not-allowed',
                    opacity: canSendEmail ? 1 : 0.5,
                    display: 'flex', alignItems: 'center', gap: '10px',
                    fontFamily: 'var(--font-sans)',
                    transition: 'all 0.15s',
                  }}
                >
                  <div style={{
                    width: '22px', height: '22px', borderRadius: '50%',
                    background: 'var(--color-primary)', display: 'flex',
                    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                  }}>
                    <svg width="12" height="12" fill="none" stroke="#fff" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <div style={{ textAlign: 'left' }}>
                    <div style={{ fontSize: '13px', fontWeight: 700, color: '#1a2530' }}>E-mail</div>
                    <div style={{ fontSize: '11px', color: '#64748b' }}>
                      {canSendEmail ? patient.email! : 'Sem e-mail cadastrado'}
                    </div>
                  </div>
                  {channel === 'EMAIL' && (
                    <div style={{ marginLeft: 'auto', width: '18px', height: '18px', borderRadius: '50%', background: 'var(--color-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <svg width="10" height="10" fill="none" stroke="#fff" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                  )}
                </button>
              </div>
            </div>

            {/* ── Link gerado ── */}
            <div style={{ marginBottom: '18px' }}>
              <label style={{
                display: 'block', fontSize: '11px', fontWeight: 700,
                color: '#374151', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '6px',
              }}>
                Link de acesso
              </label>
              <div style={{
                padding: '9px 14px', borderRadius: '10px',
                background: '#f8fafc', border: '1.5px solid #e2e8f0',
                fontSize: '13px', color: '#64748b', wordBreak: 'break-all',
              }}>
                {inviteLink}
              </div>
            </div>

            {/* ── Mensagem ── */}
            <div style={{ marginBottom: '20px' }}>
              <label style={{
                display: 'block', fontSize: '11px', fontWeight: 700,
                color: '#374151', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '6px',
              }}>
                Mensagem
                <span style={{ fontWeight: 400, textTransform: 'none', color: '#94a3b8', fontSize: '11px', letterSpacing: 0, marginLeft: '6px' }}>
                  (use {'{{nome}}'} e {'{{link}}'})
                </span>
              </label>
              <textarea
                rows={6}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                style={{
                  width: '100%', boxSizing: 'border-box', padding: '12px 14px',
                  border: '1.5px solid #e2e8f0', borderRadius: '10px',
                  fontSize: '13px', color: '#1a2530', lineHeight: '1.6',
                  background: '#fff', outline: 'none', resize: 'vertical',
                  fontFamily: 'var(--font-sans)',
                }}
                onFocus={(e) => { e.currentTarget.style.borderColor = 'var(--color-primary)' }}
                onBlur={(e) => { e.currentTarget.style.borderColor = '#e2e8f0' }}
              />
              <button
                type="button"
                onClick={() => setMessage(DEFAULT_INVITE_MESSAGE)}
                style={{
                  marginTop: '6px', background: 'none', border: 'none', padding: 0,
                  fontSize: '12px', color: '#94a3b8', cursor: 'pointer',
                  fontFamily: 'var(--font-sans)', textDecoration: 'underline',
                }}
              >
                Restaurar mensagem padrão
              </button>
            </div>

            {/* ── Erro ── */}
            {status === 'error' && (
              <div style={{
                marginBottom: '16px', padding: '10px 14px', borderRadius: '10px',
                background: '#fef2f2', border: '1px solid #fecaca',
                color: '#b91c1c', fontSize: '13px',
              }}>
                {errorMsg}
              </div>
            )}

            {/* ── Ações ── */}
            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                type="button"
                onClick={onClose}
                style={{
                  flex: 1, height: '42px', border: '1.5px solid #e2e8f0',
                  borderRadius: '10px', background: '#fff', color: '#4a5568',
                  fontSize: '13.5px', fontWeight: 600, cursor: 'pointer',
                  fontFamily: 'var(--font-sans)',
                }}
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleSend}
                disabled={status === 'sending' || (!canSendWhatsApp && channel === 'WHATSAPP') || (!canSendEmail && channel === 'EMAIL')}
                style={{
                  flex: 2, height: '42px', border: 'none',
                  borderRadius: '10px', background: 'var(--color-primary)', color: '#fff',
                  fontSize: '13.5px', fontWeight: 600,
                  cursor: status === 'sending' ? 'not-allowed' : 'pointer',
                  opacity: status === 'sending' ? 0.7 : 1,
                  fontFamily: 'var(--font-sans)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                  boxShadow: '0 4px 14px color-mix(in srgb, var(--color-primary) 30%, transparent)',
                }}
              >
                {status === 'sending' ? (
                  <>
                    <div style={{ width: '14px', height: '14px', border: '2px solid rgba(255,255,255,0.4)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                    Enviando...
                  </>
                ) : (
                  <>
                    <svg width="15" height="15" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                    </svg>
                    Enviar convite
                  </>
                )}
              </button>
            </div>
          </>
        )}
      </div>

      <style>{`
        @keyframes fadeIn  { from { opacity: 0 } to { opacity: 1 } }
        @keyframes slideUp { from { opacity: 0; transform: translate(-50%, calc(-50% + 16px)) } to { opacity: 1; transform: translate(-50%, -50%) } }
        @keyframes spin    { to { transform: rotate(360deg) } }
      `}</style>
    </>
  )
}

// ─── Patient Row ──────────────────────────────────────────────────────────────

function PatientRow({
  patient,
  slug,
  onToggle,
  isToggling,
  onInvite,
}: {
  patient: Patient
  slug: string
  onToggle: (p: Patient) => void
  isToggling: boolean
  onInvite: (p: Patient) => void
}) {
  const age = patient.birthDate
    ? Math.floor((Date.now() - new Date(patient.birthDate).getTime()) / (1000 * 60 * 60 * 24 * 365.25))
    : null

  return (
    <tr style={{ borderBottom: '1px solid #f0f2f5', opacity: patient.isActive ? 1 : 0.6 }}>
      <td style={{ padding: '14px 16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div>
            <p style={{ margin: '0 0 3px', fontSize: '13px', fontWeight: 600, color: '#1a2530' }}>
              {patient.name}
            </p>
            {age !== null && (
              <p style={{ margin: 0, fontSize: '11px', color: '#94a3b8' }}>{age} anos</p>
            )}
          </div>
        </div>
      </td>
      <td style={{ padding: '14px 16px', fontSize: '13px', color: '#4a5568' }}>
        {patient.phone}
      </td>
      <td style={{ padding: '14px 16px', fontSize: '13px', color: '#4a5568' }}>
        {patient.email ?? '—'}
      </td>
      <td style={{ padding: '14px 16px', fontSize: '13px', color: '#94a3b8' }}>
        {patient.city ?? '—'}
      </td>
      <td style={{ padding: '14px 16px' }}>
        <span style={{
          display: 'inline-block', borderRadius: '20px', padding: '3px 10px',
          background: patient.isActive ? '#ebfbee' : '#fff1f1',
          color: patient.isActive ? '#2f9e44' : '#c92a2a',
          fontSize: '12px', fontWeight: 600,
        }}>
          {patient.isActive ? 'Ativo' : 'Inativo'}
        </span>
      </td>
      <td style={{ padding: '14px 16px', fontSize: '13px', color: '#94a3b8' }}>
        {new Date(patient.createdAt).toLocaleDateString('pt-BR')}
      </td>
      <td style={{ padding: '14px 16px', textAlign: 'right' }}>
        <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
          {/* Botão Convidar */}
          <button
            onClick={() => onInvite(patient)}
            title="Enviar convite de acesso ao portal"
            style={{
              padding: '5px 10px', borderRadius: '8px',
              background: '#f0fdf4', color: '#2f9e44',
              border: '1px solid #b2f2bb',
              fontSize: '12px', fontWeight: 600,
              cursor: 'pointer', fontFamily: 'var(--font-sans)',
              display: 'inline-flex', alignItems: 'center', gap: '5px',
            }}
          >
            <svg width="12" height="12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
            Convidar
          </button>

          <Link
            to="/app/$slug/patients/$id"
            params={{ slug, id: patient.id }}
            style={{
              display: 'inline-flex', alignItems: 'center',
              padding: '5px 10px', borderRadius: '8px',
              background: '#f8fafc', color: '#374151',
              border: '1px solid #e2e8f0',
              fontSize: '12px', fontWeight: 600, textDecoration: 'none',
            }}
          >
            Ver ficha
          </Link>
          <Link
            to="/app/$slug/patients/$id/edit"
            params={{ slug, id: patient.id }}
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
          <button
            onClick={() => onToggle(patient)}
            disabled={isToggling}
            style={{
              padding: '5px 10px', borderRadius: '8px',
              background: patient.isActive ? '#fef2f2' : '#ebfbee',
              color: patient.isActive ? '#dc2626' : '#2f9e44',
              border: patient.isActive ? '1px solid #fecaca' : '1px solid #b2f2bb',
              fontSize: '12px', fontWeight: 600,
              cursor: isToggling ? 'not-allowed' : 'pointer',
              fontFamily: 'var(--font-sans)',
              opacity: isToggling ? 0.6 : 1,
            }}
          >
            {isToggling ? '...' : patient.isActive ? 'Desativar' : 'Ativar'}
          </button>
        </div>
      </td>
    </tr>
  )
}

// ─── Patients Page ────────────────────────────────────────────────────────────

export function PatientsPage() {
  const params = useParams({ strict: false }) as { slug?: string }
  const slug = params.slug ?? clinicTokens.getSlug() ?? ''
  const qc = useQueryClient()

  const [search, setSearch] = useState('')
  const [searchInput, setSearchInput] = useState('')
  const [page, setPage] = useState(1)
  const [activeFilter, setActiveFilter] = useState<'all' | 'active' | 'inactive'>('all')
  const [togglingId, setTogglingId] = useState<string | null>(null)
  const [invitingPatient, setInvitingPatient] = useState<Patient | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['patients', { page, search, activeFilter }],
    queryFn: () => patientsApi.list({
      page,
      limit: 20,
      search: search || undefined,
      ...(activeFilter !== 'all' ? { isActive: activeFilter === 'active' } : {}),
    }),
  })

  const toggleMutation = useMutation({
    mutationFn: (p: Patient) =>
      p.isActive ? patientsApi.deactivate(p.id) : patientsApi.activate(p.id),
    onMutate: (p) => setTogglingId(p.id),
    onSettled: () => {
      setTogglingId(null)
      qc.invalidateQueries({ queryKey: ['patients'] })
    },
  })

  function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    setSearch(searchInput)
    setPage(1)
  }

  const patients = data?.data ?? []
  const totalPages = data?.totalPages ?? 1

  const filterButtons: { label: string; value: 'all' | 'active' | 'inactive' }[] = [
    { label: 'Todos', value: 'all' },
    { label: 'Ativos', value: 'active' },
    { label: 'Inativos', value: 'inactive' },
  ]

  return (
    <>
      {/* ── Modal de convite ── */}
      {invitingPatient && (
        <InviteModal
          patient={invitingPatient}
          slug={slug}
          onClose={() => setInvitingPatient(null)}
        />
      )}

      <div className="r-page" style={{ maxWidth: '1200px', fontFamily: 'var(--font-sans)' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '28px', animation: 'fadeUp 0.35s ease both' }}>
          <div>
            <h1 style={{
              margin: 0, fontSize: '26px', fontWeight: 400,
              fontFamily: 'var(--font-display)', fontStyle: 'italic',
              color: '#1a2530', letterSpacing: '-0.02em',
            }}>
              Pacientes
            </h1>
            <p style={{ margin: '4px 0 0', fontSize: '13.5px', color: '#64748b' }}>
              {data ? `${data.total} paciente${data.total !== 1 ? 's' : ''} cadastrado${data.total !== 1 ? 's' : ''}` : ''}
            </p>
          </div>
          <Link to="/app/$slug/patients/new" params={{ slug }} style={{
            display: 'inline-flex', alignItems: 'center', gap: '6px',
            padding: '9px 18px', borderRadius: '10px',
            background: 'var(--color-primary)', color: '#fff',
            fontSize: '13.5px', fontWeight: 600,
            textDecoration: 'none',
            boxShadow: '0 4px 12px color-mix(in srgb, var(--color-primary) 30%, transparent)',
          }}>
            <svg width="15" height="15" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
            </svg>
            Novo Paciente
          </Link>
        </div>

        {/* Busca e Filtros */}
        <form onSubmit={handleSearch} style={{
          display: 'flex', gap: '10px', marginBottom: '20px', alignItems: 'flex-end',
          padding: '16px', background: '#fff', borderRadius: '14px',
          border: '1px solid #f0f2f5', boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
          flexWrap: 'wrap',
        }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1, minWidth: '200px', maxWidth: '320px' }}>
            <label style={{ fontSize: '11px', fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              Buscar Paciente
            </label>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ position: 'absolute', left: '10px', color: '#94a3b8' }}>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                placeholder="Nome ou telefone..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                style={{
                  width: '100%', paddingLeft: '36px', paddingRight: '12px', height: '36px',
                  border: '1.5px solid #e2e8f0', borderRadius: '10px',
                  fontSize: '13px', color: '#1a2530',
                  background: '#fff', outline: 'none', fontFamily: 'var(--font-sans)',
                }}
                onFocus={(e) => { e.currentTarget.style.borderColor = 'var(--color-primary)'; e.currentTarget.style.boxShadow = '0 0 0 3px var(--color-primary-light)' }}
                onBlur={(e) => { e.currentTarget.style.borderColor = '#e2e8f0'; e.currentTarget.style.boxShadow = 'none' }}
              />
            </div>
          </div>

          {/* Filtro Ativo/Inativo */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <label style={{ fontSize: '11px', fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              Status
            </label>
            <div style={{ display: 'flex', gap: '4px', background: '#f8fafc', borderRadius: '10px', padding: '3px', border: '1px solid #e2e8f0' }}>
              {filterButtons.map((btn) => (
                <button
                  key={btn.value}
                  type="button"
                  onClick={() => { setActiveFilter(btn.value); setPage(1) }}
                  style={{
                    padding: '5px 14px', borderRadius: '8px', fontSize: '12px', fontWeight: 600,
                    border: 'none', cursor: 'pointer', fontFamily: 'var(--font-sans)',
                    background: activeFilter === btn.value ? 'var(--color-primary)' : 'transparent',
                    color: activeFilter === btn.value ? '#fff' : '#64748b',
                    transition: 'all 0.15s',
                  }}
                >
                  {btn.label}
                </button>
              ))}
            </div>
          </div>

          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              type="submit"
              style={{
                padding: '8px 16px', borderRadius: '10px', fontSize: '13.5px', fontWeight: 600,
                border: 'none', background: 'var(--color-primary)', color: '#fff',
                cursor: 'pointer', fontFamily: 'var(--font-sans)',
              }}
            >
              Buscar
            </button>
            {search && (
              <button
                type="button"
                onClick={() => { setSearch(''); setSearchInput(''); setPage(1) }}
                style={{
                  padding: '8px 16px', borderRadius: '10px', fontSize: '13.5px', fontWeight: 600,
                  border: '1.5px solid #e2e8f0', background: '#f8fafc', color: '#64748b',
                  cursor: 'pointer', fontFamily: 'var(--font-sans)',
                }}
              >
                Limpar
              </button>
            )}
          </div>
        </form>

        {/* Tabela */}
        <div style={{
          background: '#fff', borderRadius: '16px',
          border: '1px solid #f0f2f5',
          boxShadow: '0 1px 6px rgba(0,0,0,0.04)',
          overflow: 'hidden',
        }}>
          {isLoading ? (
            <div style={{ padding: '60px 32px', textAlign: 'center', color: '#94a3b8' }}>
              <div style={{
                width: '32px', height: '32px',
                border: '2px solid #eaecef',
                borderTopColor: 'var(--color-primary)',
                borderRadius: '50%',
                animation: 'spin 0.8s linear infinite',
                margin: '0 auto 12px',
              }} />
              <p style={{ fontSize: '13px', margin: 0 }}>Carregando pacientes...</p>
              <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
            </div>
          ) : patients.length === 0 ? (
            <div style={{ padding: '72px 32px', textAlign: 'center' }}>
              <svg width="40" height="40" fill="none" stroke="#cbd5e1" viewBox="0 0 24 24" style={{ margin: '0 auto 12px', display: 'block' }}>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                  d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              <p style={{ margin: 0, fontSize: '14px', color: '#94a3b8', fontWeight: 600 }}>
                {search ? 'Nenhum paciente encontrado' : 'Ainda não há pacientes'}
              </p>
              <p style={{ margin: '4px 0 0', fontSize: '13px', color: '#cbd5e1' }}>
                {search ? 'Tente outro termo de busca.' : 'Crie o primeiro paciente para começar.'}
              </p>
            </div>
          ) : (
            <>
              <div className="r-table-wrap">
                <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '700px' }}>
                  <thead>
                    <tr style={{ background: '#fafbfc', borderBottom: '1px solid #f0f2f5' }}>
                      {['Paciente', 'Telefone', 'E-mail', 'Cidade', 'Status', 'Cadastrado em', ''].map((h) => (
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
                    {patients.map((p) => (
                      <PatientRow
                        key={p.id}
                        patient={p}
                        slug={slug}
                        onToggle={(pt) => toggleMutation.mutate(pt)}
                        isToggling={togglingId === p.id}
                        onInvite={setInvitingPatient}
                      />
                    ))}
                  </tbody>
                </table>
              </div>
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
            </>
          )}
        </div>
      </div>
    </>
  )
}
