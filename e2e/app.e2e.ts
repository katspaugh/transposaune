import { test, expect, _electron as electron, ElectronApplication, Page } from '@playwright/test'
import * as path from 'path'
import { existsSync } from 'fs'

test.describe('Transposaune E2E - Happy Path', () => {
  let electronApp: ElectronApplication
  let window: Page

  test.beforeEach(async () => {
    electronApp = await electron.launch({
      args: [path.join(__dirname, '../out/main/index.js')],
    })
    window = await electronApp.firstWindow()
    await window.waitForLoadState('domcontentloaded')
  })

  test.afterEach(async () => {
    await electronApp.close()
  })

  test('should complete full workflow: load → select part → transpose → verify', async () => {
    test.setTimeout(180000) // 3 minutes for full workflow with Audiveris
    // Verify example files exist
    const file1 = path.join(__dirname, '../examples/IMG_7775.jpeg')
    const file2 = path.join(__dirname, '../examples/IMG_7776.jpeg')
    expect(existsSync(file1)).toBeTruthy()
    expect(existsSync(file2)).toBeTruthy()

    // Step 1: Check initial state
    await expect(window.locator('h1:has-text("Transposaune")')).toBeVisible()
    await expect(window.locator('button:has-text("Upload Sheet Music")')).toBeVisible()
    
    // Step 2: Call the exposed test helper to process files
    console.log('Triggering file processing...')
    await window.evaluate(async (files) => {
      const processFile = (window as any).__testProcessFile
      if (!processFile) {
        throw new Error('Test helper __testProcessFile not available')
      }
      // Call processFile with the array of file paths
      await processFile(files)
    }, [file1, file2])
    
    // Step 3: Wait for sheet viewer to appear (indicates successful load)
    console.log('Waiting for sheet to load...')
    await expect(window.locator('.sheet-viewer')).toBeVisible({ timeout: 150000 })
    
    // Step 4: Verify sheet music is loaded
    await expect(window.locator('.sheet-viewer')).toBeVisible({ timeout: 5000 })
    console.log('Sheet music loaded successfully')
    
    // Step 5: Verify parts dropdown is populated
    const partSelect = window.locator('select').filter({ hasText: /Part|Voice/ }).first()
    await expect(partSelect).toBeVisible({ timeout: 5000 })
    await expect(partSelect).toBeEnabled()
    
    // Get part options
    const options = await partSelect.locator('option').allTextContents()
    console.log('Available parts:', options)
    expect(options.length).toBeGreaterThan(0)
    
    // Step 7: Select a specific part (not "All parts")
    if (options.length > 1) {
      // Select the second option (first is "All parts")
      const secondOption = await partSelect.locator('option').nth(1).getAttribute('value')
      if (secondOption) {
        await partSelect.selectOption(secondOption)
        console.log('Selected part:', secondOption)
        
        // Verify selection persists (check for dropdown reset bug)
        await window.waitForTimeout(500) // Wait for any re-renders
        const selectedValue = await partSelect.inputValue()
        expect(selectedValue).toBe(secondOption)
        console.log('✅ Part selection persisted (no reset)')
      }
    }
    
    // Step 8: Apply transposition
    const transposeSelect = window.locator('select').filter({ hasText: /Transpose|Concert|Bb/ }).first()
    await expect(transposeSelect).toBeVisible()
    await expect(transposeSelect).toBeEnabled()
    
    // Get transpose options
    const transposeOptions = await transposeSelect.locator('option').allTextContents()
    console.log('Transpose options:', transposeOptions)
    
    // Select Bb Trumpet (-2 semitones)
    const bbOption = await transposeSelect.locator('option:has-text("Bb")').first()
    if (await bbOption.count() > 0) {
      const bbValue = await bbOption.getAttribute('value')
      if (bbValue) {
        await transposeSelect.selectOption(bbValue)
        console.log('Selected transpose: Bb Trumpet')
        
        // Verify transposition is applied
        await window.waitForTimeout(1000) // Wait for re-render
        const transposeValue = await transposeSelect.inputValue()
        expect(transposeValue).toBe(bbValue)
        console.log('✅ Transposition applied')
      }
    }
    
    // Step 9: Verify highlighting works (check for colored vs greyed notes)
    // This is hard to test visually, but we can check that rendering happened
    const sheetViewer = window.locator('.sheet-viewer')
    await expect(sheetViewer).toBeVisible()
    
    // Check if SVG elements are present (OSMD renders to SVG)
    const svgElements = sheetViewer.locator('svg')
    const svgCount = await svgElements.count()
    console.log('SVG elements rendered:', svgCount)
    expect(svgCount).toBeGreaterThan(0)
    
    // Step 10: Verify print button is enabled
    const printButton = window.locator('button:has-text("Print")')
    await expect(printButton).toBeEnabled()
    console.log('✅ Print button enabled')
    
    // Step 11: Verify export button is enabled
    const exportButton = window.locator('button:has-text("Export PDF")')
    await expect(exportButton).toBeEnabled()
    console.log('✅ Export PDF button enabled')
    
    console.log('🎉 Happy path test completed successfully!')
  })

  test('should verify multi-page support', async () => {
    test.setTimeout(150000) // 2.5 minutes for Audiveris processing
    
    const file1 = path.join(__dirname, '../examples/IMG_7775.jpeg')
    const file2 = path.join(__dirname, '../examples/IMG_7776.jpeg')
    
    // Process both files using test helper
    await window.evaluate(async ([f1, f2]) => {
      const processFile = (window as any).__testProcessFile
      await processFile([f1, f2])
    }, [file1, file2])
    
    // Wait for sheet to load
    await expect(window.locator('.sheet-viewer')).toBeVisible({ timeout: 150000 })
    
    // Verify multi-page by checking if multiple parts are loaded (multi-page scores have more parts)
    // Or check the complete message
    const statusBar = window.locator('[class*="status"]')
    await expect(statusBar).toContainText(/Complete|Ready/)
    
    // Check that we have a substantial score loaded (multi-page should have multiple parts)
    const partSelect = window.locator('select').first()
    const options = await partSelect.locator('option').allTextContents()
    console.log('Loaded parts count:', options.length)
    expect(options.length).toBeGreaterThan(1) // Should have multiple parts from 2 pages
    console.log('✅ Multi-page support working')
  })

  test('should verify transposition changes notes', async () => {
    test.setTimeout(150000) // 2.5 minutes for Audiveris processing
    
    const file1 = path.join(__dirname, '../examples/IMG_7775.jpeg')
    
    // Process single file
    await window.evaluate(async (f1) => {
      const processFile = (window as any).__testProcessFile
      await processFile(f1)
    }, file1)
    
    // Wait for sheet to load
    await expect(window.locator('.sheet-viewer')).toBeVisible({ timeout: 150000 })
    
    // Get initial SVG content (snapshot before transpose)
    const sheetViewer = window.locator('.sheet-viewer')
    const svgBefore = await sheetViewer.innerHTML()
    
    // Apply transposition - get all selects and find the transpose one
    const selects = window.locator('select')
    const selectCount = await selects.count()
    let transposeSelect = null
    
    // Find the transpose select by checking options
    for (let i = 0; i < selectCount; i++) {
      const select = selects.nth(i)
      const options = await select.locator('option').allTextContents()
      if (options.some(opt => opt.includes('Bb Instruments'))) {
        transposeSelect = select
        break
      }
    }
    
    expect(transposeSelect).toBeTruthy()
    if (transposeSelect) {
      // Find Bb option value
      const bbOption = await transposeSelect.locator('option').filter({ hasText: 'Bb Instruments' })
      const bbValue = await bbOption.getAttribute('value')
      await transposeSelect.selectOption(bbValue!)
    }
    
    // Wait for re-render
    await window.waitForTimeout(1000)
    
    // Get SVG content after transpose
    const svgAfter = await sheetViewer.innerHTML()
    
    // Verify content changed (notes should be different)
    expect(svgBefore).not.toBe(svgAfter)
    console.log('✅ Transposition changes rendered music')
  })
})
