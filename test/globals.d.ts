import type { ProcessingProgress, ProcessResult, ExportResult } from '../src/preload'

declare global {
  interface Window {
    api: {
      checkAudiveris: () => Promise<boolean>
      processSheet: (filePath: string) => Promise<ProcessResult>
      selectFile: () => Promise<string | null>
      print: () => Promise<void>
      exportPdf: () => Promise<ExportResult>
      onProcessingProgress: (callback: (progress: ProcessingProgress) => void) => () => void
    }
    electron: unknown
  }
}

export {}
