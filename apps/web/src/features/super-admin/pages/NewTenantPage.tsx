// ─── Super Admin — New Tenant Page ───────────────────────────────────────────
//
// Formulário de cadastro de nova clínica (tenant) com o primeiro gestor.
// Usa React Hook Form + Zod para validação.
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useRef } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { useForm } from 'react-hook-form'
import { useQuery } from '@tanstack/react-query'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { superAdminApi } from '@/lib/api/super-admin.api'
import { contrastText, DEFAULT_PRIMARY, DEFAULT_SECONDARY, DEFAULT_SIDEBAR } from '@/lib/theme'

// ─── Dark theme constants ─────────────────────────────────────────────────────

const D = {
  bg:          'var(--sa-bg)',
  surface:     'var(--sa-surface)',
  surfaceUp:   'var(--sa-surface-raised)',
  border:      'var(--sa-border)',
  text:        'var(--sa-text)',
  textSec:     'var(--sa-text-secondary)',
  textMuted:   'var(--sa-text-muted)',
  primary:     'var(--admin-color-primary)',
  green:       '#3fb950',
  red:         '#f85149',
  redBg:       'rgba(248,81,73,0.1)',
  redBorder:   'rgba(248,81,73,0.2)',
}

// ─── Schema ───────────────────────────────────────────────────────────────────

const slugRegex = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

const schema = z.object({
  name:           z.string().min(2, 'Nome deve ter ao menos 2 caracteres'),
  slug:           z.string().min(2, 'Slug deve ter ao menos 2 caracteres')
                    .regex(slugRegex, 'Use apenas letras minúsculas, números e hífens'),
  email:          z.string().email('E-mail inválido'),
  phone:          z.string().optional(),
  address:        z.string().optional(),
  planId:         z.string().optional(),
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
  color: D.textMuted, textTransform: 'uppercase', letterSpacing: '0.06em',
  marginBottom: '6px',
}

const inputStyle: React.CSSProperties = {
  width: '100%', boxSizing: 'border-box', height: '42px', padding: '0 14px',
  border: `1.5px solid ${D.border}`, borderRadius: '10px',
  fontSize: '14px', color: D.text,
  background: D.bg, outline: 'none', fontFamily: 'var(--font-sans)',
}

const sectionStyle: React.CSSProperties = {
  fontSize: '11px', fontWeight: 700, color: D.textMuted,
  textTransform: 'uppercase', letterSpacing: '0.08em',
  paddingBottom: '12px', borderBottom: `1px solid ${D.border}`,
}

const focusIn  = (e: React.FocusEvent<HTMLInputElement | HTMLSelectElement>) => {
  e.currentTarget.style.borderColor = D.primary
  e.currentTarget.style.boxShadow   = '0 0 0 3px rgba(99,184,153,0.15)'
}
const focusOut = (e: React.FocusEvent<HTMLInputElement | HTMLSelectElement>) => {
  e.currentTarget.style.borderColor = D.border
  e.currentTarget.style.boxShadow   = 'none'
}

// ─── ColorPickerField ─────────────────────────────────────────────────────────

function ColorPickerField({ label, hint, value, onChange }: {
  label: string; hint: string; value: string; onChange: (v: string) => void
}) {
  const isValid = /^#[0-9A-Fa-f]{6}$/.test(value)
  const swatch  = isValid ? value : D.border

  return (
    <div>
      <label style={labelStyle}>{label}</label>
      <p style={{ margin: '0 0 8px', fontSize: '12px', color: D.textMuted, fontStyle: 'italic', opacity: 0.7 }}>{hint}</p>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <div style={{ position: 'relative', flexShrink: 0 }}>
          <div style={{
            width: '42px', height: '42px', borderRadius: '10px',
            background: swatch, border: `2px solid ${D.border}`,
            cursor: 'pointer',
            boxShadow: isValid ? `0 2px 12px ${swatch}60` : 'none',
            transition: 'box-shadow 0.2s',
          }} />
          <input type="color" value={isValid ? value : '#000000'}
            onChange={(e) => onChange(e.target.value.toUpperCase())}
            style={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer', width: '100%', height: '100%' }} />
        </div>
        <input
          value={value} onChange={(e) => onChange(e.target.value.toUpperCase())}
          placeholder="#RRGGBB" maxLength={7}
          style={{
            ...inputStyle, width: '130px',
            fontFamily: 'var(--font-mono, monospace)', fontSize: '13px', height: '42px',
            borderColor: isValid || value === '' ? D.border : D.red,
          }}
          onFocus={focusIn as any} onBlur={focusOut as any}
        />
        {isValid && (
          <div style={{
            padding: '6px 14px', borderRadius: '8px',
            background: swatch, color: contrastText(swatch),
            fontSize: '12.5px', fontWeight: 600,
            border: '1px solid rgba(255,255,255,0.1)',
            userSelect: 'none',
          }}>Texto</div>
        )}
      </div>
    </div>
  )
}

// ─── Component ────────────────────────────────────────────────────────────────

export function NewTenantPage() {
  const navigate = useNavigate()
  const [serverError,        setServerError]        = useState<string | null>(null)
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(false)
  const [logoPreview,   setLogoPreview]   = useState<string | null>(null)
  const [logoUrl,       setLogoUrl]       = useState<string | null>(null)
  const [logoUploading, setLogoUploading] = useState(false)
  const [logoError,     setLogoError]     = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [bannerPreview,   setBannerPreview]   = useState<string | null>(null)
  const [bannerUrl,       setBannerUrl]       = useState<string | null>(null)
  const [bannerUploading, setBannerUploading] = useState(false)
  const [bannerError,     setBannerError]     = useState<string | null>(null)
  const [bannerDragging,  setBannerDragging]  = useState(false)
  const bannerFileRef = useRef<HTMLInputElement>(null)
  const [colorPrimary,   setColorPrimary]   = useState(DEFAULT_PRIMARY.toUpperCase())
  const [colorSecondary, setColorSecondary] = useState(DEFAULT_SECONDARY.toUpperCase())
  const [colorSidebar,   setColorSidebar]   = useState(DEFAULT_SIDEBAR.toUpperCase())

  const { data: plansData } = useQuery({
    queryKey: ['sa-plans-list'],
    queryFn:  () => superAdminApi.listPlans(),
    staleTime: 5 * 60 * 1000,
  })
  const plans = plansData ?? []

  const { register, handleSubmit, setValue, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { slug: '', planId: '' },
  })

  function handleNameChange(e: React.ChangeEvent<HTMLInputElement>) {
    if (!slugManuallyEdited) setValue('slug', toSlug(e.target.value), { shouldValidate: true })
  }

  async function handleLogoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 5 * 1024 * 1024) { setLogoError('Arquivo muito grande. Máximo 5 MB.'); return }
    const allowed = ['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml', 'image/gif']
    if (!allowed.includes(file.type)) { setLogoError('Formato não suportado. Use PNG, JPG, WebP, SVG ou GIF.'); return }
    setLogoError(null)
    setLogoPreview(URL.createObjectURL(file))
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
    setLogoPreview(null); setLogoUrl(null); setLogoError(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  async function handleBannerFile(file: File) {
    if (file.size > 5 * 1024 * 1024) { setBannerError('Arquivo muito grande. Máximo 5 MB.'); return }
    const allowed = ['image/png', 'image/jpeg', 'image/webp', 'image/gif']
    if (!allowed.includes(file.type)) { setBannerError('Formato não suportado. Use PNG, JPG ou WebP.'); return }
    setBannerError(null)
    setBannerPreview(URL.createObjectURL(file))
    setBannerUploading(true)
    try {
      const result = await superAdminApi.uploadBanner(file)
      setBannerUrl(result.url)
    } catch {
      setBannerError('Falha no upload. Tente novamente.')
      setBannerPreview(null)
    } finally {
      setBannerUploading(false)
    }
  }

  function handleRemoveBanner() {
    setBannerPreview(null); setBannerUrl(null); setBannerError(null)
    if (bannerFileRef.current) bannerFileRef.current.value = ''
  }

  async function onSubmit(values: FormData) {
    setServerError(null)
    try {
      const hexRe = /^#[0-9A-Fa-f]{6}$/
      await superAdminApi.createTenant({
        name: values.name, slug: values.slug, email: values.email,
        phone: values.phone || undefined, address: values.address || undefined,
        planId: values.planId || undefined, logoUrl: logoUrl || undefined, bannerUrl: bannerUrl || undefined,
        colorPrimary:   hexRe.test(colorPrimary)   ? colorPrimary   : undefined,
        colorSecondary: hexRe.test(colorSecondary) ? colorSecondary : undefined,
        colorSidebar:   hexRe.test(colorSidebar)   ? colorSidebar   : undefined,
        gestor: {
          name: values.gestorName, email: values.gestorEmail,
          password: values.gestorPassword, phone: values.gestorPhone || undefined,
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
      <style>{`@keyframes spin { to { transform: rotate(360deg) } } @keyframes fadeUp { from { opacity: 0; transform: translateY(10px) } to { opacity: 1; transform: translateY(0) } }`}</style>

      {/* Header */}
      <div style={{ marginBottom: '28px', animation: 'fadeUp 0.3s ease both' }}>
        <button
          onClick={() => void navigate({ to: '/super-admin/tenants' })}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: '6px',
            background: 'none', border: 'none', cursor: 'pointer',
            fontSize: '13px', color: D.textMuted, padding: 0, marginBottom: '12px',
            fontFamily: 'var(--font-sans)', transition: 'color 0.15s',
          }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = D.textSec }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = D.textMuted }}
        >
          <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Voltar para clínicas
        </button>
        <h1 style={{
          margin: 0, fontSize: '26px', fontWeight: 400,
          fontFamily: 'var(--font-display)', fontStyle: 'italic',
          color: D.text, letterSpacing: '-0.02em',
        }}>
          Nova clínica
        </h1>
        <p style={{ margin: '4px 0 0', fontSize: '13.5px', color: D.textMuted }}>
          Cadastre uma clínica e o seu primeiro gestor
        </p>
      </div>

      {/* Form card */}
      <form onSubmit={handleSubmit(onSubmit)} noValidate>
        <div style={{
          background: D.surface, borderRadius: '16px',
          border: `1px solid ${D.border}`,
          boxShadow: '0 4px 16px rgba(0,0,0,0.25)',
          padding: '28px',
          display: 'flex', flexDirection: 'column', gap: '22px',
        }}>

          {serverError && (
            <div style={{ padding: '12px 16px', borderRadius: '10px', background: D.redBg, border: `1px solid ${D.redBorder}`, color: D.red, fontSize: '13.5px' }}>
              {serverError}
            </div>
          )}

          {/* Dados da Clínica */}
          <p style={sectionStyle}>Dados da Clínica</p>

          <div>
            <label style={labelStyle}>Nome da clínica *</label>
            <input placeholder="Clínica São Lucas"
              {...register('name', { onChange: handleNameChange })}
              style={inputStyle} onFocus={focusIn as any} onBlur={focusOut as any} />
            {errors.name && <p style={{ margin: '4px 0 0', fontSize: '12px', color: D.red }}>{errors.name.message}</p>}
          </div>

          <div>
            <label style={labelStyle}>Slug (URL pública) *</label>
            <input placeholder="clinica-sao-lucas"
              {...register('slug', { onChange: () => setSlugManuallyEdited(true) })}
              style={inputStyle} onFocus={focusIn as any} onBlur={focusOut as any} />
            <p style={{ margin: '4px 0 0', fontSize: '12px', color: D.textMuted }}>
              URL de agendamento público: /clinica-sao-lucas
            </p>
            {errors.slug && <p style={{ margin: '4px 0 0', fontSize: '12px', color: D.red }}>{errors.slug.message}</p>}
          </div>

          <div className="r-grid-2">
            <div>
              <label style={labelStyle}>E-mail da clínica *</label>
              <input type="email" placeholder="contato@clinica.com"
                {...register('email')} style={inputStyle}
                onFocus={focusIn as any} onBlur={focusOut as any} />
              {errors.email && <p style={{ margin: '4px 0 0', fontSize: '12px', color: D.red }}>{errors.email.message}</p>}
            </div>
            <div>
              <label style={labelStyle}>Telefone (opcional)</label>
              <input type="tel" placeholder="(11) 9 9999-9999"
                {...register('phone')} style={inputStyle}
                onFocus={focusIn as any} onBlur={focusOut as any} />
            </div>
          </div>

          <div className="r-grid-2">
            <div>
              <label style={labelStyle}>Plano</label>
              <select {...register('planId')} style={{ ...inputStyle, cursor: 'pointer' }}
                onFocus={focusIn as any} onBlur={focusOut as any}>
                <option value="">— Free (padrão) —</option>
                {plans.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
            <div>
              <label style={labelStyle}>Endereço (opcional)</label>
              <input placeholder="Av. Paulista, 1000 — São Paulo, SP"
                {...register('address')} style={inputStyle}
                onFocus={focusIn as any} onBlur={focusOut as any} />
            </div>
          </div>

          {/* Logo */}
          <div>
            <label style={labelStyle}>Logo da clínica (opcional)</label>
            {logoPreview ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <div style={{
                  width: '80px', height: '80px', borderRadius: '12px',
                  border: `1.5px solid ${D.border}`, overflow: 'hidden',
                  background: D.surfaceUp, flexShrink: 0,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <img src={logoPreview} alt="Preview da logo" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                </div>
                <div style={{ flex: 1 }}>
                  {logoUploading ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: D.textSec }}>
                      <div style={{ width: '14px', height: '14px', border: `2px solid ${D.border}`, borderTopColor: D.primary, borderRadius: '50%', animation: 'spin 0.8s linear infinite', flexShrink: 0 }} />
                      Enviando...
                    </div>
                  ) : logoUrl ? (
                    <p style={{ margin: '0 0 6px', fontSize: '12.5px', color: D.green, fontWeight: 600 }}>✓ Upload concluído</p>
                  ) : null}
                  {logoError && <p style={{ margin: '0 0 6px', fontSize: '12px', color: D.red }}>{logoError}</p>}
                  <button type="button" onClick={handleRemoveLogo} style={{
                    background: 'none', border: 'none', cursor: 'pointer',
                    fontSize: '12px', color: D.textMuted, padding: 0, fontFamily: 'var(--font-sans)',
                  }}>✕ Remover logo</button>
                </div>
              </div>
            ) : (
              <label htmlFor="logo-upload" style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                gap: '10px', height: '80px',
                border: `1.5px dashed ${D.border}`, borderRadius: '12px',
                background: D.surfaceUp, cursor: 'pointer',
                transition: 'border-color 0.15s, background 0.15s',
              }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.borderColor = D.primary; (e.currentTarget as HTMLElement).style.background = 'rgba(99,184,153,0.08)' }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.borderColor = D.border; (e.currentTarget as HTMLElement).style.background = D.surfaceUp }}
              >
                <svg width="20" height="20" fill="none" stroke={D.textMuted} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                    d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <div>
                  <p style={{ margin: 0, fontSize: '13px', fontWeight: 600, color: D.textSec }}>Clique para fazer upload</p>
                  <p style={{ margin: '2px 0 0', fontSize: '11px', color: D.textMuted }}>PNG, JPG, WebP, SVG ou GIF · máx. 5 MB</p>
                </div>
              </label>
            )}
            <input ref={fileInputRef} id="logo-upload" type="file"
              accept="image/png,image/jpeg,image/webp,image/svg+xml,image/gif"
              onChange={handleLogoChange} style={{ display: 'none' }} />
            {logoError && !logoPreview && <p style={{ margin: '6px 0 0', fontSize: '12px', color: D.red }}>{logoError}</p>}
          </div>

          {/* Banner de Login */}
          <div>
            <label style={labelStyle}>Banner de login (opcional)</label>
            <p style={{ margin: '0 0 10px', fontSize: '12px', color: D.textMuted }}>
              Imagem de fundo exibida na tela de login da clínica. PNG, JPG ou WebP · máx. 5 MB.
            </p>
            {bannerPreview ? (
              <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                <div style={{ flex: 1, height: '90px', borderRadius: '10px', border: `1.5px solid ${D.border}`, overflow: 'hidden', background: D.surfaceUp }}>
                  <img src={bannerPreview} alt="Preview do banner" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {bannerUploading ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: D.textSec }}>
                      <div style={{ width: '12px', height: '12px', border: `2px solid ${D.border}`, borderTopColor: D.primary, borderRadius: '50%', animation: 'spin 0.8s linear infinite', flexShrink: 0 }} />
                      Enviando...
                    </div>
                  ) : bannerUrl ? (
                    <p style={{ margin: 0, fontSize: '12px', color: D.green, fontWeight: 600 }}>✓ Upload concluído</p>
                  ) : null}
                  {bannerError && <p style={{ margin: 0, fontSize: '11px', color: D.red }}>{bannerError}</p>}
                  <button type="button" onClick={() => bannerFileRef.current?.click()}
                    style={{ background: 'none', border: `1px solid ${D.border}`, cursor: 'pointer', fontSize: '11px', color: D.textSec, padding: '4px 10px', borderRadius: '6px', fontFamily: 'var(--font-sans)' }}>
                    Trocar
                  </button>
                  <button type="button" onClick={handleRemoveBanner}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '11px', color: D.textMuted, padding: 0, fontFamily: 'var(--font-sans)' }}>
                    ✕ Remover
                  </button>
                </div>
              </div>
            ) : (
              <div
                onClick={() => bannerFileRef.current?.click()}
                onDragOver={(e) => { e.preventDefault(); setBannerDragging(true) }}
                onDragLeave={() => setBannerDragging(false)}
                onDrop={(e) => { e.preventDefault(); setBannerDragging(false); const f = e.dataTransfer.files[0]; if (f) void handleBannerFile(f) }}
                style={{
                  border: `1.5px dashed ${bannerDragging ? D.primary : D.border}`, borderRadius: '12px',
                  height: '80px', background: bannerDragging ? 'rgba(99,184,153,0.08)' : D.surfaceUp,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px',
                  cursor: bannerUploading ? 'wait' : 'pointer', transition: 'all 0.15s',
                }}
                onMouseEnter={(e) => { if (!bannerDragging) { (e.currentTarget as HTMLElement).style.borderColor = D.primary; (e.currentTarget as HTMLElement).style.background = 'rgba(99,184,153,0.06)' }}}
                onMouseLeave={(e) => { if (!bannerDragging) { (e.currentTarget as HTMLElement).style.borderColor = D.border; (e.currentTarget as HTMLElement).style.background = D.surfaceUp }}}
              >
                {bannerUploading ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: D.textSec }}>
                    <div style={{ width: '14px', height: '14px', border: `2px solid ${D.border}`, borderTopColor: D.primary, borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                    Enviando...
                  </div>
                ) : (
                  <>
                    <svg width="18" height="18" fill="none" stroke={D.textMuted} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                        d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <div>
                      <p style={{ margin: 0, fontSize: '13px', fontWeight: 600, color: D.textSec }}>Clique ou arraste para upload</p>
                      <p style={{ margin: '1px 0 0', fontSize: '11px', color: D.textMuted }}>PNG, JPG ou WebP · máx. 5 MB</p>
                    </div>
                  </>
                )}
              </div>
            )}
            {bannerError && !bannerPreview && <p style={{ margin: '6px 0 0', fontSize: '12px', color: D.red }}>{bannerError}</p>}
            <input ref={bannerFileRef} type="file"
              accept="image/png,image/jpeg,image/webp,image/gif"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) void handleBannerFile(f); e.target.value = '' }}
              style={{ display: 'none' }} />
          </div>

          {/* Identidade Visual */}
          <p style={{ ...sectionStyle, marginTop: '6px' }}>Identidade Visual</p>

          {/* Preview rápido das 3 cores */}
          <div style={{
            display: 'flex', gap: '10px', flexWrap: 'wrap',
            padding: '16px', borderRadius: '12px',
            background: D.surfaceUp, border: `1px solid ${D.border}`,
            marginBottom: '4px',
          }}>
            {[
              { label: 'Primária',   color: colorPrimary },
              { label: 'Secundária', color: colorSecondary },
              { label: 'Sidebar',    color: colorSidebar },
            ].map(({ label, color }) => {
              const valid = /^#[0-9A-Fa-f]{6}$/.test(color)
              return (
                <div key={label} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{
                    width: '28px', height: '28px', borderRadius: '8px',
                    background: valid ? color : D.border,
                    border: '2px solid rgba(255,255,255,0.08)',
                    flexShrink: 0,
                    boxShadow: valid ? `0 0 8px ${color}50` : 'none',
                  }} />
                  <div>
                    <p style={{ margin: 0, fontSize: '10px', color: D.textMuted, textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 700 }}>{label}</p>
                    <p style={{ margin: 0, fontSize: '12px', color: D.textSec, fontFamily: 'var(--font-mono, monospace)' }}>{valid ? color : '—'}</p>
                  </div>
                </div>
              )
            })}
          </div>

          <ColorPickerField label="Cor Primária" hint="Botões, links e elementos de destaque." value={colorPrimary} onChange={setColorPrimary} />
          <ColorPickerField label="Cor Secundária" hint="Badges, rótulos de status e destaques secundários." value={colorSecondary} onChange={setColorSecondary} />
          <ColorPickerField label="Cor da Sidebar" hint="Fundo da barra de navegação lateral." value={colorSidebar} onChange={setColorSidebar} />

          {/* Gestor Inicial */}
          <p style={{ ...sectionStyle, marginTop: '6px' }}>Gestor Inicial</p>
          <p style={{ margin: '-10px 0 0', fontSize: '13px', color: D.textSec }}>
            Este usuário terá acesso total ao painel como <strong style={{ color: D.text }}>Gestor</strong>.
          </p>

          <div>
            <label style={labelStyle}>Nome completo *</label>
            <input placeholder="Dr. Carlos Almeida"
              {...register('gestorName')} style={inputStyle}
              onFocus={focusIn as any} onBlur={focusOut as any} />
            {errors.gestorName && <p style={{ margin: '4px 0 0', fontSize: '12px', color: D.red }}>{errors.gestorName.message}</p>}
          </div>

          <div className="r-grid-2">
            <div>
              <label style={labelStyle}>E-mail *</label>
              <input type="email" placeholder="gestor@clinica.com"
                {...register('gestorEmail')} style={inputStyle}
                onFocus={focusIn as any} onBlur={focusOut as any} />
              {errors.gestorEmail && <p style={{ margin: '4px 0 0', fontSize: '12px', color: D.red }}>{errors.gestorEmail.message}</p>}
            </div>
            <div>
              <label style={labelStyle}>Telefone (opcional)</label>
              <input type="tel" placeholder="(11) 9 9999-9999"
                {...register('gestorPhone')} style={inputStyle}
                onFocus={focusIn as any} onBlur={focusOut as any} />
            </div>
          </div>

          <div>
            <label style={labelStyle}>Senha de acesso *</label>
            <input type="password" placeholder="••••••••"
              {...register('gestorPassword')} style={inputStyle}
              onFocus={focusIn as any} onBlur={focusOut as any} />
            <p style={{ margin: '4px 0 0', fontSize: '12px', color: D.textMuted }}>
              Mínimo 6 caracteres. O gestor poderá alterar após o primeiro acesso.
            </p>
            {errors.gestorPassword && <p style={{ margin: '4px 0 0', fontSize: '12px', color: D.red }}>{errors.gestorPassword.message}</p>}
          </div>

          {/* Botões */}
          <div style={{ display: 'flex', gap: '10px', paddingTop: '4px' }}>
            <button type="button" onClick={() => void navigate({ to: '/super-admin/tenants' })} style={{
              flex: 1, height: '44px', border: `1.5px solid ${D.border}`,
              borderRadius: '10px', background: D.surfaceUp, color: D.textSec,
              fontSize: '14px', fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font-sans)',
            }}>Cancelar</button>
            <button type="submit" disabled={isSubmitting} style={{
              flex: 2, height: '44px', border: 'none', borderRadius: '10px',
              background: D.primary, color: '#fff',
              fontSize: '14px', fontWeight: 600,
              cursor: isSubmitting ? 'not-allowed' : 'pointer',
              opacity: isSubmitting ? 0.7 : 1,
              fontFamily: 'var(--font-sans)',
              boxShadow: '0 4px 14px rgba(99,184,153,0.35)',
            }}>{isSubmitting ? 'Cadastrando...' : 'Cadastrar clínica'}</button>
          </div>
        </div>
      </form>
    </div>
  )
}
