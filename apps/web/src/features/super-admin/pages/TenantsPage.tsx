// ─── Super Admin — Tenants Page ───────────────────────────────────────────────
//
// Lista todas as clínicas (tenants) com busca, paginação,
// ações de ativar/desativar, edição e deleção com modais de confirmação.
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useEffect, useRef } from 'react'
import { Link } from '@tanstack/react-router'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { superAdminApi, type Tenant, type UpdateTenantPayload, type PlanInfo } from '@/lib/api/super-admin.api'
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
  greenBg:     'rgba(63,185,80,0.1)',
  greenBorder: 'rgba(63,185,80,0.2)',
  red:         '#f85149',
  redBg:       'rgba(248,81,73,0.1)',
  redBorder:   'rgba(248,81,73,0.2)',
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const API_BASE = import.meta.env['VITE_API_URL'] ?? 'http://localhost:3333'

function logoSrc(url: string | null | undefined): string | null {
  if (!url) return null
  if (url.startsWith('http')) return url
  return `${API_BASE}${url}`
}

function TenantAvatar({ name, logoUrl, size = 36 }: { name: string; logoUrl?: string | null; size?: number }) {
  const src = logoSrc(logoUrl)
  const [imgError, setImgError] = useState(false)

  if (src && !imgError) {
    return (
      <img
        src={src}
        alt={`Logo ${name}`}
        onError={() => setImgError(true)}
        style={{
          width: size, height: size, borderRadius: '8px',
          objectFit: 'contain', background: D.surfaceUp,
          border: `1px solid ${D.border}`, flexShrink: 0,
        }}
      />
    )
  }

  const initial = name.trim()[0]?.toUpperCase() ?? '?'
  return (
    <div style={{
      width: size, height: size, borderRadius: '8px', flexShrink: 0,
      background: 'var(--admin-color-primary-light)',
      color: D.primary,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: size * 0.38, fontWeight: 700,
    }}>
      {initial}
    </div>
  )
}

// ─── Shared input style ───────────────────────────────────────────────────────

const inputStyle: React.CSSProperties = {
  width: '100%', boxSizing: 'border-box', height: '40px',
  padding: '0 12px',
  border: `1.5px solid ${D.border}`, borderRadius: '10px',
  fontSize: '13.5px', color: D.text,
  background: D.bg, outline: 'none',
  fontFamily: 'var(--font-sans)',
}

const fieldLabel: React.CSSProperties = {
  display: 'block', fontSize: '11px', fontWeight: 700,
  color: D.textMuted, textTransform: 'uppercase', letterSpacing: '0.06em',
  marginBottom: '6px',
}

// ─── ColorPickerField ─────────────────────────────────────────────────────────

function ColorPickerField({ label, hint, value, onChange }: {
  label: string; hint: string; value: string; onChange: (v: string) => void
}) {
  const isValid = /^#[0-9A-Fa-f]{6}$/.test(value)
  const swatch  = isValid ? value : D.border

  return (
    <div>
      <label style={fieldLabel}>{label}</label>
      <p style={{ margin: '0 0 7px', fontSize: '11.5px', color: D.textMuted, fontStyle: 'italic', opacity: 0.7 }}>{hint}</p>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <div style={{ position: 'relative', flexShrink: 0 }}>
          <div style={{
            width: '38px', height: '38px', borderRadius: '9px',
            background: swatch, border: `2px solid ${D.border}`,
            cursor: 'pointer',
            boxShadow: isValid ? `0 2px 10px ${swatch}60` : 'none',
            transition: 'box-shadow 0.2s',
          }} />
          <input
            type="color"
            value={isValid ? value : '#000000'}
            onChange={(e) => onChange(e.target.value.toUpperCase())}
            style={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer', width: '100%', height: '100%' }}
          />
        </div>
        <input
          value={value}
          onChange={(e) => onChange(e.target.value.toUpperCase())}
          placeholder="#RRGGBB"
          maxLength={7}
          style={{
            width: '120px', boxSizing: 'border-box', height: '38px', padding: '0 10px',
            border: `1.5px solid ${isValid || value === '' ? D.border : D.red}`,
            borderRadius: '9px', fontSize: '13px', color: D.text,
            background: D.bg, outline: 'none',
            fontFamily: 'var(--font-mono, monospace)',
          }}
        />
        {isValid && (
          <div style={{
            padding: '5px 12px', borderRadius: '7px',
            background: swatch, color: contrastText(swatch),
            fontSize: '12px', fontWeight: 600,
            border: '1px solid rgba(255,255,255,0.1)',
            userSelect: 'none',
          }}>
            Texto
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Logo Upload ──────────────────────────────────────────────────────────────

function LogoUpload({ currentUrl, onChange }: {
  currentUrl?: string | null
  onChange: (url: string | null) => void
}) {
  const [preview, setPreview]     = useState<string | null>(logoSrc(currentUrl))
  const [uploading, setUploading] = useState(false)
  const [error, setError]         = useState<string | null>(null)
  const [uploaded, setUploaded]   = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 5 * 1024 * 1024) { setError('Máximo 5 MB.'); return }
    const allowed = ['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml', 'image/gif']
    if (!allowed.includes(file.type)) { setError('Use PNG, JPG, WebP, SVG ou GIF.'); return }
    setError(null)
    setPreview(URL.createObjectURL(file))
    setUploading(true)
    setUploaded(false)
    try {
      const result = await superAdminApi.uploadLogo(file)
      onChange(result.url)
      setUploaded(true)
    } catch {
      setError('Falha no upload. Tente novamente.')
      setPreview(logoSrc(currentUrl))
    } finally {
      setUploading(false)
    }
  }

  function handleRemove() {
    setPreview(null); setUploaded(false); setError(null); onChange(null)
    if (fileRef.current) fileRef.current.value = ''
  }

  return (
    <div>
      <label style={fieldLabel}>Logo da clínica</label>

      {preview ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{
            width: '64px', height: '64px', borderRadius: '10px',
            border: `1.5px solid ${D.border}`, overflow: 'hidden',
            background: D.surfaceUp, flexShrink: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <img src={preview} alt="Logo" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
          </div>
          <div style={{ flex: 1 }}>
            {uploading && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12.5px', color: D.textSec }}>
                <div style={{ width: '12px', height: '12px', border: `2px solid ${D.border}`, borderTopColor: D.primary, borderRadius: '50%', animation: 'spin 0.8s linear infinite', flexShrink: 0 }} />
                Enviando...
              </div>
            )}
            {uploaded && !uploading && (
              <p style={{ margin: '0 0 4px', fontSize: '12.5px', color: D.green, fontWeight: 600 }}>✓ Upload concluído</p>
            )}
            {error && <p style={{ margin: '0 0 4px', fontSize: '12px', color: D.red }}>{error}</p>}
            <button type="button" onClick={handleRemove}
              style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '12px', color: D.textMuted, padding: 0, fontFamily: 'var(--font-sans)' }}>
              ✕ Remover logo
            </button>
          </div>
        </div>
      ) : (
        <label
          htmlFor="edit-logo-upload"
          style={{
            display: 'flex', alignItems: 'center', gap: '10px', height: '64px',
            border: `1.5px dashed ${D.border}`, borderRadius: '10px',
            background: D.surfaceUp, cursor: 'pointer',
            transition: 'border-color 0.15s, background 0.15s',
            justifyContent: 'center',
          }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.borderColor = D.primary; (e.currentTarget as HTMLElement).style.background = 'rgba(99,184,153,0.08)' }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.borderColor = D.border; (e.currentTarget as HTMLElement).style.background = D.surfaceUp }}
        >
          <svg width="18" height="18" fill="none" stroke={D.textMuted} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
              d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          <div>
            <p style={{ margin: 0, fontSize: '13px', fontWeight: 600, color: D.textSec }}>Clique para fazer upload</p>
            <p style={{ margin: '1px 0 0', fontSize: '11px', color: D.textMuted }}>PNG, JPG, WebP, SVG · máx. 5 MB</p>
          </div>
        </label>
      )}

      <input ref={fileRef} id="edit-logo-upload" type="file"
        accept="image/png,image/jpeg,image/webp,image/svg+xml,image/gif"
        onChange={handleFile} style={{ display: 'none' }} />
      {error && !preview && <p style={{ margin: '4px 0 0', fontSize: '12px', color: D.red }}>{error}</p>}
    </div>
  )
}

// ─── Delete Confirm Modal ─────────────────────────────────────────────────────

function DeleteConfirmModal({ tenant, onConfirm, onClose, loading }: {
  tenant: Tenant; onConfirm: () => void; onClose: () => void; loading: boolean
}) {
  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 100,
      background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px',
    }} onClick={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <div style={{
        background: D.surface, borderRadius: '18px',
        border: `1px solid ${D.border}`,
        boxShadow: '0 24px 64px rgba(0,0,0,0.5)',
        width: '100%', maxWidth: '420px', padding: '32px',
        animation: 'fadeUp 0.2s ease',
      }}>
        <div style={{
          width: '48px', height: '48px', borderRadius: '14px',
          background: D.redBg, border: `1px solid ${D.redBorder}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          marginBottom: '20px',
        }}>
          <svg width="22" height="22" fill="none" stroke={D.red} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
          </svg>
        </div>

        <h3 style={{ margin: '0 0 8px', fontSize: '17px', fontWeight: 700, color: D.text, fontFamily: 'var(--font-sans)' }}>
          Excluir clínica?
        </h3>
        <p style={{ margin: '0 0 12px', fontSize: '13.5px', color: D.textSec, lineHeight: 1.6 }}>
          Você está prestes a excluir permanentemente a clínica:
        </p>
        <div style={{
          padding: '12px 14px', borderRadius: '10px',
          background: D.surfaceUp, border: `1px solid ${D.border}`,
          marginBottom: '20px',
        }}>
          <p style={{ margin: '0 0 2px', fontSize: '14px', fontWeight: 700, color: D.text }}>{tenant.name}</p>
          <p style={{ margin: 0, fontSize: '12px', color: D.textMuted }}>/{tenant.slug} · {tenant.email}</p>
        </div>
        <p style={{ margin: '0 0 24px', fontSize: '13px', color: D.red, fontWeight: 600 }}>
          ⚠️ Esta ação é irreversível. Todos os dados serão perdidos.
        </p>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button onClick={onClose} disabled={loading} style={{
            flex: 1, height: '42px', borderRadius: '10px',
            border: `1.5px solid ${D.border}`, background: D.surfaceUp,
            color: D.textSec, fontSize: '14px', fontWeight: 600,
            cursor: loading ? 'not-allowed' : 'pointer', fontFamily: 'var(--font-sans)',
          }}>Cancelar</button>
          <button onClick={onConfirm} disabled={loading} style={{
            flex: 1, height: '42px', borderRadius: '10px',
            border: 'none', background: D.red,
            color: '#fff', fontSize: '14px', fontWeight: 600,
            cursor: loading ? 'not-allowed' : 'pointer',
            opacity: loading ? 0.7 : 1, fontFamily: 'var(--font-sans)',
          }}>{loading ? 'Excluindo...' : 'Sim, excluir'}</button>
        </div>
      </div>
    </div>
  )
}

// ─── Edit Tenant Modal ────────────────────────────────────────────────────────

function EditTenantModal({ tenant, onSave, onClose, loading, plans }: {
  tenant: Tenant; onSave: (payload: UpdateTenantPayload) => void
  onClose: () => void; loading: boolean; plans: PlanInfo[]
}) {
  const [form, setForm] = useState<UpdateTenantPayload>({
    name: tenant.name, email: tenant.email,
    phone: tenant.phone ?? '', address: tenant.address ?? '', planId: tenant.planId ?? '',
  })
  const [logoUrl, setLogoUrl]           = useState<string | null | undefined>(tenant.logoUrl)
  const [error, setError]               = useState<string | null>(null)
  const [colorPrimary,   setColorPrimary]   = useState(tenant.colorPrimary   ?? DEFAULT_PRIMARY.toUpperCase())
  const [colorSecondary, setColorSecondary] = useState(tenant.colorSecondary ?? DEFAULT_SECONDARY.toUpperCase())
  const [colorSidebar,   setColorSidebar]   = useState(tenant.colorSidebar   ?? DEFAULT_SIDEBAR.toUpperCase())

  useEffect(() => {
    setForm({ name: tenant.name, email: tenant.email, phone: tenant.phone ?? '', address: tenant.address ?? '', planId: tenant.planId ?? '' })
    setLogoUrl(tenant.logoUrl)
    setColorPrimary(tenant.colorPrimary     ?? DEFAULT_PRIMARY.toUpperCase())
    setColorSecondary(tenant.colorSecondary ?? DEFAULT_SECONDARY.toUpperCase())
    setColorSidebar(tenant.colorSidebar     ?? DEFAULT_SIDEBAR.toUpperCase())
    setError(null)
  }, [tenant.id])

  function handleChange(field: keyof UpdateTenantPayload, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }))
    setError(null)
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name?.trim()) { setError('Nome é obrigatório.'); return }
    if (!form.email?.trim()) { setError('E-mail é obrigatório.'); return }
    const hexRe = /^#[0-9A-Fa-f]{6}$/
    onSave({
      name: form.name.trim(), email: form.email.trim(),
      phone: form.phone?.trim() || null, address: form.address?.trim() || null,
      planId: form.planId || null, logoUrl: logoUrl ?? null,
      colorPrimary:   hexRe.test(colorPrimary)   ? colorPrimary   : null,
      colorSecondary: hexRe.test(colorSecondary) ? colorSecondary : null,
      colorSidebar:   hexRe.test(colorSidebar)   ? colorSidebar   : null,
    })
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 100,
      background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px',
    }} onClick={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <div style={{
        background: D.surface, borderRadius: '18px',
        border: `1px solid ${D.border}`,
        boxShadow: '0 24px 64px rgba(0,0,0,0.5)',
        width: '100%', maxWidth: '520px',
        animation: 'fadeUp 0.22s ease', maxHeight: '90vh', overflowY: 'auto',
      }}>
        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '24px 28px 20px', borderBottom: `1px solid ${D.border}`,
          position: 'sticky', top: 0, background: D.surface, zIndex: 1,
        }}>
          <div>
            <h3 style={{ margin: '0 0 3px', fontSize: '17px', fontWeight: 700, color: D.text, fontFamily: 'var(--font-sans)' }}>
              Editar Clínica
            </h3>
            <p style={{ margin: 0, fontSize: '12px', color: D.textMuted }}>/{tenant.slug}</p>
          </div>
          <button onClick={onClose} style={{
            width: '32px', height: '32px', borderRadius: '8px',
            border: `1px solid ${D.border}`, background: D.surfaceUp,
            display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
          }}>
            <svg width="14" height="14" fill="none" stroke={D.textSec} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} style={{ padding: '24px 28px 28px' }}>
          {error && (
            <div style={{ padding: '10px 14px', borderRadius: '10px', marginBottom: '16px', background: D.redBg, border: `1px solid ${D.redBorder}`, color: D.red, fontSize: '13px' }}>
              {error}
            </div>
          )}

          <div style={{ marginBottom: '20px' }}>
            <LogoUpload currentUrl={logoUrl} onChange={setLogoUrl} />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
            <div style={{ gridColumn: '1 / -1' }}>
              <label style={fieldLabel}>Nome da clínica *</label>
              <input value={form.name ?? ''} onChange={(e) => handleChange('name', e.target.value)}
                style={inputStyle} placeholder="Ex: Clínica São Lucas"
                onFocus={(e) => { e.currentTarget.style.borderColor = D.primary; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(99,184,153,0.15)' }}
                onBlur={(e) => { e.currentTarget.style.borderColor = D.border; e.currentTarget.style.boxShadow = 'none' }} />
            </div>
            <div style={{ gridColumn: '1 / -1' }}>
              <label style={fieldLabel}>E-mail *</label>
              <input type="email" value={form.email ?? ''} onChange={(e) => handleChange('email', e.target.value)}
                style={inputStyle} placeholder="contato@clinica.com.br"
                onFocus={(e) => { e.currentTarget.style.borderColor = D.primary; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(99,184,153,0.15)' }}
                onBlur={(e) => { e.currentTarget.style.borderColor = D.border; e.currentTarget.style.boxShadow = 'none' }} />
            </div>
            <div>
              <label style={fieldLabel}>Telefone</label>
              <input value={form.phone ?? ''} onChange={(e) => handleChange('phone', e.target.value)}
                style={inputStyle} placeholder="(11) 99999-9999"
                onFocus={(e) => { e.currentTarget.style.borderColor = D.primary; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(99,184,153,0.15)' }}
                onBlur={(e) => { e.currentTarget.style.borderColor = D.border; e.currentTarget.style.boxShadow = 'none' }} />
            </div>
            <div>
              <label style={fieldLabel}>Plano</label>
              <select value={form.planId ?? ''} onChange={(e) => handleChange('planId', e.target.value)}
                style={{ ...inputStyle, cursor: 'pointer' }}>
                <option value="">— sem plano —</option>
                {plans.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
            <div style={{ gridColumn: '1 / -1' }}>
              <label style={fieldLabel}>Endereço</label>
              <input value={form.address ?? ''} onChange={(e) => handleChange('address', e.target.value)}
                style={inputStyle} placeholder="Rua, número, bairro, cidade"
                onFocus={(e) => { e.currentTarget.style.borderColor = D.primary; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(99,184,153,0.15)' }}
                onBlur={(e) => { e.currentTarget.style.borderColor = D.border; e.currentTarget.style.boxShadow = 'none' }} />
            </div>
          </div>

          {/* Identidade Visual */}
          <div style={{ borderTop: `1px solid ${D.border}`, paddingTop: '18px', marginTop: '4px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <p style={{ margin: 0, fontSize: '10px', fontWeight: 700, color: D.textMuted, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              Identidade Visual
            </p>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {[
                { label: 'Primária',   color: colorPrimary,   set: setColorPrimary },
                { label: 'Secundária', color: colorSecondary, set: setColorSecondary },
                { label: 'Sidebar',    color: colorSidebar,   set: setColorSidebar },
              ].map(({ label, color, set }) => {
                const valid = /^#[0-9A-Fa-f]{6}$/.test(color)
                return (
                  <div key={label} style={{ position: 'relative' }}>
                    <div title={label} style={{
                      width: '32px', height: '32px', borderRadius: '8px',
                      background: valid ? color : D.border,
                      border: `2px solid rgba(255,255,255,0.12)`,
                      cursor: 'pointer',
                      boxShadow: valid ? `0 0 8px ${color}50` : 'none',
                    }} />
                    <input type="color" value={valid ? color : '#000000'}
                      onChange={(e) => set(e.target.value.toUpperCase())}
                      style={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer', width: '100%', height: '100%' }} />
                    <p style={{ margin: '3px 0 0', fontSize: '10px', color: D.textMuted, textAlign: 'center', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{label}</p>
                  </div>
                )
              })}
            </div>
            <ColorPickerField label="Cor Primária" hint="Botões e elementos de destaque" value={colorPrimary} onChange={setColorPrimary} />
            <ColorPickerField label="Cor Secundária" hint="Badges e rótulos de status" value={colorSecondary} onChange={setColorSecondary} />
            <ColorPickerField label="Cor da Sidebar" hint="Fundo da barra lateral de navegação" value={colorSidebar} onChange={setColorSidebar} />
          </div>

          <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
            <button type="button" onClick={onClose} disabled={loading} style={{
              flex: 1, height: '42px', borderRadius: '10px',
              border: `1.5px solid ${D.border}`, background: D.surfaceUp,
              color: D.textSec, fontSize: '14px', fontWeight: 600,
              cursor: loading ? 'not-allowed' : 'pointer', fontFamily: 'var(--font-sans)',
            }}>Cancelar</button>
            <button type="submit" disabled={loading} style={{
              flex: 1, height: '42px', borderRadius: '10px',
              border: 'none', background: D.primary,
              color: '#fff', fontSize: '14px', fontWeight: 600,
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.7 : 1, fontFamily: 'var(--font-sans)',
              boxShadow: '0 4px 14px rgba(99,184,153,0.35)',
            }}>{loading ? 'Salvando...' : 'Salvar alterações'}</button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── Copy Clinic URL Button ───────────────────────────────────────────────────

function CopyUrlButton({ slug }: { slug: string }) {
  const [copied, setCopied] = useState(false)

  function handleCopy() {
    const url = `${window.location.protocol}//${window.location.host}/app/${slug}/login`
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  return (
    <button onClick={handleCopy} title="Copiar URL de login da clínica" style={{
      display: 'inline-flex', alignItems: 'center', gap: '5px',
      padding: '5px 10px', borderRadius: '8px',
      background: copied ? D.greenBg : D.surfaceUp,
      color: copied ? D.green : D.textSec,
      border: copied ? `1px solid ${D.greenBorder}` : `1px solid ${D.border}`,
      fontSize: '12px', fontWeight: 600, cursor: 'pointer',
      fontFamily: 'var(--font-sans)', transition: 'all 0.15s', whiteSpace: 'nowrap',
    }}>
      {copied ? (
        <><svg width="12" height="12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
        </svg>Copiado!</>
      ) : (
        <><svg width="12" height="12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
        </svg>Copiar URL</>
      )}
    </button>
  )
}

// ─── Tenant Row ───────────────────────────────────────────────────────────────

function TenantRow({ tenant, onToggle, onEdit, onDelete, isToggling }: {
  tenant: Tenant; onToggle: (tenant: Tenant) => void
  onEdit: (tenant: Tenant) => void; onDelete: (tenant: Tenant) => void; isToggling: boolean
}) {
  return (
    <tr style={{ borderBottom: `1px solid ${D.border}`, transition: 'background 0.1s' }}
      onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = D.surfaceUp }}
      onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'transparent' }}>
      <td style={{ padding: '14px 16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <TenantAvatar name={tenant.name} logoUrl={tenant.logoUrl} size={36} />
          <div>
            <p style={{ margin: '0 0 3px', fontSize: '13px', fontWeight: 600, color: D.text }}>{tenant.name}</p>
            <p style={{ margin: 0, fontSize: '11.5px', color: D.textMuted, fontFamily: 'var(--font-mono, monospace)' }}>/{tenant.slug}</p>
          </div>
        </div>
      </td>
      <td style={{ padding: '14px 16px' }}>
        <p style={{ margin: '0 0 2px', fontSize: '13px', color: D.textSec }}>{tenant.email}</p>
        {tenant.phone && <p style={{ margin: 0, fontSize: '11.5px', color: D.textMuted }}>{tenant.phone}</p>}
      </td>
      <td style={{ padding: '14px 16px' }}>
        <span style={{
          display: 'inline-block', padding: '3px 10px', borderRadius: '6px',
          background: 'var(--admin-color-primary-light)', color: D.primary,
          fontSize: '11.5px', fontWeight: 700, letterSpacing: '0.04em',
        }}>
          {tenant.plan?.name ?? tenant.planType ?? '—'}
        </span>
      </td>
      <td style={{ padding: '14px 16px' }}>
        <span style={{
          display: 'inline-block', borderRadius: '20px', padding: '4px 10px',
          background: tenant.isActive ? D.greenBg : D.redBg,
          color: tenant.isActive ? D.green : D.red,
          border: `1px solid ${tenant.isActive ? D.greenBorder : D.redBorder}`,
          fontSize: '12px', fontWeight: 600,
        }}>
          {tenant.isActive ? 'Ativa' : 'Inativa'}
        </span>
      </td>
      <td style={{ padding: '14px 16px', fontSize: '13px', color: D.textMuted }}>
        {new Date(tenant.createdAt).toLocaleDateString('pt-BR')}
      </td>
      <td style={{ padding: '14px 16px' }}>
        <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
          <CopyUrlButton slug={tenant.slug} />
          <button onClick={() => onEdit(tenant)} title="Editar clínica" style={{
            display: 'inline-flex', alignItems: 'center', gap: '5px',
            padding: '5px 10px', borderRadius: '8px',
            background: D.surfaceUp, color: D.textSec,
            border: `1px solid ${D.border}`,
            fontSize: '12px', fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font-sans)',
          }}>
            <svg width="12" height="12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M15.232 5.232l3.536 3.536M9 11l6.586-6.586a2 2 0 112.828 2.828L11.828 13.828A2 2 0 0110 14H8v-2a2 2 0 01.586-1.414z" />
            </svg>
            Editar
          </button>
          <button onClick={() => onToggle(tenant)} disabled={isToggling} style={{
            padding: '5px 10px', borderRadius: '8px',
            background: tenant.isActive ? D.redBg : D.greenBg,
            color: tenant.isActive ? D.red : D.green,
            border: `1px solid ${tenant.isActive ? D.redBorder : D.greenBorder}`,
            fontSize: '12px', fontWeight: 600,
            cursor: isToggling ? 'not-allowed' : 'pointer',
            opacity: isToggling ? 0.7 : 1, fontFamily: 'var(--font-sans)',
          }}>
            {isToggling ? '...' : tenant.isActive ? 'Desativar' : 'Ativar'}
          </button>
          <button onClick={() => onDelete(tenant)} title="Excluir clínica" style={{
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            width: '30px', height: '30px', borderRadius: '8px',
            background: D.redBg, color: D.red,
            border: `1px solid ${D.redBorder}`,
            cursor: 'pointer', flexShrink: 0,
          }}>
            <svg width="13" height="13" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
      </td>
    </tr>
  )
}

// ─── Pagination ───────────────────────────────────────────────────────────────

function Pagination({ page, totalPages, onPageChange }: {
  page: number; totalPages: number; onPageChange: (p: number) => void
}) {
  if (totalPages <= 1) return null
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '14px 20px', borderTop: `1px solid ${D.border}`,
    }}>
      <span style={{ fontSize: '13px', color: D.textMuted }}>
        Página {page} de {totalPages}
      </span>
      <div style={{ display: 'flex', gap: '8px' }}>
        {[
          { label: '← Anterior', action: () => onPageChange(page - 1), disabled: page <= 1 },
          { label: 'Próxima →', action: () => onPageChange(page + 1), disabled: page >= totalPages },
        ].map(({ label, action, disabled }) => (
          <button key={label} onClick={action} disabled={disabled} style={{
            padding: '7px 14px', borderRadius: '8px', fontSize: '13px', fontWeight: 500,
            border: `1.5px solid ${D.border}`, background: D.surfaceUp, color: D.textSec,
            cursor: disabled ? 'not-allowed' : 'pointer',
            opacity: disabled ? 0.5 : 1, fontFamily: 'var(--font-sans)',
          }}>{label}</button>
        ))}
      </div>
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export function TenantsPage() {
  const queryClient = useQueryClient()
  const [search, setSearch]             = useState('')
  const [searchInput, setSearchInput]   = useState('')
  const [page, setPage]                 = useState(1)
  const [togglingId, setTogglingId]     = useState<string | null>(null)
  const [editTarget, setEditTarget]     = useState<Tenant | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Tenant | null>(null)

  const { data, isLoading, isError } = useQuery({
    queryKey: ['sa-tenants', { page, search }],
    queryFn: () => superAdminApi.listTenants({ page, limit: 10, search: search || undefined }),
  })

  const { data: plansData } = useQuery({
    queryKey: ['sa-plans-list'],
    queryFn:  () => superAdminApi.listPlans(),
    staleTime: 5 * 60 * 1000,
  })
  const plans = plansData ?? []

  const toggleMutation = useMutation({
    mutationFn: (tenant: Tenant) =>
      tenant.isActive ? superAdminApi.deactivateTenant(tenant.id) : superAdminApi.activateTenant(tenant.id),
    onMutate:   (tenant) => setTogglingId(tenant.id),
    onSettled:  () => { setTogglingId(null); void queryClient.invalidateQueries({ queryKey: ['sa-tenants'] }) },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateTenantPayload }) =>
      superAdminApi.updateTenant(id, payload),
    onSuccess: () => { setEditTarget(null); void queryClient.invalidateQueries({ queryKey: ['sa-tenants'] }) },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => superAdminApi.deleteTenant(id),
    onSuccess: () => { setDeleteTarget(null); void queryClient.invalidateQueries({ queryKey: ['sa-tenants'] }) },
  })

  function handleSearch(e: React.FormEvent) {
    e.preventDefault(); setSearch(searchInput); setPage(1)
  }

  const tenants    = data?.data ?? []
  const meta       = data?.meta
  const totalPages = meta?.totalPages ?? 1

  return (
    <div className="r-page" style={{ fontFamily: 'var(--font-sans)' }}>
      <style>{`@keyframes spin { to { transform: rotate(360deg) } } @keyframes fadeUp { from { opacity: 0; transform: translateY(10px) } to { opacity: 1; transform: translateY(0) } }`}</style>

      {/* Cabeçalho */}
      <div style={{
        display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
        marginBottom: '28px', animation: 'fadeUp 0.35s ease both',
      }}>
        <div>
          <h1 style={{
            margin: 0, fontSize: '26px', fontWeight: 400,
            fontFamily: 'var(--font-display)', fontStyle: 'italic',
            color: D.text, letterSpacing: '-0.02em',
          }}>
            Clínicas
          </h1>
          <p style={{ margin: '4px 0 0', fontSize: '13.5px', color: D.textMuted }}>
            {meta ? `${meta.total} clínica${meta.total !== 1 ? 's' : ''} cadastrada${meta.total !== 1 ? 's' : ''}` : ''}
          </p>
        </div>
        <Link to="/super-admin/tenants/new" style={{
          display: 'inline-flex', alignItems: 'center', gap: '6px',
          padding: '9px 18px', borderRadius: '10px',
          background: D.primary, color: '#fff',
          fontSize: '13.5px', fontWeight: 600, textDecoration: 'none',
          boxShadow: '0 4px 16px rgba(99,184,153,0.35)',
        }}>
          <svg width="15" height="15" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
          </svg>
          Nova Clínica
        </Link>
      </div>

      {/* Busca */}
      <form onSubmit={handleSearch} style={{
        display: 'flex', gap: '10px', marginBottom: '20px', alignItems: 'flex-end',
        padding: '16px', background: D.surface, borderRadius: '14px',
        border: `1px solid ${D.border}`,
      }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1, maxWidth: '320px' }}>
          <label style={{ fontSize: '11px', fontWeight: 600, color: D.textMuted, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            Buscar
          </label>
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
            <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24"
              style={{ position: 'absolute', left: '10px', color: D.textMuted, pointerEvents: 'none' }}>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text" placeholder="Nome, slug ou e-mail..."
              value={searchInput} onChange={(e) => setSearchInput(e.target.value)}
              style={{ ...inputStyle, paddingLeft: '36px' }}
              onFocus={(e) => { e.currentTarget.style.borderColor = D.primary; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(99,184,153,0.15)' }}
              onBlur={(e) => { e.currentTarget.style.borderColor = D.border; e.currentTarget.style.boxShadow = 'none' }}
            />
          </div>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button type="submit" style={{
            padding: '8px 16px', borderRadius: '10px', fontSize: '13.5px', fontWeight: 600,
            border: 'none', background: D.primary, color: '#fff',
            cursor: 'pointer', fontFamily: 'var(--font-sans)',
          }}>Buscar</button>
          {search && (
            <button type="button" onClick={() => { setSearch(''); setSearchInput(''); setPage(1) }} style={{
              padding: '8px 14px', borderRadius: '10px', fontSize: '13.5px', fontWeight: 600,
              border: `1.5px solid ${D.border}`, background: D.surfaceUp, color: D.textSec,
              cursor: 'pointer', fontFamily: 'var(--font-sans)',
            }}>Limpar</button>
          )}
        </div>
      </form>

      {/* Tabela */}
      <div style={{
        background: D.surface, borderRadius: '16px',
        border: `1px solid ${D.border}`,
        boxShadow: '0 4px 16px rgba(0,0,0,0.25)',
        overflow: 'hidden',
      }}>
        {isLoading ? (
          <div style={{ padding: '60px 32px', textAlign: 'center', color: D.textMuted }}>
            <div style={{
              width: '32px', height: '32px',
              border: `2px solid ${D.border}`, borderTopColor: D.primary,
              borderRadius: '50%', animation: 'spin 0.8s linear infinite',
              margin: '0 auto 12px',
            }} />
            <p style={{ fontSize: '13px', margin: 0 }}>Carregando clínicas...</p>
          </div>
        ) : isError ? (
          <div style={{ padding: '60px 32px', textAlign: 'center', color: D.red, fontSize: '14px' }}>
            Erro ao carregar clínicas. Tente novamente.
          </div>
        ) : tenants.length === 0 ? (
          <div style={{ padding: '72px 32px', textAlign: 'center' }}>
            <svg width="40" height="40" fill="none" stroke={D.border} viewBox="0 0 24 24"
              style={{ margin: '0 auto 12px', display: 'block' }}>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16M3 21h18" />
            </svg>
            <p style={{ margin: '0 0 4px', fontSize: '14px', color: D.textMuted, fontWeight: 600 }}>
              {search ? 'Nenhuma clínica encontrada' : 'Ainda não há clínicas cadastradas'}
            </p>
            <p style={{ margin: '4px 0 0', fontSize: '13px', color: D.textMuted, opacity: 0.5 }}>
              {search ? 'Tente outro termo de busca.' : 'Cadastre a primeira clínica para começar.'}
            </p>
          </div>
        ) : (
          <>
            <div className="r-table-wrap">
              <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '700px' }}>
                <thead>
                  <tr style={{ background: D.surfaceUp, borderBottom: `1px solid ${D.border}` }}>
                    {['Nome', 'Contato', 'Plano', 'Status', 'Criada em', ''].map((h) => (
                      <th key={h} style={{
                        padding: '11px 16px', textAlign: 'left',
                        fontSize: '11px', fontWeight: 700,
                        color: D.textMuted, textTransform: 'uppercase', letterSpacing: '0.07em',
                      }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {tenants.map((tenant) => (
                    <TenantRow key={tenant.id} tenant={tenant}
                      onToggle={(t) => toggleMutation.mutate(t)}
                      onEdit={setEditTarget} onDelete={setDeleteTarget}
                      isToggling={togglingId === tenant.id} />
                  ))}
                </tbody>
              </table>
            </div>
            <Pagination page={meta?.page ?? 1} totalPages={totalPages} onPageChange={setPage} />
          </>
        )}
      </div>

      {editTarget && (
        <EditTenantModal tenant={editTarget} onClose={() => setEditTarget(null)}
          loading={updateMutation.isPending}
          onSave={(payload) => updateMutation.mutate({ id: editTarget.id, payload })}
          plans={plans} />
      )}

      {deleteTarget && (
        <DeleteConfirmModal tenant={deleteTarget} onClose={() => setDeleteTarget(null)}
          loading={deleteMutation.isPending}
          onConfirm={() => deleteMutation.mutate(deleteTarget.id)} />
      )}
    </div>
  )
}
