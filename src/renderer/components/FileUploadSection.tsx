import { Button, ProgressBar } from './ui'

interface FileUploadSectionProps {
  isProcessing: boolean
  isAvailable: boolean | null
  musicXml: string | null
  progress: { stage: string; percent: number } | null
  onUpload: () => void
  onReset: () => void
}

export function FileUploadSection({
  isProcessing,
  isAvailable,
  musicXml,
  progress,
  onUpload,
  onReset
}: FileUploadSectionProps) {
  return (
    <>
      <div className="control-group">
        <Button
          variant="primary"
          onClick={onUpload}
          disabled={isProcessing || isAvailable === false}
        >
          {isProcessing ? 'Processing...' : 'Upload Sheet Music'}
        </Button>

        {musicXml && (
          <Button variant="ghost" onClick={onReset} style={{ marginTop: 'var(--space-sm)' }}>
            Clear
          </Button>
        )}
      </div>

      {isProcessing && progress && (
        <div className="control-group">
          <ProgressBar percent={progress.percent} label={progress.stage} />
        </div>
      )}
    </>
  )
}
