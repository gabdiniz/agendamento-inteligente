// ─── Super Admin — New Tenant Page ───────────────────────────────────────────
//
// Formulário de cadastro de nova clínica (tenant) com o primeiro gestor.
// Usa React Hook Form + Zod para validação.
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useRef } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { superAdminApi } from '@/lib/api/super-admin.api'

// ─── Schema ───────────────────────────────────────────────────────────────────

const slugRegex = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

const schema = z.object({
  name:           z.string().min(2, 'Nome deve ter ao menos 2 caracteres'),
  slug:           z.string().min(2, 'Slug deve ter ao menos 2 caracteres')
                    .regex(slugRegex, 'Use apenas letras minúsculas, números e hífens'),
  email:          z.string().email('E-mail inválido'),
  phone:          z.string().optional(),
  address:        z.string().optional(),
  planType:       z.enum(['BASIC', 'PRO']).default('BASIC'),
  gestorName:     z.string().min(2, 'Nome do gestor obrigatório'),
  gestorEmail:    z.string().email('E-mail do gestor inválido'),
  gestorPassword: z.string().min(6, 'Senha deve ter ao menos 6 caracteres'),
  gestorPhone:    z.string().optional(),
})

type FormData = z.infer<typeof schema>

// ─── Helpers ─────────────────────────────────────────────────────────────────

function toSlug(value: string) {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
}

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

const sectionDividerStyle: React.CSSProperties = {
  fontSize: '11px', fontWeight: 700, color: '#94a3b8',
  textTransform: 'uppercase', letterSpacing: '0.08em',
  paddingBottom: '12px', borderBottom: '1px solid #f0f2f5',
}

// ─── Component ────────────────────────────────────────────────────────────────

export function NewTenantPage() {
  const navigate = useNavigate()
  const [serverError,         setServerError]         = useState<string | null>(null)
  const [slugManuallyEdited,  setSlugManuallyEdited]  = useState(false)

  // ── Logo upload ────────────────────────────────────────────────
  const [logoPreview,   setLogoPreview]   = useState<string | null>(null)
  const [logoUrl,       setLogoUrl]       = useState<string | null>(null)
  const [logoUploading, setLogoUploading] = useState(false)
  const [logoError,     setLogoError]     = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const { register, handleSubmit, setValue, watch, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { slug: '', planType: 'BASIC' },
  })

  function handleNameChange(e: React.ChangeEvent<HTMLInputElement>) {
    if (!slugManuallyEdited) {
      setValue('slug', toSlug(e.target.value), { shouldValidate: true })
    }
  }

  async function handleLogoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    // Validação no cliente
    if (file.size > 5 * 1024 * 1024) {
      setLogoError('Arquivo muito grande. Máximo 5 MB.')
      return
    }
    const allowed = ['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml', 'image/gif']
    if (!allowed.includes(file.type)) {
      setLogoError('Formato não suportado. Use PNG, JPG, WebP, SVG ou GIF.')
      return
    }

    setLogoError(null)
    // Preview local imediato
    setLogoPreview(URL.createObjectURL(file))

    // Upload imediato ao backend
    setLogoUploading(true)
    try {
      const result = await superAdminApi.uploadLogo(file)
      setLogoUrl(result.url)
    } catch {
      setLogoError('Falha no upload. Tente novamente.')
      setLogoPreview(null)
    } finally {
      setLogoUploading(false)
    }
  }

  function handleRemoveLogo() {
    setLogoPreview(null)
    setLogoUrl(null)
    setLogoError(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  async function onSubmit(values: FormData) {
    setServerError(null)
    try {
      await superAdminApi.createTenant({
        name:     values.name,
        slug:     values.slug,
        email:    values.email,
        phone:    values.phone    || undefined,
        address:  values.address  || undefined,
        planType: values.planType,
        logoUrl:  logoUrl || undefined,
        gestor: {
          name:     values.gestorName,
          email:    values.gestorEmail,
          password: values.gestorPassword,
          phone:    values.gestorPhone || undefined,
        },
      })
      void navigate({ to: '/super-admin/tenants' })
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro ao cadastrar clínica. Tente novamente.'
      setServerError(msg)
    }
  }

  return (
    <div style={{ padding: '32px', maxWidth: '680px', fontFamily: 'var(--font-sans)' }}>
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>

      {/* ── Header ────────────────────────────────────────────────────── */}
      <div style={{ marginBottom: '28px' }}>
        <button
          onClick={() => void navigate({ to: '/super-admin/tenants' })}
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
          Voltar para clínicas
        </button>
        <h1 style={{
          margin: 0, fontSize: '26px', fontWeight: 400,
          fontFamily: 'var(--font-display)', fontStyle: 'italic',
          color: '#1a2530', letterSpacing: '-0.02em',
        }}>
          Nova clínica
        </h1>
        <p style={{ margin: '4px 0 0', fontSize: '13.5px', color: '#64748b' }}>
          Cadastre uma clínica e o seu primeiro gestor
        </p>
      </div>

      {/* ── Card ──────────────────────────────────────────────────────── */}
      <form onSubmit={handleSubmit(onSubmit)} noValidate>
        <div style={{
          background: '#fff', borderRadius: '16px',
          border: '1px solid #f0f2f5',
          boxShadow: '0 1px 6px rgba(0,0,0,0.04)',
          padding: '28px',
          display: 'flex', flexDirection: 'column', gap: '22px',
        }}>

          {serverError && (
            <div style={{
              padding: '12px 16px', borderRadius: '10px',
              background: '#fef2f2', border: '1px solid #fecaca',
              color: '#b91c1c', fontSize: '13.5px',
            }}>
              {serverError}
            </div>
          )}

          {/* ── Seção: Dados da Clínica ──────────────────────────────── */}
          <p style={sectionDividerStyle}>Dados da Clínica</p>

          {/* Nome */}
          <div>
            <label style={labelStyle}>Nome da clínica *</label>
            <input
              placeholder="Clínica São Lucas"
              {...register('name', { onChange: handleNameChange })}
              style={inputStyle}
            />
            {errors.name && (
              <p style={{ margin: '4px 0 0', fontSize: '12px', color: '#dc2626' }}>
                {errors.name.message}
              </p>
            )}
          </div>

          {/* Slug */}
          <div>
            <label style={labelStyle}>Slug (URL pública) *</label>
            <input
              placeholder="clinica-sao-lucas"
              {...register('slug', { onChange: () => setSlugManuallyEdited(true) })}
              style={inputStyle}
            />
            <p style={{ margin: '4px 0 0', fontSize: '12px', color: '#94a3b8' }}>
              URL de agendamento público: /clinica-sao-lucas
            </p>
            {errors.slug && (
              <p style={{ margin: '4px 0 0', fontSize: '12px', color: '#dc2626' }}>
                {errors.slug.message}
              </p>
            )}
          </div>

          {/* E-mail + Telefone */}
          <div className="r-grid-2">
            <div>
              <label style={labelStyle}>E-mail da clínica *</label>
              <input
                type="email"
                placeholder="contato@clinica.com"
                {...register('email')}
                style={inputStyle}
              />
              {errors.email && (
                <p style={{ margin: '4px 0 0', fontSize: '12px', color: '#dc2626' }}>
                  {errors.email.message}
                </p>
              )}
            </div>
            <div>
              <label style={labelStyle}>Telefone (opcional)</label>
              <input
                type="tel"
                placeholder="(11) 9 9999-9999"
                {...register('phone')}
                style={inputStyle}
              />
            </div>
          </div>

          {/* Plano + Endereço */}
          <div className="r-grid-2">
            <div>
              <label style={labelStyle}>Plano</label>
              <select
                {...register('planType')}
                style={{ ...inputStyle, cursor: 'pointer' }}
              >
                <option value="BASIC">BASIC</option>
                <option value="PRO">PRO</option>
              </select>
            </div>
            <div>
              <label style={labelStyle}>Endereço (opcional)</label>
              <input
                placeholder="Av. Paulista, 1000 — São Paulo, SP"
                {...register('address')}
                style={inputStyle}
              />
            </div>
          </div>

          {/* ── Logo da Clínica ───────────────────────────────────── */}
          <div>
            <label style={labelStyle}>Logo da clínica (opcional)</label>

            {logoPreview ? (
              // Preview com opção de remover
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <div style={{
                  width: '80px', height: '80px', borderRadius: '12px',
                  border: '1.5px solid #e2e8f0', overflow: 'hidden',
                  background: '#f8fafc', flexShrink: 0,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <img
                    src={logoPreview}
                    alt="Preview da logo"
                    style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                  />
                </div>
                <div style={{ flex: 1 }}>
                  {logoUploading ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#64748b' }}>
                      <div style={{ width: '14px', height: '14px', border: '2px solid #e2e8f0', borderTopColor: 'var(--admin-color-primary)', borderRadius: '50%', animation: 'spin 0.8s linear infinite', flexShrink: 0 }} />
                      Enviando...
                    </div>
                  ) : logoUrl ? (
                    <p style={{ margin: '0 0 6px', fontSize: '12.5px', color: '#16a34a', fontWeight: 600 }}>
                      ✓ Upload concluído
                    </p>
                  ) : null}
                  {logoError && (
                    <p style={{ margin: '0 0 6px', fontSize: '12px', color: '#dc2626' }}>{logoError}</p>
                  )}
                  <button
                    type="button"
                    onClick={handleRemoveLogo}
                    style={{
                      background: 'none', border: 'none', cursor: 'pointer',
                      fontSize: '12px', color: '#94a3b8', padding: 0,
                      fontFamily: 'var(--font-sans)',
                    }}
                  >
                    ✕ Remover logo
                  </button>
                </div>
              </div>
            ) : (
              // Área de drop / botão de upload
              <label
                htmlFor="logo-upload"
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  gap: '10px', height: '80px',
                  border: '1.5px dashed #cbd5e1', borderRadius: '12px',
                  background: '#f8fafc', cursor: 'pointer',
                  transition: 'border-color 0.15s, background 0.15s',
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLElement).style.borderColor = 'var(--admin-color-primary)'
                  ;(e.currentTarget as HTMLElement).style.background = 'color-mix(in srgb, var(--admin-color-primary) 5%, white)'
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLElement).style.borderColor = '#cbd5e1'
                  ;(e.currentTarget as HTMLElement).style.background = '#f8fafc'
                }}
              >
                <svg width="20" height="20" fill="none" stroke="#94a3b8" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                    d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <div>
                  <p style={{ margin: 0, fontSize: '13px', fontWeight: 600, color: '#64748b' }}>
                    Clique para fazer upload
                  </p>
                  <p style={{ margin: '2px 0 0', fontSize: '11px', color: '#94a3b8' }}>
                    PNG, JPG, WebP, SVG ou GIF · máx. 5 MB
                  </p>
                </div>
              </label>
            )}

            <input
              ref={fileInputRef}
              id="logo-upload"
              type="file"
              accept="image/png,image/jpeg,image/webp,image/svg+xml,image/gif"
              onChange={handleLogoChange}
              style={{ display: 'none' }}
            />

            {logoError && !logoPreview && (
              <p style={{ margin: '6px 0 0', fontSize: '12px', color: '#dc2626' }}>{logoError}</p>
            )}
          </div>

          {/* ── Seção: Gestor Inicial ────────────────────────────────── */}
          <p style={{ ...sectionDividerStyle, marginTop: '6px' }}>Gestor Inicial</p>

          <p style={{ margin: '-10px 0 0', fontSize: '13px', color: '#64748b' }}>
            Este usuário terá acesso total ao painel como <strong>Gestor</strong>.
          </p>

          {/* Nome do gestor */}
          <div>
            <label style={labelStyle}>Nome completo *</label>
            <input
              placeholder="Dr. Carlos Almeida"
              {...register('gestorName')}
              style={inputStyle}
            />
            {errors.gestorName && (
              <p style={{ margin: '4px 0 0', fontSize: '12px', color: '#dc2626' }}>
                {errors.gestorName.message}
              </p>
            )}
          </div>

          {/* E-mail gestor + Telefone gestor */}
          <div className="r-grid-2">
            <div>
              <label style={labelStyle}>E-mail *</label>
              <input
                type="email"
                placeholder="gestor@clinica.com"
                {...register('gestorEmail')}
                style={inputStyle}
              />
              {errors.gestorEmail && (
                <p style={{ margin: '4px 0 0', fontSize: '12px', color: '#dc2626' }}>
                  {errors.gestorEmail.message}
                </p>
              )}
            </div>
            <div>
              <label style={labelStyle}>Telefone (opcional)</label>
              <input
                type="tel"
                placeholder="(11) 9 9999-9999"
                {...register('gestorPhone')}
                style={inputStyle}
              />
            </div>
          </div>

          {/* Senha */}
          <div>
            <label style={labelStyle}>Senha de acesso *</label>
            <input
              type="password"
              placeholder="••••••••"
              {...register('gestorPassword')}
              style={inputStyle}
            />
            <p style={{ margin: '4px 0 0', fontSize: '12px', color: '#94a3b8' }}>
              Mínimo 6 caracteres. O gestor poderá alterar após o primeiro acesso.
            </p>
            {errors.gestorPassword && (
              <p style={{ margin: '4px 0 0', fontSize: '12px', color: '#dc2626' }}>
                {errors.gestorPassword.message}
              </p>
            )}
          </div>

          {/* Botões */}
          <div style={{ display: 'flex', gap: '10px', paddingTop: '4px' }}>
            <button
              type="button"
              onClick={() => void navigate({ to: '/super-admin/tenants' })}
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
                borderRadius: '10px',
                background: 'var(--admin-color-primary)', color: '#fff',
                fontSize: '14px', fontWeight: 600,
                cursor: isSubmitting ? 'not-allowed' : 'pointer',
                opacity: isSubmitting ? 0.7 : 1,
                fontFamily: 'var(--font-sans)',
                boxShadow: '0 4px 14px rgba(99,184,153,0.35)',
              }}
            >
              {isSubmitting ? 'Cadastrando...' : 'Cadastrar clínica'}
            </button>
          </div>
        </div>
      </form>
    </div>
  )
}
