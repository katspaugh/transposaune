import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'

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

const api = {
  // Check if Audiveris is available
  checkAudiveris: (): Promise<boolean> =>
    ipcRenderer.invoke('check-audiveris'),

  // Audiveris OMR processing
  processSheet: (filePath: string | string[]): Promise<ProcessResult> =>
    ipcRenderer.invoke('process-sheet', filePath),

  // File operations
  selectFile: (): Promise<string | string[] | null> =>
    ipcRenderer.invoke('select-file'),

  // Print functionality
  print: (): Promise<void> =>
    ipcRenderer.invoke('print'),

  // Export to PDF
  exportPdf: (): Promise<ExportResult> =>
    ipcRenderer.invoke('export-pdf'),

  // Export to MusicXML
  exportMusicXml: (musicXml: string): Promise<ExportResult> =>
    ipcRenderer.invoke('export-musicxml', musicXml),

  // Listen for processing progress
  onProcessingProgress: (callback: (progress: ProcessingProgress) => void): (() => void) => {
    const handler = (_event: Electron.IpcRendererEvent, progress: ProcessingProgress) => {
      callback(progress)
    }
    ipcRenderer.on('processing-progress', handler)
    return () => {
      ipcRenderer.removeListener('processing-progress', handler)
    }
  }
}

if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('api', api)
  } catch (error) {
    console.error(error)
  }
} else {
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore - Non-isolated context
  window.electron = electronAPI
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore - Non-isolated context
  window.api = api
}
