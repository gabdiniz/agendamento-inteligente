// ─── EditPatientPage ──────────────────────────────────────────────────────────

import { useState, useEffect } from 'react'
import { useNavigate, useParams, Link } from '@tanstack/react-router'
import { useForm } from 'react-hook-form'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { patientsApi } from '@/lib/api/clinic.api'
import { clinicTokens } from '@/lib/api/client'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { Card, CardHeader, CardBody } from '@/components/ui/Card'

const schema = z.object({
  name:      z.string().min(2, 'Nome obrigatório'),
  phone:     z.string().min(10, 'Telefone inválido'),
  email:     z.string().email('E-mail inválido').optional().or(z.literal('')),
  birthDate: z.string().optional(),
  gender:    z.enum(['MALE', 'FEMALE', 'OTHER', 'PREFER_NOT_TO_SAY']).optional(),
  city:      z.string().optional(),
  notes:     z.string().optional(),
})

type FormData = z.infer<typeof schema>

const genderOptions = [
  { value: '',                 label: 'Não informado' },
  { value: 'MALE',            label: 'Masculino' },
  { value: 'FEMALE',          label: 'Feminino' },
  { value: 'OTHER',           label: 'Outro' },
  { value: 'PREFER_NOT_TO_SAY', label: 'Prefiro não informar' },
]

export function EditPatientPage() {
  const navigate = useNavigate()
  const qc       = useQueryClient()
  const params   = useParams({ strict: false }) as { slug?: string; id?: string }
  const slug     = params.slug ?? clinicTokens.getSlug() ?? ''
  const id       = params.id ?? ''

  const [serverError, setServerError] = useState<string | null>(null)

  const { data: patient, isLoading } = useQuery({
    queryKey: ['patient', id],
    queryFn:  () => patientsApi.get(id),
    enabled:  !!id,
  })

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
  })

  useEffect(() => {
    if (patient) {
      reset({
        name:      patient.name,
        phone:     patient.phone,
        email:     patient.email     ?? '',
        birthDate: patient.birthDate ?? '',
        gender:    (patient.gender as FormData['gender']) ?? undefined,
        city:      patient.city      ?? '',
        notes:     patient.notes     ?? '',
      })
    }
  }, [patient, reset])

  async function onSubmit(values: FormData) {
    setServerError(null)
    try {
      await patientsApi.update(id, {
        name:      values.name,
        phone:     values.phone,
        email:     values.email     || undefined,
        birthDate: values.birthDate || undefined,
        gender:    values.gender    || undefined,
        city:      values.city      || undefined,
        notes:     values.notes     || undefined,
      })
      await qc.invalidateQueries({ queryKey: ['patients'] })
      await qc.invalidateQueries({ queryKey: ['patient', id] })
      void navigate({ to: '/app/$slug/patients/$id', params: { slug, id } })
    } catch {
      setServerError('Erro ao salvar. Tente novamente.')
    }
  }

  const selectStyle = {
    background: 'var(--color-surface)',
    border:     '1px solid var(--color-border)',
    color:      'var(--color-text)',
    borderRadius: 'var(--radius-md)',
    padding:    '0.625rem 0.75rem',
    fontSize:   '0.875rem',
    width:      '100%',
    outline:    'none',
  } as React.CSSProperties

  if (isLoading) {
    return <div style={{ padding: '48px', textAlign: 'center', color: '#94a3b8', fontFamily: 'var(--font-sans)' }}>Carregando...</div>
  }

  return (
    <div className="p-8 max-w-2xl mx-auto">
      <div className="flex items-center gap-3 mb-8">
        <Link
          to="/app/$slug/patients/$id"
          params={{ slug, id }}
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
          <h1 className="text-2xl font-bold" style={{ color: 'var(--color-text)' }}>Editar Paciente</h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--color-text-muted)' }}>{patient?.name}</p>
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
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <Input label="Nome completo" placeholder="João da Silva" error={errors.name?.message} {...register('name')} />
              </div>
              <Input label="Telefone" type="tel" placeholder="(11) 9 9999-9999" error={errors.phone?.message} {...register('phone')} />
              <Input label="E-mail (opcional)" type="email" placeholder="joao@email.com" error={errors.email?.message} {...register('email')} />
              <Input label="Data de nascimento (opcional)" type="date" {...register('birthDate')} />
              <div>
                <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--color-text)' }}>Gênero (opcional)</label>
                <select {...register('gender')} style={selectStyle}>
                  {genderOptions.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </div>
              <div className="sm:col-span-2">
                <Input label="Cidade (opcional)" placeholder="São Paulo" {...register('city')} />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--color-text)' }}>Observações (opcional)</label>
                <textarea
                  rows={3} placeholder="Alergias, condições especiais..."
                  {...register('notes')}
                  className="w-full px-3 py-2.5 rounded-lg text-sm outline-none resize-none"
                  style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', color: 'var(--color-text)' }}
                  onFocus={(e) => { e.currentTarget.style.borderColor = 'var(--color-primary)'; e.currentTarget.style.boxShadow = '0 0 0 3px var(--color-primary-light)' }}
                  onBlur={(e)  => { e.currentTarget.style.borderColor = 'var(--color-border)';  e.currentTarget.style.boxShadow = 'none' }}
                />
              </div>
            </div>
          </CardBody>
        </Card>

        <div className="flex items-center justify-end gap-3">
          <Link to="/app/$slug/patients/$id" params={{ slug, id }}>
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
