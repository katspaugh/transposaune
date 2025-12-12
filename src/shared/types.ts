export interface ElectronAPI {
  ipcRenderer: {
    send: (channel: string, ...args: unknown[]) => void
    on: (channel: string, func: (...args: unknown[]) => void) => void
  }
}

export interface ProcessingProgress {
  stage: string
  percent: number
}

export interface ProcessResult {
  success: boolean
  musicXml?: string
  originalPath?: string
  pageCount?: number
  error?: string
}

export interface ExportResult {
  success: boolean
  path?: string
  error?: string
}

export interface API {
  checkAudiveris: () => Promise<boolean>
  processSheet: (filePath: string | string[]) => Promise<ProcessResult>
  selectFile: () => Promise<string | string[] | null>
  print: () => Promise<void>
  exportPdf: () => Promise<ExportResult>
  exportMusicXml: (musicXml: string) => Promise<ExportResult>
  onProcessingProgress: (callback: (progress: ProcessingProgress) => void) => () => void
}

declare global {
  interface Window {
    electron: ElectronAPI
    api: API
  }
}
