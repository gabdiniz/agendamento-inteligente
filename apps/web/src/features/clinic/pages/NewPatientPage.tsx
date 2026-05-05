// ─── New Patient Page ─────────────────────────────────────────────────────────

import { useState } from 'react'
import { useNavigate, useParams } from '@tanstack/react-router'
import { useForm } from 'react-hook-form'
import { useQueryClient } from '@tanstack/react-query'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { patientsApi } from '@/lib/api/clinic.api'
import { clinicTokens } from '@/lib/api/client'

// ─── Schema ───────────────────────────────────────────────────────────────────

const schema = z.object({
  name:      z.string().min(2, 'Nome obrigatório'),
  phone:     z.string().min(10, 'Telefone inválido'),
  email:     z.string().email('E-mail inválido').optional().or(z.literal('')),
  birthDate: z.string().optional(),
  gender:    z.enum(['MALE', 'FEMALE', 'OTHER', 'PREFER_NOT_TO_SAY']).optional().or(z.literal('')),
  city:      z.string().optional(),
  notes:     z.string().optional(),
})

type FormData = z.infer<typeof schema>

const genderOptions = [
  { value: '',                   label: 'Não informado' },
  { value: 'MALE',               label: 'Masculino' },
  { value: 'FEMALE',             label: 'Feminino' },
  { value: 'OTHER',              label: 'Outro' },
  { value: 'PREFER_NOT_TO_SAY',  label: 'Prefiro não informar' },
]

const DEFAULT_INVITE_MESSAGE =
  'Olá, {{nome}}! 👋\n\nVocê foi cadastrado em nossa clínica e agora pode agendar seus atendimentos de forma prática pelo nosso portal online:\n\n🔗 {{link}}\n\nAcesse, crie sua senha e aproveite! Em caso de dúvidas, estamos à disposição. 😊'

// ─── Shared styles ────────────────────────────────────────────────────────────

const labelStyle: React.CSSProperties = {
  display: 'block', fontSize: '12px', fontWeight: 700,
  color: '#374151', textTransform: 'uppercase', letterSpacing: '0.06em',
  marginBottom: '6px',
}

const inputStyle: React.CSSProperties = {
  width: '100%', boxSizing: 'border-box', height: '42px', padding: '0 14px',
  border: '1.5px solid #e2e8f0', borderRadius: '10px',
  fontSize: '14px', color: '#1a2530',
  background: '#fff', outline: 'none', fontFamily: 'var(--font-sans)',
}

// ─── Component ────────────────────────────────────────────────────────────────

export function NewPatientPage() {
  const navigate  = useNavigate()
  const qc        = useQueryClient()
  const params    = useParams({ strict: false }) as { slug?: string }
  const slug      = params.slug ?? clinicTokens.getSlug() ?? ''

  const [serverError, setServerError] = useState<string | null>(null)

  // Checkboxes de convite — ambos desmarcados por default
  const [inviteWhatsApp, setInviteWhatsApp] = useState(false)
  const [inviteEmail,    setInviteEmail]    = useState(false)

  // Avisos inline de convite (após criação)
  const [inviteResults, setInviteResults] = useState<Array<{ channel: string; ok: boolean; msg: string }>>([])

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
  })

  async function onSubmit(values: FormData) {
    setServerError(null)
    setInviteResults([])

    let createdPatientId: string | null = null

    try {
      const patient = await patientsApi.create({
        name:      values.name,
        phone:     values.phone,
        email:     values.email     || undefined,
        birthDate: values.birthDate || undefined,
        gender:    values.gender    || undefined,
        city:      values.city      || undefined,
        notes:     values.notes     || undefined,
      })
      createdPatientId = patient.id
      await qc.invalidateQueries({ queryKey: ['patients'] })
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })
        ?.response?.data?.message
      setServerError(msg ?? 'Erro ao cadastrar paciente. Tente novamente.')
      return
    }

    // ── Enviar convites se solicitado ──────────────────────────────────────────
    const inviteLink = `${window.location.origin}/${slug}`
    const channels: Array<'WHATSAPP' | 'EMAIL'> = []
    if (inviteWhatsApp) channels.push('WHATSAPP')
    if (inviteEmail)    channels.push('EMAIL')

    if (channels.length === 0) {
      // Nenhum convite → navega direto
      void navigate({ to: '/app/$slug/$section', params: { slug, section: 'patients' } })
      return
    }

    const results: Array<{ channel: string; ok: boolean; msg: string }> = []

    await Promise.allSettled(
      channels.map(async (channel) => {
        try {
          await patientsApi.sendInvite(createdPatientId!, {
            channel,
            inviteLink,
            message: DEFAULT_INVITE_MESSAGE,
          })
          results.push({ channel, ok: true, msg: channel === 'WHATSAPP' ? 'Convite WhatsApp enviado!' : 'Convite por e-mail enviado!' })
        } catch (err: unknown) {
          const errMsg = (err as { response?: { data?: { message?: string } } })
            ?.response?.data?.message ?? 'Erro ao enviar convite.'
          results.push({ channel, ok: false, msg: errMsg })
        }
      }),
    )

    setInviteResults(results)

    // Se todos os convites falharam, permanece na página para mostrar os erros.
    // Se pelo menos um foi ok (ou sem convite), navega após 2.5s.
    const anyOk = results.some((r) => r.ok)
    const allFailed = results.every((r) => !r.ok)

    if (!allFailed || channels.length === 0) {
      setTimeout(() => {
        void navigate({ to: '/app/$slug/$section', params: { slug, section: 'patients' } })
      }, anyOk ? 2500 : 0)
    }
    // Se todos falharam, o usuário vê os erros e pode navegar manualmente
  }

  return (
    <div className="r-page" style={{ maxWidth: '680px', fontFamily: 'var(--font-sans)' }}>

      {/* ── Header ────────────────────────────────────────────── */}
      <div style={{ marginBottom: '28px' }}>
        <button
          onClick={() => void navigate({ to: '/app/$slug/$section', params: { slug, section: 'patients' } })}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: '6px',
            background: 'none', border: 'none', cursor: 'pointer',
            fontSize: '13px', color: '#64748b', padding: 0, marginBottom: '12px',
            fontFamily: 'var(--font-sans)',
          }}
        >
          <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Voltar para pacientes
        </button>
        <h1 style={{
          margin: 0, fontSize: '26px', fontWeight: 400,
          fontFamily: 'var(--font-display)', fontStyle: 'italic',
          color: '#1a2530', letterSpacing: '-0.02em',
        }}>
          Novo paciente
        </h1>
        <p style={{ margin: '4px 0 0', fontSize: '13.5px', color: '#64748b' }}>
          Preencha os dados do paciente
        </p>
      </div>

      {/* ── Card ──────────────────────────────────────────────── */}
      <form onSubmit={handleSubmit(onSubmit)} noValidate>
        <div className="r-card" style={{ display: 'flex', flexDirection: 'column', gap: '22px' }}>

          {serverError && (
            <div style={{
              padding: '12px 16px', borderRadius: '10px',
              background: '#fef2f2', border: '1px solid #fecaca',
              color: '#b91c1c', fontSize: '13.5px',
            }}>
              {serverError}
            </div>
          )}

          {/* ── Resultados dos convites ── */}
          {inviteResults.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {inviteResults.map((r) => (
                <div key={r.channel} style={{
                  padding: '10px 14px', borderRadius: '10px',
                  background: r.ok ? '#ebfbee' : '#fef2f2',
                  border: `1px solid ${r.ok ? '#b2f2bb' : '#fecaca'}`,
                  color: r.ok ? '#2f9e44' : '#b91c1c',
                  fontSize: '13px',
                  display: 'flex', alignItems: 'center', gap: '8px',
                }}>
                  {r.ok ? (
                    <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                    </svg>
                  ) : (
                    <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  )}
                  {r.msg}
                </div>
              ))}
            </div>
          )}

          {/* Nome */}
          <div>
            <label style={labelStyle}>Nome completo *</label>
            <input
              placeholder="João da Silva"
              {...register('name')}
              style={inputStyle}
            />
            {errors.name && (
              <p style={{ margin: '4px 0 0', fontSize: '12px', color: '#dc2626' }}>
                {errors.name.message}
              </p>
            )}
          </div>

          {/* Telefone + E-mail */}
          <div className="r-grid-2">
            <div>
              <label style={labelStyle}>Telefone *</label>
              <input
                type="tel"
                placeholder="(11) 9 9999-9999"
                {...register('phone')}
                style={inputStyle}
              />
              {errors.phone && (
                <p style={{ margin: '4px 0 0', fontSize: '12px', color: '#dc2626' }}>
                  {errors.phone.message}
                </p>
              )}
            </div>
            <div>
              <label style={labelStyle}>E-mail (opcional)</label>
              <input
                type="email"
                placeholder="joao@email.com"
                {...register('email')}
                style={inputStyle}
              />
              {errors.email && (
                <p style={{ margin: '4px 0 0', fontSize: '12px', color: '#dc2626' }}>
                  {errors.email.message}
                </p>
              )}
            </div>
          </div>

          {/* Nascimento + Gênero */}
          <div className="r-grid-2">
            <div>
              <label style={labelStyle}>Data de nascimento (opcional)</label>
              <input
                type="date"
                {...register('birthDate')}
                style={inputStyle}
              />
            </div>
            <div>
              <label style={labelStyle}>Gênero (opcional)</label>
              <select
                {...register('gender')}
                style={{ ...inputStyle, cursor: 'pointer' }}
              >
                {genderOptions.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Cidade */}
          <div>
            <label style={labelStyle}>Cidade (opcional)</label>
            <input
              placeholder="São Paulo"
              {...register('city')}
              style={inputStyle}
            />
          </div>

          {/* Observações */}
          <div>
            <label style={labelStyle}>Observações (opcional)</label>
            <textarea
              rows={3}
              placeholder="Alergias, condições especiais, preferências..."
              {...register('notes')}
              style={{
                ...inputStyle, height: 'auto',
                padding: '12px 14px', resize: 'vertical',
              }}
            />
          </div>

          {/* ── Envio de convite ─────────────────────────────── */}
          <div style={{
            padding: '16px', borderRadius: '12px',
            background: '#f8fafc', border: '1.5px solid #e2e8f0',
          }}>
            <p style={{
              margin: '0 0 12px', fontSize: '12px', fontWeight: 700,
              color: '#374151', textTransform: 'uppercase', letterSpacing: '0.06em',
            }}>
              Enviar convite de acesso ao portal
            </p>
            <p style={{ margin: '0 0 14px', fontSize: '12.5px', color: '#64748b', lineHeight: '1.5' }}>
              Envia uma mensagem com o link de acesso ao portal de agendamentos logo após o cadastro.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {/* WhatsApp */}
              <label style={{
                display: 'flex', alignItems: 'center', gap: '10px',
                cursor: 'pointer', userSelect: 'none',
              }}>
                <div style={{ position: 'relative', width: '18px', height: '18px', flexShrink: 0 }}>
                  <input
                    type="checkbox"
                    checked={inviteWhatsApp}
                    onChange={(e) => setInviteWhatsApp(e.target.checked)}
                    style={{ position: 'absolute', opacity: 0, width: '100%', height: '100%', cursor: 'pointer', margin: 0 }}
                  />
                  <div style={{
                    width: '18px', height: '18px', borderRadius: '5px',
                    border: inviteWhatsApp ? '2px solid #25D366' : '1.5px solid #cbd5e1',
                    background: inviteWhatsApp ? '#25D366' : '#fff',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    transition: 'all 0.15s',
                  }}>
                    {inviteWhatsApp && (
                      <svg width="11" height="11" fill="none" stroke="#fff" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
                  <svg width="18" height="18" viewBox="0 0 32 32" fill="none" style={{ flexShrink: 0 }}>
                    <circle cx="16" cy="16" r="16" fill="#25D366"/>
                    <path d="M22.9 9.1A9.66 9.66 0 0016 6.4a9.6 9.6 0 00-8.3 14.4L6 26l5.3-1.7A9.6 9.6 0 0016 25.6a9.6 9.6 0 009.6-9.6 9.54 9.54 0 00-2.7-6.9zm-6.9 14.8a8 8 0 01-4.1-1.1l-.3-.2-3.1 1 1-3-.2-.3a8 8 0 1114.8-4.3 8 8 0 01-8.1 7.9zm4.4-6c-.2-.1-1.4-.7-1.6-.8s-.4-.1-.5.1-.6.8-.8 1-.3.1-.5 0a6.7 6.7 0 01-2-1.2 7.4 7.4 0 01-1.4-1.7c-.1-.3 0-.4.1-.5l.4-.5.2-.4v-.3l-.7-1.8c-.2-.5-.4-.4-.5-.4h-.5a.9.9 0 00-.6.3 2.7 2.7 0 00-.8 2 4.8 4.8 0 001 2.5 10.9 10.9 0 004.1 3.6 13.4 13.4 0 001.4.5 3.3 3.3 0 001.5.1 2.5 2.5 0 001.6-1.1 2 2 0 00.1-1.1c0-.1-.2-.2-.5-.3z" fill="#fff"/>
                  </svg>
                  <span style={{ fontSize: '13.5px', fontWeight: 600, color: '#1a2530' }}>
                    Enviar convite por WhatsApp
                  </span>
                </div>
              </label>

              {/* E-mail */}
              <label style={{
                display: 'flex', alignItems: 'center', gap: '10px',
                cursor: 'pointer', userSelect: 'none',
              }}>
                <div style={{ position: 'relative', width: '18px', height: '18px', flexShrink: 0 }}>
                  <input
                    type="checkbox"
                    checked={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.checked)}
                    style={{ position: 'absolute', opacity: 0, width: '100%', height: '100%', cursor: 'pointer', margin: 0 }}
                  />
                  <div style={{
                    width: '18px', height: '18px', borderRadius: '5px',
                    border: inviteEmail ? '2px solid var(--color-primary)' : '1.5px solid #cbd5e1',
                    background: inviteEmail ? 'var(--color-primary)' : '#fff',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    transition: 'all 0.15s',
                  }}>
                    {inviteEmail && (
                      <svg width="11" height="11" fill="none" stroke="#fff" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
                  <div style={{
                    width: '18px', height: '18px', borderRadius: '50%', flexShrink: 0,
                    background: 'var(--color-primary)', display: 'flex',
                    alignItems: 'center', justifyContent: 'center',
                  }}>
                    <svg width="10" height="10" fill="none" stroke="#fff" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <span style={{ fontSize: '13.5px', fontWeight: 600, color: '#1a2530' }}>
                    Enviar convite por E-mail
                  </span>
                </div>
              </label>
            </div>

            {(inviteWhatsApp || inviteEmail) && (
              <p style={{
                margin: '12px 0 0', fontSize: '12px', color: '#94a3b8',
                display: 'flex', alignItems: 'flex-start', gap: '5px',
              }}>
                <svg width="13" height="13" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ flexShrink: 0, marginTop: '1px' }}>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                A mensagem padrão será enviada com o link de acesso. Você pode personalizar o texto pelo botão "Convidar" na listagem de pacientes.
              </p>
            )}
          </div>

          {/* Botões */}
          <div className="r-btn-row" style={{ paddingTop: '4px' }}>
            <button
              type="button"
              onClick={() => void navigate({ to: '/app/$slug/$section', params: { slug, section: 'patients' } })}
              style={{
                flex: 1, height: '44px', border: '1.5px solid #e2e8f0',
                borderRadius: '10px', background: '#fff', color: '#4a5568',
                fontSize: '14px', fontWeight: 600, cursor: 'pointer',
                fontFamily: 'var(--font-sans)',
              }}
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              style={{
                flex: 2, height: '44px', border: 'none',
                borderRadius: '10px', background: 'var(--color-primary)', color: '#fff',
                fontSize: '14px', fontWeight: 600,
                cursor: isSubmitting ? 'not-allowed' : 'pointer',
                opacity: isSubmitting ? 0.7 : 1,
                fontFamily: 'var(--font-sans)',
                boxShadow: '0 4px 14px color-mix(in srgb, var(--color-primary) 30%, transparent)',
              }}
            >
              {isSubmitting ? 'Cadastrando...' : 'Cadastrar paciente'}
            </button>
          </div>
        </div>
      </form>
    </div>
  )
}
