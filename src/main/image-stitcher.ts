import sharp from 'sharp'
import { basename } from 'path'
import { tmpdir } from 'os'
import { join } from 'path'
import { mkdir } from 'fs/promises'

/**
 * Stitch multiple images together vertically into a single tall image
 * This allows OMR to process them as a single document
 */
export async function stitchImages(inputPaths: string[]): Promise<string> {
  if (inputPaths.length === 0) {
    throw new Error('No images to stitch')
  }

  if (inputPaths.length === 1) {
    return inputPaths[0]
  }

  // Sort paths by filename (handles IMG_0001.jpg, IMG_0002.jpg, etc.)
  const sortedPaths = [...inputPaths].sort((a, b) => {
    const aName = basename(a)
    const bName = basename(b)
    return aName.localeCompare(bName, undefined, { numeric: true })
  })

  console.log('[Stitcher] Stitching images in order:', sortedPaths.map(p => basename(p)))

  // Load all images and get their metadata
  const images = await Promise.all(
    sortedPaths.map(async (path) => {
      const image = sharp(path)
      const metadata = await image.metadata()
      return { path, image, metadata }
    })
  )

  // Find the maximum width to normalize all images
  const maxWidth = Math.max(...images.map(img => img.metadata.width || 0))
  console.log(`[Stitcher] Normalizing all images to width: ${maxWidth}px`)

  // Resize all images to the same width (maintaining aspect ratio)
  const resizedBuffers = await Promise.all(
    images.map(async ({ image, metadata }) => {
      const width = metadata.width || maxWidth
      const height = metadata.height || 0

      if (width === maxWidth) {
        // No resize needed
        return image.toBuffer()
      }

      // Resize to maxWidth, height will scale proportionally
      const scaleFactor = maxWidth / width
      const newHeight = Math.round(height * scaleFactor)

      return image
        .resize(maxWidth, newHeight, {
          fit: 'fill',
          kernel: sharp.kernel.lanczos3
        })
        .toBuffer()
    })
  )

  // Get metadata for resized images to calculate total height
  const resizedMetadata = await Promise.all(
    resizedBuffers.map(buffer => sharp(buffer).metadata())
  )

  const totalHeight = resizedMetadata.reduce((sum, meta) => sum + (meta.height || 0), 0)
  console.log(`[Stitcher] Creating stitched image: ${maxWidth}x${totalHeight}px`)

  // Create a blank canvas
  const canvas = sharp({
    create: {
      width: maxWidth,
      height: totalHeight,
      channels: 3,
      background: { r: 255, g: 255, b: 255 }
    }
  })

  // Prepare composite operations (layering images vertically)
  let yOffset = 0
  const compositeOps = resizedBuffers.map((buffer, idx) => {
    const height = resizedMetadata[idx].height || 0
    const composite = {
      input: buffer,
      top: yOffset,
      left: 0
    }
    yOffset += height
    return composite
  })

  // Composite all images onto the canvas
  const stitched = canvas.composite(compositeOps)

  // Save to temp directory
  const tempDir = join(tmpdir(), 'transposaune-stitched')
  await mkdir(tempDir, { recursive: true })

  const outputPath = join(tempDir, 'stitched.png')
  await stitched.png().toFile(outputPath)

  console.log(`[Stitcher] ✓ Stitched image saved to: ${outputPath}`)
  return outputPath
}
