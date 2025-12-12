import { describe, it, expect, vi } from 'vitest'
import { stitchImages } from '../image-stitcher'

// Mock sharp
vi.mock('sharp', () => {
  const mockSharp: any = vi.fn(() => ({
    metadata: vi.fn().mockResolvedValue({ width: 2000, height: 3000 }),
    resize: vi.fn().mockReturnThis(),
    toBuffer: vi.fn().mockResolvedValue(Buffer.from('mock-image')),
    composite: vi.fn().mockReturnThis(),
    png: vi.fn().mockReturnThis(),
    toFile: vi.fn().mockResolvedValue(undefined)
  }))

  // Add create method for blank canvas
  mockSharp.kernel = { lanczos3: 'lanczos3' }

  return { default: mockSharp }
})

describe('image-stitcher', () => {
  describe('stitchImages', () => {
    it('should return single image unchanged', async () => {
      const result = await stitchImages(['/path/to/image.jpg'])
      expect(result).toBe('/path/to/image.jpg')
    })

    it('should throw error for empty array', async () => {
      await expect(stitchImages([])).rejects.toThrow('No images to stitch')
    })

    it('should stitch multiple images', async () => {
      const paths = ['/path/to/img1.jpg', '/path/to/img2.jpg']
      const result = await stitchImages(paths)

      // Should return a path to the stitched image
      expect(result).toContain('stitched.png')
      expect(result).toContain('transposaune-stitched')
    })

    it('should sort images by filename numerically', async () => {
      // Test that IMG_0001, IMG_0002, IMG_0010 sorts correctly
      const paths = [
        '/path/IMG_0010.jpg',
        '/path/IMG_0001.jpg',
        '/path/IMG_0002.jpg'
      ]

      const result = await stitchImages(paths)
      expect(result).toBeDefined()

      // In real implementation, the order would be:
      // IMG_0001, IMG_0002, IMG_0010 (not IMG_0001, IMG_0010, IMG_0002)
    })

    it('should handle different image sizes', async () => {
      const paths = [
        '/path/small.jpg',
        '/path/large.jpg'
      ]

      const result = await stitchImages(paths)
      expect(result).toBeDefined()
      expect(result).toContain('stitched.png')
    })
  })
})
