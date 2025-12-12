import { test, expect, _electron as electron, ElectronApplication, Page } from '@playwright/test'
import * as path from 'path'
import { existsSync } from 'fs'

test.describe('OMR Pipeline E2E - With Error Detection', () => {
  let electronApp: ElectronApplication
  let window: Page
  const consoleMessages: string[] = []
  const errorMessages: string[] = []

  test.beforeEach(async () => {
    // Clear message arrays
    consoleMessages.length = 0
    errorMessages.length = 0

    electronApp = await electron.launch({
      args: [path.join(__dirname, '../out/main/index.js')],
    })

    // Capture console output from Electron main process
    electronApp.on('console', (msg) => {
      const text = msg.text()
      consoleMessages.push(text)

      // Capture specific error patterns
      if (
        text.includes('NullPointerException') ||
        text.includes('java.lang') ||
        text.includes('[OMR] ✗') ||
        text.includes('Could not export') ||
        text.includes('No MusicXML files generated')
      ) {
        errorMessages.push(text)
      }
    })

    window = await electronApp.firstWindow()
    await window.waitForLoadState('domcontentloaded')

    // Also capture renderer console
    window.on('console', (msg) => {
      consoleMessages.push(`[Renderer] ${msg.text()}`)
    })
  })

  test.afterEach(async () => {
    await electronApp.close()
  })

  test('should process example images without Audiveris errors', async () => {
    test.setTimeout(180000) // 3 minutes for full OMR pipeline

    // Verify example files exist
    const file1 = path.join(__dirname, '../examples/IMG_7775.jpeg')
    const file2 = path.join(__dirname, '../examples/IMG_7776.jpeg')

    console.log('Checking for example files...')
    expect(existsSync(file1), `File should exist: ${file1}`).toBeTruthy()
    expect(existsSync(file2), `File should exist: ${file2}`).toBeTruthy()
    console.log('✓ Example files found')

    // Process files using test helper
    console.log('Starting OMR processing...')
    await window.evaluate(async (files) => {
      const processFile = (window as any).__testProcessFile
      if (!processFile) {
        throw new Error('Test helper __testProcessFile not available')
      }
      await processFile(files)
    }, [file1, file2])

    // Wait for processing to complete (sheet viewer appears or error)
    console.log('Waiting for processing to complete...')

    try {
      await expect(window.locator('.sheet-viewer')).toBeVisible({ timeout: 150000 })
      console.log('✓ Sheet viewer appeared - processing succeeded')
    } catch (err) {
      // Processing might have failed - check error messages
      console.log('Sheet viewer did not appear - checking for errors')
    }

    // Wait a bit for all console messages to be captured
    await window.waitForTimeout(2000)

    // Log all captured messages for debugging
    console.log('\n=== Captured Console Messages ===')
    consoleMessages.forEach((msg, idx) => {
      if (idx < 50) { // Only log first 50 to avoid spam
        console.log(msg)
      }
    })
    if (consoleMessages.length > 50) {
      console.log(`... and ${consoleMessages.length - 50} more messages`)
    }

    // Check for specific log patterns
    const hasPreprocessing = consoleMessages.some(msg => msg.includes('[Deskew] Detected'))
    const hasStitching = consoleMessages.some(msg => msg.includes('[Stitcher]'))
    const hasAudiveris = consoleMessages.some(msg => msg.includes('[Audiveris'))
    const hasOMRStart = consoleMessages.some(msg => msg.includes('[OMR] Starting with'))

    console.log('\n=== Pipeline Stages ===')
    console.log(`Preprocessing: ${hasPreprocessing ? '✓' : '✗'}`)
    console.log(`Stitching: ${hasStitching ? '✓' : '✗'}`)
    console.log(`OMR Start: ${hasOMRStart ? '✓' : '✗'}`)
    console.log(`Audiveris: ${hasAudiveris ? '✓' : '✗'}`)

    // Assert preprocessing and stitching worked
    expect(hasPreprocessing, 'Preprocessing should have run').toBeTruthy()
    expect(hasStitching, 'Image stitching should have run').toBeTruthy()
    expect(hasOMRStart, 'OMR processing should have started').toBeTruthy()
    expect(hasAudiveris, 'Audiveris should have been invoked').toBeTruthy()

    // Check for Java errors
    console.log('\n=== Error Detection ===')
    if (errorMessages.length > 0) {
      console.log('⚠️  Errors detected:')
      errorMessages.forEach(msg => console.log(`  - ${msg}`))
    } else {
      console.log('✓ No errors detected')
    }

    // Check for specific failure patterns
    const hasNullPointer = errorMessages.some(msg => msg.includes('NullPointerException'))
    const hasNoMusicXML = errorMessages.some(msg => msg.includes('No MusicXML files generated'))
    const hasExportFailure = errorMessages.some(msg => msg.includes('Could not export'))

    // Report detailed findings
    if (hasNullPointer) {
      console.error('❌ FOUND: Java NullPointerException in Audiveris')
      const nullPointerMsgs = errorMessages.filter(msg => msg.includes('NullPointerException'))
      nullPointerMsgs.forEach(msg => console.error(`   ${msg}`))
    }

    if (hasNoMusicXML) {
      console.error('❌ FOUND: Audiveris did not generate MusicXML output')
    }

    if (hasExportFailure) {
      console.error('❌ FOUND: Audiveris export failed')
    }

    // These assertions will fail if errors are detected, making the test fail
    expect(hasNullPointer, 'Should not have Java NullPointerException').toBeFalsy()
    expect(hasNoMusicXML, 'Should generate MusicXML files').toBeFalsy()
    expect(hasExportFailure, 'Export should succeed').toBeFalsy()

    // Verify successful OMR processing
    const hasSuccessfulOMR = consoleMessages.some(
      msg => msg.includes('[OMR] ✓') || msg.includes('MusicXML file:')
    )
    expect(hasSuccessfulOMR, 'OMR processing should complete successfully').toBeTruthy()

    console.log('\n✅ OMR pipeline test passed - no errors detected')
  })

  test('should process single image without errors', async () => {
    test.setTimeout(120000) // 2 minutes for single image

    const file1 = path.join(__dirname, '../examples/IMG_7775.jpeg')
    expect(existsSync(file1)).toBeTruthy()

    console.log('Processing single image...')
    await window.evaluate(async (file) => {
      const processFile = (window as any).__testProcessFile
      await processFile(file)
    }, file1)

    // Wait for completion
    try {
      await expect(window.locator('.sheet-viewer')).toBeVisible({ timeout: 100000 })
      console.log('✓ Single image processed successfully')
    } catch {
      console.log('⚠️  Sheet viewer did not appear')
    }

    await window.waitForTimeout(2000)

    // Check for errors
    const hasErrors = errorMessages.length > 0
    if (hasErrors) {
      console.error('Errors found during single image processing:')
      errorMessages.forEach(msg => console.error(`  - ${msg}`))
    }

    expect(hasErrors, 'Single image processing should not have errors').toBeFalsy()
  })

  test('should log preprocessing details', async () => {
    test.setTimeout(180000)

    const file1 = path.join(__dirname, '../examples/IMG_7775.jpeg')
    const file2 = path.join(__dirname, '../examples/IMG_7776.jpeg')

    await window.evaluate(async (files) => {
      const processFile = (window as any).__testProcessFile
      await processFile(files)
    }, [file1, file2])

    // Wait for processing
    await window.waitForTimeout(30000)

    // Check preprocessing logs
    const deskewLogs = consoleMessages.filter(msg => msg.includes('[Deskew]'))
    const preprocessLogs = consoleMessages.filter(msg => msg.includes('[Preprocessing]'))
    const stitcherLogs = consoleMessages.filter(msg => msg.includes('[Stitcher]'))

    console.log('\n=== Preprocessing Details ===')
    console.log('Deskew logs:', deskewLogs.length)
    deskewLogs.forEach(log => console.log(`  ${log}`))

    console.log('Preprocess logs:', preprocessLogs.length)
    preprocessLogs.forEach(log => console.log(`  ${log}`))

    console.log('Stitcher logs:', stitcherLogs.length)
    stitcherLogs.forEach(log => console.log(`  ${log}`))

    // Verify preprocessing ran
    expect(deskewLogs.length).toBeGreaterThan(0)
    expect(stitcherLogs.length).toBeGreaterThan(0)

    // Check for angle detection
    const hasAngleDetection = deskewLogs.some(log => log.includes('Detected') && log.includes('angle'))
    expect(hasAngleDetection, 'Should detect skew angles').toBeTruthy()
  })
})
