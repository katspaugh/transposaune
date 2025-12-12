import { describe, test, expect } from 'vitest'
import { useStatusText } from '../useStatusText'

describe('useStatusText', () => {
  test('should return checking message when availability is null', () => {
    const result = useStatusText({
      isAvailable: null,
      isProcessing: false,
      progress: null,
      error: null,
      musicXml: null,
      parts: [],
      effectiveSemitones: 0
    })
    expect(result).toBe('Checking Audiveris...')
  })

  test('should return not found message when audiveris is unavailable', () => {
    const result = useStatusText({
      isAvailable: false,
      isProcessing: false,
      progress: null,
      error: null,
      musicXml: null,
      parts: [],
      effectiveSemitones: 0
    })
    expect(result).toBe('Audiveris not found - please install it')
  })

  test('should return progress message when processing', () => {
    const result = useStatusText({
      isAvailable: true,
      isProcessing: true,
      progress: { stage: 'OCR Processing', percent: 50 },
      error: null,
      musicXml: null,
      parts: [],
      effectiveSemitones: 0
    })
    expect(result).toBe('OCR Processing (50%)')
  })

  test('should return error message when error exists', () => {
    const result = useStatusText({
      isAvailable: true,
      isProcessing: false,
      progress: null,
      error: 'File not found',
      musicXml: null,
      parts: [],
      effectiveSemitones: 0
    })
    expect(result).toBe('Error: File not found')
  })

  test('should return ready message with parts count', () => {
    const result = useStatusText({
      isAvailable: true,
      isProcessing: false,
      progress: null,
      error: null,
      musicXml: '<musicxml>...</musicxml>',
      parts: [
        { id: 'P1', name: 'Soprano', index: 0 },
        { id: 'P2', name: 'Alto', index: 1 }
      ],
      effectiveSemitones: 0
    })
    expect(result).toBe('Ready - 2 part(s) loaded')
  })

  test('should include transpose info when semitones is positive', () => {
    const result = useStatusText({
      isAvailable: true,
      isProcessing: false,
      progress: null,
      error: null,
      musicXml: '<musicxml>...</musicxml>',
      parts: [{ id: 'P1', name: 'Soprano', index: 0 }],
      effectiveSemitones: 2
    })
    expect(result).toBe('Ready - 1 part(s) loaded | Transposed: +2 semitones')
  })

  test('should include transpose info when semitones is negative', () => {
    const result = useStatusText({
      isAvailable: true,
      isProcessing: false,
      progress: null,
      error: null,
      musicXml: '<musicxml>...</musicxml>',
      parts: [{ id: 'P1', name: 'Soprano', index: 0 }],
      effectiveSemitones: -2
    })
    expect(result).toBe('Ready - 1 part(s) loaded | Transposed: -2 semitones')
  })

  test('should return ready to load message when no music loaded', () => {
    const result = useStatusText({
      isAvailable: true,
      isProcessing: false,
      progress: null,
      error: null,
      musicXml: null,
      parts: [],
      effectiveSemitones: 0
    })
    expect(result).toBe('Ready to load sheet music')
  })
})
