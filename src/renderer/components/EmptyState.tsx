interface EmptyStateProps {
  isAudiverisAvailable: boolean | null
}

export function EmptyState({ isAudiverisAvailable }: EmptyStateProps) {
  return (
    <div className="empty-state">
      <span className="music-note">&#9835;</span>
      <p>Upload sheet music to begin</p>
      {isAudiverisAvailable === false && (
        <p className="error-hint">Audiveris not installed</p>
      )}
    </div>
  )
}
