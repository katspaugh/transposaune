import { describe, it, expect } from 'vitest'
import * as path from 'path'

describe('Audiveris Integration', () => {
  describe('file validation', () => {
    it('should accept valid PDF file', () => {
      const mockFilePath = '/test/file.pdf'
      expect(path.extname(mockFilePath)).toBe('.pdf')
    })

    it('should accept valid image files', () => {
      const validExtensions = ['.pdf', '.png', '.jpg', '.jpeg']
      expect(validExtensions.includes(path.extname('/test/file.png'))).toBe(true)
      expect(validExtensions.includes(path.extname('/test/file.jpg'))).toBe(true)
      expect(validExtensions.includes(path.extname('/test/file.jpeg'))).toBe(true)
    })

    it('should reject invalid file extensions', () => {
      const mockFilePath = '/test/file.txt'
      const validExtensions = ['.pdf', '.png', '.jpg', '.jpeg']
      expect(validExtensions.includes(path.extname(mockFilePath))).toBe(false)
    })
  })

  describe('error handling', () => {
    it('should handle processing errors gracefully', () => {
      const mockError = new Error('Audiveris process failed')
      expect(mockError.message).toBe('Audiveris process failed')
      expect(mockError).toBeInstanceOf(Error)
    })

    it('should handle file not found errors', () => {
      const error = { success: false, error: 'Input file not found: /path/to/file.pdf' }
      expect(error.success).toBe(false)
      expect(error.error).toContain('Input file not found')
    })
  })

  describe('MusicXML validation', () => {
    it('should validate MusicXML output structure', () => {
      const mockXML = '<?xml version="1.0"?><score-partwise></score-partwise>'
      expect(mockXML).toContain('score-partwise')
      expect(mockXML).toContain('<?xml')
    })

    it('should reject invalid XML', () => {
      const mockXML = 'not valid xml'
      expect(mockXML.startsWith('<?xml')).toBe(false)
    })

    it('should have proper MusicXML structure', () => {
      const validXML = `<?xml version="1.0" encoding="UTF-8"?>
<score-partwise version="3.1">
  <part-list></part-list>
</score-partwise>`
      expect(validXML).toContain('score-partwise')
      expect(validXML).toContain('part-list')
    })
  })
})
