import { ipcMain, dialog, BrowserWindow } from 'electron'
import { join, dirname } from 'path'
import { mkdtemp, rm } from 'fs/promises'
import { tmpdir } from 'os'
import { processSheetMusic, readMusicXML, isAudiverisAvailable } from './audiveris'
import { settings, getSettings, updateSettings } from './settings'

interface ProcessingState {
  stage: string
  percent: number
}

let currentProcessingState: ProcessingState = { stage: 'Idle', percent: 0 }

export function setupIpcHandlers(): void {
  // Check if Audiveris is available
  ipcMain.handle('check-audiveris', () => {
    return isAudiverisAvailable()
  })

  // Get current processing state
  ipcMain.handle('get-processing-state', () => {
    return currentProcessingState
  })

  // Get settings
  ipcMain.handle('get-settings', () => {
    return getSettings()
  })

  // Update settings
  ipcMain.handle('update-settings', (_event, updates) => {
    updateSettings(updates)
    return getSettings()
  })

  // Select file dialog (supports multiple files)
  ipcMain.handle('select-file', async () => {
    const lastDir = settings.get('lastOpenDirectory')

    const result = await dialog.showOpenDialog({
      defaultPath: lastDir || undefined,
      properties: ['openFile', 'multiSelections'],  // Allow multiple files
      filters: [
        { name: 'All Supported', extensions: ['pdf', 'png', 'jpg', 'jpeg', 'tiff', 'tif', 'xml', 'musicxml', 'mxl'] },
        { name: 'Images', extensions: ['pdf', 'png', 'jpg', 'jpeg', 'tiff', 'tif'] },
        { name: 'MusicXML', extensions: ['xml', 'musicxml', 'mxl'] },
        { name: 'All Files', extensions: ['*'] }
      ]
    })

    if (result.canceled || result.filePaths.length === 0) {
      return null
    }

    // Save the directory for next time
    const filePath = result.filePaths[0]
    settings.set('lastOpenDirectory', dirname(filePath))

    // Return array of paths (or single path for backward compatibility)
    return result.filePaths.length === 1 ? result.filePaths[0] : result.filePaths
  })

  // Process sheet music with Audiveris (or load MusicXML directly)
  ipcMain.handle('process-sheet', async (event, filePaths: string | string[]) => {
    const mainWindow = BrowserWindow.fromWebContents(event.sender)
    const paths = Array.isArray(filePaths) ? filePaths : [filePaths]

    // Check if the file is already MusicXML
    const firstPath = paths[0]
    const ext = firstPath.toLowerCase().match(/\.([^.]+)$/)?.[1]
    const isMusicXML = ext && ['xml', 'musicxml', 'mxl'].includes(ext)

    if (isMusicXML) {
      // Direct MusicXML import - skip Audiveris
      try {
        currentProcessingState = { stage: 'Loading MusicXML...', percent: 50 }
        mainWindow?.webContents.send('processing-progress', currentProcessingState)

        const fs = await import('fs/promises')
        let musicXml: string

        if (ext === 'mxl') {
          // Compressed MusicXML
          musicXml = await readMusicXML(firstPath)
        } else {
          // Plain XML
          musicXml = await fs.readFile(firstPath, 'utf-8')
        }

        currentProcessingState = { stage: 'Complete', percent: 100 }
        mainWindow?.webContents.send('processing-progress', currentProcessingState)

        return {
          success: true,
          musicXml,
          originalPath: firstPath,
          pageCount: 1
        }
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : String(error)
        }
      } finally {
        currentProcessingState = { stage: 'Idle', percent: 0 }
      }
    }

    // Image/PDF file - process with Audiveris
    const tempDir = await mkdtemp(join(tmpdir(), 'transposaune-'))

    try {
      const result = await processSheetMusic(filePaths, tempDir, (progress) => {
        currentProcessingState = progress
        mainWindow?.webContents.send('processing-progress', progress)
      })

      if (!result.success) {
        return { success: false, error: result.error }
      }

      // Read and return the MusicXML content
      const musicXml = await readMusicXML(result.musicXmlPath!)

      return {
        success: true,
        musicXml,
        originalPath: paths[0],  // First file for compatibility
        pageCount: paths.length
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      }
    } finally {
      // Clean up temp directory
      try {
        await rm(tempDir, { recursive: true, force: true })
      } catch {
        // Ignore cleanup errors
      }
      currentProcessingState = { stage: 'Idle', percent: 0 }
    }
  })

  // Print functionality
  ipcMain.handle('print', async (event) => {
    const mainWindow = BrowserWindow.fromWebContents(event.sender)
    if (mainWindow) {
      mainWindow.webContents.print({
        silent: false,
        printBackground: true
      })
    }
  })

  // Export to PDF
  ipcMain.handle('export-pdf', async (event) => {
    const mainWindow = BrowserWindow.fromWebContents(event.sender)
    if (!mainWindow) return { success: false, error: 'No window' }

    const result = await dialog.showSaveDialog(mainWindow, {
      defaultPath: 'sheet-music.pdf',
      filters: [{ name: 'PDF', extensions: ['pdf'] }]
    })

    if (result.canceled || !result.filePath) {
      return { success: false, error: 'Cancelled' }
    }

    try {
      const data = await mainWindow.webContents.printToPDF({
        printBackground: true,
        landscape: false
      })

      const fs = await import('fs/promises')
      await fs.writeFile(result.filePath, data)

      return { success: true, path: result.filePath }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      }
    }
  })

  // Export MusicXML
  ipcMain.handle('export-musicxml', async (event, musicXml: string) => {
    const mainWindow = BrowserWindow.fromWebContents(event.sender)
    if (!mainWindow) return { success: false, error: 'No window' }

    const result = await dialog.showSaveDialog(mainWindow, {
      defaultPath: 'sheet-music.musicxml',
      filters: [
        { name: 'MusicXML', extensions: ['musicxml', 'xml'] },
        { name: 'All Files', extensions: ['*'] }
      ]
    })

    if (result.canceled || !result.filePath) {
      return { success: false, error: 'Cancelled' }
    }

    try {
      const fs = await import('fs/promises')
      await fs.writeFile(result.filePath, musicXml, 'utf-8')

      return { success: true, path: result.filePath }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      }
    }
  })
}
