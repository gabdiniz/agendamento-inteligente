type BadgeVariant = 'success' | 'warning' | 'danger' | 'neutral' | 'admin'

interface BadgeProps {
  variant?: BadgeVariant
  children: React.ReactNode
  className?: string
}

const styles: Record<BadgeVariant, { bg: string; color: string }> = {
  success: { bg: 'var(--success-50)',  color: 'var(--success-600)' },
  warning: { bg: 'var(--warning-50)',  color: 'var(--warning-600)' },
  danger:  { bg: 'var(--danger-50)',   color: 'var(--danger-600)' },
  neutral: { bg: 'var(--gray-100)',    color: 'var(--gray-600)' },
  admin:   { bg: 'var(--admin-100)',   color: 'var(--admin-700)' },
}

export function Badge({ variant = 'neutral', children, className = '' }: BadgeProps) {
  const s = styles[variant]
  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${className}`}
      style={{ background: s.bg, color: s.color }}
    >
      {children}
    </span>
  )
}
