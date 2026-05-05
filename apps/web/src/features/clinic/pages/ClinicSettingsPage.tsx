// ─── Clinic Settings Page (Identidade Visual) ─────────────────────────────────
//
// Permite que o GESTOR atualize logo, banner e cores da clínica.
// Rota: /app/:slug/configuracoes/identidade-visual
//
// Fluxo:
//   1. Carrega configurações atuais via GET /t/:slug/clinic/settings
//   2. Upload de logo/banner via POST /t/:slug/upload/logo (banner)
//   3. Salva cores + URLs via PATCH /t/:slug/clinic/settings
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useEffect, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { clinicBrandingApi } from '@/lib/api/clinic.api'
import { BASE_URL } from '@/lib/api/client'

// ─── Helpers ─────────────────────────────────────────────────────────────────

function resolveUrl(url: string | null | undefined): string | null {
  if (!url) return null
  return url.startsWith('http') ? url : `${BASE_URL}${url}`
}

function isValidHex(v: string) {
  return /^#[0-9A-Fa-f]{6}$/.test(v)
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const card: React.CSSProperties = {
  background: '#fff',
  borderRadius: 14,
  border: '1px solid #eaecef',
  padding: '24px',
  boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
}

const sectionTitle: React.CSSProperties = {
  fontSize: 13,
  fontWeight: 700,
  color: '#1a2530',
  marginBottom: 4,
  letterSpacing: '-0.01em',
}

const sectionSubtitle: React.CSSProperties = {
  fontSize: 12,
  color: '#8a99a6',
  marginBottom: 20,
}

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: 11,
  fontWeight: 700,
  letterSpacing: '0.07em',
  textTransform: 'uppercase',
  color: '#6b7c88',
  marginBottom: 6,
}

// ─── ImageUploadField ─────────────────────────────────────────────────────────

function ImageUploadField({
  label,
  description,
  currentUrl,
  onUpload,
  onClear,
  uploading,
  accept,
  aspectHint,
}: {
  label: string
  description: string
  currentUrl: string | null
  onUpload: (file: File) => void
  onClear: () => void
  uploading: boolean
  accept?: string
  aspectHint?: string
}) {
  const fileRef = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) onUpload(file)
  }

  return (
    <div>
      <label style={labelStyle}>{label}</label>
      <p style={{ fontSize: 12, color: '#8a99a6', margin: '0 0 12px' }}>{description}</p>

      {/* Preview ou drop zone */}
      {currentUrl ? (
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16 }}>
          <div style={{
            width: label.toLowerCase().includes('banner') ? '100%' : 80,
            height: label.toLowerCase().includes('banner') ? 100 : 80,
            borderRadius: 10,
            border: '1px solid #eaecef',
            overflow: 'hidden',
            background: '#f8fafc',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0,
          }}>
            <img
              src={currentUrl}
              alt={label}
              style={{
                width: '100%',
                height: '100%',
                objectFit: label.toLowerCase().includes('banner') ? 'cover' : 'contain',
              }}
            />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <button
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              style={{
                padding: '7px 14px', borderRadius: 8,
                border: '1px solid #e2e8ed', background: '#fff',
                fontSize: 12, fontWeight: 600, cursor: 'pointer',
                color: '#1a2530', fontFamily: 'var(--font-sans)',
              }}
            >
              {uploading ? 'Enviando...' : 'Trocar imagem'}
            </button>
            <button
              onClick={onClear}
              style={{
                padding: '7px 14px', borderRadius: 8,
                border: '1px solid #fecaca', background: '#fff5f5',
                fontSize: 12, fontWeight: 600, cursor: 'pointer',
                color: '#b91c1c', fontFamily: 'var(--font-sans)',
              }}
            >
              Remover
            </button>
          </div>
        </div>
      ) : (
        <div
          onClick={() => fileRef.current?.click()}
          onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
          style={{
            border: `2px dashed ${dragging ? 'var(--color-primary)' : '#d0d7de'}`,
            borderRadius: 12,
            padding: '28px 20px',
            textAlign: 'center',
            cursor: uploading ? 'wait' : 'pointer',
            background: dragging ? 'color-mix(in srgb, var(--color-primary) 5%, white)' : '#fafbfc',
            transition: 'all 0.15s',
          }}
        >
          {uploading ? (
            <p style={{ fontSize: 13, color: '#8a99a6', margin: 0 }}>Enviando...</p>
          ) : (
            <>
              <svg width="32" height="32" fill="none" stroke="#b0bbc6" viewBox="0 0 24 24" style={{ margin: '0 auto 8px', display: 'block' }}>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                  d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <p style={{ fontSize: 13, color: '#5a6b78', margin: '0 0 4px', fontWeight: 600 }}>
                Arraste uma imagem ou clique para selecionar
              </p>
              {aspectHint && (
                <p style={{ fontSize: 11, color: '#b0bbc6', margin: 0 }}>{aspectHint}</p>
              )}
            </>
          )}
        </div>
      )}

      <input
        ref={fileRef}
        type="file"
        accept={accept ?? 'image/png,image/jpeg,image/webp,image/gif'}
        style={{ display: 'none' }}
        onChange={(e) => {
          const file = e.target.files?.[0]
          if (file) onUpload(file)
          e.target.value = ''
        }}
      />
    </div>
  )
}

// ─── ColorField ───────────────────────────────────────────────────────────────

function ColorField({
  label,
  description,
  value,
  onChange,
}: {
  label: string
  description: string
  value: string
  onChange: (v: string) => void
}) {
  const valid = isValidHex(value)

  return (
    <div>
      <label style={labelStyle}>{label}</label>
      <p style={{ fontSize: 12, color: '#8a99a6', margin: '0 0 10px' }}>{description}</p>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        {/* Swatch clicável */}
        <div style={{ position: 'relative' }}>
          <div
            style={{
              width: 40, height: 40, borderRadius: 10,
              background: valid ? value : '#eaecef',
              border: '2px solid #e2e8ed',
              cursor: 'pointer',
              boxShadow: valid ? `0 2px 8px ${value}50` : 'none',
            }}
          />
          <input
            type="color"
            value={valid ? value : '#63b899'}
            onChange={(e) => onChange(e.target.value)}
            style={{
              position: 'absolute', inset: 0,
              opacity: 0, cursor: 'pointer', width: '100%', height: '100%',
            }}
          />
        </div>
        {/* Input hex */}
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value.startsWith('#') ? e.target.value : `#${e.target.value}`)}
          placeholder="#RRGGBB"
          maxLength={7}
          style={{
            padding: '9px 12px',
            borderRadius: 8,
            border: `1.5px solid ${valid ? '#e2e8ed' : '#fca5a5'}`,
            fontSize: 13,
            fontFamily: 'var(--font-sans)',
            color: '#1a2530',
            outline: 'none',
            width: 120,
            background: '#fafbfc',
          }}
        />
        {!valid && value && (
          <p style={{ fontSize: 11, color: '#ef4444', margin: 0 }}>Formato inválido</p>
        )}
      </div>
    </div>
  )
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export function ClinicSettingsPage() {
  const qc = useQueryClient()

  // ── State local para edição ──────────────────────────────────────────────────
  const [logoUrl, setLogoUrl]             = useState<string | null>(null)
  const [bannerUrl, setBannerUrl]         = useState<string | null>(null)
  const [colorPrimary, setColorPrimary]   = useState('#63b899')
  const [colorSecondary, setColorSecondary] = useState('#3ba8d8')
  const [colorSidebar, setColorSidebar]   = useState('#1a2530')
  const [dirty, setDirty]                 = useState(false)
  const [saveOk, setSaveOk]               = useState(false)
  const [saveError, setSaveError]         = useState<string | null>(null)
  const [uploadingLogo, setUploadingLogo] = useState(false)
  const [uploadingBanner, setUploadingBanner] = useState(false)

  // ── Query ─────────────────────────────────────────────────────────────────────
  const { data: settings, isLoading } = useQuery({
    queryKey: ['clinic-branding-settings'],
    queryFn: clinicBrandingApi.getSettings,
  })

  useEffect(() => {
    if (settings) {
      setLogoUrl(settings.logoUrl)
      setBannerUrl(settings.bannerUrl)
      setColorPrimary(settings.colorPrimary  ?? '#63b899')
      setColorSecondary(settings.colorSecondary ?? '#3ba8d8')
      setColorSidebar(settings.colorSidebar  ?? '#1a2530')
      setDirty(false)
    }
  }, [settings])

  // ── Mutation ─────────────────────────────────────────────────────────────────
  const saveMutation = useMutation({
    mutationFn: () => clinicBrandingApi.updateSettings({
      logoUrl,
      bannerUrl,
      colorPrimary:   isValidHex(colorPrimary)   ? colorPrimary   : null,
      colorSecondary: isValidHex(colorSecondary) ? colorSecondary : null,
      colorSidebar:   isValidHex(colorSidebar)   ? colorSidebar   : null,
    }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['clinic-branding-settings'] })
      setDirty(false)
      setSaveOk(true)
      setSaveError(null)
      setTimeout(() => setSaveOk(false), 3000)
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
      setSaveError(msg ?? 'Erro ao salvar.')
    },
  })

  // ── Upload handlers ───────────────────────────────────────────────────────────
  async function handleUploadLogo(file: File) {
    setUploadingLogo(true)
    try {
      const url = await clinicBrandingApi.uploadLogo(file)
      setLogoUrl(url)
      setDirty(true)
    } catch {
      setSaveError('Erro ao enviar logo.')
    } finally {
      setUploadingLogo(false)
    }
  }

  async function handleUploadBanner(file: File) {
    setUploadingBanner(true)
    try {
      const url = await clinicBrandingApi.uploadBanner(file)
      setBannerUrl(url)
      setDirty(true)
    } catch {
      setSaveError('Erro ao enviar banner.')
    } finally {
      setUploadingBanner(false)
    }
  }

  function markDirty() { setDirty(true); setSaveOk(false) }

  // ── Render ────────────────────────────────────────────────────────────────────

  if (isLoading) {
    return (
      <div style={{ padding: 40, display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 300 }}>
        <div style={{
          width: 28, height: 28, borderRadius: '50%',
          border: '2px solid #eaecef',
          borderTopColor: 'var(--color-primary)',
          animation: 'spin 0.8s linear infinite',
        }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
      </div>
    )
  }

  return (
    <div style={{
      padding: '32px 40px',
      fontFamily: 'var(--font-sans)',
      maxWidth: 760,
      animation: 'fadeUp 0.3s ease both',
    }}>
      <style>{`
        @keyframes fadeUp { from { opacity: 0; transform: translateY(8px) } to { opacity: 1; transform: translateY(0) } }
        @keyframes spin   { to { transform: rotate(360deg) } }
      `}</style>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28 }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 800, color: '#1a2530', margin: '0 0 4px', letterSpacing: '-0.02em' }}>
            Identidade Visual
          </h1>
          <p style={{ fontSize: 13, color: '#8a99a6', margin: 0 }}>
            Logo, banner e cores da sua clínica — aparecem nas telas de login e no portal do paciente.
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {saveOk && (
            <span style={{ fontSize: 12, color: '#16a34a', fontWeight: 600 }}>✓ Salvo!</span>
          )}
          {saveError && (
            <span style={{ fontSize: 12, color: '#ef4444' }}>{saveError}</span>
          )}
          <button
            onClick={() => saveMutation.mutate()}
            disabled={!dirty || saveMutation.isPending}
            style={{
              padding: '9px 20px', borderRadius: 10, border: 'none',
              background: dirty ? 'var(--color-primary)' : '#eaecef',
              color: dirty ? '#fff' : '#8a99a6',
              fontSize: 13, fontWeight: 700, cursor: dirty ? 'pointer' : 'not-allowed',
              fontFamily: 'var(--font-sans)',
              transition: 'all 0.15s',
              boxShadow: dirty ? '0 4px 12px color-mix(in srgb, var(--color-primary) 35%, transparent)' : 'none',
            }}
          >
            {saveMutation.isPending ? 'Salvando...' : 'Salvar alterações'}
          </button>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

        {/* ── Logo ─────────────────────────────────────────────────────────── */}
        <div style={card}>
          <p style={sectionTitle}>Logo da clínica</p>
          <p style={sectionSubtitle}>Aparece na tela de login, no header do portal do paciente e na página de agendamento.</p>
          <ImageUploadField
            label="Logo"
            description="PNG, JPG, WebP ou SVG. Recomendado: 200×200 px ou maior, fundo transparente."
            currentUrl={resolveUrl(logoUrl)}
            onUpload={handleUploadLogo}
            onClear={() => { setLogoUrl(null); markDirty() }}
            uploading={uploadingLogo}
            accept="image/png,image/jpeg,image/webp,image/svg+xml,image/gif"
            aspectHint="Recomendado: quadrado (1:1) ou logo horizontal"
          />
        </div>

        {/* ── Banner ───────────────────────────────────────────────────────── */}
        <div style={card}>
          <p style={sectionTitle}>Banner de login</p>
          <p style={sectionSubtitle}>Imagem de fundo exibida na tela de login da clínica. Quando não cadastrado, exibe fundo padrão.</p>
          <ImageUploadField
            label="Banner"
            description="PNG, JPG ou WebP. Recomendado: 1920×1080 px (16:9) ou maior."
            currentUrl={resolveUrl(bannerUrl)}
            onUpload={handleUploadBanner}
            onClear={() => { setBannerUrl(null); markDirty() }}
            uploading={uploadingBanner}
            accept="image/png,image/jpeg,image/webp,image/gif"
            aspectHint="Recomendado: 1920×1080 px, horizontal"
          />
        </div>

        {/* ── Cores ────────────────────────────────────────────────────────── */}
        <div style={card}>
          <p style={sectionTitle}>Cores da clínica</p>
          <p style={sectionSubtitle}>Personalize os botões, destaques e a barra lateral do painel.</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 24 }}>
            <ColorField
              label="Cor primária"
              description="Botões, links e destaques."
              value={colorPrimary}
              onChange={(v) => { setColorPrimary(v); markDirty() }}
            />
            <ColorField
              label="Cor secundária"
              description="Badges e elementos de apoio."
              value={colorSecondary}
              onChange={(v) => { setColorSecondary(v); markDirty() }}
            />
            <ColorField
              label="Cor da sidebar"
              description="Fundo da barra lateral do painel."
              value={colorSidebar}
              onChange={(v) => { setColorSidebar(v); markDirty() }}
            />
          </div>

          {/* Preview das cores */}
          <div style={{ marginTop: 20, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            {[
              { label: 'Primária', value: colorPrimary },
              { label: 'Secundária', value: colorSecondary },
              { label: 'Sidebar', value: colorSidebar },
            ].map(({ label, value }) => (
              <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{
                  width: 24, height: 24, borderRadius: 6,
                  background: isValidHex(value) ? value : '#eaecef',
                  border: '1px solid rgba(0,0,0,0.1)',
                  boxShadow: isValidHex(value) ? `0 2px 6px ${value}40` : 'none',
                }} />
                <span style={{ fontSize: 11, color: '#8a99a6' }}>{label}</span>
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* Sticky save bar */}
      {dirty && (
        <div style={{
          position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)',
          background: '#fff',
          border: '1px solid #eaecef',
          borderRadius: 12, padding: '12px 20px',
          display: 'flex', alignItems: 'center', gap: 16,
          boxShadow: '0 8px 32px rgba(0,0,0,0.12)', zIndex: 100,
        }}>
          <span style={{ fontSize: 13, color: '#5a6b78' }}>Você tem alterações não salvas.</span>
          <button
            onClick={() => {
              if (settings) {
                setLogoUrl(settings.logoUrl)
                setBannerUrl(settings.bannerUrl)
                setColorPrimary(settings.colorPrimary ?? '#63b899')
                setColorSecondary(settings.colorSecondary ?? '#3ba8d8')
                setColorSidebar(settings.colorSidebar ?? '#1a2530')
                setDirty(false)
              }
            }}
            style={{
              fontSize: 12, padding: '6px 14px', borderRadius: 8,
              border: '1px solid #eaecef', background: 'transparent',
              color: '#8a99a6', cursor: 'pointer', fontFamily: 'var(--font-sans)',
            }}
          >
            Descartar
          </button>
          <button
            onClick={() => saveMutation.mutate()}
            disabled={saveMutation.isPending}
            style={{
              fontSize: 13, padding: '7px 18px', borderRadius: 8, border: 'none',
              background: 'var(--color-primary)', color: '#fff', fontWeight: 700,
              cursor: 'pointer', fontFamily: 'var(--font-sans)',
              boxShadow: '0 4px 12px color-mix(in srgb, var(--color-primary) 35%, transparent)',
            }}
          >
            {saveMutation.isPending ? 'Salvando...' : 'Salvar agora'}
          </button>
        </div>
      )}
    </div>
  )
}
