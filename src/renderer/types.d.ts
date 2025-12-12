/// <reference types="vite/client" />

import type { ProcessingProgress, ProcessResult, ExportResult } from '../preload'

declare global {
  interface Window {
    api: {
      checkAudiveris: () => Promise<boolean>
      processSheet: (filePath: string | string[]) => Promise<ProcessResult>
      selectFile: () => Promise<string | string[] | null>
      print: () => Promise<void>
      exportPdf: () => Promise<ExportResult>
      exportMusicXml: (musicXml: string) => Promise<ExportResult>
      onProcessingProgress: (callback: (progress: ProcessingProgress) => void) => () => void
    }
    electron: unknown
  }
}

export {}
