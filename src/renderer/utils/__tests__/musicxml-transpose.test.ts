import { describe, it, expect } from 'vitest'
import { transposeMusicXML } from '../musicxml-transpose'

describe('transposeMusicXML', () => {
  it('should not modify MusicXML when transposing by 0 semitones', () => {
    const xml = `<?xml version="1.0"?><score-partwise><part><measure><note><pitch><step>C</step><octave>4</octave></pitch></note></measure></part></score-partwise>`
    const result = transposeMusicXML(xml, 0)
    expect(result).toBe(xml)
  })

  it('should transpose C4 up 2 semitones to D4', () => {
    const xml = `<?xml version="1.0"?><score-partwise><part><measure><note><pitch><step>C</step><octave>4</octave></pitch></note></measure></part></score-partwise>`
    const result = transposeMusicXML(xml, 2)
    expect(result).toContain('<step>D</step>')
    expect(result).toContain('<octave>4</octave>')
  })

  it('should transpose C4 down 2 semitones to A#3 (Bb3 enharmonic)', () => {
    const xml = `<?xml version="1.0"?><score-partwise><part><measure><note><pitch><step>C</step><octave>4</octave></pitch></note></measure></part></score-partwise>`
    const result = transposeMusicXML(xml, -2)
    // The algorithm produces A#3 which is enharmonically equivalent to Bb3
    expect(result).toContain('<step>A</step>')
    expect(result).toContain('<alter>1</alter>')
    expect(result).toContain('<octave>3</octave>')
  })

  it('should transpose E4 up 1 semitone to F4', () => {
    const xml = `<?xml version="1.0"?><score-partwise><part><measure><note><pitch><step>E</step><octave>4</octave></pitch></note></measure></part></score-partwise>`
    const result = transposeMusicXML(xml, 1)
    expect(result).toContain('<step>F</step>')
    expect(result).toContain('<octave>4</octave>')
    // F natural has no alter
    expect(result).not.toContain('<alter>')
  })

  it('should transpose B3 up 1 semitone to C4', () => {
    const xml = `<?xml version="1.0"?><score-partwise><part><measure><note><pitch><step>B</step><octave>3</octave></pitch></note></measure></part></score-partwise>`
    const result = transposeMusicXML(xml, 1)
    expect(result).toContain('<step>C</step>')
    expect(result).toContain('<octave>4</octave>')
  })

  it('should handle notes with existing alterations (sharps)', () => {
    const xml = `<?xml version="1.0"?><score-partwise><part><measure><note><pitch><step>C</step><alter>1</alter><octave>4</octave></pitch></note></measure></part></score-partwise>`
    const result = transposeMusicXML(xml, 1)
    expect(result).toContain('<step>D</step>')
    expect(result).toContain('<octave>4</octave>')
  })

  it('should transpose multiple notes', () => {
    const xml = `<?xml version="1.0"?><score-partwise><part><measure>
      <note><pitch><step>C</step><octave>4</octave></pitch></note>
      <note><pitch><step>E</step><octave>4</octave></pitch></note>
      <note><pitch><step>G</step><octave>4</octave></pitch></note>
    </measure></part></score-partwise>`
    const result = transposeMusicXML(xml, 2)

    // C4 + 2 = D4
    expect(result).toContain('<step>D</step>')
    // E4 + 2 = F#4
    expect(result).toContain('<step>F</step>')
    expect(result).toContain('<alter>1</alter>')
    // G4 + 2 = A4
    expect(result).toContain('<step>A</step>')
  })

  describe('key signature transposition', () => {
    it('should transpose Eb major (3 flats) + 2 semitones to F major (1 flat)', () => {
      const xml = `<?xml version="1.0"?><score-partwise><part><measure>
        <attributes><key><fifths>-3</fifths></key></attributes>
        <note><pitch><step>C</step><octave>4</octave></pitch></note>
      </measure></part></score-partwise>`
      const result = transposeMusicXML(xml, 2)
      
      // Eb (fifths=-3) + 2 semitones = F major (fifths=-1)
      expect(result).toContain('<fifths>-1</fifths>')
      expect(result).toContain('<step>D</step>') // C transposed up 2 semitones
    })

    it('should transpose C major (0) + 2 semitones to D major (2 sharps)', () => {
      const xml = `<?xml version="1.0"?><score-partwise><part><measure>
        <attributes><key><fifths>0</fifths></key></attributes>
        <note><pitch><step>C</step><octave>4</octave></pitch></note>
      </measure></part></score-partwise>`
      const result = transposeMusicXML(xml, 2)
      
      // C major (fifths=0) + 2 semitones = D major (fifths=2)
      expect(result).toContain('<fifths>2</fifths>')
    })

    it('should transpose G major (1 sharp) + 2 semitones to A major (3 sharps)', () => {
      const xml = `<?xml version="1.0"?><score-partwise><part><measure>
        <attributes><key><fifths>1</fifths></key></attributes>
        <note><pitch><step>G</step><octave>4</octave></pitch></note>
      </measure></part></score-partwise>`
      const result = transposeMusicXML(xml, 2)
      
      // G major (fifths=1) + 2 semitones = A major (fifths=3)
      expect(result).toContain('<fifths>3</fifths>')
      expect(result).toContain('<step>A</step>') // G transposed up 2 semitones
    })

    it('should handle downward transposition (Bb major to Ab major)', () => {
      const xml = `<?xml version="1.0"?><score-partwise><part><measure>
        <attributes><key><fifths>-2</fifths></key></attributes>
        <note><pitch><step>D</step><octave>4</octave></pitch></note>
      </measure></part></score-partwise>`
      const result = transposeMusicXML(xml, -2)
      
      // Bb major (fifths=-2) - 2 semitones = Ab major (fifths=-4)
      expect(result).toContain('<fifths>-4</fifths>')
      expect(result).toContain('<step>C</step>') // D transposed down 2 semitones
    })

    it('should handle transposition with no key signature element', () => {
      const xml = `<?xml version="1.0"?><score-partwise><part><measure>
        <note><pitch><step>C</step><octave>4</octave></pitch></note>
      </measure></part></score-partwise>`
      const result = transposeMusicXML(xml, 2)
      
      // Should transpose notes even without key signature
      expect(result).toContain('<step>D</step>')
      // Should not crash
      expect(result).toBeTruthy()
    })
  })

  describe('selective staff transposition', () => {
    it('should transpose only the selected staff', () => {
      const xml = `<?xml version="1.0"?><score-partwise>
        <part id="P1"><measure>
          <attributes><key><fifths>0</fifths></key></attributes>
          <note><pitch><step>C</step><octave>4</octave></pitch></note>
        </measure></part>
        <part id="P2"><measure>
          <attributes><key><fifths>0</fifths></key></attributes>
          <note><pitch><step>E</step><octave>4</octave></pitch></note>
        </measure></part>
      </score-partwise>`
      
      // Transpose only staff 1
      const result = transposeMusicXML(xml, 2, 'staff-1-layer-1')
      
      // First part should be transposed: C -> D
      expect(result).toContain('<step>D</step>')
      // Second part should remain: E
      expect(result).toContain('<step>E</step>')
      
      // Parse to verify structure
      const parser = new DOMParser()
      const doc = parser.parseFromString(result, 'text/xml')
      const parts = doc.querySelectorAll('part')
      
      // Part 1 key signature should be transposed
      const part1Key = parts[0].querySelector('fifths')
      expect(part1Key?.textContent).toBe('2') // C major + 2 semitones = D major
      
      // Part 2 key signature should remain unchanged
      const part2Key = parts[1].querySelector('fifths')
      expect(part2Key?.textContent).toBe('0') // Still C major
    })

    it('should transpose all staves when no part is selected', () => {
      const xml = `<?xml version="1.0"?><score-partwise>
        <part id="P1"><measure>
          <note><pitch><step>C</step><octave>4</octave></pitch></note>
        </measure></part>
        <part id="P2"><measure>
          <note><pitch><step>E</step><octave>4</octave></pitch></note>
        </measure></part>
      </score-partwise>`
      
      const result = transposeMusicXML(xml, 2)
      
      // Both should be transposed
      expect(result).toContain('<step>D</step>') // C -> D
      expect(result).toContain('<step>F</step>') // E -> F#
      expect(result).toContain('<alter>1</alter>') // F#
    })

    it('should transpose all staves when "all" is selected', () => {
      const xml = `<?xml version="1.0"?><score-partwise>
        <part id="P1"><measure>
          <note><pitch><step>C</step><octave>4</octave></pitch></note>
        </measure></part>
        <part id="P2"><measure>
          <note><pitch><step>E</step><octave>4</octave></pitch></note>
        </measure></part>
      </score-partwise>`

      const result = transposeMusicXML(xml, 2, 'all')

      // Both should be transposed
      expect(result).toContain('<step>D</step>') // C -> D
      expect(result).toContain('<step>F</step>') // E -> F#
    })

    it('should transpose entire part when selecting any voice in that part', () => {
      // MusicXML with a single part containing 2 voices
      const xml = `<?xml version="1.0"?><score-partwise>
        <part id="P1">
          <measure>
            <attributes><key><fifths>0</fifths></key></attributes>
            <note><pitch><step>C</step><octave>4</octave></pitch><voice>1</voice></note>
            <note><pitch><step>E</step><octave>4</octave></pitch><voice>2</voice></note>
          </measure>
        </part>
      </score-partwise>`

      // Select any voice in part 1 - should transpose ENTIRE part (all voices)
      const result = transposeMusicXML(xml, 2, 'staff-1-layer-2')

      // Parse result to check individual notes
      const parser = new DOMParser()
      const doc = parser.parseFromString(result, 'text/xml')
      const notes = doc.querySelectorAll('note')

      // Both voices should be transposed
      const voice1Step = notes[0].querySelector('step')
      expect(voice1Step?.textContent).toBe('D') // C -> D

      const voice2Step = notes[1].querySelector('step')
      expect(voice2Step?.textContent).toBe('F') // E -> F#
      const voice2Alter = notes[1].querySelector('alter')
      expect(voice2Alter?.textContent).toBe('1')

      // Key signature should be updated
      const keyEl = doc.querySelector('fifths')
      expect(keyEl?.textContent).toBe('2') // C major -> D major
    })

    it('should update key signature when selecting a voice in a single-voice part', () => {
      // MusicXML with Eb major (3 flats), single voice
      const xml = `<?xml version="1.0"?><score-partwise>
        <part id="P1">
          <measure>
            <attributes><key><fifths>-3</fifths></key></attributes>
            <note><pitch><step>E</step><alter>-1</alter><octave>4</octave></pitch><voice>1</voice></note>
          </measure>
        </part>
      </score-partwise>`

      // Transpose up 2 semitones (1 tone), selecting voice 1
      const result = transposeMusicXML(xml, 2, 'staff-1-layer-1')

      const parser = new DOMParser()
      const doc = parser.parseFromString(result, 'text/xml')

      // Note should be transposed: Eb -> F
      const step = doc.querySelector('step')
      expect(step?.textContent).toBe('F')

      // Key signature should be updated: Eb major (-3) -> F major (-1)
      const keyEl = doc.querySelector('fifths')
      expect(keyEl?.textContent).toBe('-1')
    })
  })
})
