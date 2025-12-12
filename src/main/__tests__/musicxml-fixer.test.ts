import { describe, it, expect } from 'vitest'
import { fixMusicXMLIssues } from '../musicxml-fixer'

describe('fixMusicXMLIssues - Credit Cleanup', () => {
  it('should remove measure numbers from credits', () => {
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<score-partwise version="4.0.3">
  <defaults>
    <page-layout>
      <page-height>2000</page-height>
    </page-layout>
  </defaults>
  <credit page="1">
    <credit-words default-x="100" default-y="1800" font-size="18">My Great Title</credit-words>
  </credit>
  <credit page="1">
    <credit-words default-x="100" default-y="500" font-size="9">5</credit-words>
  </credit>
  <credit page="1">
    <credit-words default-x="100" default-y="300" font-size="9">10</credit-words>
  </credit>
</score-partwise>`

    const fixed = fixMusicXMLIssues(xml)

    // Should keep the title
    expect(fixed).toContain('My Great Title')

    // Should remove measure numbers
    expect(fixed).not.toContain('<credit-words default-x="100" default-y="500"')
    expect(fixed).not.toContain('<credit-words default-x="100" default-y="300"')
  })

  it('should remove page numbers from credits', () => {
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<score-partwise version="4.0.3">
  <defaults>
    <page-layout>
      <page-height>2000</page-height>
    </page-layout>
  </defaults>
  <credit page="1">
    <credit-words default-x="100" default-y="1800" font-size="18">Song Title</credit-words>
  </credit>
  <credit page="1">
    <credit-words default-x="100" default-y="100" font-size="12">32</credit-words>
  </credit>
</score-partwise>`

    const fixed = fixMusicXMLIssues(xml)

    // Should keep the title
    expect(fixed).toContain('Song Title')

    // Should remove page number
    expect(fixed).not.toContain('>32<')
  })

  it('should remove parenthetical catalog numbers', () => {
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<score-partwise version="4.0.3">
  <defaults>
    <page-layout>
      <page-height>2000</page-height>
    </page-layout>
  </defaults>
  <credit page="1">
    <credit-words default-x="100" default-y="1800" font-size="18">Wie soll ich dich empfangen</credit-words>
  </credit>
  <credit page="1">
    <credit-words default-x="100" default-y="1700" font-size="9">(EC 1 1)</credit-words>
  </credit>
</score-partwise>`

    const fixed = fixMusicXMLIssues(xml)

    // Should keep the title
    expect(fixed).toContain('Wie soll ich dich empfangen')

    // Should remove catalog number
    expect(fixed).not.toContain('(EC 1 1)')
  })

  it('should remove short stray text', () => {
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<score-partwise version="4.0.3">
  <defaults>
    <page-layout>
      <page-height>2000</page-height>
    </page-layout>
  </defaults>
  <credit page="1">
    <credit-words default-x="100" default-y="1800" font-size="18">Title</credit-words>
  </credit>
  <credit page="1">
    <credit-words default-x="100" default-y="700" font-size="14">IS</credit-words>
  </credit>
</score-partwise>`

    const fixed = fixMusicXMLIssues(xml)

    // Should keep the title
    expect(fixed).toContain('Title')

    // Should remove short stray text
    expect(fixed).not.toContain('>IS<')
  })

  it('should enhance title font styling', () => {
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<score-partwise version="4.0.3">
  <defaults>
    <page-layout>
      <page-height>2000</page-height>
      <page-width>1200</page-width>
    </page-layout>
  </defaults>
  <credit page="1">
    <credit-words default-x="100" default-y="1800" font-size="18">Beautiful Song</credit-words>
  </credit>
</score-partwise>`

    const fixed = fixMusicXMLIssues(xml)

    // Should enhance to at least size 28 (bigger title)
    expect(fixed).toContain('font-size="28"')

    // Should add bold
    expect(fixed).toContain('font-weight="bold"')

    // Should center-align
    expect(fixed).toContain('halign="center"')

    // Should center horizontally (x = 600, which is 1200/2)
    expect(fixed).toContain('default-x="600"')

    // Should still contain the title text
    expect(fixed).toContain('Beautiful Song')
  })

  it('should create composer credit from creator element', () => {
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<score-partwise version="4.0.3">
  <identification>
    <creator type="composer">Pyotr Ilyich Tchaikovsky</creator>
  </identification>
  <defaults>
    <page-layout>
      <page-height>2000</page-height>
      <page-width>1200</page-width>
    </page-layout>
  </defaults>
</score-partwise>`

    const fixed = fixMusicXMLIssues(xml)

    // Should contain composer name
    expect(fixed).toContain('Pyotr Ilyich Tchaikovsky')

    // Should be in a credit element
    expect(fixed).toContain('<credit')

    // Should have italic style
    expect(fixed).toContain('font-style="italic"')

    // Should be small font (12pt)
    expect(fixed).toContain('font-size="12"')

    // Should be right-aligned
    expect(fixed).toContain('halign="right"')

    // Should be positioned on right side (x = 1100, which is 1200 - 100)
    expect(fixed).toContain('default-x="1100"')
  })

  it('should not remove existing composer credits', () => {
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<score-partwise version="4.0.3">
  <defaults>
    <page-layout>
      <page-height>2000</page-height>
      <page-width>1200</page-width>
    </page-layout>
  </defaults>
  <credit page="1">
    <credit-words default-x="1000" default-y="1850" font-size="12" font-style="italic">J.S. Bach</credit-words>
  </credit>
</score-partwise>`

    const fixed = fixMusicXMLIssues(xml)

    // Should keep composer credit
    expect(fixed).toContain('J.S. Bach')
    expect(fixed).toContain('font-style="italic"')
  })
})
