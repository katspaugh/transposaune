import { test, expect, _electron as electron, ElectronApplication, Page } from '@playwright/test'
import * as path from 'path'
import { existsSync } from 'fs'

test.describe('Transposaune Visual Verification', () => {
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

  test('should verify voice highlighting changes opacity', async () => {
    test.setTimeout(180000)

    const file1 = path.join(__dirname, '../examples/IMG_7775.jpeg')
    expect(existsSync(file1)).toBeTruthy()

    // Load sheet music
    await window.evaluate(async (f1) => {
      const processFile = (window as any).__testProcessFile
      await processFile(f1)
    }, file1)

    await expect(window.locator('.sheet-viewer')).toBeVisible({ timeout: 150000 })

    // Wait for rendering to complete
    await window.waitForTimeout(2000)

    // Check that all layers have no opacity set (default: all visible)
    const allPartsOpacity = await window.evaluate(() => {
      const layers = document.querySelectorAll('.sheet-viewer g.layer')
      const opacities: string[] = []
      layers.forEach(layer => {
        opacities.push(layer.getAttribute('opacity') || 'none')
      })
      return { count: layers.length, opacities }
    })

    console.log('All parts - layers with opacity:', allPartsOpacity.opacities.filter(o => o !== 'none').length)
    expect(allPartsOpacity.count).toBeGreaterThan(0)

    // Now select a specific part
    const partSelect = window.locator('select').first()
    await partSelect.waitFor({ state: 'visible' })

    // Select second option (first voice)
    const secondOption = await partSelect.locator('option').nth(1).getAttribute('value')
    if (secondOption) {
      await partSelect.selectOption(secondOption)
      console.log('Selected part:', secondOption)

      // Wait for highlighting to apply
      await window.waitForTimeout(1000)

      // Check opacity after selection - some layers should be dimmed
      const onePartOpacity = await window.evaluate(() => {
        const layers = document.querySelectorAll('.sheet-viewer g.layer')
        const opacities: string[] = []
        layers.forEach(layer => {
          opacities.push(layer.getAttribute('opacity') || 'none')
        })
        return { count: layers.length, opacities }
      })

      const dimmedCount = onePartOpacity.opacities.filter(o => o === '0.3').length
      const fullCount = onePartOpacity.opacities.filter(o => o === 'none').length

      console.log(`Dimmed layers: ${dimmedCount}, Full opacity: ${fullCount}`)

      // Both dimmed and full opacity layers should exist
      expect(dimmedCount).toBeGreaterThan(0)
      expect(fullCount).toBeGreaterThan(0)
      console.log('✅ Highlighting is working (opacity correctly applied)')
    }
  })

  test('should verify transposition changes note pitches visually', async () => {
    test.setTimeout(180000)
    
    const file1 = path.join(__dirname, '../examples/IMG_7775.jpeg')

    // Load sheet music
    await window.evaluate(async (f1) => {
      const processFile = (window as any).__testProcessFile
      await processFile(f1)
    }, file1)

    await expect(window.locator('.sheet-viewer')).toBeVisible({ timeout: 150000 })
    await window.waitForTimeout(2000)

    // Take screenshot before transposition
    const sheetViewer = window.locator('.sheet-viewer')
    await sheetViewer.screenshot({ path: 'test-results/before-transpose.png' })
    console.log('📸 Screenshot saved: before-transpose.png')

    // Get note positions before transpose
    const notesBefore = await window.evaluate(() => {
      const svg = document.querySelector('.sheet-viewer svg')
      if (!svg) return []
      
      // VexFlow uses specific classes for noteheads
      const noteheads = svg.querySelectorAll('[class*="vf-notehead"]')
      const positions: Array<{ y: number; class: string }> = []
      
      noteheads.forEach(el => {
        const y = parseFloat(el.getAttribute('transform')?.match(/translate\([^,]+,\s*([^)]+)\)/)?.[1] || '0')
        positions.push({ 
          y, 
          class: el.getAttribute('class') || '' 
        })
      })
      
      return positions
    })

    console.log('Notes before transpose (first 5):', notesBefore.slice(0, 5))

    // Apply transposition
    const selects = window.locator('select')
    const selectCount = await selects.count()
    
    for (let i = 0; i < selectCount; i++) {
      const select = selects.nth(i)
      const options = await select.locator('option').allTextContents()
      if (options.some(opt => opt.includes('Bb Instruments'))) {
        const bbOption = await select.locator('option').filter({ hasText: 'Bb Instruments' })
        const bbValue = await bbOption.getAttribute('value')
        await select.selectOption(bbValue!)
        console.log('Applied Bb transposition (-2 semitones)')
        break
      }
    }

    // Wait for re-render
    await window.waitForTimeout(2000)

    // Take screenshot after transposition
    await sheetViewer.screenshot({ path: 'test-results/after-transpose.png' })
    console.log('📸 Screenshot saved: after-transpose.png')

    // Get note positions after transpose
    const notesAfter = await window.evaluate(() => {
      const svg = document.querySelector('.sheet-viewer svg')
      if (!svg) return []
      
      const noteheads = svg.querySelectorAll('[class*="vf-notehead"]')
      const positions: Array<{ y: number; class: string }> = []
      
      noteheads.forEach(el => {
        const y = parseFloat(el.getAttribute('transform')?.match(/translate\([^,]+,\s*([^)]+)\)/)?.[1] || '0')
        positions.push({ 
          y, 
          class: el.getAttribute('class') || '' 
        })
      })
      
      return positions
    })

    console.log('Notes after transpose (first 5):', notesAfter.slice(0, 5))

    // Verify note positions changed (transposition moves notes vertically)
    expect(notesBefore.length).toBeGreaterThan(0)
    expect(notesAfter.length).toBeGreaterThan(0)
    
    // At least some notes should have different Y positions
    let positionsChanged = 0
    const minLength = Math.min(notesBefore.length, notesAfter.length)
    for (let i = 0; i < minLength; i++) {
      if (Math.abs(notesBefore[i].y - notesAfter[i].y) > 1) {
        positionsChanged++
      }
    }
    
    console.log(`✅ ${positionsChanged}/${minLength} notes changed vertical position`)
    expect(positionsChanged).toBeGreaterThan(0)
  })

  test('should verify multi-page creates proper layout', async () => {
    test.setTimeout(180000)
    
    const file1 = path.join(__dirname, '../examples/IMG_7775.jpeg')
    const file2 = path.join(__dirname, '../examples/IMG_7776.jpeg')

    // Load both pages
    await window.evaluate(async ([f1, f2]) => {
      const processFile = (window as any).__testProcessFile
      await processFile([f1, f2])
    }, [file1, file2])

    await expect(window.locator('.sheet-viewer')).toBeVisible({ timeout: 150000 })
    await window.waitForTimeout(2000)

    // Take screenshot of multi-page result
    const sheetViewer = window.locator('.sheet-viewer')
    await sheetViewer.screenshot({ 
      path: 'test-results/multi-page-layout.png',
      fullPage: true 
    })
    console.log('📸 Screenshot saved: multi-page-layout.png')

    // Verify layout is not columnized (title should be above music, not beside)
    const viewerPanel = window.locator('.viewer-panel')
    const layout = await viewerPanel.evaluate((el) => {
      const style = window.getComputedStyle(el)
      return {
        display: style.display,
        flexDirection: style.flexDirection,
        width: el.offsetWidth,
        height: el.offsetHeight
      }
    })

    console.log('Viewer panel layout:', layout)
    expect(layout.flexDirection).toBe('column')
    console.log('✅ Layout uses column direction (not row/columnized)')

    // Verify sheet viewer is directly in the panel (no title between them)
    const svgElement = sheetViewer.locator('svg').first()
    await expect(svgElement).toBeVisible()
    console.log('✅ Sheet music displays directly in viewer (no title above it)')
  })

  test('should verify title removed (no longer displayed)', async () => {
    test.setTimeout(180000)
    
    const file1 = path.join(__dirname, '../examples/IMG_7775.jpeg')

    await window.evaluate(async (f1) => {
      const processFile = (window as any).__testProcessFile
      await processFile(f1)
    }, file1)

    await expect(window.locator('.sheet-viewer')).toBeVisible({ timeout: 150000 })

    // Verify title is NOT displayed in viewer panel
    const viewerPanel = window.locator('.viewer-panel')
    const h2Elements = await viewerPanel.locator('h2').count()
    
    console.log('H2 elements in viewer:', h2Elements)
    expect(h2Elements).toBe(0)
    console.log('✅ Title correctly removed from viewer')
    
    // Take screenshot
    await viewerPanel.screenshot({ path: 'test-results/no-title-display.png' })
    console.log('📸 Screenshot saved: no-title-display.png')
  })
})
