// ─── Edit Professional Page ───────────────────────────────────────────────────

import { useState, useEffect, useRef } from 'react'
import { useNavigate, useParams } from '@tanstack/react-router'
import { useForm } from 'react-hook-form'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { professionalsApi, proceduresApi } from '@/lib/api/clinic.api'
import { clinicTokens } from '@/lib/api/client'

// ─── Constants ────────────────────────────────────────────────────────────────

const PRESET_COLORS = [
  '#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b',
  '#10b981', '#ef4444', '#06b6d4', '#84cc16',
]

const schema = z.object({
  name:      z.string().min(2, 'Nome obrigatório'),
  specialty: z.string().optional(),
  bio:       z.string().optional(),
})

type FormData = z.infer<typeof schema>

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

export function EditProfessionalPage() {
  const navigate = useNavigate()
  const qc       = useQueryClient()
  const params   = useParams({ strict: false }) as { slug?: string; id?: string }
  const slug     = params.slug ?? clinicTokens.getSlug() ?? ''
  const id       = params.id ?? ''

  const [serverError,     setServerError]     = useState<string | null>(null)
  const [selectedColor,   setSelectedColor]   = useState(PRESET_COLORS[0]!)
  const [selectedProcIds, setSelectedProcIds] = useState<string[]>([])

  // ── Avatar upload ─────────────────────────────────────────────
  const [avatarPreview,   setAvatarPreview]   = useState<string | null>(null)
  const [avatarUrl,       setAvatarUrl]       = useState<string | null>(null)
  const [avatarUploading, setAvatarUploading] = useState(false)
  const [avatarError,     setAvatarError]     = useState<string | null>(null)
  const avatarInputRef = useRef<HTMLInputElement>(null)

  const { data: prof, isLoading } = useQuery({
    queryKey: ['professional', id],
    queryFn:  () => professionalsApi.get(id),
    enabled:  !!id,
  })

  const { data: allProcedures } = useQuery({
    queryKey: ['procedures-active'],
    queryFn:  () => proceduresApi.list({ limit: 100, isActive: true }),
  })

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
  })

  useEffect(() => {
    if (prof) {
      reset({ name: prof.name, specialty: prof.specialty ?? '', bio: prof.bio ?? '' })
      setSelectedColor(prof.color ?? PRESET_COLORS[0]!)
      setSelectedProcIds((prof.procedures ?? []).map((p) => p.id))
      if (prof.avatarUrl) {
        const base = import.meta.env.VITE_API_URL as string ?? ''
        setAvatarPreview(`${base}${prof.avatarUrl}`)
        setAvatarUrl(prof.avatarUrl)
      }
    }
  }, [prof, reset])

  async function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    if (file.size > 5 * 1024 * 1024) {
      setAvatarError('Arquivo muito grande. Máximo 5 MB.')
      return
    }
    const allowed = ['image/png', 'image/jpeg', 'image/webp', 'image/gif']
    if (!allowed.includes(file.type)) {
      setAvatarError('Formato não suportado. Use PNG, JPG, WebP ou GIF.')
      return
    }

    setAvatarError(null)
    setAvatarPreview(URL.createObjectURL(file))
    setAvatarUploading(true)
    try {
      const result = await professionalsApi.uploadAvatar(file)
      setAvatarUrl(result.url)
    } catch {
      setAvatarError('Falha no upload. Tente novamente.')
      setAvatarPreview(null)
    } finally {
      setAvatarUploading(false)
    }
  }

  function handleRemoveAvatar() {
    setAvatarPreview(null)
    setAvatarUrl(null)
    setAvatarError(null)
    if (avatarInputRef.current) avatarInputRef.current.value = ''
  }

  function toggleProc(procId: string) {
    setSelectedProcIds((prev) =>
      prev.includes(procId) ? prev.filter((x) => x !== procId) : [...prev, procId]
    )
  }

  async function onSubmit(values: FormData) {
    setServerError(null)
    try {
      await professionalsApi.update(id, {
        name:      values.name,
        specialty: values.specialty || undefined,
        bio:       values.bio       || undefined,
        color:     selectedColor,
        avatarUrl: avatarUrl ?? null,
      })
      // Sincroniza procedimentos (substitui todos os vínculos)
      await professionalsApi.linkProcedures(id, selectedProcIds)
      await qc.invalidateQueries({ queryKey: ['professionals'] })
      await qc.invalidateQueries({ queryKey: ['professional', id] })
      void navigate({ to: '/app/$slug/$section', params: { slug, section: 'professionals' } })
    } catch {
      setServerError('Erro ao salvar. Tente novamente.')
    }
  }

  if (isLoading) {
    return (
      <div style={{ padding: '48px', textAlign: 'center', color: '#94a3b8', fontFamily: 'var(--font-sans)' }}>
        <div style={{
          width: '32px', height: '32px', borderRadius: '50%',
          border: '2px solid #eaecef', borderTopColor: 'var(--color-primary)',
          animation: 'spin 0.8s linear infinite', margin: '0 auto 12px',
        }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
        Carregando...
      </div>
    )
  }

  return (
    <div className="r-page" style={{ maxWidth: '680px', fontFamily: 'var(--font-sans)' }}>
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>

      {/* ── Header ────────────────────────────────────────────────────── */}
      <div style={{ marginBottom: '28px' }}>
        <button
          onClick={() => void navigate({ to: '/app/$slug/$section', params: { slug, section: 'professionals' } })}
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
          Voltar para profissionais
        </button>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <h1 style={{
              margin: 0, fontSize: '26px', fontWeight: 400,
              fontFamily: 'var(--font-display)', fontStyle: 'italic',
              color: '#1a2530', letterSpacing: '-0.02em',
            }}>
              Editar profissional
            </h1>
            <p style={{ margin: '4px 0 0', fontSize: '13.5px', color: '#64748b' }}>
              {prof?.name}
            </p>
          </div>

          {/* Botão de acesso à agenda do profissional */}
          <a
            href={`/app/${slug}/professionals/${id}/schedule`}
            onClick={(e) => {
              e.preventDefault()
              void navigate({ to: '/app/$slug/professionals/$id/schedule', params: { slug, id } })
            }}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: '7px',
              padding: '9px 16px', borderRadius: '10px',
              border: '1.5px solid #e2e8f0', background: '#fff',
              color: '#374151', fontSize: '13px', fontWeight: 600,
              textDecoration: 'none', cursor: 'pointer',
              fontFamily: 'var(--font-sans)',
            }}
          >
            <svg width="15" height="15" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            Horários de trabalho
          </a>
        </div>
      </div>

      {/* ── Card ──────────────────────────────────────────────────────── */}
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

          {/* ── Foto do profissional ──────────────────────────────── */}
          <div>
            <label style={labelStyle}>Foto do profissional (opcional)</label>

            {avatarPreview ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <div style={{
                  width: '72px', height: '72px', borderRadius: '50%',
                  border: '2px solid #e2e8f0', overflow: 'hidden',
                  background: '#f8fafc', flexShrink: 0,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <img
                    src={avatarPreview}
                    alt="Preview do avatar"
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                </div>
                <div style={{ flex: 1 }}>
                  {avatarUploading ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#64748b' }}>
                      <div style={{ width: '14px', height: '14px', border: '2px solid #e2e8f0', borderTopColor: 'var(--color-primary)', borderRadius: '50%', animation: 'spin 0.8s linear infinite', flexShrink: 0 }} />
                      Enviando...
                    </div>
                  ) : avatarUrl ? (
                    <p style={{ margin: '0 0 6px', fontSize: '12.5px', color: '#16a34a', fontWeight: 600 }}>
                      ✓ Upload concluído
                    </p>
                  ) : null}
                  {avatarError && (
                    <p style={{ margin: '0 0 6px', fontSize: '12px', color: '#dc2626' }}>{avatarError}</p>
                  )}
                  <button
                    type="button"
                    onClick={handleRemoveAvatar}
                    style={{
                      background: 'none', border: 'none', cursor: 'pointer',
                      fontSize: '12px', color: '#94a3b8', padding: 0,
                      fontFamily: 'var(--font-sans)',
                    }}
                  >
                    ✕ Remover foto
                  </button>
                </div>
              </div>
            ) : (
              <label
                htmlFor="avatar-upload"
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  gap: '10px', height: '72px',
                  border: '1.5px dashed #cbd5e1', borderRadius: '12px',
                  background: '#f8fafc', cursor: 'pointer',
                  transition: 'border-color 0.15s, background 0.15s',
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLElement).style.borderColor = 'var(--color-primary)'
                  ;(e.currentTarget as HTMLElement).style.background = 'color-mix(in srgb, var(--color-primary) 5%, white)'
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLElement).style.borderColor = '#cbd5e1'
                  ;(e.currentTarget as HTMLElement).style.background = '#f8fafc'
                }}
              >
                <svg width="20" height="20" fill="none" stroke="#94a3b8" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                    d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                <div>
                  <p style={{ margin: 0, fontSize: '13px', fontWeight: 600, color: '#64748b' }}>
                    Clique para fazer upload
                  </p>
                  <p style={{ margin: '2px 0 0', fontSize: '11px', color: '#94a3b8' }}>
                    PNG, JPG, WebP ou GIF · máx. 5 MB
                  </p>
                </div>
              </label>
            )}

            <input
              ref={avatarInputRef}
              id="avatar-upload"
              type="file"
              accept="image/png,image/jpeg,image/webp,image/gif"
              onChange={handleAvatarChange}
              style={{ display: 'none' }}
            />

            {avatarError && !avatarPreview && (
              <p style={{ margin: '6px 0 0', fontSize: '12px', color: '#dc2626' }}>{avatarError}</p>
            )}
          </div>

          {/* Divisor */}
          <div style={{ borderTop: '1px solid #f0f2f5' }} />

          {/* Nome */}
          <div>
            <label style={labelStyle}>Nome completo *</label>
            <input
              placeholder="Dra. Ana Lima"
              {...register('name')}
              style={inputStyle}
            />
            {errors.name && (
              <p style={{ margin: '4px 0 0', fontSize: '12px', color: '#dc2626' }}>
                {errors.name.message}
              </p>
            )}
          </div>

          {/* Especialidade */}
          <div>
            <label style={labelStyle}>Especialidade (opcional)</label>
            <input
              placeholder="Fisioterapia, Nutrição..."
              {...register('specialty')}
              style={inputStyle}
            />
          </div>

          {/* Biografia */}
          <div>
            <label style={labelStyle}>Biografia (opcional)</label>
            <textarea
              rows={3}
              placeholder="Breve apresentação do profissional..."
              {...register('bio')}
              style={{
                ...inputStyle, height: 'auto',
                padding: '12px 14px', resize: 'vertical',
              }}
            />
          </div>

          {/* Divisor */}
          <div style={{ borderTop: '1px solid #f0f2f5', paddingTop: '4px' }} />

          {/* Procedimentos vinculados */}
          <div>
            <label style={labelStyle}>Procedimentos realizados</label>
            <p style={{ margin: '0 0 12px', fontSize: '13px', color: '#64748b' }}>
              Selecione os procedimentos que este profissional realiza.
            </p>
            {!allProcedures || allProcedures.data.length === 0 ? (
              <p style={{ fontSize: '13px', color: '#94a3b8', fontStyle: 'italic' }}>
                Nenhum procedimento cadastrado ainda.{' '}
                <a
                  href={`/app/${slug}/configuracoes/procedimentos/new`}
                  style={{ color: 'var(--color-primary)', textDecoration: 'none', fontStyle: 'normal' }}
                >
                  Cadastrar procedimento →
                </a>
              </p>
            ) : (
              <div style={{
                display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
                gap: '8px',
              }}>
                {allProcedures.data.map((proc) => {
                  const checked = selectedProcIds.includes(proc.id)
                  return (
                    <label
                      key={proc.id}
                      onClick={() => toggleProc(proc.id)}
                      style={{
                        display: 'flex', alignItems: 'center', gap: '10px',
                        padding: '10px 12px', borderRadius: '10px', cursor: 'pointer',
                        border: checked ? '1.5px solid var(--color-primary)' : '1.5px solid #e2e8f0',
                        background: checked ? 'color-mix(in srgb, var(--color-primary) 6%, white)' : '#fff',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      <div style={{
                        width: '16px', height: '16px', borderRadius: '4px', flexShrink: 0,
                        border: checked ? 'none' : '1.5px solid #d1d5db',
                        background: checked ? 'var(--color-primary)' : '#fff',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}>
                        {checked && (
                          <svg width="10" height="10" fill="none" stroke="#fff" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          {proc.color && (
                            <span style={{
                              width: '8px', height: '8px', borderRadius: '50%',
                              background: proc.color, flexShrink: 0,
                            }} />
                          )}
                          <span style={{ fontSize: '13px', fontWeight: 600, color: '#1a2530', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {proc.name}
                          </span>
                        </div>
                        <span style={{ fontSize: '11px', color: '#94a3b8' }}>
                          {proc.durationMinutes} min
                          {proc.priceCents != null && ` · ${(proc.priceCents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}`}
                        </span>
                      </div>
                    </label>
                  )
                })}
              </div>
            )}
          </div>

          {/* Divisor */}
          <div style={{ borderTop: '1px solid #f0f2f5', paddingTop: '4px' }} />

          {/* Cor de identificação */}
          <div>
            <label style={labelStyle}>Cor de identificação</label>
            <p style={{ margin: '0 0 14px', fontSize: '13px', color: '#64748b' }}>
              Usada para identificar o profissional no calendário de agendamentos.
            </p>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
              {PRESET_COLORS.map((color) => (
                <button
                  key={color}
                  type="button"
                  onClick={() => setSelectedColor(color)}
                  style={{
                    width: '34px', height: '34px', borderRadius: '50%',
                    background: color, border: 'none', cursor: 'pointer',
                    transform: selectedColor === color ? 'scale(1.25)' : 'scale(1)',
                    outline: selectedColor === color ? `3px solid ${color}` : 'none',
                    outlineOffset: '2px',
                    transition: 'transform 0.15s ease',
                    flexShrink: 0,
                  }}
                />
              ))}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginLeft: '4px' }}>
                <span style={{ fontSize: '13px', color: '#94a3b8' }}>Personalizada:</span>
                <input
                  type="color"
                  value={selectedColor}
                  onChange={(e) => setSelectedColor(e.target.value)}
                  style={{
                    width: '34px', height: '34px', borderRadius: '6px',
                    border: '1.5px solid #e2e8f0', cursor: 'pointer', padding: '2px',
                  }}
                />
              </div>
            </div>
          </div>

          {/* Botões */}
          <div className="r-btn-row" style={{ paddingTop: '4px' }}>
            <button
              type="button"
              onClick={() => void navigate({ to: '/app/$slug/$section', params: { slug, section: 'professionals' } })}
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
              {isSubmitting ? 'Salvando...' : 'Salvar alterações'}
            </button>
          </div>
        </div>
      </form>
    </div>
  )
}
