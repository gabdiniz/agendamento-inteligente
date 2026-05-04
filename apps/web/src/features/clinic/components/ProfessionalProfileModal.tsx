// ─── ProfessionalProfileModal ─────────────────────────────────────────────────
//
// Modal grande de perfil do profissional — área da clínica.
// Exibe: foto, nome, aniversário, estrelas de avaliação, bio, procedimentos.
//
// ─────────────────────────────────────────────────────────────────────────────

import { useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { professionalsApi } from '@/lib/api/clinic.api'

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatBirthDate(dateStr: string | null): string | null {
  if (!dateStr) return null
  const [year, month, day] = dateStr.split('-')
  if (!year || !month || !day) return null
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
          const filled   = score >= star
          const partial  = !filled && score > star - 1
          const pct      = partial ? Math.round((score - (star - 1)) * 100) : 0
          return (
            <svg key={star} width="18" height="18" viewBox="0 0 24 24" style={{ flexShrink: 0 }}>
              {partial && (
                <defs>
                  <linearGradient id={`pg-${star}`} x1="0" x2="1" y1="0" y2="0">
                    <stop offset={`${pct}%`}    stopColor="#f59e0b" />
                    <stop offset={`${pct}%`}    stopColor="#e2e8f0" />
                  </linearGradient>
                </defs>
              )}
              <path
                d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"
                fill={filled ? '#f59e0b' : partial ? `url(#pg-${star})` : '#e2e8f0'}
                stroke="none"
              />
            </svg>
          )
        })}
      </div>
      {rating !== null ? (
        <span style={{ fontSize: '13px', color: '#64748b', fontWeight: 500 }}>
          {rating.toFixed(1)} <span style={{ color: '#94a3b8' }}>({count} avaliação{count !== 1 ? 'ões' : ''})</span>
        </span>
      ) : (
        <span style={{ fontSize: '13px', color: '#94a3b8' }}>Sem avaliações ainda</span>
      )}
    </div>
  )
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface Props {
  professionalId: string
  onClose: () => void
}

// ─── Component ────────────────────────────────────────────────────────────────

export function ProfessionalProfileModal({ professionalId, onClose }: Props) {
  // Fetch full professional with rating (GET /:id already returns rating)
  const { data: prof, isLoading } = useQuery({
    queryKey: ['professional', professionalId],
    queryFn: () => professionalsApi.get(professionalId),
    staleTime: 30_000,
  })

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

  const base = (import.meta.env.VITE_API_URL as string) ?? ''

  return (
    <>
      <style>{`
        @keyframes pmFadeIn  { from { opacity: 0 } to { opacity: 1 } }
        @keyframes pmSlideUp { from { opacity: 0; transform: translateY(24px) } to { opacity: 1; transform: translateY(0) } }
        @keyframes spin      { to { transform: rotate(360deg) } }
      `}</style>

      {/* ── Backdrop ─────────────────────────────────────────────────── */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0,
          background: 'rgba(15,23,42,0.55)',
          backdropFilter: 'blur(3px)',
          zIndex: 1000,
          animation: 'pmFadeIn 0.2s ease both',
        }}
      />

      {/* ── Modal ────────────────────────────────────────────────────── */}
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          position: 'fixed', inset: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 1001, padding: '16px',
          pointerEvents: 'none',
        }}
      >
        <div
          style={{
            background: '#fff',
            borderRadius: '20px',
            boxShadow: '0 24px 80px rgba(0,0,0,0.22)',
            width: '100%',
            maxWidth: '580px',
            maxHeight: '90vh',
            overflowY: 'auto',
            pointerEvents: 'auto',
            animation: 'pmSlideUp 0.28s cubic-bezier(0.16,1,0.3,1) both',
          }}
        >
          {/* ── Close button ─────────────────────────────────────────── */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '16px 20px 0' }}>
            <button
              onClick={onClose}
              style={{
                width: '32px', height: '32px', borderRadius: '50%',
                background: '#f1f5f9', border: 'none', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: '#64748b',
              }}
            >
              <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {isLoading || !prof ? (
            <div style={{ padding: '48px 32px', textAlign: 'center' }}>
              <div style={{
                width: '36px', height: '36px',
                border: '2px solid #eaecef', borderTopColor: 'var(--color-primary)',
                borderRadius: '50%', animation: 'spin 0.8s linear infinite',
                margin: '0 auto 12px',
              }} />
              <p style={{ fontSize: '13px', color: '#94a3b8', margin: 0 }}>Carregando...</p>
            </div>
          ) : (
            <div style={{ padding: '0 32px 32px' }}>

              {/* ── Avatar + nome + especialidade ─────────────────────── */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', marginBottom: '28px' }}>
                {prof.avatarUrl ? (
                  <img
                    src={`${base}${prof.avatarUrl}`}
                    alt={prof.name}
                    style={{
                      width: '100px', height: '100px', borderRadius: '50%',
                      objectFit: 'cover', marginBottom: '14px',
                      border: '3px solid #f0f2f5',
                      boxShadow: '0 4px 16px rgba(0,0,0,0.10)',
                    }}
                  />
                ) : (
                  <div style={{
                    width: '100px', height: '100px', borderRadius: '50%',
                    background: prof.color ?? 'var(--color-primary)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '36px', fontWeight: 700, color: '#fff',
                    marginBottom: '14px',
                    boxShadow: '0 4px 16px rgba(0,0,0,0.14)',
                  }}>
                    {prof.name.charAt(0).toUpperCase()}
                  </div>
                )}

                <h2 style={{
                  margin: '0 0 4px', fontSize: '22px', fontWeight: 700,
                  color: '#1a2530', fontFamily: 'var(--font-display)', fontStyle: 'italic',
                  letterSpacing: '-0.02em',
                }}>
                  {prof.name}
                </h2>

                {prof.specialty && (
                  <p style={{ margin: '0 0 10px', fontSize: '14px', color: '#64748b' }}>
                    {prof.specialty}
                  </p>
                )}

                {/* Aniversário */}
                {prof.birthDate && (
                  <div style={{
                    display: 'inline-flex', alignItems: 'center', gap: '5px',
                    background: '#f8fafc', borderRadius: '20px',
                    padding: '4px 12px', marginBottom: '10px',
                    border: '1px solid #e2e8f0',
                  }}>
                    <svg width="13" height="13" fill="none" stroke="#94a3b8" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                        d="M21 15.546c-.523 0-1.046.151-1.5.454a2.704 2.704 0 01-3 0 2.704 2.704 0 00-3 0 2.704 2.704 0 01-3 0 2.704 2.704 0 00-3 0 2.701 2.701 0 00-1.5-.454M9 6v2m3-2v2m3-2v2M9 3h.01M12 3h.01M15 3h.01M21 21l-1-9H4l-1 9" />
                    </svg>
                    <span style={{ fontSize: '12.5px', color: '#64748b' }}>
                      Aniversário: {formatBirthDate(prof.birthDate)}
                    </span>
                  </div>
                )}

                {/* Avaliação */}
                <StarRating rating={prof.rating ?? null} count={prof.ratingCount ?? 0} />
              </div>

              {/* ── Divisor ───────────────────────────────────────────── */}
              <div style={{ borderTop: '1px solid #f0f2f5', margin: '0 0 22px' }} />

              {/* ── Bio ───────────────────────────────────────────────── */}
              {prof.bio && (
                <>
                  <div style={{ marginBottom: '22px' }}>
                    <h3 style={{ margin: '0 0 8px', fontSize: '11px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.07em' }}>
                      Sobre
                    </h3>
                    <p style={{ margin: 0, fontSize: '14px', color: '#374151', lineHeight: '1.65' }}>
                      {prof.bio}
                    </p>
                  </div>
                  <div style={{ borderTop: '1px solid #f0f2f5', margin: '0 0 22px' }} />
                </>
              )}

              {/* ── Procedimentos ─────────────────────────────────────── */}
              {prof.procedures && prof.procedures.length > 0 && (
                <div>
                  <h3 style={{ margin: '0 0 12px', fontSize: '11px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.07em' }}>
                    Procedimentos
                  </h3>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                    {prof.procedures.map((p) => (
                      <span
                        key={p.id}
                        style={{
                          display: 'inline-flex', alignItems: 'center', gap: '6px',
                          padding: '5px 12px', borderRadius: '20px',
                          background: '#f8fafc', border: '1px solid #e2e8f0',
                          fontSize: '12.5px', color: '#374151', fontWeight: 500,
                        }}
                      >
                        {p.color && (
                          <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: p.color, flexShrink: 0 }} />
                        )}
                        {p.name}
                        <span style={{ color: '#94a3b8' }}>· {p.durationMinutes} min</span>
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  )
}
