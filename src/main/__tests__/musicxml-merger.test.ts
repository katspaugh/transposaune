import { describe, it, expect } from 'vitest'
import { mergeMusicXMLDocuments } from '../musicxml-merger'

describe('musicxml-merger', () => {
  const sampleMusicXML1 = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE score-partwise PUBLIC "-//Recordare//DTD MusicXML 3.1 Partwise//EN" "http://www.musicxml.org/dtds/partwise.dtd">
<score-partwise version="3.1">
  <part-list>
    <score-part id="P1">
      <part-name>Part 1</part-name>
    </score-part>
  </part-list>
  <part id="P1">
    <measure number="1">
      <note>
        <pitch><step>C</step><octave>4</octave></pitch>
        <duration>4</duration>
      </note>
    </measure>
    <measure number="2">
      <note>
        <pitch><step>D</step><octave>4</octave></pitch>
        <duration>4</duration>
      </note>
    </measure>
  </part>
</score-partwise>`

  const sampleMusicXML2 = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE score-partwise PUBLIC "-//Recordare//DTD MusicXML 3.1 Partwise//EN" "http://www.musicxml.org/dtds/partwise.dtd">
<score-partwise version="3.1">
  <part-list>
    <score-part id="P1">
      <part-name>Part 1</part-name>
    </score-part>
  </part-list>
  <part id="P1">
    <measure number="1">
      <note>
        <pitch><step>E</step><octave>4</octave></pitch>
        <duration>4</duration>
      </note>
    </measure>
    <measure number="2">
      <note>
        <pitch><step>F</step><octave>4</octave></pitch>
        <duration>4</duration>
      </note>
    </measure>
  </part>
</score-partwise>`

  describe('mergeMusicXMLDocuments', () => {
    it('should return single document unchanged', () => {
      const result = mergeMusicXMLDocuments([sampleMusicXML1])
      expect(result).toBe(sampleMusicXML1)
    })

    it('should throw error for empty array', () => {
      expect(() => mergeMusicXMLDocuments([])).toThrow('No MusicXML documents to merge')
    })

    it('should merge two documents', () => {
      const result = mergeMusicXMLDocuments([sampleMusicXML1, sampleMusicXML2])

      // Check that result is valid XML
      expect(result).toContain('<score-partwise')
      expect(result).toContain('</score-partwise>')

      // Should have 4 measures total (2 from each document)
      const measureCount = (result.match(/<measure/g) || []).length
      expect(measureCount).toBe(4)

      // Check that measures are renumbered correctly
      expect(result).toContain('number="1"')
      expect(result).toContain('number="2"')
      expect(result).toContain('number="3"')
      expect(result).toContain('number="4"')

      // Check that notes from both documents are present
      expect(result).toContain('<step>C</step>') // From doc 1
      expect(result).toContain('<step>D</step>') // From doc 1
      expect(result).toContain('<step>E</step>') // From doc 2
      expect(result).toContain('<step>F</step>') // From doc 2
    })

    it('should handle multiple documents', () => {
      const result = mergeMusicXMLDocuments([
        sampleMusicXML1,
        sampleMusicXML2,
        sampleMusicXML1
      ])

      // Should have 6 measures total
      const measureCount = (result.match(/<measure/g) || []).length
      expect(measureCount).toBe(6)

      // Last measure should be numbered 6
      expect(result).toContain('number="6"')
    })

    it('should handle document with no part element', () => {
      const invalidXML = `<?xml version="1.0"?>
<score-partwise version="3.1">
  <part-list>
    <score-part id="P1">
      <part-name>Part 1</part-name>
    </score-part>
  </part-list>
</score-partwise>`

      // Should not throw, just skip invalid documents
      const result = mergeMusicXMLDocuments([sampleMusicXML1, invalidXML])

      // Should still have measures from the first document
      const measureCount = (result.match(/<measure/g) || []).length
      expect(measureCount).toBe(2)
    })

    it('should handle multiple parts (staves)', () => {
      const multiPartXML1 = `<?xml version="1.0" encoding="UTF-8"?>
<score-partwise version="3.1">
  <part-list>
    <score-part id="P1"><part-name>Soprano</part-name></score-part>
    <score-part id="P2"><part-name>Bass</part-name></score-part>
  </part-list>
  <part id="P1">
    <measure number="1"><note><pitch><step>C</step><octave>5</octave></pitch><duration>4</duration></note></measure>
  </part>
  <part id="P2">
    <measure number="1"><note><pitch><step>C</step><octave>3</octave></pitch><duration>4</duration></note></measure>
  </part>
</score-partwise>`

      const multiPartXML2 = `<?xml version="1.0" encoding="UTF-8"?>
<score-partwise version="3.1">
  <part-list>
    <score-part id="P1"><part-name>Soprano</part-name></score-part>
    <score-part id="P2"><part-name>Bass</part-name></score-part>
  </part-list>
  <part id="P1">
    <measure number="1"><note><pitch><step>D</step><octave>5</octave></pitch><duration>4</duration></note></measure>
  </part>
  <part id="P2">
    <measure number="1"><note><pitch><step>D</step><octave>3</octave></pitch><duration>4</duration></note></measure>
  </part>
</score-partwise>`

      const result = mergeMusicXMLDocuments([multiPartXML1, multiPartXML2])

      // Should have 2 parts
      const partCount = (result.match(/<part id=/g) || []).length
      expect(partCount).toBe(2)

      // Each part should have 2 measures
      const measureCount = (result.match(/<measure/g) || []).length
      expect(measureCount).toBe(4) // 2 parts × 2 measures

      // Check both parts got merged
      expect(result).toContain('<step>C</step><octave>5</octave>') // Soprano page 1
      expect(result).toContain('<step>D</step><octave>5</octave>') // Soprano page 2
      expect(result).toContain('<step>C</step><octave>3</octave>') // Bass page 1
      expect(result).toContain('<step>D</step><octave>3</octave>') // Bass page 2
    })
  })
})
