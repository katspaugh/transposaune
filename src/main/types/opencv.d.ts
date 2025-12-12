// Type definitions for @techstark/opencv-js
declare module '@techstark/opencv-js' {
  export interface ImageData {
    data: Uint8ClampedArray
    width: number
    height: number
  }

  export class Mat {
    constructor()
    rows: number
    cols: number
    data32S: Int32Array
    data: Uint8Array
    delete(): void
  }

  export class MatVector {
    constructor()
    size(): number
    get(index: number): Mat
    delete(): void
  }

  export class Size {
    constructor(width: number, height: number)
    width: number
    height: number
  }

  export class Scalar {
    constructor(...values: number[])
  }

  export function matFromImageData(imageData: ImageData): Mat
  export function matFromArray(rows: number, cols: number, type: number, data: number[]): Mat
  export function imread(element: unknown): Mat
  export function cvtColor(src: Mat, dst: Mat, code: number): void
  export function GaussianBlur(src: Mat, dst: Mat, ksize: Size, sigmaX: number): void
  export function Canny(
    src: Mat,
    dst: Mat,
    threshold1: number,
    threshold2: number,
    apertureSize?: number,
    L2gradient?: boolean
  ): void
  export function HoughLinesP(
    src: Mat,
    lines: Mat,
    rho: number,
    theta: number,
    threshold: number,
    minLineLength?: number,
    maxLineGap?: number
  ): void
  export function findContours(
    image: Mat,
    contours: MatVector,
    hierarchy: Mat,
    mode: number,
    method: number
  ): void
  export function contourArea(contour: Mat): number
  export function arcLength(curve: Mat, closed: boolean): number
  export function approxPolyDP(curve: Mat, approxCurve: Mat, epsilon: number, closed: boolean): void
  export function getPerspectiveTransform(src: Mat, dst: Mat): Mat
  export function warpPerspective(
    src: Mat,
    dst: Mat,
    M: Mat,
    dsize: Size,
    flags?: number,
    borderMode?: number,
    borderValue?: Scalar
  ): void
  export function adaptiveThreshold(
    src: Mat,
    dst: Mat,
    maxValue: number,
    adaptiveMethod: number,
    thresholdType: number,
    blockSize: number,
    C: number
  ): void

  // Constants
  export const COLOR_RGB2GRAY: number
  export const RETR_EXTERNAL: number
  export const CHAIN_APPROX_SIMPLE: number
  export const INTER_LINEAR: number
  export const BORDER_CONSTANT: number
  export const ADAPTIVE_THRESH_GAUSSIAN_C: number
  export const THRESH_BINARY: number
  export const CV_32FC2: number
}
