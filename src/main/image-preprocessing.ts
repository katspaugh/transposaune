import sharp from 'sharp'
import { existsSync } from 'fs'
import { join, basename, extname } from 'path'
import { tmpdir } from 'os'
import { mkdir } from 'fs/promises'
import cv from '@techstark/opencv-js'

// Initialize OpenCV (it's loaded synchronously in Node.js)
let cvReady = false
try {
  // Check if cv is available
  if (cv && typeof cv.imread === 'function') {
    cvReady = true
    console.log('[OpenCV] Loaded successfully')
  }
} catch (err) {
  console.warn('[OpenCV] Failed to load:', err)
}

/**
 * Detect document corners and apply perspective correction
 * This "flattens" photos taken at an angle or with perspective distortion
 */
async function correctPerspective(imagePath: string): Promise<string | null> {
  if (!cvReady) {
    console.warn('[Perspective] OpenCV not available, skipping perspective correction')
    return null
  }

  try {
    // Read image
    const imageBuffer = await sharp(imagePath)
      .raw()
      .toBuffer({ resolveWithObject: true })

    const { data, info } = imageBuffer
    const { width, height, channels } = info

    // Create OpenCV Mat from raw image data
    const src = cv.matFromImageData({
      data: new Uint8ClampedArray(data),
      width,
      height
    })

    // Convert to grayscale
    const gray = new cv.Mat()
    cv.cvtColor(src, gray, cv.COLOR_RGB2GRAY)

    // Apply Gaussian blur to reduce noise
    const blurred = new cv.Mat()
    cv.GaussianBlur(gray, blurred, new cv.Size(5, 5), 0)

    // Edge detection
    const edges = new cv.Mat()
    cv.Canny(blurred, edges, 50, 150)

    // Find contours
    const contours = new cv.MatVector()
    const hierarchy = new cv.Mat()
    cv.findContours(edges, contours, hierarchy, cv.RETR_EXTERNAL, cv.CHAIN_APPROX_SIMPLE)

    // Find the largest contour (should be the document)
    let maxArea = 0
    let maxContourIdx = -1

    for (let i = 0; i < contours.size(); i++) {
      const contour = contours.get(i)
      const area = cv.contourArea(contour)
      if (area > maxArea) {
        maxArea = area
        maxContourIdx = i
      }
    }

    // Need to find a quadrilateral with significant area (at least 10% of image)
    const minArea = (width * height) * 0.1
    if (maxContourIdx === -1 || maxArea < minArea) {
      console.log('[Perspective] No significant document contour found, skipping correction')
      src.delete()
      gray.delete()
      blurred.delete()
      edges.delete()
      contours.delete()
      hierarchy.delete()
      return null
    }

    // Approximate contour to polygon
    const contour = contours.get(maxContourIdx)
    const peri = cv.arcLength(contour, true)
    const approx = new cv.Mat()
    cv.approxPolyDP(contour, approx, 0.02 * peri, true)

    // We need exactly 4 corners for perspective transform
    if (approx.rows !== 4) {
      console.log(`[Perspective] Document contour has ${approx.rows} corners (need 4), skipping correction`)
      src.delete()
      gray.delete()
      blurred.delete()
      edges.delete()
      contours.delete()
      hierarchy.delete()
      approx.delete()
      return null
    }

    // Extract the 4 corner points
    const corners: { x: number; y: number }[] = []
    for (let i = 0; i < 4; i++) {
      corners.push({
        x: approx.data32S[i * 2],
        y: approx.data32S[i * 2 + 1]
      })
    }

    // Sort corners: top-left, top-right, bottom-right, bottom-left
    corners.sort((a, b) => a.y - b.y) // Sort by y
    const top = corners.slice(0, 2).sort((a, b) => a.x - b.x) // Top two, sorted by x
    const bottom = corners.slice(2, 4).sort((a, b) => a.x - b.x) // Bottom two, sorted by x

    const [tl, tr] = top
    const [bl, br] = bottom

    // Calculate output dimensions (use the max width/height from the corners)
    const widthTop = Math.sqrt(Math.pow(tr.x - tl.x, 2) + Math.pow(tr.y - tl.y, 2))
    const widthBottom = Math.sqrt(Math.pow(br.x - bl.x, 2) + Math.pow(br.y - bl.y, 2))
    const outputWidth = Math.max(widthTop, widthBottom)

    const heightLeft = Math.sqrt(Math.pow(bl.x - tl.x, 2) + Math.pow(bl.y - tl.y, 2))
    const heightRight = Math.sqrt(Math.pow(br.x - tr.x, 2) + Math.pow(br.y - tr.y, 2))
    const outputHeight = Math.max(heightLeft, heightRight)

    // Create source and destination points for perspective transform
    const srcPoints = cv.matFromArray(4, 1, cv.CV_32FC2, [
      tl.x, tl.y,
      tr.x, tr.y,
      br.x, br.y,
      bl.x, bl.y
    ])

    const dstPoints = cv.matFromArray(4, 1, cv.CV_32FC2, [
      0, 0,
      outputWidth, 0,
      outputWidth, outputHeight,
      0, outputHeight
    ])

    // Calculate perspective transform matrix
    const M = cv.getPerspectiveTransform(srcPoints, dstPoints)

    // Apply perspective transform
    const warped = new cv.Mat()
    cv.warpPerspective(
      src,
      warped,
      M,
      new cv.Size(outputWidth, outputHeight),
      cv.INTER_LINEAR,
      cv.BORDER_CONSTANT,
      new cv.Scalar(255, 255, 255, 255)
    )

    // Convert back to buffer for sharp
    const warpedData = new Uint8Array(warped.data)

    // Clean up
    src.delete()
    gray.delete()
    blurred.delete()
    edges.delete()
    contours.delete()
    hierarchy.delete()
    approx.delete()
    srcPoints.delete()
    dstPoints.delete()
    M.delete()

    // Save warped image to temp file
    const tempDir = join(tmpdir(), 'transposaune-preprocessed')
    await mkdir(tempDir, { recursive: true })
    const name = basename(imagePath, extname(imagePath))
    const warpedPath = join(tempDir, `${name}_perspective.png`)

    await sharp(Buffer.from(warpedData), {
      raw: {
        width: Math.round(outputWidth),
        height: Math.round(outputHeight),
        channels: channels
      }
    })
      .png()
      .toFile(warpedPath)

    warped.delete()

    console.log(`[Perspective] ✓ Applied perspective correction: ${Math.round(outputWidth)}x${Math.round(outputHeight)}px`)
    return warpedPath
  } catch (err) {
    console.warn('[Perspective] Perspective correction failed:', err)
    return null
  }
}

/**
 * Detect and correct page curvature/warping using page-dewarp-js library
 * This handles curved pages (like book bindings) that perspective correction can't fix
 */
async function correctPageCurvature(imagePath: string): Promise<string | null> {
  try {
    console.log('[Dewarp] Attempting page dewarp...')
    
    // Dynamically import page-dewarp-js
    const { loadOpenCV, WarpedImage, updateConfig } = await import('page-dewarp-js')
    
    // Load OpenCV for page-dewarp-js (it uses its own opencv-wasm)
    await loadOpenCV()
    
    // Configure for sheet music (high quality output)
    updateConfig({
      OUTPUT_ZOOM: 1.0,
      OUTPUT_DPI: 300,
      DEBUG_LEVEL: 0 // No debug output
    })
    
    // Process the image
    const warpedImage = new WarpedImage(imagePath)
    await warpedImage.process()
    
    // Get the output path (page-dewarp-js saves as inputname_thresh.png)
    const outputPath = imagePath.replace(/\.[^.]+$/, '_thresh.png')
    
    // Clean up
    warpedImage.destroy()
    
    // Check if output was created
    const { existsSync } = await import('fs')
    if (existsSync(outputPath)) {
      console.log(`[Dewarp] ✓ Page dewarped: ${outputPath}`)
      return outputPath
    } else {
      console.log('[Dewarp] Output file not found, dewarp may have failed')
      return null
    }
    
  } catch (err) {
    console.warn('[Dewarp] Page dewarp failed:', err)
    console.log('[Dewarp] Continuing with original image')
    return null
  }
}

/**
 * Detect skew angle using OpenCV Hough Line Transform
 * This detects staff lines and calculates their angle for accurate deskewing
 */
async function detectSkewAngle(imagePath: string): Promise<number> {
  if (!cvReady) {
    console.warn('[Deskew] OpenCV not available, skipping deskew detection')
    return 0
  }

  try {
    // Read image with sharp and convert to format OpenCV can use
    const imageBuffer = await sharp(imagePath)
      .grayscale()
      .raw()
      .toBuffer({ resolveWithObject: true })

    const { data, info } = imageBuffer

    // Create OpenCV Mat from raw image data
    const src = cv.matFromImageData({
      data: new Uint8ClampedArray(data),
      width: info.width,
      height: info.height
    })

    // Apply edge detection
    const edges = new cv.Mat()
    cv.Canny(src, edges, 50, 150, 3, false)

    // Detect lines using Hough Line Transform
    const lines = new cv.Mat()
    cv.HoughLinesP(
      edges,
      lines,
      1,                    // rho: distance resolution in pixels
      Math.PI / 180,        // theta: angle resolution in radians (1 degree)
      80,                   // threshold: minimum number of intersections to detect a line
      50,                   // minLineLength: minimum line length
      10                    // maxLineGap: maximum gap between line segments
    )

    // Calculate angles of detected lines
    const angles: number[] = []
    for (let i = 0; i < lines.rows; i++) {
      const x1 = lines.data32S[i * 4]
      const y1 = lines.data32S[i * 4 + 1]
      const x2 = lines.data32S[i * 4 + 2]
      const y2 = lines.data32S[i * 4 + 3]

      // Calculate angle in degrees
      const angle = Math.atan2(y2 - y1, x2 - x1) * (180 / Math.PI)

      // Filter for near-horizontal lines (staff lines are horizontal)
      // We want angles close to 0° (or 180°/-180°)
      const normalizedAngle = ((angle + 180) % 180) - 90 // Normalize to [-90, 90]
      if (Math.abs(normalizedAngle) < 45) {
        angles.push(normalizedAngle)
      }
    }

    // Clean up OpenCV Mats
    src.delete()
    edges.delete()
    lines.delete()

    if (angles.length === 0) {
      console.log('[Deskew] No horizontal lines detected, assuming no skew')
      return 0
    }

    // Use median angle to avoid outliers
    angles.sort((a, b) => a - b)
    const medianAngle = angles[Math.floor(angles.length / 2)]

    console.log(`[Deskew] Detected ${angles.length} lines, median angle: ${medianAngle.toFixed(2)}°`)
    return -medianAngle // Negative because we need to rotate opposite direction
  } catch (err) {
    console.warn('[Deskew] Hough transform failed:', err)
    return 0
  }
}

export interface PreprocessOptions {
  correctPerspective?: boolean  // Apply perspective correction (flatten angled photos)
  correctCurvature?: boolean    // Detect and warn about page curvature (dewarp not yet implemented)
  deskew?: boolean              // Auto-detect and correct skew
  enhanceContrast?: boolean     // Improve contrast for better staff detection
  denoise?: boolean             // Remove noise
  binarize?: boolean            // Convert to black and white
  threshold?: number            // Threshold for binarization (0-255, default: auto)
}

const DEFAULT_OPTIONS: PreprocessOptions = {
  correctPerspective: true,
  correctCurvature: true,
  deskew: true,
  enhanceContrast: true,
  denoise: true,
  binarize: true
}

/**
 * Preprocess an image for better OMR quality
 * Returns path to preprocessed image
 */
export async function preprocessImage(
  inputPath: string,
  options: PreprocessOptions = {}
): Promise<string> {
  if (!existsSync(inputPath)) {
    throw new Error(`Input file not found: ${inputPath}`)
  }

  const opts = { ...DEFAULT_OPTIONS, ...options }

  // Create temp directory for preprocessed images
  const tempDir = join(tmpdir(), 'transposaune-preprocessed')
  await mkdir(tempDir, { recursive: true })

  const ext = extname(inputPath)
  const name = basename(inputPath, ext)
  const outputPath = join(tempDir, `${name}_preprocessed.png`)

  // Track the current working path (will be updated if perspective correction succeeds)
  let workingPath = inputPath

  // 1. Perspective correction (do this FIRST before any other processing)
  if (opts.correctPerspective) {
    try {
      const correctedPath = await correctPerspective(inputPath)
      if (correctedPath) {
        workingPath = correctedPath
        console.log('[Preprocessing] ✓ Perspective corrected')
      }
    } catch (err) {
      console.warn('[Preprocessing] Perspective correction failed, skipping:', err)
    }
  }

  // 2. Curvature detection (warns about warped pages)
  if (opts.correctCurvature) {
    try {
      await correctPageCurvature(workingPath)
      // This currently only detects and warns, doesn't fix
    } catch (err) {
      console.warn('[Preprocessing] Curvature detection failed, skipping:', err)
    }
  }

  // 3. Deskew detection and correction (on perspective-corrected image)
  let rotationAngle = 0
  if (opts.deskew) {
    try {
      rotationAngle = await detectSkewAngle(workingPath)
    } catch (err) {
      console.warn('[Preprocessing] Deskew detection failed, skipping:', err)
    }
  }

  let pipeline = sharp(workingPath)

  // 4. Apply rotation if skew was detected
  if (rotationAngle !== 0) {
    console.log(`[Preprocessing] Applying rotation: ${rotationAngle}°`)
    pipeline = pipeline.rotate(rotationAngle, { background: { r: 255, g: 255, b: 255 } })
  }

  // 5. Normalize to standard size for consistent processing
  // This helps with small/large images
  const metadata = await sharp(workingPath).metadata()
  const width = metadata.width || 2000

  // Resize if image is too small (< 1000px) or too large (> 4000px)
  if (width < 1000 || width > 4000) {
    const targetWidth = width < 1000 ? 2000 : 3000
    pipeline = pipeline.resize(targetWidth, null, {
      fit: 'inside',
      withoutEnlargement: false
    })
  }

  // 6. Convert to grayscale
  pipeline = pipeline.grayscale()

  // 7. Enhance contrast
  if (opts.enhanceContrast) {
    pipeline = pipeline.normalize() // Auto-contrast
  }

  // 8. Denoise using median filter (helps with scanned/photo noise)
  if (opts.denoise) {
    pipeline = pipeline.median(3) // 3x3 median filter
  }

  // 9. Sharpen to make staff lines and notes crisper
  pipeline = pipeline.sharpen()

  // 10. Binarization (threshold to pure black/white)
  if (opts.binarize) {
    if (cvReady) {
      // Use OpenCV adaptive thresholding for best results with uneven lighting
      try {
        // Save intermediate result for OpenCV processing
        const tempPath = join(tempDir, `${name}_temp.png`)
        await pipeline.toFile(tempPath)

        // Apply adaptive threshold with OpenCV
        const binarizedPath = await applyAdaptiveThreshold(tempPath)
        if (binarizedPath) {
          // Copy the binarized result to output path
          await sharp(binarizedPath).toFile(outputPath)
          return outputPath
        }
      } catch (err) {
        console.warn('[Preprocessing] Adaptive threshold failed, falling back to simple threshold:', err)
      }
    }

    // Fallback: Use sharp's built-in threshold
    pipeline = pipeline
      .normalise() // Ensure full dynamic range
      .linear(1.5, -(128 * 0.5)) // Increase contrast
      .threshold(opts.threshold) // Apply threshold
  }

  await pipeline.toFile(outputPath)

  return outputPath
}

/**
 * Apply adaptive threshold using OpenCV
 * Better handles uneven lighting compared to global threshold
 */
async function applyAdaptiveThreshold(imagePath: string): Promise<string | null> {
  if (!cvReady) {
    return null
  }

  try {
    // Read grayscale image
    const imageBuffer = await sharp(imagePath)
      .grayscale()
      .raw()
      .toBuffer({ resolveWithObject: true })

    const { data, info } = imageBuffer
    const { width, height } = info

    // Create OpenCV Mat
    const src = cv.matFromImageData({
      data: new Uint8ClampedArray(data),
      width,
      height
    })

    // Apply adaptive threshold
    // ADAPTIVE_THRESH_GAUSSIAN_C works better for sheet music than MEAN
    const dst = new cv.Mat()
    cv.adaptiveThreshold(
      src,
      dst,
      255,                                  // Max value
      cv.ADAPTIVE_THRESH_GAUSSIAN_C,        // Adaptive method
      cv.THRESH_BINARY,                     // Threshold type
      15,                                   // Block size (must be odd)
      10                                    // Constant subtracted from mean
    )

    // Convert back to buffer
    const resultData = new Uint8Array(dst.data)

    // Clean up
    src.delete()

    // Save result
    const tempDir = join(tmpdir(), 'transposaune-preprocessed')
    const name = basename(imagePath, extname(imagePath))
    const outputPath = join(tempDir, `${name}_binarized.png`)

    await sharp(Buffer.from(resultData), {
      raw: {
        width,
        height,
        channels: 1
      }
    })
      .png()
      .toFile(outputPath)

    dst.delete()

    console.log('[Binarization] ✓ Applied adaptive threshold')
    return outputPath
  } catch (err) {
    console.warn('[Binarization] Adaptive threshold failed:', err)
    return null
  }
}

/**
 * Preprocess multiple images in parallel
 */
export async function preprocessImages(
  inputPaths: string[],
  options: PreprocessOptions = {}
): Promise<string[]> {
  return Promise.all(
    inputPaths.map(path => preprocessImage(path, options))
  )
}
