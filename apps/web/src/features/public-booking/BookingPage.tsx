// ─── Public Booking Page ──────────────────────────────────────────────────────
//
// Página pública de agendamento — acessível sem autenticação via /:slug
// Redesign: "Private Practice" — creme + grain + DM Serif + refinamento clínico
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useEffect } from 'react'
import { useParams, Link } from '@tanstack/react-router'
import { applyTenantTheme, resetTenantTheme } from '@/lib/theme'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import {
  publicApi,
  type PublicProfessional,
  type PublicProcedure,
  type TimeSlot,
  type ClinicInfo,
} from '@/lib/api/public.api'
import { usePatientAuthStore } from '@/stores/patient-auth.store'
import { patientTokens } from '@/lib/api/patient-client'
import { patientPortalApi } from '@/lib/api/patient-auth.api'
import { ProfessionalDetailModal } from './ProfessionalDetailModal'

// ─── Types ────────────────────────────────────────────────────────────────────

type Step = 1 | 2 | 3 | 4

const patientSchema = z.object({
  name: z.string().min(2, 'Nome obrigatório'),
  phone: z.string().min(10, 'Telefone inválido'),
  email: z.string().email('E-mail inválido'),
})

// Schema permissivo para modo "locked" (paciente autenticado): campos são
// somente-leitura e o backend usa os dados reais do paciente, então qualquer
// valor (inclusive string vazia quando phone é null) passa sem erro.
const lockedPatientSchema = z.object({
  name:  z.string(),
  phone: z.string().optional().default(''),
  email: z.string(),
})

type PatientForm = z.infer<typeof patientSchema>

// ─── Helpers ──────────────────────────────────────────────────────────────────

function nextDays(n: number): string[] {
  return Array.from({ length: n }, (_, i) => {
    const d = new Date()
    d.setDate(d.getDate() + i)
    return d.toISOString().split('T')[0]!
  })
}

function formatDateShort(iso: string) {
  const [y, m, d] = iso.split('-')
  const date = new Date(Number(y), Number(m) - 1, Number(d))
  return {
    weekday: date.toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', ''),
    day: date.getDate(),
    month: date.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', ''),
    isToday: iso === new Date().toISOString().split('T')[0],
  }
}

function formatDateLong(iso: string) {
  const [y, m, d] = iso.split('-')
  return new Date(Number(y), Number(m) - 1, Number(d)).toLocaleDateString('pt-BR', {
    weekday: 'long', day: 'numeric', month: 'long',
  })
}

function formatPrice(cents: number): string {
  return (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

// ─── ICS Calendar helpers ─────────────────────────────────────────────────────

function generateICS(params: {
  summary: string
  description: string
  location: string
  dateStr: string       // "YYYY-MM-DD"
  startTime: string     // "HH:MM"
  durationMinutes: number
}): string {
  const [y, mo, d] = params.dateStr.split('-').map(Number)
  const [hh, mm] = params.startTime.split(':').map(Number)
  const start = new Date(y!, mo! - 1, d!, hh!, mm!, 0)
  const end   = new Date(start.getTime() + params.durationMinutes * 60_000)
  const fmt   = (dt: Date) => dt.toISOString().replace(/[-:.]/g, '').slice(0, 15) + 'Z'
  const uid   = `${Date.now()}-myagendix@booking`
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//MyAgendix//MyAgendix//PT',
    'BEGIN:VEVENT',
    `UID:${uid}`,
    `DTSTART:${fmt(start)}`,
    `DTEND:${fmt(end)}`,
    `SUMMARY:${params.summary}`,
    `DESCRIPTION:${params.description}`,
  ]
  if (params.location) lines.push(`LOCATION:${params.location}`)
  lines.push('END:VEVENT', 'END:VCALENDAR')
  return lines.join('\r\n')
}

function downloadICS(content: string, filename: string) {
  const blob = new Blob([content], { type: 'text/calendar;charset=utf-8' })
  const url  = URL.createObjectURL(blob)
  const a    = document.createElement('a')
  a.href     = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

// ─── Inline styles ────────────────────────────────────────────────────────────

const styles = {
  page: {
    minHeight: '100vh',
    background: '#faf8f5',
    fontFamily: 'var(--font-sans)',
    position: 'relative' as const,
    overflow: 'hidden' as const,
  } as React.CSSProperties,

  grain: {
    position: 'fixed' as const,
    inset: 0,
    backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.035'/%3E%3C/svg%3E")`,
    pointerEvents: 'none' as const,
    zIndex: 0,
  } as React.CSSProperties,

  container: {
    position: 'relative' as const,
    zIndex: 1,
    maxWidth: '520px',
    margin: '0 auto',
    padding: 'clamp(16px, 5vw, 40px) clamp(12px, 4vw, 20px) clamp(40px, 8vw, 80px)',
  } as React.CSSProperties,

  card: {
    background: '#ffffff',
    borderRadius: '20px',
    border: '1px solid #ece9e4',
    boxShadow: '0 2px 4px rgba(0,0,0,0.04), 0 12px 32px rgba(0,0,0,0.07)',
    overflow: 'hidden' as const,
    animation: 'scaleIn 0.35s cubic-bezier(0.16, 1, 0.3, 1)',
  } as React.CSSProperties,

  input: {
    width: '100%',
    padding: '12px 14px',
    borderRadius: '10px',
    fontSize: '14px',
    outline: 'none',
    transition: 'all 0.2s',
    background: '#faf8f5',
    border: '1.5px solid #e5e1db',
    color: '#1a1614',
    fontFamily: 'var(--font-sans)',
  } as React.CSSProperties,

  label: {
    display: 'block',
    fontSize: '12px',
    fontWeight: 600,
    letterSpacing: '0.06em',
    textTransform: 'uppercase' as const,
    color: '#8a7f75',
    marginBottom: '6px',
  } as React.CSSProperties,

  btnPrimary: {
    background: 'var(--color-primary)',
    color: '#fff',
    border: 'none',
    borderRadius: '10px',
    padding: '13px 20px',
    fontSize: '14px',
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'all 0.2s',
    fontFamily: 'var(--font-sans)',
    letterSpacing: '0.01em',
  } as React.CSSProperties,

  btnSecondary: {
    background: 'transparent',
    color: '#8a7f75',
    border: '1.5px solid #e5e1db',
    borderRadius: '10px',
    padding: '11px 18px',
    fontSize: '14px',
    fontWeight: 500,
    cursor: 'pointer',
    transition: 'all 0.2s',
    fontFamily: 'var(--font-sans)',
  } as React.CSSProperties,

  btnGhost: {
    background: 'transparent',
    color: '#8a7f75',
    border: 'none',
    padding: '8px 0',
    fontSize: '13px',
    fontWeight: 500,
    cursor: 'pointer',
    fontFamily: 'var(--font-sans)',
    display: 'flex' as const,
    alignItems: 'center' as const,
    gap: '6px',
  } as React.CSSProperties,
}

// ─── Step Bar ─────────────────────────────────────────────────────────────────

function StepBar({ current }: { current: Step }) {
  const steps = [
    { n: 1, label: 'Serviço' },
    { n: 2, label: 'Horário' },
    { n: 3, label: 'Dados' },
    { n: 4, label: 'Confirmação' },
  ]

  return (
    <div style={{
      padding: '24px 28px 20px',
      borderBottom: '1px solid #f0ece7',
      display: 'flex',
      alignItems: 'center',
    }}>
      {steps.map((s, i) => {
        const done = s.n < current
        const active = s.n === current
        return (
          <div key={s.n} style={{ display: 'flex', alignItems: 'center', flex: i < steps.length - 1 ? 1 : 0 }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '5px' }}>
              <div style={{
                width: '28px',
                height: '28px',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '12px',
                fontWeight: 700,
                transition: 'all 0.3s ease',
                background: done || active
                  ? 'var(--color-primary)'
                  : '#f0ece7',
                color: done || active ? '#fff' : '#b0a899',
                boxShadow: active ? '0 0 0 4px color-mix(in srgb, var(--color-primary) 15%, transparent)' : 'none',
              }}>
                {done ? (
                  <svg width="13" height="13" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                  </svg>
                ) : s.n}
              </div>
              <span style={{
                fontSize: '10px',
                fontWeight: active ? 600 : 400,
                letterSpacing: '0.04em',
                color: active ? 'var(--color-primary)' : '#b0a899',
                whiteSpace: 'nowrap',
                textTransform: 'uppercase',
              }}>
                {s.label}
              </span>
            </div>
            {i < steps.length - 1 && (
              <div style={{
                flex: 1,
                height: '2px',
                margin: '0 8px',
                marginBottom: '17px',
                background: done
                  ? 'var(--color-primary)'
                  : '#ece8e3',
                borderRadius: '2px',
                transition: 'background 0.4s ease',
              }} />
            )}
          </div>
        )
      })}
    </div>
  )
}

// ─── Step 1 — Profissional + Procedimento ─────────────────────────────────────

function Step1({
  professionals,
  loading,
  onSelect,
}: {
  professionals: PublicProfessional[]
  loading: boolean
  onSelect: (prof: PublicProfessional, proc: PublicProcedure) => void
}) {
  const [selectedProf, setSelectedProf] = useState<string | null>(null)
  const [detailProf, setDetailProf]     = useState<PublicProfessional | null>(null)
  const base = (import.meta.env.VITE_API_URL as string) ?? ''

  if (loading) {
    return (
      <div style={{ padding: '60px 28px', textAlign: 'center' as const }}>
        <div style={{
          display: 'inline-flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '14px',
          color: '#b0a899',
        }}>
          <div style={{
            width: '36px',
            height: '36px',
            border: '2px solid #ece8e3',
            borderTopColor: 'var(--color-primary)',
            borderRadius: '50%',
            animation: 'spin 0.8s linear infinite',
          }} />
          <span style={{ fontSize: '13px' }}>Carregando profissionais...</span>
        </div>
        <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
      </div>
    )
  }

  if (professionals.length === 0) {
    return (
      <div style={{ padding: '60px 28px', textAlign: 'center' as const, color: '#b0a899' }}>
        <svg width="40" height="40" style={{ margin: '0 auto 12px', display: 'block' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
        <p style={{ fontSize: '14px' }}>Nenhum profissional disponível no momento.</p>
      </div>
    )
  }

  return (
    <div style={{ padding: 'clamp(16px, 5vw, 28px)' }}>
      <p style={{ fontSize: '12px', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: '#b0a899', marginBottom: '16px' }}>
        Selecione o profissional
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {professionals.map((prof, i) => {
          const isOpen = selectedProf === prof.id
          return (
            <div
              key={prof.id}
              style={{
                borderRadius: '12px',
                border: `1.5px solid ${isOpen ? 'var(--color-primary)' : '#ece8e3'}`,
                overflow: 'hidden',
                transition: 'all 0.25s ease',
                animation: `fadeUp 0.3s ease both`,
                animationDelay: `${i * 60}ms`,
                background: isOpen ? 'color-mix(in srgb, var(--color-primary) 4%, white)' : '#faf8f5',
              }}
            >
              {/* Cabeçalho do profissional */}
              <div
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '14px',
                  padding: '14px 16px',
                  cursor: 'pointer',
                }}
                onClick={() => setSelectedProf(isOpen ? null : prof.id)}
              >
                {/* Avatar — clique abre o modal de perfil */}
                {prof.avatarUrl ? (
                  <img
                    src={`${base}${prof.avatarUrl}`}
                    alt={prof.name}
                    title="Ver perfil"
                    onClick={(e) => { e.stopPropagation(); setDetailProf(prof) }}
                    style={{
                      width: '42px', height: '42px', borderRadius: '50%',
                      objectFit: 'cover', flexShrink: 0,
                      border: '2px solid #ece9e4', cursor: 'pointer',
                      transition: 'transform 0.15s, box-shadow 0.15s',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = 'scale(1.07)'
                      e.currentTarget.style.boxShadow = '0 0 0 3px color-mix(in srgb, var(--color-primary) 25%, transparent)'
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = 'scale(1)'
                      e.currentTarget.style.boxShadow = 'none'
                    }}
                  />
                ) : (
                  <div
                    title="Ver perfil"
                    onClick={(e) => { e.stopPropagation(); setDetailProf(prof) }}
                    style={{
                      width: '42px', height: '42px', borderRadius: '50%',
                      background: `color-mix(in srgb, var(--color-primary) 15%, white)`,
                      color: 'var(--color-primary)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '16px', fontWeight: 700, flexShrink: 0,
                      cursor: 'pointer',
                      transition: 'transform 0.15s, box-shadow 0.15s',
                    }}
                    onMouseEnter={(e) => {
                      (e.currentTarget as HTMLElement).style.transform = 'scale(1.07)'
                      ;(e.currentTarget as HTMLElement).style.boxShadow = '0 0 0 3px color-mix(in srgb, var(--color-primary) 25%, transparent)'
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget as HTMLElement).style.transform = 'scale(1)'
                      ;(e.currentTarget as HTMLElement).style.boxShadow = 'none'
                    }}
                  >
                    {prof.name.charAt(0).toUpperCase()}
                  </div>
                )}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: '14px', fontWeight: 600, color: '#1a1614', margin: 0 }}>{prof.name}</p>
                  {prof.specialty && (
                    <p style={{ fontSize: '12px', color: '#8a7f75', margin: '2px 0 0' }}>{prof.specialty}</p>
                  )}
                </div>
                <svg
                  width="16" height="16"
                  fill="none" stroke="#b0a899"
                  viewBox="0 0 24 24"
                  style={{
                    flexShrink: 0,
                    transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                    transition: 'transform 0.25s ease',
                  }}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>

              {/* Procedimentos */}
              {isOpen && (
                <div style={{ borderTop: '1px solid #ece8e3', padding: '4px 12px 12px' }}>
                  <p style={{ fontSize: '10px', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: '#b0a899', padding: '10px 4px 8px' }}>
                    Escolha o serviço
                  </p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {prof.procedures.map((proc) => (
                      <button
                        key={proc.id}
                        type="button"
                        onClick={() => onSelect(prof, proc)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '12px 14px',
                          borderRadius: '10px',
                          border: '1.5px solid #ece8e3',
                          background: '#fff',
                          cursor: 'pointer',
                          transition: 'all 0.18s ease',
                          textAlign: 'left',
                          fontFamily: 'var(--font-sans)',
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.borderColor = 'var(--color-primary)'
                          e.currentTarget.style.background = 'color-mix(in srgb, var(--color-primary) 4%, white)'
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.borderColor = '#ece8e3'
                          e.currentTarget.style.background = '#fff'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          {proc.color && (
                            <span style={{
                              width: '10px', height: '10px',
                              borderRadius: '50%',
                              background: proc.color,
                              flexShrink: 0,
                            }} />
                          )}
                          <span style={{ fontSize: '13px', fontWeight: 500, color: '#1a1614' }}>{proc.name}</span>
                        </div>
                        <span style={{
                          fontSize: '11px',
                          fontWeight: 600,
                          color: '#b0a899',
                          background: '#f0ece7',
                          padding: '3px 8px',
                          borderRadius: '20px',
                        }}>
                          {proc.durationMinutes} min
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* ── Professional detail modal ────────────────────────────────── */}
      {detailProf && (
        <ProfessionalDetailModal
          prof={detailProf}
          onClose={() => setDetailProf(null)}
        />
      )}
    </div>
  )
}

// ─── Step 2 — Data + Horário ──────────────────────────────────────────────────

function Step2({
  slug,
  professionalId,
  procedureId,
  onSelect,
  onBack,
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
    <div style={{ padding: 'clamp(16px, 5vw, 28px)', animation: 'slideRight 0.3s ease both' }}>
      {/* Seletor de dias */}
      <p style={{ fontSize: '12px', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: '#b0a899', marginBottom: '14px' }}>
        Escolha o dia
      </p>
      <div style={{
        display: 'flex',
        gap: '8px',
        overflowX: 'auto',
        paddingBottom: '4px',
        marginBottom: '28px',
        scrollbarWidth: 'none',
      }}>
        {days.map((d) => {
          const { weekday, day, month, isToday } = formatDateShort(d)
          const active = d === selectedDate
          return (
            <button
              key={d}
              type="button"
              onClick={() => setSelectedDate(d)}
              style={{
                flexShrink: 0,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '3px',
                padding: '10px 14px',
                borderRadius: '12px',
                border: `1.5px solid ${active ? 'var(--color-primary)' : '#ece8e3'}`,
                background: active ? 'var(--color-primary)' : '#faf8f5',
                color: active ? '#fff' : '#6b5f55',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                fontFamily: 'var(--font-sans)',
              }}
            >
              <span style={{ fontSize: '10px', fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase', opacity: 0.8 }}>
                {isToday ? 'Hoje' : weekday}
              </span>
              <span style={{ fontSize: '18px', fontWeight: 700, lineHeight: 1 }}>{day}</span>
              <span style={{ fontSize: '10px', opacity: 0.7 }}>{month}</span>
            </button>
          )
        })}
      </div>

      {/* Horários */}
      <p style={{ fontSize: '12px', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: '#b0a899', marginBottom: '14px' }}>
        Horários disponíveis
      </p>

      {loadingSlots ? (
        <div style={{ textAlign: 'center', padding: '32px 0', color: '#b0a899' }}>
          <div style={{
            width: '28px', height: '28px',
            border: '2px solid #ece8e3',
            borderTopColor: 'var(--color-primary)',
            borderRadius: '50%',
            animation: 'spin 0.8s linear infinite',
            margin: '0 auto 10px',
          }} />
          <span style={{ fontSize: '12px' }}>Buscando horários...</span>
          <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
        </div>
      ) : slots.length === 0 ? (
        <div style={{
          textAlign: 'center',
          padding: '32px',
          background: '#faf8f5',
          borderRadius: '12px',
          border: '1.5px dashed #ece8e3',
          color: '#b0a899',
        }}>
          <svg width="32" height="32" style={{ margin: '0 auto 10px', display: 'block' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          <p style={{ fontSize: '13px', fontWeight: 500 }}>Sem horários disponíveis</p>
          <p style={{ fontSize: '12px', marginTop: '4px' }}>Tente outra data.</p>
        </div>
      ) : (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(72px, 1fr))',
          gap: '8px',
          animation: 'fadeIn 0.25s ease',
        }}>
          {slots.map((slot) => (
            <button
              key={slot.startTime}
              type="button"
              onClick={() => onSelect(selectedDate, slot)}
              style={{
                padding: '10px 6px',
                borderRadius: '10px',
                border: '1.5px solid #ece8e3',
                background: '#faf8f5',
                color: '#1a1614',
                fontSize: '13px',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.18s ease',
                fontFamily: 'var(--font-sans)',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = 'var(--color-primary)'
                e.currentTarget.style.background = 'var(--color-primary)'
                e.currentTarget.style.color = '#fff'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = '#ece8e3'
                e.currentTarget.style.background = '#faf8f5'
                e.currentTarget.style.color = '#1a1614'
              }}
            >
              {slot.startTime}
            </button>
          ))}
        </div>
      )}

      <div style={{ marginTop: '28px' }}>
        <button type="button" style={styles.btnGhost} onClick={onBack}>
          <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Voltar
        </button>
      </div>
    </div>
  )
}

// ─── Step 3 — Dados do paciente ───────────────────────────────────────────────

function Step3({
  onSubmit,
  onBack,
  loading,
  loggedInPatient,
}: {
  onSubmit: (data: PatientForm) => void
  onBack: () => void
  loading: boolean
  loggedInPatient?: { name: string; phone: string | null; email: string | null } | null
}) {
  const locked = !!loggedInPatient

  const { register, handleSubmit, formState: { errors } } = useForm<PatientForm>({
    resolver: zodResolver(locked ? lockedPatientSchema : patientSchema),
    defaultValues: locked ? {
      name:  loggedInPatient.name,
      phone: loggedInPatient.phone ?? '',
      email: loggedInPatient.email ?? '',
    } : undefined,
  })

  const [focusedField, setFocusedField] = useState<string | null>(null)

  // Estilo compartilhado para campos bloqueados
  const lockedStyle: React.CSSProperties = {
    ...styles.input,
    background: '#f4f1ed',
    color: '#6b6057',
    cursor: 'default',
    borderColor: '#e5e1db',
  }

  return (
    <div style={{ padding: 'clamp(16px, 5vw, 28px)', animation: 'slideRight 0.3s ease both' }}>

      {/* Banner: agendando como paciente logado */}
      {locked ? (
        <div style={{
          display: 'flex', alignItems: 'center', gap: '10px',
          background: 'color-mix(in srgb, var(--color-primary) 8%, white)',
          border: '1.5px solid color-mix(in srgb, var(--color-primary) 25%, transparent)',
          borderRadius: '10px', padding: '10px 14px', marginBottom: '20px',
        }}>
          <div style={{
            width: '30px', height: '30px', borderRadius: '50%', flexShrink: 0,
            background: 'color-mix(in srgb, var(--color-primary) 15%, white)',
            color: 'var(--color-primary)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '11px', fontWeight: 700,
          }}>
            {loggedInPatient.name.split(' ').slice(0, 2).map((n) => n[0]).join('').toUpperCase()}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ fontSize: '12px', fontWeight: 600, color: 'var(--color-primary)', margin: 0 }}>
              Agendando como
            </p>
            <p style={{ fontSize: '13px', color: '#1a1614', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {loggedInPatient.name}
            </p>
          </div>
          <svg width="16" height="16" fill="none" stroke="var(--color-primary)" viewBox="0 0 24 24" style={{ flexShrink: 0 }}>
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
      ) : (
        <p style={{ fontSize: '12px', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: '#b0a899', marginBottom: '20px' }}>
          Seus dados
        </p>
      )}

      <form onSubmit={handleSubmit(onSubmit)} noValidate style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {/* Nome */}
        <div>
          <label style={styles.label}>Nome completo</label>
          <input
            type="text"
            placeholder="João da Silva"
            autoComplete="name"
            readOnly={locked}
            {...register('name')}
            style={locked ? lockedStyle : {
              ...styles.input,
              borderColor: errors.name ? '#e57373' : focusedField === 'name' ? 'var(--color-primary)' : '#e5e1db',
              boxShadow: focusedField === 'name' ? '0 0 0 3px color-mix(in srgb, var(--color-primary) 15%, transparent)' : 'none',
            }}
            onFocus={() => !locked && setFocusedField('name')}
            onBlur={() => setFocusedField(null)}
          />
          {errors.name && <p style={{ fontSize: '12px', color: '#e57373', marginTop: '5px' }}>{errors.name.message}</p>}
        </div>

        {/* Telefone */}
        <div>
          <label style={styles.label}>Telefone / WhatsApp</label>
          <input
            type="tel"
            placeholder="(11) 9 9999-9999"
            autoComplete="tel"
            readOnly={locked}
            {...register('phone')}
            style={locked ? lockedStyle : {
              ...styles.input,
              borderColor: errors.phone ? '#e57373' : focusedField === 'phone' ? 'var(--color-primary)' : '#e5e1db',
              boxShadow: focusedField === 'phone' ? '0 0 0 3px color-mix(in srgb, var(--color-primary) 15%, transparent)' : 'none',
            }}
            onFocus={() => !locked && setFocusedField('phone')}
            onBlur={() => setFocusedField(null)}
          />
          {errors.phone && <p style={{ fontSize: '12px', color: '#e57373', marginTop: '5px' }}>{errors.phone.message}</p>}
        </div>

        {/* E-mail */}
        <div>
          <label style={styles.label}>E-mail</label>
          <input
            type="email"
            placeholder="voce@email.com"
            autoComplete="email"
            readOnly={locked}
            {...register('email')}
            style={locked ? lockedStyle : {
              ...styles.input,
              borderColor: errors.email ? '#e57373' : focusedField === 'email' ? 'var(--color-primary)' : '#e5e1db',
              boxShadow: focusedField === 'email' ? '0 0 0 3px color-mix(in srgb, var(--color-primary) 15%, transparent)' : 'none',
            }}
            onFocus={() => !locked && setFocusedField('email')}
            onBlur={() => setFocusedField(null)}
          />
          {errors.email && <p style={{ fontSize: '12px', color: '#e57373', marginTop: '5px' }}>{errors.email.message}</p>}
        </div>

        <div style={{ display: 'flex', gap: '10px', marginTop: '8px' }}>
          <button type="button" style={styles.btnGhost} onClick={onBack}>
            <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Voltar
          </button>
          <button
            type="submit"
            disabled={loading}
            style={{
              ...styles.btnPrimary,
              flex: 1,
              opacity: loading ? 0.7 : 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
            }}
          >
            {loading ? (
              <>
                <div style={{
                  width: '14px', height: '14px',
                  border: '2px solid rgba(255,255,255,0.4)',
                  borderTopColor: '#fff',
                  borderRadius: '50%',
                  animation: 'spin 0.8s linear infinite',
                }} />
                Confirmando...
              </>
            ) : 'Confirmar agendamento'}
          </button>
        </div>
        <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
      </form>
    </div>
  )
}

// ─── Step 4 — Confirmação Rica ────────────────────────────────────────────────

function Step4({
  professional,
  procedure,
  date,
  slot,
  slug,
  patientEmail,
  isLoggedIn,
  clinicInfo,
  onNew,
}: {
  professional: PublicProfessional
  procedure: PublicProcedure
  date: string
  slot: TimeSlot
  slug: string
  patientEmail: string
  isLoggedIn: boolean
  clinicInfo: ClinicInfo | null
  onNew: () => void
}) {
  const base = (import.meta.env.VITE_API_URL as string) ?? ''
  const mapsUrl = clinicInfo?.address
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(clinicInfo.address)}`
    : null

  function handleSaveToCalendar() {
    const ics = generateICS({
      summary:         `${procedure.name} — ${professional.name}`,
      description:     `Procedimento: ${procedure.name}\\nProfissional: ${professional.name}${procedure.preparationInstructions ? '\\n\\nPreparo: ' + procedure.preparationInstructions : ''}`,
      location:        clinicInfo?.address ?? '',
      dateStr:         date,
      startTime:       slot.startTime,
      durationMinutes: procedure.durationMinutes,
    })
    downloadICS(ics, `agendamento-${date}.ics`)
  }

  return (
    <div style={{ padding: 'clamp(20px, 5vw, 32px)', animation: 'scaleIn 0.4s cubic-bezier(0.16, 1, 0.3, 1)' }}>

      {/* ── Cabeçalho de sucesso ─────────────────────────────────── */}
      <div style={{ textAlign: 'center', marginBottom: '24px' }}>
        <div style={{
          width: '60px', height: '60px', borderRadius: '50%',
          background: 'color-mix(in srgb, var(--color-primary) 12%, white)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 16px',
          boxShadow: '0 0 0 8px color-mix(in srgb, var(--color-primary) 6%, white)',
        }}>
          <svg width="26" height="26" fill="none" stroke="var(--color-primary)" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h2 style={{
          fontFamily: 'var(--font-display)',
          fontSize: '22px',
          fontStyle: 'italic',
          color: '#1a1614',
          margin: '0 0 4px',
          lineHeight: 1.2,
        }}>
          Agendamento confirmado!
        </h2>
        <p style={{ fontSize: '13px', color: '#8a7f75', margin: 0 }}>
          Tudo certo. Veja os detalhes abaixo.
        </p>
      </div>

      {/* ── Card do profissional ──────────────────────────────────── */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: '14px',
        padding: '14px 16px',
        background: '#faf8f5',
        borderRadius: '14px',
        border: '1.5px solid #ece8e3',
        marginBottom: '12px',
      }}>
        {/* Avatar */}
        {professional.avatarUrl ? (
          <img
            src={`${base}${professional.avatarUrl}`}
            alt={professional.name}
            style={{ width: '48px', height: '48px', borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }}
          />
        ) : (
          <div style={{
            width: '48px', height: '48px', borderRadius: '50%', flexShrink: 0,
            background: professional.color ?? 'color-mix(in srgb, var(--color-primary) 18%, white)',
            color: 'var(--color-primary)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '18px', fontWeight: 700,
          }}>
            {professional.name.charAt(0).toUpperCase()}
          </div>
        )}
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontSize: '14px', fontWeight: 600, color: '#1a1614', margin: 0 }}>{professional.name}</p>
          {professional.specialty && (
            <p style={{ fontSize: '12px', color: '#8a7f75', margin: '2px 0 0' }}>{professional.specialty}</p>
          )}
        </div>
      </div>

      {/* ── Detalhes do agendamento ───────────────────────────────── */}
      <div style={{
        background: '#faf8f5',
        borderRadius: '14px',
        border: '1.5px solid #ece8e3',
        overflow: 'hidden',
        marginBottom: '12px',
      }}>
        {/* Serviço + preço */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '12px 16px',
          borderBottom: '1px solid #ece8e3',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            {procedure.color && (
              <span style={{ width: '9px', height: '9px', borderRadius: '50%', background: procedure.color, flexShrink: 0 }} />
            )}
            <div>
              <p style={{ fontSize: '10px', fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase', color: '#b0a899', margin: 0 }}>Serviço</p>
              <p style={{ fontSize: '13px', fontWeight: 500, color: '#1a1614', margin: '2px 0 0' }}>
                {procedure.name} · {procedure.durationMinutes} min
              </p>
            </div>
          </div>
          {procedure.priceCents != null && (
            <span style={{
              fontSize: '13px', fontWeight: 700, color: '#1a1614',
              background: 'color-mix(in srgb, var(--color-primary) 10%, white)',
              border: '1px solid color-mix(in srgb, var(--color-primary) 20%, transparent)',
              padding: '3px 10px', borderRadius: '20px',
              flexShrink: 0,
            }}>
              {formatPrice(procedure.priceCents)}
            </span>
          )}
        </div>

        {/* Data */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '12px 16px', borderBottom: '1px solid #ece8e3' }}>
          <div style={{
            width: '30px', height: '30px', borderRadius: '8px', flexShrink: 0,
            background: 'color-mix(in srgb, var(--color-primary) 10%, white)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <svg width="14" height="14" fill="none" stroke="var(--color-primary)" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
          <div>
            <p style={{ fontSize: '10px', fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase', color: '#b0a899', margin: 0 }}>Data</p>
            <p style={{ fontSize: '13px', fontWeight: 500, color: '#1a1614', margin: '2px 0 0', textTransform: 'capitalize' }}>{formatDateLong(date)}</p>
          </div>
        </div>

        {/* Horário */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '12px 16px' }}>
          <div style={{
            width: '30px', height: '30px', borderRadius: '8px', flexShrink: 0,
            background: 'color-mix(in srgb, var(--color-primary) 10%, white)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <svg width="14" height="14" fill="none" stroke="var(--color-primary)" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div>
            <p style={{ fontSize: '10px', fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase', color: '#b0a899', margin: 0 }}>Horário</p>
            <p style={{ fontSize: '13px', fontWeight: 500, color: '#1a1614', margin: '2px 0 0' }}>{slot.startTime} — {slot.endTime}</p>
          </div>
        </div>
      </div>

      {/* ── Instruções de preparo ─────────────────────────────────── */}
      {procedure.preparationInstructions && (
        <div style={{
          display: 'flex', gap: '12px',
          padding: '14px 16px',
          background: '#fffbeb',
          border: '1.5px solid #fde68a',
          borderRadius: '12px',
          marginBottom: '12px',
        }}>
          <svg width="18" height="18" fill="none" stroke="#d97706" viewBox="0 0 24 24" style={{ flexShrink: 0, marginTop: '1px' }}>
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div>
            <p style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', color: '#d97706', margin: '0 0 4px' }}>
              Como se preparar
            </p>
            <p style={{ fontSize: '13px', color: '#78350f', lineHeight: 1.6, margin: 0 }}>
              {procedure.preparationInstructions}
            </p>
          </div>
        </div>
      )}

      {/* ── Ações rápidas ─────────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: mapsUrl ? '1fr 1fr' : '1fr', gap: '8px', marginBottom: '12px' }}>
        {/* Salvar na agenda */}
        <button
          type="button"
          onClick={handleSaveToCalendar}
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '7px',
            padding: '12px 14px',
            borderRadius: '10px',
            border: '1.5px solid #ece8e3',
            background: '#faf8f5',
            color: '#1a1614',
            fontSize: '12px',
            fontWeight: 600,
            cursor: 'pointer',
            fontFamily: 'var(--font-sans)',
            transition: 'all 0.18s ease',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--color-primary)'; e.currentTarget.style.background = 'color-mix(in srgb, var(--color-primary) 5%, white)' }}
          onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#ece8e3'; e.currentTarget.style.background = '#faf8f5' }}
        >
          <svg width="15" height="15" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          Salvar na agenda
        </button>

        {/* Como chegar */}
        {mapsUrl && (
          <a
            href={mapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '7px',
              padding: '12px 14px',
              borderRadius: '10px',
              border: '1.5px solid #ece8e3',
              background: '#faf8f5',
              color: '#1a1614',
              fontSize: '12px',
              fontWeight: 600,
              textDecoration: 'none',
              fontFamily: 'var(--font-sans)',
              transition: 'all 0.18s ease',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--color-primary)'; e.currentTarget.style.background = 'color-mix(in srgb, var(--color-primary) 5%, white)' }}
            onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#ece8e3'; e.currentTarget.style.background = '#faf8f5' }}
          >
            <svg width="15" height="15" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            Como chegar
          </a>
        )}
      </div>

      {/* ── Novo agendamento ──────────────────────────────────────── */}
      <button
        type="button"
        onClick={onNew}
        style={{ ...styles.btnSecondary, width: '100%', textAlign: 'center', marginBottom: '12px' }}
      >
        Fazer novo agendamento
      </button>

      {/* ── CTA portal do paciente ────────────────────────────────── */}
      {patientEmail && (
        <div style={{
          padding: '14px 16px',
          borderRadius: '12px',
          background: 'color-mix(in srgb, var(--color-primary) 6%, white)',
          border: '1px solid color-mix(in srgb, var(--color-primary) 18%, transparent)',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
        }}>
          <div style={{
            width: '36px', height: '36px', borderRadius: '50%', flexShrink: 0,
            background: 'color-mix(in srgb, var(--color-primary) 14%, white)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <svg width="16" height="16" fill="none" stroke="var(--color-primary)" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ fontSize: '12px', fontWeight: 600, color: 'var(--color-primary)', margin: '0 0 2px' }}>
              {isLoggedIn ? 'Você está logado' : 'Acesse sua conta'}
            </p>
            <p style={{ fontSize: '11px', color: '#8a7f75', margin: 0, lineHeight: 1.5 }}>
              {isLoggedIn
                ? 'Acompanhe seus agendamentos na área do paciente.'
                : <>Enviamos um e-mail para <strong>{patientEmail}</strong> com acesso ao portal.</>
              }
            </p>
          </div>
          {isLoggedIn ? (
            <Link
              to="/$slug/minha-conta/$section"
              params={{ slug, section: 'agendamentos' }}
              style={{
                padding: '7px 14px', borderRadius: '8px',
                background: 'var(--color-primary)', color: '#fff',
                fontSize: '12px', fontWeight: 600,
                textDecoration: 'none', flexShrink: 0,
                whiteSpace: 'nowrap',
              }}
            >
              Minha área
            </Link>
          ) : (
            <Link
              to="/$slug/minha-conta/login"
              params={{ slug }}
              style={{
                padding: '7px 14px', borderRadius: '8px',
                background: 'var(--color-primary)', color: '#fff',
                fontSize: '12px', fontWeight: 600,
                textDecoration: 'none', flexShrink: 0,
              }}
            >
              Entrar
            </Link>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export function BookingPage() {
  const { slug } = useParams({ strict: false }) as { slug?: string }
  const tenantSlug = slug ?? ''

  // Paciente autenticado — pré-preenche o Step3
  const { patient } = usePatientAuthStore()
  const isPatientLoggedIn = patientTokens.isAuthenticated(tenantSlug)
  const loggedInPatient = isPatientLoggedIn && patient ? patient : null

  const [step, setStep] = useState<Step>(1)
  const [professionals, setProfessionals] = useState<PublicProfessional[]>([])
  const [clinicInfo, setClinicInfo] = useState<ClinicInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [booking, setBooking] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [selectedProf, setSelectedProf] = useState<PublicProfessional | null>(null)
  const [selectedProc, setSelectedProc] = useState<PublicProcedure | null>(null)
  const [selectedDate, setSelectedDate] = useState<string>('')
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null)
  const [bookedEmail, setBookedEmail] = useState<string>('')

  const BASE_URL = (import.meta.env['VITE_API_URL'] as string) ?? 'http://localhost:3333'
  const bannerUrl = clinicInfo?.bannerUrl
    ? (clinicInfo.bannerUrl.startsWith('http') ? clinicInfo.bannerUrl : `${BASE_URL}${clinicInfo.bannerUrl}`)
    : null

  useEffect(() => {
    if (!tenantSlug) return
    Promise.all([
      publicApi.getProfessionals(tenantSlug),
      publicApi.getClinicInfo(tenantSlug).catch(() => null),
    ])
      .then(([profs, info]) => {
        setProfessionals(profs)
        setClinicInfo(info)
        if (info) {
          applyTenantTheme({
            colorPrimary:   info.colorPrimary,
            colorSecondary: info.colorSecondary,
            colorSidebar:   info.colorSidebar,
          })
        }
      })
      .catch((err: unknown) => {
        const status = (err as { response?: { status?: number } })?.response?.status
        if (status === 404) {
          setError('Clínica não encontrada ou inativa.')
        } else if (!status) {
          setError('Não foi possível conectar ao servidor. Verifique sua conexão.')
        } else {
          setError(`Erro ao carregar dados da clínica (${status}). Tente novamente.`)
        }
      })
      .finally(() => setLoading(false))
    return () => resetTenantTheme()
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
      if (loggedInPatient) {
        // Paciente autenticado: usa a rota do portal (token JWT)
        // O backend já conhece os dados do paciente pelo token — não precisa repassar phone/email
        await patientPortalApi.createAppointment(tenantSlug, {
          professionalId: selectedProf.id,
          procedureId:    selectedProc.id,
          scheduledDate:  selectedDate,
          startTime:      selectedSlot.startTime,
        })
        setBookedEmail(loggedInPatient.email ?? '')
      } else {
        // Paciente anônimo: usa a rota pública com os dados do formulário
        await publicApi.book(tenantSlug, {
          patientName:    patient.name,
          patientPhone:   patient.phone!,
          patientEmail:   patient.email,
          professionalId: selectedProf.id,
          procedureId:    selectedProc.id,
          scheduledDate:  selectedDate,
          startTime:      selectedSlot.startTime,
        })
        setBookedEmail(patient.email)
      }
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
    setBookedEmail('')
    setError(null)
  }

  return (
    <div style={{
      ...styles.page,
      background: bannerUrl
        ? `url("${bannerUrl}") center/cover no-repeat`
        : '#faf8f5',
    }}>
      {/* Overlay escuro sobre o banner */}
      {bannerUrl && (
        <div aria-hidden style={{
          position: 'fixed' as const,
          inset: 0,
          background: 'rgba(0,0,0,0.45)',
          backdropFilter: 'blur(1px)',
          zIndex: 0,
        }} />
      )}

      {/* Grain texture overlay */}
      <div style={styles.grain} aria-hidden />

      {/* Decoração de fundo — círculos suaves (apenas sem banner) */}
      {!bannerUrl && (<>
      <div aria-hidden style={{
        position: 'fixed',
        top: '-120px',
        right: '-120px',
        width: '400px',
        height: '400px',
        borderRadius: '50%',
        background: 'color-mix(in srgb, var(--color-primary) 6%, transparent)',
        pointerEvents: 'none',
        zIndex: 0,
      }} />
      <div aria-hidden style={{
        position: 'fixed',
        bottom: '-80px',
        left: '-80px',
        width: '280px',
        height: '280px',
        borderRadius: '50%',
        background: 'color-mix(in srgb, var(--color-primary) 4%, transparent)',
        pointerEvents: 'none',
        zIndex: 0,
      }} />
      </>)}

      <div style={styles.container}>
        {/* Header */}
        <div style={{ marginBottom: '32px', animation: 'fadeUp 0.4s ease both' }}>
          {/* Botão Minha Conta */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '12px' }}>
            <Link
              to="/$slug/minha-conta/login"
              params={{ slug: tenantSlug }}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                fontSize: '12px',
                fontWeight: 600,
                color: 'var(--color-primary)',
                textDecoration: 'none',
                padding: '7px 14px',
                borderRadius: '20px',
                background: 'color-mix(in srgb, var(--color-primary) 10%, white)',
                border: '1px solid color-mix(in srgb, var(--color-primary) 20%, transparent)',
                transition: 'all 0.2s',
                letterSpacing: '0.01em',
              }}
            >
              <svg width="13" height="13" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              Minha Conta
            </Link>
          </div>

          <div style={{ textAlign: 'center' }}>
          {(() => {
            const logoSrc = clinicInfo?.logoUrl
              ? (clinicInfo.logoUrl.startsWith('http')
                  ? clinicInfo.logoUrl
                  : `${import.meta.env['VITE_API_URL'] ?? 'http://localhost:3333'}${clinicInfo.logoUrl}`)
              : null
            return logoSrc ? (
              <img
                src={logoSrc}
                alt={clinicInfo?.name ?? 'Logo da clínica'}
                style={{
                  height: '108px', maxWidth: '260px',
                  objectFit: 'contain',
                  margin: '0 auto 14px',
                  display: 'block',
                  filter: bannerUrl ? 'drop-shadow(0 2px 8px rgba(0,0,0,0.35))' : 'none',
                }}
              />
            ) : (
              <div style={{
                width: '52px', height: '52px',
                borderRadius: '16px',
                background: 'var(--color-primary)',
                color: '#fff',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '20px', fontWeight: 700,
                margin: '0 auto 16px',
                boxShadow: '0 8px 24px color-mix(in srgb, var(--color-primary) 35%, transparent)',
              }}>M</div>
            )
          })()}
          <h1 style={{
            fontFamily: 'var(--font-display)',
            fontSize: '26px',
            fontStyle: 'italic',
            color: bannerUrl ? '#fff' : '#1a1614',
            margin: '0 0 6px',
            lineHeight: 1.2,
            textShadow: bannerUrl ? '0 1px 4px rgba(0,0,0,0.4)' : 'none',
          }}>
            {clinicInfo?.name ? clinicInfo.name : 'Agendar consulta'}
          </h1>
          {/* slug oculto intencionalmente */}
          </div>{/* /textAlign:center */}
        </div>{/* /header */}

        {/* Card principal */}
        <div style={bannerUrl ? {
          ...styles.card,
          background: 'rgba(255,255,255,0.60)',
          backdropFilter: 'blur(18px) saturate(0.15)',
          WebkitBackdropFilter: 'blur(18px) saturate(0.15)',
          border: '1px solid rgba(255,255,255,0.4)',
          boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
        } : styles.card}>
          {step < 4 && <StepBar current={step} />}

          {/* Resumo da seleção — steps 2 e 3 */}
          {(step === 2 || step === 3) && selectedProf && selectedProc && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              padding: '12px 20px',
              background: 'color-mix(in srgb, var(--color-primary) 6%, white)',
              borderBottom: '1px solid color-mix(in srgb, var(--color-primary) 15%, white)',
              animation: 'fadeIn 0.2s ease',
            }}>
              <div style={{
                width: '30px', height: '30px',
                borderRadius: '50%',
                background: 'color-mix(in srgb, var(--color-primary) 18%, white)',
                color: 'var(--color-primary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '13px',
                fontWeight: 700,
                flexShrink: 0,
              }}>
                {selectedProf.name.charAt(0)}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: '12px', fontWeight: 600, color: 'var(--color-primary)', margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {selectedProf.name}
                </p>
                <p style={{ fontSize: '11px', color: 'color-mix(in srgb, var(--color-primary) 70%, #555)', margin: '1px 0 0' }}>
                  {selectedProc.name}
                  {step === 3 && selectedSlot && ` · ${selectedDate ? formatDateLong(selectedDate) : ''} às ${selectedSlot.startTime}`}
                </p>
              </div>
              {step === 3 && (
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  style={{ fontSize: '11px', color: 'var(--color-primary)', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600, fontFamily: 'var(--font-sans)', padding: '2px 6px' }}
                >
                  Alterar
                </button>
              )}
            </div>
          )}

          {/* Mensagem de erro */}
          {error && (
            <div style={{
              margin: '16px 20px 0',
              padding: '12px 14px',
              borderRadius: '10px',
              background: '#fff5f5',
              border: '1.5px solid #fecaca',
              fontSize: '13px',
              color: '#b91c1c',
              display: 'flex',
              alignItems: 'flex-start',
              gap: '8px',
            }}>
              <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ flexShrink: 0, marginTop: '1px' }}>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {error}
            </div>
          )}

          {/* Steps */}
          {step === 1 && (
            <Step1
              professionals={professionals}
              loading={loading}
              onSelect={handleSelectService}
            />
          )}
          {step === 2 && selectedProf && selectedProc && (
            <Step2
              slug={tenantSlug}
              professionalId={selectedProf.id}
              procedur