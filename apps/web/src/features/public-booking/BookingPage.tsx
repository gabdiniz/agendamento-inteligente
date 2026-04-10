// ─── Public Booking Page ──────────────────────────────────────────────────────
//
// Página pública de agendamento — acessível sem autenticação via /:slug
// Fluxo em 4 etapas:
//   1. Selecionar profissional e procedimento
//   2. Selecionar data e horário
//   3. Informar dados do paciente
//   4. Confirmação / sucesso
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useEffect } from 'react'
import { useParams } from '@tanstack/react-router'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import {
  publicApi,
  type PublicProfessional,
  type PublicProcedure,
  type TimeSlot,
} from '@/lib/api/public.api'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'

// ─── Types & constants ────────────────────────────────────────────────────────

type Step = 1 | 2 | 3 | 4

const patientSchema = z.object({
  name: z.string().min(2, 'Nome obrigatório'),
  phone: z.string().min(10, 'Telefone inválido'),
  email: z.string().email('E-mail inválido').optional().or(z.literal('')),
})
type PatientForm = z.infer<typeof patientSchema>

// ─── Helpers ──────────────────────────────────────────────────────────────────

function todayISO() {
  return new Date().toISOString().split('T')[0]!
}

/** Retorna os próximos N dias no formato YYYY-MM-DD */
function nextDays(n: number): string[] {
  return Array.from({ length: n }, (_, i) => {
    const d = new Date()
    d.setDate(d.getDate() + i)
    return d.toISOString().split('T')[0]!
  })
}

function formatDate(iso: string) {
  const [y, m, d] = iso.split('-')
  return new Date(Number(y), Number(m) - 1, Number(d)).toLocaleDateString('pt-BR', {
    weekday: 'short', day: 'numeric', month: 'short',
  })
}

// ─── Step indicator ───────────────────────────────────────────────────────────

function StepBar({ current }: { current: Step }) {
  const steps = ['Serviço', 'Horário', 'Dados', 'Confirmação']
  return (
    <div className="flex items-center gap-0 mb-8">
      {steps.map((label, i) => {
        const n = (i + 1) as Step
        const done = n < current
        const active = n === current
        return (
          <div key={label} className="flex items-center flex-1 last:flex-none">
            <div className="flex flex-col items-center">
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-colors"
                style={{
                  background: done || active ? 'var(--color-primary)' : 'var(--gray-200)',
                  color: done || active ? '#fff' : 'var(--gray-500)',
                }}
              >
                {done ? (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                  </svg>
                ) : n}
              </div>
              <span className="text-xs mt-1 whitespace-nowrap hidden sm:block"
                style={{ color: active ? 'var(--color-primary)' : 'var(--gray-400)', fontWeight: active ? 600 : 400 }}>
                {label}
              </span>
            </div>
            {i < steps.length - 1 && (
              <div className="flex-1 h-0.5 mx-2 mb-4 rounded"
                style={{ background: done ? 'var(--color-primary)' : 'var(--gray-200)' }} />
            )}
          </div>
        )
      })}
    </div>
  )
}

// ─── Step 1 — Profissional + Procedimento ─────────────────────────────────────

function Step1({
  professionals, loading,
  onSelect,
}: {
  professionals: PublicProfessional[]
  loading: boolean
  onSelect: (prof: PublicProfessional, proc: PublicProcedure) => void
}) {
  const [selectedProf, setSelectedProf] = useState<PublicProfessional | null>(null)

  if (loading) return (
    <div className="flex items-center justify-center py-20" style={{ color: 'var(--color-text-muted)' }}>
      <svg className="animate-spin w-6 h-6 mr-2" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
      </svg>
      Carregando...
    </div>
  )

  return (
    <div>
      <h2 className="text-lg font-semibold mb-1" style={{ color: 'var(--color-text)' }}>
        Com quem deseja ser atendido?
      </h2>
      <p className="text-sm mb-6" style={{ color: 'var(--color-text-muted)' }}>
        Selecione o profissional e o serviço desejado.
      </p>

      <div className="space-y-3">
        {professionals.map((prof) => (
          <div key={prof.id}>
            {/* Card do profissional */}
            <button
              type="button"
              onClick={() => setSelectedProf(selectedProf?.id === prof.id ? null : prof)}
              className="w-full text-left rounded-xl px-5 py-4 transition-all"
              style={{
                border: `2px solid ${selectedProf?.id === prof.id ? 'var(--color-primary)' : 'var(--color-border)'}`,
                background: selectedProf?.id === prof.id ? 'var(--color-primary-light)' : 'var(--color-surface)',
              }}
            >
              <div className="flex items-center gap-3">
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold shrink-0"
                  style={{ background: 'var(--color-primary)' }}
                >
                  {prof.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <p className="font-medium text-sm" style={{ color: 'var(--color-text)' }}>{prof.name}</p>
                  {prof.specialty && (
                    <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{prof.specialty}</p>
                  )}
                </div>
                <svg
                  className="w-5 h-5 ml-auto transition-transform"
                  style={{
                    color: 'var(--color-text-muted)',
                    transform: selectedProf?.id === prof.id ? 'rotate(180deg)' : 'rotate(0deg)',
                  }}
                  fill="none" stroke="currentColor" viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </button>

            {/* Procedimentos do profissional */}
            {selectedProf?.id === prof.id && (
              <div className="ml-4 mt-2 space-y-2">
                {prof.procedures.map((proc) => (
                  <button
                    key={proc.id}
                    type="button"
                    onClick={() => onSelect(prof, proc)}
                    className="w-full text-left rounded-lg px-4 py-3 transition-all"
                    style={{
                      border: '1px solid var(--color-border)',
                      background: 'var(--color-surface)',
                    }}
                    onMouseEnter={(e) => {
                      (e.currentTarget as HTMLElement).style.borderColor = 'var(--color-primary)'
                      ;(e.currentTarget as HTMLElement).style.background = 'var(--color-primary-light)'
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget as HTMLElement).style.borderColor = 'var(--color-border)'
                      ;(e.currentTarget as HTMLElement).style.background = 'var(--color-surface)'
                    }}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {proc.color && (
                          <span className="w-3 h-3 rounded-full shrink-0" style={{ background: proc.color }} />
                        )}
                        <span className="text-sm font-medium" style={{ color: 'var(--color-text)' }}>
                          {proc.name}
                        </span>
                      </div>
                      <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                        {proc.durationMinutes} min
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Step 2 — Data + Horário ──────────────────────────────────────────────────

function Step2({
  slug, professionalId, procedureId,
  onSelect, onBack,
}: {
  slug: string
  professionalId: string
  procedureId: string
  onSelect: (date: string, slot: TimeSlot) => void
  onBack: () => void
}) {
  const days = nextDays(14)
  const [selectedDate, setSelectedDate] = useState(days[0]!)
  const [slots, setSlots] = useState<TimeSlot[]>([])
  const [loadingSlots, setLoadingSlots] = useState(false)

  useEffect(() => {
    setLoadingSlots(true)
    publicApi.getSlots(slug, professionalId, procedureId, selectedDate)
      .then(setSlots)
      .catch(() => setSlots([]))
      .finally(() => setLoadingSlots(false))
  }, [slug, professionalId, procedureId, selectedDate])

  return (
    <div>
      <h2 className="text-lg font-semibold mb-1" style={{ color: 'var(--color-text)' }}>
        Escolha data e horário
      </h2>
      <p className="text-sm mb-6" style={{ color: 'var(--color-text-muted)' }}>
        Selecione o dia e o horário disponível para o atendimento.
      </p>

      {/* Seletor de dias */}
      <div className="flex gap-2 overflow-x-auto pb-2 mb-6">
        {days.map((d) => {
          const active = d === selectedDate
          return (
            <button
              key={d}
              type="button"
              onClick={() => setSelectedDate(d)}
              className="shrink-0 px-4 py-2 rounded-xl text-sm font-medium transition-colors"
              style={{
                background: active ? 'var(--color-primary)' : 'var(--color-surface)',
                color: active ? '#fff' : 'var(--color-text)',
                border: `1px solid ${active ? 'var(--color-primary)' : 'var(--color-border)'}`,
              }}
            >
              {formatDate(d)}
            </button>
          )
        })}
      </div>

      {/* Horários */}
      {loadingSlots ? (
        <div className="flex items-center justify-center py-10" style={{ color: 'var(--color-text-muted)' }}>
          <svg className="animate-spin w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
          </svg>
          Buscando horários...
        </div>
      ) : slots.length === 0 ? (
        <div className="text-center py-10" style={{ color: 'var(--color-text-muted)' }}>
          <svg className="w-10 h-10 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
              d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          <p className="text-sm">Sem horários disponíveis neste dia.</p>
          <p className="text-xs mt-1">Tente outro dia ou entre na lista de espera.</p>
        </div>
      ) : (
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
          {slots.map((slot) => (
            <button
              key={slot.startTime}
              type="button"
              onClick={() => onSelect(selectedDate, slot)}
              className="py-2.5 rounded-xl text-sm font-medium transition-colors"
              style={{
                background: 'var(--color-surface)',
                border: '1px solid var(--color-border)',
                color: 'var(--color-text)',
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLElement).style.background = 'var(--color-primary)'
                ;(e.currentTarget as HTMLElement).style.color = '#fff'
                ;(e.currentTarget as HTMLElement).style.borderColor = 'var(--color-primary)'
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.background = 'var(--color-surface)'
                ;(e.currentTarget as HTMLElement).style.color = 'var(--color-text)'
                ;(e.currentTarget as HTMLElement).style.borderColor = 'var(--color-border)'
              }}
            >
              {slot.startTime}
            </button>
          ))}
        </div>
      )}

      <div className="mt-6">
        <Button variant="ghost" size="sm" onClick={onBack}>← Voltar</Button>
      </div>
    </div>
  )
}

// ─── Step 3 — Dados do paciente ───────────────────────────────────────────────

function Step3({
  onSubmit, onBack, loading,
}: {
  onSubmit: (data: PatientForm) => void
  onBack: () => void
  loading: boolean
}) {
  const { register, handleSubmit, formState: { errors } } = useForm<PatientForm>({
    resolver: zodResolver(patientSchema),
  })

  return (
    <div>
      <h2 className="text-lg font-semibold mb-1" style={{ color: 'var(--color-text)' }}>
        Seus dados
      </h2>
      <p className="text-sm mb-6" style={{ color: 'var(--color-text-muted)' }}>
        Informe seus dados para confirmar o agendamento.
      </p>

      <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
        <Input label="Nome completo" placeholder="João da Silva" error={errors.name?.message} {...register('name')} />
        <Input label="Telefone / WhatsApp" type="tel" placeholder="(11) 9 9999-9999" error={errors.phone?.message} {...register('phone')} />
        <Input label="E-mail (opcional)" type="email" placeholder="voce@email.com" error={errors.email?.message} {...register('email')} />

        <div className="flex items-center gap-3 mt-6">
          <Button type="button" variant="ghost" onClick={onBack}>← Voltar</Button>
          <Button type="submit" variant="primary" loading={loading} className="flex-1">
            {loading ? 'Confirmando...' : 'Confirmar agendamento'}
          </Button>
        </div>
      </form>
    </div>
  )
}

// ─── Step 4 — Sucesso ────────────────────────────────────────────────────────

function Step4({
  professional, procedure, date, slot, onNew,
}: {
  professional: PublicProfessional
  procedure: PublicProcedure
  date: string
  slot: TimeSlot
  onNew: () => void
}) {
  return (
    <div className="text-center py-4">
      <div
        className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4"
        style={{ background: 'var(--success-50)' }}
      >
        <svg className="w-8 h-8" style={{ color: 'var(--success-600)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
      </div>
      <h2 className="text-xl font-bold mb-2" style={{ color: 'var(--color-text)' }}>
        Agendamento confirmado!
      </h2>
      <p className="text-sm mb-6" style={{ color: 'var(--color-text-muted)' }}>
        Você receberá uma confirmação em breve.
      </p>

      <div
        className="rounded-xl p-5 text-left mb-6"
        style={{ background: 'var(--color-bg-subtle)', border: '1px solid var(--color-border)' }}
      >
        <dl className="space-y-3 text-sm">
          {[
            { label: 'Profissional', value: professional.name },
            { label: 'Serviço', value: `${procedure.name} (${procedure.durationMinutes} min)` },
            { label: 'Data', value: new Date(date + 'T12:00:00').toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' }) },
            { label: 'Horário', value: slot.startTime },
          ].map(({ label, value }) => (
            <div key={label} className="flex items-start justify-between gap-4">
              <dt style={{ color: 'var(--color-text-muted)' }}>{label}</dt>
              <dd className="font-medium text-right" style={{ color: 'var(--color-text)' }}>{value}</dd>
            </div>
          ))}
        </dl>
      </div>

      <Button variant="secondary" onClick={onNew} className="w-full">
        Fazer novo agendamento
      </Button>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export function BookingPage() {
  const { slug } = useParams({ strict: false }) as { slug?: string }
  const tenantSlug = slug ?? ''

  const [step, setStep] = useState<Step>(1)
  const [professionals, setProfessionals] = useState<PublicProfessional[]>([])
  const [loading, setLoading] = useState(true)
  const [booking, setBooking] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Seleções do usuário
  const [selectedProf, setSelectedProf] = useState<PublicProfessional | null>(null)
  const [selectedProc, setSelectedProc] = useState<PublicProcedure | null>(null)
  const [selectedDate, setSelectedDate] = useState<string>('')
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null)

  useEffect(() => {
    if (!tenantSlug) return
    publicApi.getProfessionals(tenantSlug)
      .then(setProfessionals)
      .catch(() => setError('Clínica não encontrada ou inativa.'))
      .finally(() => setLoading(false))
  }, [tenantSlug])

  function handleSelectService(prof: PublicProfessional, proc: PublicProcedure) {
    setSelectedProf(prof)
    setSelectedProc(proc)
    setStep(2)
  }

  function handleSelectSlot(date: string, slot: TimeSlot) {
    setSelectedDate(date)
    setSelectedSlot(slot)
    setStep(3)
  }

  async function handleConfirm(patient: PatientForm) {
    if (!selectedProf || !selectedProc || !selectedSlot) return
    setBooking(true)
    setError(null)
    try {
      await publicApi.book(tenantSlug, {
        patientName: patient.name,
        patientPhone: patient.phone,
        patientEmail: patient.email || undefined,
        professionalId: selectedProf.id,
        procedureId: selectedProc.id,
        scheduledDate: selectedDate,
        startTime: selectedSlot.startTime,
      })
      setStep(4)
    } catch {
      setError('Não foi possível confirmar o agendamento. O horário pode ter sido ocupado. Tente outro.')
    } finally {
      setBooking(false)
    }
  }

  function handleNew() {
    setStep(1)
    setSelectedProf(null)
    setSelectedProc(null)
    setSelectedDate('')
    setSelectedSlot(null)
    setError(null)
  }

  return (
    <div
      className="min-h-screen py-10 px-4"
      style={{ background: 'var(--color-bg-subtle)' }}
    >
      <div className="max-w-lg mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div
            className="inline-flex items-center justify-center w-12 h-12 rounded-2xl text-white font-bold text-lg mb-3"
            style={{ background: 'var(--color-primary)' }}
          >
            M
          </div>
          <h1 className="text-xl font-bold" style={{ color: 'var(--color-text)' }}>
            Agendar consulta
          </h1>
          {tenantSlug && (
            <p className="text-sm mt-1" style={{ color: 'var(--color-text-muted)' }}>/{tenantSlug}</p>
          )}
        </div>

        {/* Card principal */}
        <div
          className="rounded-2xl p-6 sm:p-8"
          style={{
            background: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            boxShadow: 'var(--shadow-md)',
          }}
        >
          {step < 4 && <StepBar current={step} />}

          {error && (
            <div
              className="mb-5 px-4 py-3 rounded-lg text-sm"
              style={{
                background: 'var(--danger-50)',
                border: '1px solid var(--danger-200)',
                color: 'var(--danger-700)',
              }}
            >
              {error}
            </div>
          )}

          {step === 1 && (
            <Step1
              professionals={professionals}
              loading={loading}
              onSelect={handleSelectService}
            />
          )}

          {step === 2 && selectedProf && selectedProc && (
            <>
              {/* Resumo do que foi selecionado */}
              <div
                className="flex items-center gap-3 px-4 py-3 rounded-xl mb-6"
                style={{ background: 'var(--color-primary-light)', border: '1px solid var(--color-primary-border)' }}
              >
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0"
                  style={{ background: 'var(--color-primary)' }}
                >
                  {selectedProf.name.charAt(0)}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium" style={{ color: 'var(--color-primary)' }}>
                    {selectedProf.name}
                  </p>
                  <p className="text-xs" style={{ color: 'var(--color-primary)' }}>
                    {selectedProc.name} · {selectedProc.durationMinutes} min
                  </p>
                </div>
              </div>
              <Step2
                slug={tenantSlug}
                professionalId={selectedProf.id}
                procedureId={selectedProc.id}
                onSelect={handleSelectSlot}
                onBack={() => setStep(1)}
              />
            </>
          )}

          {step === 3 && selectedProf && selectedProc && selectedSlot && (
            <>
              {/* Resumo */}
              <div
                className="flex items-center gap-3 px-4 py-3 rounded-xl mb-6"
                style={{ background: 'var(--color-primary-light)', border: '1px solid var(--color-primary-border)' }}
              >
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium" style={{ color: 'var(--color-primary)' }}>
                    {selectedProf.name} · {selectedProc.name}
                  </p>
                  <p className="text-xs" style={{ color: 'var(--color-primary)' }}>
                    {new Date(selectedDate + 'T12:00:00').toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })} às {selectedSlot.startTime}
                  </p>
                </div>
                <button
                  type="button"
                  className="text-xs underline shrink-0"
                  style={{ color: 'var(--color-primary)' }}
                  onClick={() => setStep(2)}
                >
                  Alterar
                </button>
              </div>
              <Step3 onSubmit={handleConfirm} onBack={() => setStep(2)} loading={booking} />
            </>
          )}

          {step === 4 && selectedProf && selectedProc && selectedSlot && (
            <Step4
              professional={selectedProf}
              procedure={selectedProc}
              date={selectedDate}
              slot={selectedSlot}
              onNew={handleNew}
            />
          )}
        </div>
      </div>
    </div>
  )
}
