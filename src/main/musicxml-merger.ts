import { DOMParser, XMLSerializer } from '@xmldom/xmldom'

/**
 * Merge multiple MusicXML documents into a single multi-page document
 * Each input document becomes a continuation of the output
 * Handles multiple parts (staves) correctly
 */
export function mergeMusicXMLDocuments(musicXmlDocs: string[]): string {
  if (musicXmlDocs.length === 0) {
    throw new Error('No MusicXML documents to merge')
  }

  if (musicXmlDocs.length === 1) {
    return musicXmlDocs[0]
  }

  const parser = new DOMParser()
  const serializer = new XMLSerializer()

  // Parse the first document as the base
  const baseDoc = parser.parseFromString(musicXmlDocs[0], 'text/xml')
  const baseRoot = baseDoc.documentElement

  // Find ALL part elements in the base document
  const baseParts = baseRoot.getElementsByTagName('part')
  if (baseParts.length === 0) {
    throw new Error('Base document has no part elements')
  }

  console.log(`Base document has ${baseParts.length} parts`)

  // Process each additional document
  for (let i = 1; i < musicXmlDocs.length; i++) {
    const doc = parser.parseFromString(musicXmlDocs[i], 'text/xml')
    const parts = doc.getElementsByTagName('part')

    if (parts.length === 0) {
      console.warn(`Document ${i + 1} has no part elements, skipping`)
      continue
    }

    console.log(`Document ${i + 1} has ${parts.length} parts`)

    // Verify that the number of parts matches
    if (parts.length !== baseParts.length) {
      console.warn(
        `Document ${i + 1} has ${parts.length} parts, but base has ${baseParts.length}. ` +
        `This may cause issues. Merging available parts only.`
      )
    }

    // Merge each part separately
    const partCount = Math.min(parts.length, baseParts.length)
    for (let partIdx = 0; partIdx < partCount; partIdx++) {
      const basePart = baseParts[partIdx]
      const srcPart = parts[partIdx]

      // Get the part ID for debugging
      const partId = basePart.getAttribute('id') || `part-${partIdx + 1}`
      console.log(`  Merging part ${partIdx + 1} (id: ${partId})`)

      // Extract all measures from this part
      const measures = srcPart.getElementsByTagName('measure')

      // Get the last measure number in the base part
      const baseMeasures = basePart.getElementsByTagName('measure')
      let lastMeasureNum = 0
      if (baseMeasures.length > 0) {
        const lastMeasure = baseMeasures[baseMeasures.length - 1]
        const measureNum = lastMeasure.getAttribute('number')
        if (measureNum) {
          lastMeasureNum = parseInt(measureNum, 10)
        }
      }

      // Append all measures from this part, renumbering them
      for (let j = 0; j < measures.length; j++) {
        const measure = measures[j]
        const newMeasure = measure.cloneNode(true) as Element

        // Renumber the measure
        const measureNum = newMeasure.getAttribute('number')
        const newNum = lastMeasureNum + j + 1
        if (measureNum) {
          newMeasure.setAttribute('number', newNum.toString())
        }

        // For the first measure of merged pages, clean up attributes
        // that would override the part's initial definitions
        if (j === 0) {
          const attributes = newMeasure.getElementsByTagName('attributes')
          for (let attrIdx = 0; attrIdx < attributes.length; attrIdx++) {
            const attr = attributes[attrIdx]

            // Remove clef definitions (they should inherit from the first page)
            // This prevents bass clef from being overridden to treble clef
            const clefs = attr.getElementsByTagName('clef')
            for (let clefIdx = clefs.length - 1; clefIdx >= 0; clefIdx--) {
              const clef = clefs[clefIdx]
              console.log(`  Removing clef from merged measure (part ${partIdx + 1}, measure ${newNum})`)
              clef.parentNode?.removeChild(clef)
            }

            // Also remove key and time signatures if this is a continuation
            // (they should only change if there's an actual key/time change)
            const keys = attr.getElementsByTagName('key')
            for (let keyIdx = keys.length - 1; keyIdx >= 0; keyIdx--) {
              keys[keyIdx].parentNode?.removeChild(keys[keyIdx])
            }

            // Remove empty attributes element
            if (attr.childNodes.length === 0) {
              attr.parentNode?.removeChild(attr)
            }
          }

          // For the first measure of the first part, add system break
          if (partIdx === 0) {
            const printElements = newMeasure.getElementsByTagName('print')
            if (printElements.length > 0) {
              const printEl = printElements[0]
              printEl.removeAttribute('new-page')
              printEl.setAttribute('new-system', 'yes')
            } else {
              // Create a print element with system break
              const printEl = baseDoc.createElement('print')
              printEl.setAttribute('new-system', 'yes')
              // Insert at the beginning of the measure
              if (newMeasure.firstChild) {
                newMeasure.insertBefore(printEl, newMeasure.firstChild)
              } else {
                newMeasure.appendChild(printEl)
              }
            }
          }
        }

        // Import the measure into the base document
        const importedMeasure = baseDoc.importNode(newMeasure, true)
        basePart.appendChild(importedMeasure)
      }
    }
  }

  // Serialize the merged document
  return serializer.serializeToString(baseDoc)
}
