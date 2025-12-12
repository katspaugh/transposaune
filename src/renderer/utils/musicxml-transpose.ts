/**
 * Transpose MusicXML by modifying pitch elements
 * @param musicXml - The MusicXML string to transpose
 * @param semitones - Number of semitones to transpose (positive = up, negative = down)
 * @param selectedPartId - Optional part ID to transpose (e.g., "staff-1-layer-1"). If not provided, transposes all staves.
 * @returns Transposed MusicXML string
 */
export function transposeMusicXML(musicXml: string, semitones: number, selectedPartId?: string): string {
  if (semitones === 0) {
    return musicXml
  }

  const parser = new DOMParser()
  const xmlDoc = parser.parseFromString(musicXml, 'text/xml')

  // Extract staff number from partId if provided (e.g., "staff-1-layer-2" -> staff=1)
  // Note: We transpose the entire staff/part, not individual voices within it
  let targetStaffNum: number | null = null
  if (selectedPartId && selectedPartId !== 'all') {
    const match = selectedPartId.match(/staff-(\d+)/)
    if (match) {
      targetStaffNum = parseInt(match[1])
    }
  }

  // Find all parts to process
  const parts = xmlDoc.querySelectorAll('part')

  parts.forEach((part, partIndex) => {
    const partStaffNum = partIndex + 1 // Parts are 1-based
    
    // Skip if we're filtering by staff and this isn't the target
    if (targetStaffNum !== null && partStaffNum !== targetStaffNum) {
      return
    }

    // Transpose ALL pitches in this part (all voices)
    const notes = part.querySelectorAll('note')

    notes.forEach(note => {
      const pitch = note.querySelector('pitch')
      if (!pitch) return

      const stepEl = pitch.querySelector('step')
      const alterEl = pitch.querySelector('alter')
      const octaveEl = pitch.querySelector('octave')

      if (!stepEl || !octaveEl) return

      let step = stepEl.textContent || 'C'
      let alter = alterEl ? parseInt(alterEl.textContent || '0') : 0
      let octave = parseInt(octaveEl.textContent || '4')

      // Convert to MIDI note number for easier transposition
      const noteToMidi: Record<string, number> = {
        'C': 0, 'D': 2, 'E': 4, 'F': 5, 'G': 7, 'A': 9, 'B': 11
      }
      const midiToNote = ['C', 'C', 'D', 'D', 'E', 'F', 'F', 'G', 'G', 'A', 'A', 'B']
      const midiToAlter = [0, 1, 0, 1, 0, 0, 1, 0, 1, 0, 1, 0]

      let midiNote = noteToMidi[step] + alter + (octave * 12)
      midiNote += semitones

      // Convert back to step, alter, octave
      const newOctave = Math.floor(midiNote / 12)
      const pitchClass = ((midiNote % 12) + 12) % 12
      const newStep = midiToNote[pitchClass]
      const newAlter = midiToAlter[pitchClass]

      // Update the XML elements
      stepEl.textContent = newStep
      octaveEl.textContent = newOctave.toString()

      if (newAlter !== 0) {
        if (alterEl) {
          alterEl.textContent = newAlter.toString()
        } else {
          const newAlterEl = xmlDoc.createElement('alter')
          newAlterEl.textContent = newAlter.toString()
          pitch.insertBefore(newAlterEl, octaveEl)
        }
      } else {
        // Remove alter element if it exists and new alter is 0
        if (alterEl) {
          pitch.removeChild(alterEl)
        }
      }
    })

    // Update key signatures for this part (always, since we transpose the entire part)
    {
      const attributes = part.querySelectorAll('attributes')
      attributes.forEach(attr => {
        const keyEl = attr.querySelector('key')
        if (!keyEl) return

        const fifthsEl = keyEl.querySelector('fifths')
        if (!fifthsEl) return

        const currentFifths = parseInt(fifthsEl.textContent || '0')
        const newFifths = transposeKeySignature(currentFifths, semitones)
        fifthsEl.textContent = newFifths.toString()
      })
    }
  })

  // Serialize back to string
  const serializer = new XMLSerializer()
  return serializer.serializeToString(xmlDoc)
}

/**
 * Transpose a key signature by semitones using circle of fifths
 * @param fifths - Current fifths value (-7 to 7)
 * @param semitones - Number of semitones to transpose
 * @returns New fifths value (-7 to 7)
 * 
 * Circle of fifths: Each step = 7 semitones
 * Examples:
 * - Eb major (fifths=-3) + 2 semitones = F major (fifths=-1)
 * - C major (fifths=0) + 2 semitones = D major (fifths=2)
 */
function transposeKeySignature(fifths: number, semitones: number): number {
  // Map semitones to circle of fifths changes
  // Semitone -> Fifths change
  const semitoneToFifthsMap: Record<number, number> = {
    0: 0,   // C -> C
    1: -5,  // C -> Db (7 flats -> 5 flats) 
    2: 2,   // C -> D (0 -> 2 sharps)
    3: -3,  // C -> Eb (0 -> 3 flats)
    4: 4,   // C -> E (0 -> 4 sharps)
    5: -1,  // C -> F (0 -> 1 flat)
    6: 6,   // C -> F# (0 -> 6 sharps) / Gb (6 flats)
    7: 1,   // C -> G (0 -> 1 sharp)
    8: -4,  // C -> Ab (0 -> 4 flats)
    9: 3,   // C -> A (0 -> 3 sharps)
    10: -2, // C -> Bb (0 -> 2 flats)
    11: 5,  // C -> B (0 -> 5 sharps)
  }

  // Normalize semitones to 0-11 range
  const normalizedSemitones = ((semitones % 12) + 12) % 12
  const fifthsChange = semitoneToFifthsMap[normalizedSemitones] || 0
  
  const newFifths = fifths + fifthsChange
  
  // Clamp to valid range (-7 to 7)
  return Math.max(-7, Math.min(7, newFifths))
}
