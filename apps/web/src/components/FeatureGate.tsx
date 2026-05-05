// ─── FeatureGate ──────────────────────────────────────────────────────────────
//
// Envolve uma página que requer uma feature do plano.
// Se o tenant não tem a feature, exibe a tela de upgrade em vez da página.
//
// Uso:
//   <FeatureGate slug="waitlist">
//     <WaitlistPage />
//   </FeatureGate>
// ─────────────────────────────────────────────────────────────────────────────

import React from 'react'
import { useFeature } from '@/hooks/useFeature'

const FEATURE_LABELS: Record<string, { name: string; description: string }> = {
  waitlist: {
    name: 'Lista de Espera',
    description: 'Gerencie pacientes aguardando disponibilidade e preencha cancelamentos automaticamente.',
  },
  whatsapp: {
    name: 'WhatsApp & Notificações',
    description: 'Envie lembretes automáticos de consulta e confirmações via WhatsApp.',
  },
}

function UpgradeScreen({ slug }: { slug: string }) {
  const info = FEATURE_LABELS[slug] ?? { name: 'Esta funcionalidade', description: 'Não disponível no seu plano atual.' }

  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      minHeight: '100%', padding: '40px 24px',
      background: 'var(--color-bg-subtle)',
    }}>
      <div style={{
        maxWidth: '440px', width: '100%',
        background: '#fff', borderRadius: '20px',
        border: '1px solid #eaecef',
        boxShadow: '0 4px 24px rgba(0,0,0,0.06)',
        padding: '48px 40px',
        textAlign: 'center',
      }}>
        {/* Ícone de cadeado */}
        <div style={{
          width: '64px', height: '64px', borderRadius: '18px',
          background: 'color-mix(in srgb, var(--color-primary) 10%, white)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 24px',
        }}>
          <svg width="28" height="28" fill="none" stroke="var(--color-primary)" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
              d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
        </div>

        <h2 style={{
          fontSize: '20px', fontWeight: 700, color: '#1a2530',
          margin: '0 0 10px', letterSpacing: '-0.02em',
        }}>
          {info.name}
        </h2>

        <p style={{
          fontSize: '14px', color: '#6b7a8a', lineHeight: '1.6',
          margin: '0 0 8px',
        }}>
          {info.description}
        </p>

        <p style={{
          fontSize: '13px', color: '#b0bbc6', margin: '0 0 32px',
        }}>
          Esta funcionalidade não está disponível no seu plano atual.
        </p>

        <div style={{
          padding: '16px 20px', borderRadius: '12px',
          background: 'color-mix(in srgb, var(--color-primary) 6%, white)',
          border: '1px solid color-mix(in srgb, var(--color-primary) 20%, white)',
          fontSize: '13px', color: '#4a5568', lineHeight: '1.5',
        }}>
          <strong style={{ color: 'var(--color-primary)' }}>Quer liberar esta funcionalidade?</strong>
          <br />
          Entre em contato com o suporte ou faça upgrade do seu plano.
        </div>
      </div>
    </div>
  )
}

export function FeatureGate({
  slug,
  children,
}: {
  slug: string
  children: React.ReactNode
}) {
  const hasFeature = useFeature(slug)

  if (!hasFeature) return <UpgradeScreen slug={slug} />

  return <>{children}</>
}
