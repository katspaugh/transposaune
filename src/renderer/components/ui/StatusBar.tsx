import { ReactNode } from 'react'

interface StatusBarProps {
  children: ReactNode
  variant?: 'default' | 'error'
}

export function StatusBar({ children, variant = 'default' }: StatusBarProps) {
  return (
    <div className={`status-bar ${variant === 'error' ? 'error' : ''}`}>
      {children}
    </div>
  )
}
