import type { HTMLAttributes } from 'react'

interface CardProps extends HTMLAttributes<HTMLDivElement> {}
interface CardHeaderProps extends HTMLAttributes<HTMLDivElement> {}
interface CardBodyProps extends HTMLAttributes<HTMLDivElement> {}

export function Card({ className = '', children, ...props }: CardProps) {
  return (
    <div
      className={`rounded-[--radius-lg] border shadow-[--shadow-sm] ${className}`}
      style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}
      {...props}
    >
      {children}
    </div>
  )
}

export function CardHeader({ className = '', children, ...props }: CardHeaderProps) {
  return (
    <div
      className={`px-6 py-4 border-b ${className}`}
      style={{ borderColor: 'var(--color-border)' }}
      {...props}
    >
      {children}
    </div>
  )
}

export function CardBody({ className = '', children, ...props }: CardBodyProps) {
  return (
    <div className={`px-6 py-5 ${className}`} {...props}>
      {children}
    </div>
  )
}
