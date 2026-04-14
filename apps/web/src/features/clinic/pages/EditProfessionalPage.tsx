// ─── EditProfessionalPage ─────────────────────────────────────────────────────

import { useState, useEffect } from 'react'
import { useNavigate, useParams, Link } from '@tanstack/react-router'
import { useForm } from 'react-hook-form'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { professionalsApi } from '@/lib/api/clinic.api'
import { clinicTokens } from '@/lib/api/client'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { Card, CardHeader, CardBody } from '@/components/ui/Card'

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

export function EditProfessionalPage() {
  const navigate  = useNavigate()
  const qc        = useQueryClient()
  const params    = useParams({ strict: false }) as { slug?: string; id?: string }
  const slug      = params.slug ?? clinicTokens.getSlug() ?? ''
  const id        = params.id ?? ''

  const [serverError,   setServerError]   = useState<string | null>(null)
  const [selectedColor, setSelectedColor] = useState('#3b82f6')

  const { data: prof, isLoading } = useQuery({
    queryKey: ['professional', id],
    queryFn:  () => professionalsApi.get(id),
    enabled:  !!id,
  })

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
  })

  useEffect(() => {
    if (prof) {
      reset({ name: prof.name, specialty: prof.specialty ?? '', bio: prof.bio ?? '' })
      setSelectedColor(prof.color ?? PRESET_COLORS[0]!)
    }
  }, [prof, reset])

  async function onSubmit(values: FormData) {
    setServerError(null)
    try {
      await professionalsApi.update(id, {
        name:      values.name,
        specialty: values.specialty || undefined,
        bio:       values.bio       || undefined,
        color:     selectedColor,
      })
      await qc.invalidateQueries({ queryKey: ['professionals'] })
      await qc.invalidateQueries({ queryKey: ['professional', id] })
      void navigate({ to: '/app/$slug/$section', params: { slug, section: 'professionals' } })
    } catch {
      setServerError('Erro ao salvar. Tente novamente.')
    }
  }

  if (isLoading) {
    return <div style={{ padding: '48px', textAlign: 'center', color: '#94a3b8', fontFamily: 'var(--font-sans)' }}>Carregando...</div>
  }

  return (
    <div className="p-8 max-w-2xl mx-auto">
      <div className="flex items-center gap-3 mb-8">
        <Link
          to="/app/$slug/$section"
          params={{ slug, section: 'professionals' }}
          className="flex items-center justify-center w-8 h-8 rounded-lg transition-colors"
          style={{ border: '1px solid var(--color-border)' }}
          onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--color-bg-subtle)')}
          onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
        >
          <svg className="w-4 h-4" style={{ color: 'var(--color-text-secondary)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </Link>
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--color-text)' }}>Editar Profissional</h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--color-text-muted)' }}>{prof?.name}</p>
        </div>
      </div>

      {serverError && (
        <div className="mb-6 px-4 py-3 rounded-lg text-sm"
          style={{ background: 'var(--danger-50)', border: '1px solid var(--danger-200)', color: 'var(--danger-700)' }}>
          {serverError}
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} noValidate>
        <Card className="mb-6">
          <CardHeader>
            <h3 className="text-sm font-semibold uppercase tracking-wider" style={{ color: 'var(--color-text-muted)' }}>
              Dados pessoais
            </h3>
          </CardHeader>
          <CardBody>
            <div className="space-y-4">
              <Input label="Nome completo" placeholder="Dra. Ana Lima" error={errors.name?.message} {...register('name')} />
              <Input label="Especialidade (opcional)" placeholder="Fisioterapia, Nutrição..." {...register('specialty')} />
              <div>
                <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--color-text)' }}>Biografia (opcional)</label>
                <textarea
                  rows={3}
                  placeholder="Breve apresentação..."
                  {...register('bio')}
                  className="w-full px-3 py-2.5 rounded-lg text-sm outline-none resize-none"
                  style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', color: 'var(--color-text)' }}
                  onFocus={(e) => { e.currentTarget.style.borderColor = 'var(--color-primary)'; e.currentTarget.style.boxShadow = '0 0 0 3px var(--color-primary-light)' }}
                  onBlur={(e)  => { e.currentTarget.style.borderColor = 'var(--color-border)';  e.currentTarget.style.boxShadow = 'none' }}
                />
              </div>
            </div>
          </CardBody>
        </Card>

        <Card className="mb-8">
          <CardHeader>
            <h3 className="text-sm font-semibold uppercase tracking-wider" style={{ color: 'var(--color-text-muted)' }}>
              Cor de identificação
            </h3>
          </CardHeader>
          <CardBody>
            <div className="flex items-center gap-3 flex-wrap">
              {PRESET_COLORS.map((color) => (
                <button key={color} type="button" onClick={() => setSelectedColor(color)}
                  className="w-9 h-9 rounded-full transition-transform"
                  style={{
                    background: color,
                    transform: selectedColor === color ? 'scale(1.2)' : 'scale(1)',
                    outline:   selectedColor === color ? `3px solid ${color}` : 'none',
                    outlineOffset: '2px',
                  }}
                />
              ))}
              <div className="flex items-center gap-2 ml-2">
                <label className="text-sm" style={{ color: 'var(--color-text-muted)' }}>Personalizada:</label>
                <input type="color" value={selectedColor}
                  onChange={(e) => setSelectedColor(e.target.value)}
                  className="w-9 h-9 rounded cursor-pointer border-0 p-0"
                />
              </div>
            </div>
          </CardBody>
        </Card>

        <div className="flex items-center justify-end gap-3">
          <Link to="/app/$slug/$section" params={{ slug, section: 'professionals' }}>
            <Button type="button" variant="secondary">Cancelar</Button>
          </Link>
          <Button type="submit" variant="primary" loading={isSubmitting}>
            {isSubmitting ? 'Salvando...' : 'Salvar alterações'}
          </Button>
        </div>
      </form>
    </div>
  )
}
