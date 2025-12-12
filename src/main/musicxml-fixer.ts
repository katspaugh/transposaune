import { DOMParser, XMLSerializer } from '@xmldom/xmldom'

/**
 * Create a credit element for the composer (if not already present)
 */
function ensureComposerCredit(doc: Document): number {
  const root = doc.documentElement

  // Look for <creator type="composer"> in <identification>
  const identification = root.getElementsByTagName('identification')[0]
  if (!identification) return 0

  const creators = identification.getElementsByTagName('creator')
  let composerName: string | null = null

  for (let i = 0; i < creators.length; i++) {
    const creator = creators[i]
    if (creator.getAttribute('type') === 'composer') {
      composerName = creator.textContent?.trim() || null
      break
    }
  }

  if (!composerName) return 0

  // Check if a credit for this composer already exists
  const credits = root.getElementsByTagName('credit')
  for (let i = 0; i < credits.length; i++) {
    const creditWords = credits[i].getElementsByTagName('credit-words')[0]
    if (creditWords?.textContent?.trim() === composerName) {
      console.log(`[Composer Credit] Composer credit already exists: "${composerName}"`)
      return 0
    }
  }

  // Get page dimensions for positioning
  const pageLayout = root.getElementsByTagName('page-layout')[0]
  const pageWidth = pageLayout?.getElementsByTagName('page-width')[0]?.textContent
  const pageHeight = pageLayout?.getElementsByTagName('page-height')[0]?.textContent

  const width = pageWidth ? parseInt(pageWidth) : 1200
  const height = pageHeight ? parseInt(pageHeight) : 2000

  // Create composer credit in top-right corner
  const credit = doc.createElement('credit')
  credit.setAttribute('page', '1')

  const creditWords = doc.createElement('credit-words')
  creditWords.setAttribute('default-x', (width - 100).toString()) // Right side with margin
  creditWords.setAttribute('default-y', (height - 100).toString()) // Top with margin
  creditWords.setAttribute('font-family', 'serif')
  creditWords.setAttribute('font-size', '12')
  creditWords.setAttribute('font-style', 'italic')
  creditWords.setAttribute('halign', 'right')
  creditWords.textContent = composerName

  credit.appendChild(creditWords)

  // Insert after other credits or after defaults
  const existingCredits = root.getElementsByTagName('credit')
  if (existingCredits.length > 0) {
    const lastCredit = existingCredits[existingCredits.length - 1]
    lastCredit.parentNode?.insertBefore(credit, lastCredit.nextSibling)
  } else {
    // Insert after defaults if no credits exist
    const defaults = root.getElementsByTagName('defaults')[0]
    if (defaults) {
      if (defaults.nextSibling) {
        defaults.parentNode?.insertBefore(credit, defaults.nextSibling)
      } else {
        defaults.parentNode?.appendChild(credit)
      }
    } else {
      // No defaults element, insert at beginning
      const firstChild = root.firstChild
      if (firstChild) {
        root.insertBefore(credit, firstChild)
      } else {
        root.appendChild(credit)
      }
    }
  }

  console.log(`[Composer Credit] Created credit for composer: "${composerName}"`)
  return 1
}

/**
 * Clean up OCR'd credit elements to remove unwanted text
 * (measure numbers, page numbers, stray text, etc.)
 */
function cleanupCredits(doc: Document): number {
  const root = doc.documentElement

  // Get page height for position-based filtering
  const pageLayout = root.getElementsByTagName('page-layout')[0]
  const pageHeight = pageLayout?.getElementsByTagName('page-height')[0]?.textContent
  const height = pageHeight ? parseInt(pageHeight) : 2000

  const credits = root.getElementsByTagName('credit')
  const creditsToRemove: Element[] = []
  let enhancedCount = 0

  console.log(`[Credit Cleanup] Found ${credits.length} credit elements`)

  for (let i = 0; i < credits.length; i++) {
    const credit = credits[i]
    const creditWords = credit.getElementsByTagName('credit-words')[0]
    if (!creditWords) continue

    const text = creditWords.textContent?.trim() || ''
    const fontSize = creditWords.getAttribute('font-size')
    const yPos = creditWords.getAttribute('default-y')

    const size = fontSize ? parseInt(fontSize) : 10
    const y = yPos ? parseInt(yPos) : 0

    const xPos = creditWords.getAttribute('default-x')
    const x = xPos ? parseInt(xPos) : 0

    // Get page width for position-based filtering
    const pageLayout = root.getElementsByTagName('page-layout')[0]
    const pageWidth = pageLayout?.getElementsByTagName('page-width')[0]?.textContent
    const width = pageWidth ? parseInt(pageWidth) : 1200

    // Calculate if text is in top portion of page (title area)
    const isInTitleArea = y > height * 0.85 // Top 15% of page
    const isOnRightSide = x > width * 0.7 // Right 30% of page

    // Heuristics to identify unwanted credits:
    const isJustNumber = /^\d+$/.test(text)
    const isVeryShort = text.length <= 2
    const isParenthetical = /^\([^)]+\)$/.test(text) // Like "(EC 1 1)"
    const isSmallFont = size < 10
    const isLowOnPage = y < height * 0.5 // Below middle of page
    const fontStyle = creditWords.getAttribute('font-style')
    const isItalic = fontStyle === 'italic'

    // Likely composer credit (small italic text on right side in title area)
    const isLikelyComposer = isItalic && isOnRightSide && isInTitleArea && size >= 10 && size <= 14

    let shouldRemove = false
    let reason = ''

    // Never remove composer credits
    if (isLikelyComposer) {
      shouldRemove = false
    }
    // Remove obvious non-title elements
    else if (isJustNumber) {
      shouldRemove = true
      reason = 'just a number (likely measure/page number)'
    } else if (isVeryShort && !isInTitleArea) {
      shouldRemove = true
      reason = 'very short text not in title area'
    } else if (isParenthetical && size < 12) {
      shouldRemove = true
      reason = 'small parenthetical text (likely catalog number)'
    } else if (isSmallFont && isLowOnPage) {
      shouldRemove = true
      reason = 'small font low on page'
    }

    if (shouldRemove) {
      console.log(`[Credit Cleanup] Removing: "${text}" (size=${size}, y=${y}, ${reason})`)
      creditsToRemove.push(credit)
    } else {
      console.log(`[Credit Cleanup] Keeping: "${text}" (size=${size}, y=${y})`)

      // Enhance title styling for larger text in title area (but not composer)
      if (isInTitleArea && size >= 14 && !isLikelyComposer) {
        // Make title font larger, bolder, and centered
        const newSize = Math.max(size, 28) // Bigger title font
        creditWords.setAttribute('font-size', newSize.toString())
        creditWords.setAttribute('font-weight', 'bold')
        creditWords.setAttribute('halign', 'center')

        // Center horizontally
        creditWords.setAttribute('default-x', (width / 2).toString())

        console.log(`[Credit Cleanup] Enhanced title styling: "${text}" (size=${newSize}, centered)`)
        enhancedCount++
      }

      // Preserve composer styling (small italic on right)
      if (isLikelyComposer) {
        console.log(`[Credit Cleanup] Preserved composer credit: "${text}"`)
      }
    }
  }

  // Remove unwanted credits
  creditsToRemove.forEach(credit => {
    credit.parentNode?.removeChild(credit)
  })

  console.log(`[Credit Cleanup] Removed ${creditsToRemove.length} unwanted credits, enhanced ${enhancedCount} titles`)
  return creditsToRemove.length + enhancedCount
}

/**
 * Fix common Audiveris parsing issues in MusicXML
 *
 * Known issues:
 * 1. Last system on page: Staff marked as hidden (print-object="no") while
 *    another staff has incorrect clef and merged content
 * 2. OCR extracts measure numbers, page numbers, and stray text as credits
 */
export function fixMusicXMLIssues(musicXml: string): string {
  const parser = new DOMParser()
  const serializer = new XMLSerializer()

  const doc = parser.parseFromString(musicXml, 'text/xml')
  const root = doc.documentElement

  // Issue #1: Ensure composer credit exists (from <creator> element)
  const composerCreated = ensureComposerCredit(doc)

  // Issue #2: Clean up OCR'd credits (measure numbers, page numbers, etc.)
  const creditsFixed = cleanupCredits(doc)

  // Find all parts
  const parts = root.getElementsByTagName('part')
  if (parts.length === 0) {
    // Return modified version if any changes were made
    const totalChanges = composerCreated + creditsFixed
    return totalChanges > 0 ? serializer.serializeToString(doc) : musicXml
  }

  console.log(`[MusicXML Fixer] Analyzing ${parts.length} parts...`)

  // Issue #2: Detect hidden staves with suspicious clef changes in parallel staves
  // This happens when Audiveris mis-parses the last system
  let fixCount = 0
  
  // Get all measure numbers across all parts
  const firstPart = parts[0]
  const measures = firstPart.getElementsByTagName('measure')
  
  for (let m = 0; m < measures.length; m++) {
    const measureNum = measures[m].getAttribute('number')
    if (!measureNum) continue
    
    // Check if any staff in this measure is hidden
    let hasHiddenStaff = false
    let hiddenPartIdx = -1
    
    for (let p = 0; p < parts.length; p++) {
      const part = parts[p]
      const partMeasures = part.getElementsByTagName('measure')
      const measure = Array.from(partMeasures).find(
        m => m.getAttribute('number') === measureNum
      )
      
      if (measure) {
        const staffDetails = measure.getElementsByTagName('staff-details')
        for (let i = 0; i < staffDetails.length; i++) {
          const detail = staffDetails[i]
          if (detail.getAttribute('print-object') === 'no') {
            hasHiddenStaff = true
            hiddenPartIdx = p
            break
          }
        }
      }
    }
    
    if (hasHiddenStaff) {
      console.log(`[MusicXML Fixer] Found hidden staff in measure ${measureNum} (part ${hiddenPartIdx + 1})`)
      
      // Check if any other part in this measure has a suspicious clef change
      for (let p = 0; p < parts.length; p++) {
        if (p === hiddenPartIdx) continue
        
        const part = parts[p]
        const partMeasures = part.getElementsByTagName('measure')
        const measure = Array.from(partMeasures).find(
          m => m.getAttribute('number') === measureNum
        )
        
        if (measure) {
          // Look for clef changes
          const clefs = measure.getElementsByTagName('clef')
          for (let c = 0; c < clefs.length; c++) {
            const clef = clefs[c]
            const sign = clef.getElementsByTagName('sign')[0]?.textContent
            const line = clef.getElementsByTagName('line')[0]?.textContent
            
            // Alto/C clef (G on line 3) is suspicious in piano music
            if (sign === 'G' && line === '3') {
              console.log(`[MusicXML Fixer] ⚠️ Suspicious clef change in measure ${measureNum} part ${p + 1}: ${sign} on line ${line}`)
              console.log(`[MusicXML Fixer] This measure likely has mis-parsed content from the hidden staff`)
              console.log(`[MusicXML Fixer] Recommendation: Re-scan with better image quality or manually crop the image`)
              
              // We could attempt to split the measure content here, but it's very complex
              // For now, just log the issue
              fixCount++
            }
          }
        }
      }
    }
  }
  
  // Issue #2: Fix staff-details that are incorrectly hidden at the end
  // If the last few measures of a staff are hidden, un-hide them
  for (let p = 0; p < parts.length; p++) {
    const part = parts[p]
    const partMeasures = part.getElementsByTagName('measure')
    
    // Check last 3 measures
    const checkCount = Math.min(3, partMeasures.length)
    for (let m = partMeasures.length - checkCount; m < partMeasures.length; m++) {
      const measure = partMeasures[m]
      const staffDetails = measure.getElementsByTagName('staff-details')
      
      for (let i = 0; i < staffDetails.length; i++) {
        const detail = staffDetails[i]
        if (detail.getAttribute('print-object') === 'no') {
          const measureNum = measure.getAttribute('number')
          console.log(`[MusicXML Fixer] Removing hidden staff-details in measure ${measureNum} (part ${p + 1})`)
          
          // Remove the staff-details element entirely
          detail.parentNode?.removeChild(detail)
          fixCount++
        }
      }
    }
  }
  
  const totalFixes = fixCount + creditsFixed + composerCreated
  if (totalFixes > 0) {
    console.log(`[MusicXML Fixer] Applied ${totalFixes} fix(es) (${composerCreated} composer credit, ${creditsFixed} credit cleanup, ${fixCount} staff fixes)`)
    return serializer.serializeToString(doc)
  }

  return musicXml
}
