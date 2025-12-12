interface ProgressBarProps {
  percent: number
  label?: string
}

export function ProgressBar({ percent, label }: ProgressBarProps) {
  return (
    <div className="progress-wrapper">
      <div className="progress">
        <div
          className="progress-bar"
          style={{ width: `${Math.min(100, Math.max(0, percent))}%` }}
        />
      </div>
      {label && (
        <p style={{
          fontSize: 'var(--font-size-xs)',
          color: 'var(--color-text-secondary)',
          marginTop: 'var(--space-xs)'
        }}>
          {label}
        </p>
      )}
    </div>
  )
}
