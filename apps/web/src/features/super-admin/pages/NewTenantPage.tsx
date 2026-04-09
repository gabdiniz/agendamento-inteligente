// ─── Super Admin — New Tenant Page ───────────────────────────────────────────
//
// Formulário de cadastro de nova clínica (tenant) com o primeiro gestor.
// Usa React Hook Form + Zod para validação.
// ─────────────────────────────────────────────────────────────────────────────

import { useState } from 'react'
import { useNavigate, Link } from '@tanstack/react-router'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { superAdminApi } from '@/lib/api/super-admin.api'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { Card, CardHeader, CardBody } from '@/components/ui/Card'

// ─── Schema ───────────────────────────────────────────────────────────────────

const slugRegex = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

const schema = z.object({
  // Clínica
  name: z.string().min(2, 'Nome deve ter ao menos 2 caracteres'),
  slug: z
    .string()
    .min(2, 'Slug deve ter ao menos 2 caracteres')
    .regex(slugRegex, 'Slug inválido — use apenas letras minúsculas, números e hífens'),
  email: z.string().email('E-mail inválido'),
  phone: z.string().optional(),
  address: z.string().optional(),

  // Gestor inicial
  gestorName: z.string().min(2, 'Nome do gestor obrigatório'),
  gestorEmail: z.string().email('E-mail do gestor inválido'),
  gestorPassword: z.string().min(6, 'Senha deve ter ao menos 6 caracteres'),
  gestorPhone: z.string().optional(),
})

type FormData = z.infer<typeof schema>

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Gera slug automático a partir do nome */
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

// ─── Section divider ─────────────────────────────────────────────────────────

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="flex items-center gap-3 mb-5"
      style={{ borderBottom: '1px solid var(--gray-100)', paddingBottom: '0.75rem' }}
    >
      <h3 className="text-sm font-semibold uppercase tracking-wider" style={{ color: 'var(--gray-500)' }}>
        {children}
      </h3>
    </div>
  )
}

// ─── Component ────────────────────────────────────────────────────────────────

export function NewTenantPage() {
  const navigate = useNavigate()
  const [serverError, setServerError] = useState<string | null>(null)
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(false)

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      slug: '',
    },
  })

  /** Auto-preenche o slug enquanto o usuário não editou manualmente */
  function handleNameChange(e: React.ChangeEvent<HTMLInputElement>) {
    if (!slugManuallyEdited) {
      setValue('slug', toSlug(e.target.value), { shouldValidate: true })
    }
  }

  async function onSubmit(values: FormData) {
    setServerError(null)
    try {
      await superAdminApi.createTenant({
        name: values.name,
        slug: values.slug,
        email: values.email,
        phone: values.phone || undefined,
        address: values.address || undefined,
        gestor: {
          name: values.gestorName,
          email: values.gestorEmail,
          password: values.gestorPassword,
          phone: values.gestorPhone || undefined,
        },
      })
      void navigate({ to: '/super-admin/tenants' })
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : 'Erro ao cadastrar clínica. Tente novamente.'
      setServerError(msg)
    }
  }

  return (
    <div className="p-8 max-w-3xl mx-auto">
      {/* ── Cabeçalho ─────────────────────────────────────────── */}
      <div className="flex items-center gap-3 mb-8">
        <Link
          to="/super-admin/tenants"
          className="flex items-center justify-center w-8 h-8 rounded-lg transition-colors"
          style={{ border: '1px solid var(--gray-200)' }}
          onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--gray-50)')}
          onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
        >
          <svg className="w-4 h-4" style={{ color: 'var(--gray-600)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </Link>
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--gray-900)' }}>
            Nova Clínica
          </h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--gray-500)' }}>
            Cadastre uma clínica e o seu primeiro gestor
          </p>
        </div>
      </div>

      {serverError && (
        <div
          className="mb-6 px-4 py-3 rounded-lg text-sm"
          style={{
            background: 'var(--danger-50)',
            border: '1px solid var(--danger-200)',
            color: 'var(--danger-700)',
          }}
        >
          {serverError}
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} noValidate>
        {/* ── Dados da Clínica ─────────────────────────────── */}
        <Card className="mb-6">
          <CardHeader>
            <SectionTitle>Dados da Clínica</SectionTitle>
          </CardHeader>
          <CardBody>
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              {/* Nome */}
              <div className="sm:col-span-2">
                <Input
                  label="Nome da clínica"
                  placeholder="Clínica São Lucas"
                  error={errors.name?.message}
                  {...register('name', {
                    onChange: handleNameChange,
                  })}
                />
              </div>

              {/* Slug */}
              <div className="sm:col-span-2">
                <Input
                  label="Slug (URL pública)"
                  placeholder="clinica-sao-lucas"
                  hint="Usado na URL de agendamento público: /clinica-sao-lucas"
                  error={errors.slug?.message}
                  {...register('slug', {
                    onChange: () => setSlugManuallyEdited(true),
                  })}
                />
              </div>

              {/* E-mail */}
              <Input
                label="E-mail da clínica"
                type="email"
                placeholder="contato@clinica.com"
                error={errors.email?.message}
                {...register('email')}
              />

              {/* Telefone */}
              <Input
                label="Telefone (opcional)"
                type="tel"
                placeholder="(11) 9 9999-9999"
                error={errors.phone?.message}
                {...register('phone')}
              />

              {/* Endereço */}
              <div className="sm:col-span-2">
                <Input
                  label="Endereço (opcional)"
                  placeholder="Av. Paulista, 1000 — São Paulo, SP"
                  error={errors.address?.message}
                  {...register('address')}
                />
              </div>
            </div>
          </CardBody>
        </Card>

        {/* ── Gestor inicial ───────────────────────────────── */}
        <Card className="mb-8">
          <CardHeader>
            <SectionTitle>Gestor Inicial</SectionTitle>
          </CardHeader>
          <CardBody>
            <p className="text-sm mb-5" style={{ color: 'var(--gray-500)' }}>
              Esse usuário terá acesso total ao painel da clínica como <strong>Gestor</strong>.
            </p>
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              {/* Nome do gestor */}
              <div className="sm:col-span-2">
                <Input
                  label="Nome completo"
                  placeholder="Dr. Carlos Almeida"
                  error={errors.gestorName?.message}
                  {...register('gestorName')}
                />
              </div>

              {/* E-mail do gestor */}
              <Input
                label="E-mail"
                type="email"
                placeholder="gestor@clinica.com"
                error={errors.gestorEmail?.message}
                {...register('gestorEmail')}
              />

              {/* Telefone do gestor */}
              <Input
                label="Telefone (opcional)"
                type="tel"
                placeholder="(11) 9 9999-9999"
                error={errors.gestorPhone?.message}
                {...register('gestorPhone')}
              />

              {/* Senha */}
              <div className="sm:col-span-2">
                <Input
                  label="Senha de acesso"
                  type="password"
                  placeholder="••••••••"
                  hint="Mínimo 6 caracteres. O gestor poderá alterar após o primeiro acesso."
                  error={errors.gestorPassword?.message}
                  {...register('gestorPassword')}
                />
              </div>
            </div>
          </CardBody>
        </Card>

        {/* ── Ações ────────────────────────────────────────── */}
        <div className="flex items-center justify-end gap-3">
          <Link to="/super-admin/tenants">
            <Button type="button" variant="secondary" size="md">
              Cancelar
            </Button>
          </Link>
          <Button
            type="submit"
            variant="primary"
            size="md"
            loading={isSubmitting}
            style={{ background: 'var(--admin-color-primary)' }}
          >
            {isSubmitting ? 'Cadastrando...' : 'Cadastrar Clínica'}
          </Button>
        </div>
      </form>
    </div>
  )
}
