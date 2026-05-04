// ─── ProfessionalDetailModal (público) ───────────────────────────────────────
//
// Modal de perfil do profissional na área de agendamento do paciente.
// Exibe: foto, nome, aniversário, estrelas de avaliação, bio.
// Usa dados já carregados — sem request adicional.
//
// ─────────────────────────────────────────────────────────────────────────────

import { useEffect } from 'react'
import type { PublicProfessional } from '@/lib/api/public.api'

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatBirthDate(dateStr: string | null): string | null {
  if (!dateStr) return null
  const [, month, day] = dateStr.split('-')
  if (!month || !day) return null
  const months = [
    'jan', 'fev', 'mar', 'abr', 'mai', 'jun',
    'jul', 'ago', 'set', 'out', 'nov', 'dez',
  ]
  const monthLabel = months[parseInt(month, 10) - 1]
  return `${parseInt(day, 10)} de ${monthLabel}.`
}

function StarRating({ rating, count }: { rating: number | null; count: number }) {
  const score = rating ?? 0
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
      <div style={{ display: 'flex', gap: '2px' }}>
        {[1, 2, 3, 4, 5].map((star) => {
          const filled  = score >= star
          const partial = !filled && score > star - 1
          const pct     = partial ? Math.round((score - (star - 1)) * 100) : 0
          return (
            <svg key={star} width="18" height="18" viewBox="0 0 24 24" style={{ flexShrink: 0 }}>
              {partial && (
                <defs>
                  <linearGradient id={`spg-${star}`} x1="0" x2="1" y1="0" y2="0">
                    <stop offset={`${pct}%`} stopColor="#f59e0b" />
                    <stop offset={`${pct}%`} stopColor="#e5e1db" />
                  </linearGradient>
                </defs>
              )}
              <path
                d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"
                fill={filled ? '#f59e0b' : partial ? `url(#spg-${star})` : '#e5e1db'}
                stroke="none"
              />
            </svg>
          )
        })}
      </div>
      {rating !== null ? (
        <span style={{ fontSize: '13px', color: '#8a7f75', fontWeight: 500 }}>
          {rating.toFixed(1)}{' '}
          <span style={{ color: '#b0a899' }}>({count} avaliação{count !== 1 ? 'ões' : ''})</span>
        </span>
      ) : (
        <span style={{ fontSize: '13px', color: '#b0a899' }}>Sem avaliações ainda</span>
      )}
    </div>
  )
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface Props {
  prof: PublicProfessional
  onClose: () => void
}

// ─── Component ────────────────────────────────────────────────────────────────

export function ProfessionalDetailModal({ prof, onClose }: Props) {
  const base = (import.meta.env.VITE_API_URL as string) ?? ''

  // Close on Escape
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  // Lock body scroll
  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = prev }
  }, [])

  return (
    <>
      <style>{`
        @keyframes pdmFadeIn  { from { opacity: 0 } to { opacity: 1 } }
        @keyframes pdmSlideUp { from { opacity: 0; transform: translateY(24px) } to { opacity: 1; transform: translateY(0) } }
      `}</style>

      {/* ── Backdrop ───────────────────────────────────────────────────── */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0,
          background: 'rgba(26,22,20,0.50)',
          backdropFilter: 'blur(4px)',
          zIndex: 1000,
          animation: 'pdmFadeIn 0.2s ease both',
        }}
      />

      {/* ── Modal ──────────────────────────────────────────────────────── */}
      <div
        style={{
          position: 'fixed', inset: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 1001, padding: '16px',
          pointerEvents: 'none',
        }}
      >
        <div
          onClick={(e) => e.stopPropagation()}
          style={{
            background: '#faf8f5',
            borderRadius: '20px',
            border: '1px solid #ece9e4',
            boxShadow: '0 24px 80px rgba(26,22,20,0.22)',
            width: '100%',
            maxWidth: '460px',
            maxHeight: '88vh',
            overflowY: 'auto',
            pointerEvents: 'auto',
            animation: 'pdmSlideUp 0.28s cubic-bezier(0.16,1,0.3,1) both',
          }}
        >
          {/* ── Close ──────────────────────────────────────────────────── */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '16px 20px 0' }}>
            <button
              onClick={onClose}
              style={{
                width: '32px', height: '32px', borderRadius: '50%',
                background: '#f0ece7', border: 'none', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: '#8a7f75',
              }}
            >
              <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* ── Content ────────────────────────────────────────────────── */}
          <div style={{ padding: '0 28px 32px' }}>

            {/* Avatar + nome + especialidade */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', marginBottom: '24px' }}>
              {prof.avatarUrl ? (
                <img
                  src={`${base}${prof.avatarUrl}`}
                  alt={prof.name}
                  style={{
                    width: '96px', height: '96px', borderRadius: '50%',
                    objectFit: 'cover', marginBottom: '14px',
                    border: '3px solid #ece9e4',
                    boxShadow: '0 4px 16px rgba(0,0,0,0.10)',
                  }}
                />
              ) : (
                <div style={{
                  width: '96px', height: '96px', borderRadius: '50%',
                  background: `color-mix(in srgb, var(--color-primary) 15%, white)`,
                  color: 'var(--color-primary)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '34px', fontWeight: 700,
                  marginBottom: '14px',
                  boxShadow: '0 4px 16px rgba(0,0,0,0.10)',
                }}>
                  {prof.name.charAt(0).toUpperCase()}
                </div>
              )}

              <h2 style={{
                margin: '0 0 4px', fontSize: '20px', fontWeight: 700,
                color: '#1a1614',
                fontFamily: 'var(--font-display)', fontStyle: 'italic',
                letterSpacing: '-0.02em',
              }}>
                {prof.name}
              </h2>

              {prof.specialty && (
                <p style={{ margin: '0 0 10px', fontSize: '13px', color: '#8a7f75' }}>
                  {prof.specialty}
                </p>
              )}

              {/* Aniversário */}
              {prof.birthDate && (
                <div style={{
                  display: 'inline-flex', alignItems: 'center', gap: '5px',
                  background: '#f0ece7', borderRadius: '20px',
                  padding: '4px 12px', marginBottom: '10px',
                  border: '1px solid #e5e1db',
                }}>
                  <svg width="13" height="13" fill="none" stroke="#b0a899" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M21 15.546c-.523 0-1.046.151-1.5.454a2.704 2.704 0 01-3 0 2.704 2.704 0 00-3 0 2.704 2.704 0 01-3 0 2.704 2.704 0 00-3 0 2.701 2.701 0 00-1.5-.454M9 6v2m3-2v2m3-2v2M9 3h.01M12 3h.01M15 3h.01M21 21l-1-9H4l-1 9" />
                  </svg>
                  <span style={{ fontSize: '12px', color: '#8a7f75' }}>
                    Aniversário: {formatBirthDate(prof.birthDate)}
                  </span>
                </div>
              )}

              {/* Avaliação */}
              <StarRating rating={prof.rating ?? null} count={prof.ratingCount ?? 0} />
            </div>

            {/* Divisor */}
            {prof.bio && <div style={{ borderTop: '1px solid #ece9e4', margin: '0 0 20px' }} />}

            {/* Bio */}
            {prof.bio && (
              <div>
                <p style={{
                  fontSize: '11px', fontWeight: 700, color: '#b0a899',
                  textTransform: 'uppercase', letterSpacing: '0.07em',
                  margin: '0 0 8px',
                }}>
                  Sobre
                </p>
                <p style={{ margin: 0, fontSize: '14px', color: '#4a3f38', lineHeight: '1.65' }}>
                  {prof.bio}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  )
}
