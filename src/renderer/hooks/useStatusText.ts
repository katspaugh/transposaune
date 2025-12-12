import { Part } from '../components/SheetViewerVerovio'

interface UseStatusTextProps {
  isAvailable: boolean | null
  isProcessing: boolean
  progress: { stage: string; percent: number } | null
  error: string | null
  musicXml: string | null
  parts: Part[]
  effectiveSemitones: number
}

export function useStatusText({
  isAvailable,
  isProcessing,
  progress,
  error,
  musicXml,
  parts,
  effectiveSemitones
}: UseStatusTextProps): string {
  if (isAvailable === null) return 'Checking Audiveris...'
  if (!isAvailable) return 'Audiveris not found - please install it'
  if (isProcessing && progress) return `${progress.stage} (${progress.percent}%)`
  if (error) return `Error: ${error}`
  if (musicXml) {
    const transposeInfo = effectiveSemitones !== 0
      ? ` | Transposed: ${effectiveSemitones > 0 ? '+' : ''}${effectiveSemitones} semitones`
      : ''
    return `Ready - ${parts.length} part(s) loaded${transposeInfo}`
  }
  return 'Ready to load sheet music'
}
