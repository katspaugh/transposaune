import { useState, useEffect, useCallback } from 'react'
import type { ProcessingProgress, ProcessResult } from '../../shared/types'

interface UseAudiverisReturn {
  isAvailable: boolean | null
  isProcessing: boolean
  progress: ProcessingProgress | null
  error: string | null
  musicXml: string | null
  processFile: (filePath: string | string[]) => Promise<void>
  selectAndProcess: () => Promise<void>
  reset: () => void
}

export function useAudiveris(): UseAudiverisReturn {
  const [isAvailable, setIsAvailable] = useState<boolean | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [progress, setProgress] = useState<ProcessingProgress | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [musicXml, setMusicXml] = useState<string | null>(null)

  useEffect(() => {
    // Check if Audiveris is available on mount
    window.api.checkAudiveris().then(setIsAvailable)

    // Listen for processing progress updates
    const unsubscribe = window.api.onProcessingProgress((p) => {
      setProgress(p)
    })

    return unsubscribe
  }, [])

  const processFile = useCallback(async (filePath: string | string[]) => {
    setIsProcessing(true)
    setError(null)
    setProgress({ stage: 'Starting...', percent: 0 })

    try {
      const result: ProcessResult = await window.api.processSheet(filePath)

      if (result.success && result.musicXml) {
        setMusicXml(result.musicXml)
        const pageInfo = result.pageCount && result.pageCount > 1 
          ? ` (${result.pageCount} pages)` 
          : ''
        setProgress({ stage: `Complete${pageInfo}`, percent: 100 })
      } else {
        setError(result.error || 'Unknown error occurred')
        setProgress(null)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
      setProgress(null)
    } finally {
      setIsProcessing(false)
    }
  }, [])

  const selectAndProcess = useCallback(async () => {
    const filePath = await window.api.selectFile()
    if (filePath) {
      await processFile(filePath)
    }
  }, [processFile])

  const reset = useCallback(() => {
    setMusicXml(null)
    setError(null)
    setProgress(null)
  }, [])

  return {
    isAvailable,
    isProcessing,
    progress,
    error,
    musicXml,
    processFile,
    selectAndProcess,
    reset
  }
}
