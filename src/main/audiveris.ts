import { spawn, ChildProcess } from 'child_process'
import { existsSync } from 'fs'
import { readdir, writeFile } from 'fs/promises'
import { join, extname } from 'path'
import { app } from 'electron'
import { preprocessImages } from './image-preprocessing'
import { stitchImages } from './image-stitcher'
import { mergeMusicXMLDocuments } from './musicxml-merger'
import { fixMusicXMLIssues } from './musicxml-fixer'

interface AudiverisResult {
  success: boolean
  musicXmlPath?: string
  error?: string
}

interface ProcessProgress {
  stage: string
  percent: number
}

type ProgressCallback = (progress: ProcessProgress) => void

function getAudiverisPath(): string | null {
  const platform = process.platform
  const arch = process.arch

  // Check bundled location first (in production)
  const resourcesPath = app.isPackaged
    ? process.resourcesPath
    : join(__dirname, '../../resources')

  // Platform-specific paths for bundled version
  const platformKey = platform === 'darwin' ? `${platform}-${arch}` : `${platform}-x64`
  const bundledPaths: Record<string, string> = {
    'darwin-arm64': join(resourcesPath, 'audiveris-darwin-arm64', 'bin', 'Audiveris'),
    'darwin-x64': join(resourcesPath, 'audiveris-darwin-x64', 'bin', 'Audiveris'),
    'win32-x64': join(resourcesPath, 'audiveris-win32-x64', 'bin', 'Audiveris.bat'),
    'linux-x64': join(resourcesPath, 'audiveris-linux-x64', 'bin', 'Audiveris')
  }

  const bundledPath = bundledPaths[platformKey]
  if (bundledPath && existsSync(bundledPath)) {
    return bundledPath
  }

  // Check standard installation paths
  const systemPaths: Record<string, string[]> = {
    darwin: [
      '/Applications/Audiveris.app/Contents/MacOS/Audiveris',
      '/usr/local/bin/audiveris',
      join(process.env.HOME || '', 'Applications/Audiveris.app/Contents/MacOS/Audiveris')
    ],
    win32: [
      'C:\\Program Files\\Audiveris\\bin\\Audiveris.bat',
      'C:\\Program Files (x86)\\Audiveris\\bin\\Audiveris.bat'
    ],
    linux: [
      '/usr/bin/audiveris',
      '/usr/local/bin/audiveris',
      '/opt/audiveris/bin/Audiveris',
      join(process.env.HOME || '', '.local/bin/audiveris')
    ]
  }

  const paths = systemPaths[platform] || []
  for (const p of paths) {
    if (existsSync(p)) {
      return p
    }
  }

  // Check if audiveris is in PATH
  const pathEnv = process.env.PATH || ''
  const pathDirs = pathEnv.split(process.platform === 'win32' ? ';' : ':')
  for (const dir of pathDirs) {
    const audiverisPath = join(dir, process.platform === 'win32' ? 'audiveris.bat' : 'audiveris')
    if (existsSync(audiverisPath)) {
      return audiverisPath
    }
  }

  return null
}

export function isAudiverisAvailable(): boolean {
  return getAudiverisPath() !== null
}

export async function processSheetMusic(
  inputPaths: string | string[],
  outputDir: string,
  onProgress?: ProgressCallback
): Promise<AudiverisResult> {
  const audiverisPath = getAudiverisPath()

  if (!audiverisPath) {
    return {
      success: false,
      error: 'Audiveris not found. Please install Audiveris or ensure it is bundled with the app.'
    }
  }

  // Normalize to array
  const paths = Array.isArray(inputPaths) ? inputPaths : [inputPaths]

  // Verify all files exist
  for (const path of paths) {
    if (!existsSync(path)) {
      return {
        success: false,
        error: `Input file not found: ${path}`
      }
    }
  }

  // Handle multiple images by stitching them together first
  // This is much simpler than merging MusicXML files
  let processedPaths = paths
  const imageExtensions = ['.png', '.jpg', '.jpeg', '.tif', '.tiff', '.bmp']
  const areImages = paths.every(p => imageExtensions.includes(extname(p).toLowerCase()))

  console.log(`[OMR] Starting with ${paths.length} input file(s)`)

  if (areImages) {
    // Step 1: Preprocessing with denoise disabled to avoid Java errors
    onProgress?.({ stage: 'Preprocessing images...', percent: 3 })
    const pathsBeforePreprocessing = processedPaths
    try {
      processedPaths = await preprocessImages(processedPaths, {
        correctPerspective: true,  // NEW: Fix curved/angled photos
        deskew: true,
        enhanceContrast: true,
        denoise: false,  // Disabled - causes Java errors in Audiveris
        binarize: true
      })
      console.log(`[OMR] ✓ Preprocessed ${processedPaths.length} file(s)`)
    } catch (err) {
      console.warn('[OMR] ✗ Image preprocessing failed, using original images:', err)
      // Fall back to original images
      processedPaths = pathsBeforePreprocessing
    }

    // Step 2: Stitch preprocessed images into one tall image
    if (processedPaths.length > 1) {
      onProgress?.({ stage: 'Stitching images...', percent: 7 })
      const pathsBeforeStitching = processedPaths
      try {
        const stitchedPath = await stitchImages(processedPaths)
        processedPaths = [stitchedPath]
        console.log(`[OMR] ✓ Stitched ${pathsBeforeStitching.length} preprocessed images into single image: ${stitchedPath}`)
      } catch (err) {
        console.warn('[OMR] ✗ Image stitching failed, processing separately:', err)
        // Fall back to processing preprocessed images separately
        processedPaths = pathsBeforeStitching
      }
    }
  }

  console.log(`[OMR] Final files to process: ${processedPaths.length}`)
  processedPaths.forEach((p, idx) => console.log(`[OMR]   [${idx + 1}] ${p}`))

  return new Promise((resolve) => {
    const fileCount = processedPaths.length
    const pluralFiles = fileCount > 1 ? 's' : ''
    onProgress?.({ stage: `Starting Audiveris (${fileCount} file${pluralFiles})...`, percent: 0 })

    const args = [
      '-batch',
      '-export',
      '-output', outputDir,
      '--',
      ...processedPaths  // Pass preprocessed files
    ]

    console.log(`[OMR] Spawning Audiveris with args:`, args)

    // Set TESSDATA_PREFIX to bundled tessdata directory
    const resourcesPath = app.isPackaged
      ? process.resourcesPath
      : join(__dirname, '../../resources')
    const tessdataPath = join(resourcesPath, 'tessdata')

    const env = {
      ...process.env,
      TESSDATA_PREFIX: tessdataPath
    }

    console.log(`[OMR] Setting TESSDATA_PREFIX to: ${tessdataPath}`)

    const child: ChildProcess = spawn(audiverisPath, args, {
      stdio: ['ignore', 'pipe', 'pipe'],
      env
    })

    let stderr = ''

    child.stdout?.on('data', (data: Buffer) => {
      const output = data.toString()
      console.log('[Audiveris stdout]', output.trim())

      // Parse progress from Audiveris output
      if (output.includes('Loading')) {
        onProgress?.({ stage: 'Loading image...', percent: 10 })
      } else if (output.includes('SCALE')) {
        onProgress?.({ stage: 'Detecting scale...', percent: 20 })
      } else if (output.includes('GRID')) {
        onProgress?.({ stage: 'Building grid...', percent: 30 })
      } else if (output.includes('BINARY')) {
        onProgress?.({ stage: 'Processing binary...', percent: 40 })
      } else if (output.includes('HEADS')) {
        onProgress?.({ stage: 'Recognizing note heads...', percent: 50 })
      } else if (output.includes('STEMS')) {
        onProgress?.({ stage: 'Detecting stems...', percent: 60 })
      } else if (output.includes('BEAMS')) {
        onProgress?.({ stage: 'Processing beams...', percent: 70 })
      } else if (output.includes('SYMBOLS')) {
        onProgress?.({ stage: 'Recognizing symbols...', percent: 80 })
      } else if (output.includes('Export')) {
        onProgress?.({ stage: 'Exporting MusicXML...', percent: 90 })
      }
    })

    child.stderr?.on('data', (data: Buffer) => {
      const output = data.toString()
      stderr += output
      console.log('[Audiveris stderr]', output.trim())
    })

    child.on('close', async (code) => {
      if (code !== 0) {
        resolve({
          success: false,
          error: `Audiveris exited with code ${code}: ${stderr}`
        })
        return
      }

      onProgress?.({ stage: 'Complete', percent: 100 })

      console.log('[OMR] Audiveris completed, checking output directory:', outputDir)

      // Find the generated MusicXML file(s)
      try {
        const files = await readdir(outputDir)
        console.log(`[OMR] Found ${files.length} files in output directory:`, files)

        const mxlFiles = files.filter(f => f.endsWith('.mxl'))
        console.log(`[OMR] Found ${mxlFiles.length} .mxl file(s):`, mxlFiles)

        if (mxlFiles.length === 0) {
          console.error('[OMR] ✗ No MusicXML files generated by Audiveris')
          resolve({
            success: false,
            error: 'No MusicXML files generated by Audiveris'
          })
          return
        }

        // Check if Audiveris created movement files (.mvt1.mxl, .mvt2.mxl, etc.)
        // This happens when it detects multiple "pages" in a tall stitched image
        const movementFiles = mxlFiles.filter(f => /\.mvt\d+\.mxl$/.test(f))

        if (movementFiles.length > 1) {
          // Sort movement files by number
          const sortedMovements = movementFiles.sort((a, b) => {
            const aNum = parseInt(a.match(/\.mvt(\d+)\.mxl$/)?.[1] || '0', 10)
            const bNum = parseInt(b.match(/\.mvt(\d+)\.mxl$/)?.[1] || '0', 10)
            return aNum - bNum
          })

          console.log(`[OMR] Audiveris detected ${sortedMovements.length} movements, merging them...`)

          try {
            // Read all movement files
            const musicXmlDocs = await Promise.all(
              sortedMovements.map(async (file) => {
                const filePath = join(outputDir, file)
                console.log(`[OMR]   Reading ${file}`)
                return await readMusicXML(filePath)
              })
            )

            // Merge all movements into a single MusicXML document
            let mergedXml = mergeMusicXMLDocuments(musicXmlDocs)

            // Fix common Audiveris parsing issues
            mergedXml = fixMusicXMLIssues(mergedXml)

            // Write merged file
            const mergedPath = join(outputDir, 'merged.xml')
            await writeFile(mergedPath, mergedXml, 'utf-8')
            console.log(`[OMR] ✓ Merged ${sortedMovements.length} movements into: ${mergedPath}`)

            resolve({
              success: true,
              musicXmlPath: mergedPath
            })
          } catch (err) {
            console.error('[OMR] ✗ Failed to merge movement files:', err)
            resolve({
              success: false,
              error: `Failed to merge movement files: ${err}`
            })
          }
        } else if (mxlFiles.length === 1) {
          // Single file - apply fixes before using
          const musicXmlPath = join(outputDir, mxlFiles[0])
          console.log(`[OMR] ✓ Processing MusicXML file: ${musicXmlPath}`)
          
          try {
            // Read, fix, and write back
            let musicXml = await readMusicXML(musicXmlPath)
            musicXml = fixMusicXMLIssues(musicXml)
            
            // Write fixed XML
            const fixedPath = join(outputDir, 'fixed.xml')
            await writeFile(fixedPath, musicXml, 'utf-8')
            console.log(`[OMR] ✓ Applied fixes: ${fixedPath}`)
            
            resolve({
              success: true,
              musicXmlPath: fixedPath
            })
          } catch (err) {
            console.error('[OMR] Failed to apply fixes, using original:', err)
            resolve({
              success: true,
              musicXmlPath
            })
          }
        } else {
          // Multiple non-movement files - merge them
          // This happens when processing multiple pages separately
          console.log(`[OMR] Processing ${mxlFiles.length} separate pages, merging them...`)

          // Sort files by name to maintain page order
          const sortedFiles = mxlFiles.sort((a, b) => {
            // Natural sort to handle IMG_7775.mxl, IMG_7776.mxl correctly
            return a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' })
          })

          try {
            // Read all MusicXML files
            const musicXmlDocs = await Promise.all(
              sortedFiles.map(async (file) => {
                const filePath = join(outputDir, file)
                console.log(`[OMR]   Reading ${file}`)
                return await readMusicXML(filePath)
              })
            )

            // Merge all documents into a single MusicXML document
            let mergedXml = mergeMusicXMLDocuments(musicXmlDocs)

            // Fix common Audiveris parsing issues
            mergedXml = fixMusicXMLIssues(mergedXml)

            // Write merged file
            const mergedPath = join(outputDir, 'merged.xml')
            await writeFile(mergedPath, mergedXml, 'utf-8')
            console.log(`[OMR] ✓ Merged ${sortedFiles.length} pages into: ${mergedPath}`)

            resolve({
              success: true,
              musicXmlPath: mergedPath
            })
          } catch (err) {
            console.error('[OMR] ✗ Failed to merge MusicXML files:', err)
            resolve({
              success: false,
              error: `Failed to merge MusicXML files: ${err}`
            })
          }
        }
      } catch (err) {
        resolve({
          success: false,
          error: `Failed to read output directory: ${err}`
        })
      }
    })

    child.on('error', (err) => {
      resolve({
        success: false,
        error: `Failed to start Audiveris: ${err.message}`
      })
    })
  })
}

export async function readMusicXML(mxlPath: string): Promise<string> {
  const { readFile } = await import('fs/promises')
  const { extname } = await import('path')

  // Check file extension
  const ext = extname(mxlPath).toLowerCase()

  // If it's a plain XML file, just read it directly
  if (ext === '.xml' || ext === '.musicxml') {
    return await readFile(mxlPath, 'utf-8')
  }

  // For .mxl files (compressed MusicXML in ZIP format)
  if (ext === '.mxl') {
    try {
      const AdmZip = await import('adm-zip')
      const zip = new AdmZip.default(mxlPath)
      const entries = zip.getEntries()

      // Find the main MusicXML file (usually META-INF/container.xml points to it)
      const containerEntry = entries.find((e) => e.entryName === 'META-INF/container.xml')

      if (containerEntry) {
        const containerXml = containerEntry.getData().toString('utf8')
        const match = containerXml.match(/full-path="([^"]+)"/)
        if (match) {
          const rootFile = match[1]
          const rootEntry = entries.find((e) => e.entryName === rootFile)
          if (rootEntry) {
            return rootEntry.getData().toString('utf8')
          }
        }
      }

      // Fallback: look for any .xml file that's not in META-INF
      const xmlEntry = entries.find(
        (e) => e.entryName.endsWith('.xml') && !e.entryName.startsWith('META-INF')
      )

      if (xmlEntry) {
        return xmlEntry.getData().toString('utf8')
      }

      throw new Error('Could not find MusicXML content in .mxl file')
    } catch (err) {
      // If ZIP reading fails, try reading as plain text
      // (Audiveris might have exported as plain XML despite .mxl extension)
      console.warn('Failed to read .mxl as ZIP, trying as plain XML:', err)
      try {
        return await readFile(mxlPath, 'utf-8')
      } catch {
        throw new Error(`Failed to read MusicXML file: ${err}`)
      }
    }
  }

  // Unknown extension, try reading as plain text
  return await readFile(mxlPath, 'utf-8')
}
