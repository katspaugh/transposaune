import { ReactNode, CSSProperties } from 'react'

interface PanelProps {
  children: ReactNode
  className?: string
  style?: CSSProperties
}

export function Panel({ children, className = '', style }: PanelProps) {
  return (
    <div className={`panel ${className}`} style={style}>
      {children}
    </div>
  )
}
