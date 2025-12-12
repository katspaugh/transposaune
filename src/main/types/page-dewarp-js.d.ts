// Type definitions for page-dewarp-js
declare module 'page-dewarp-js' {
  export interface ConfigOptions {
    OUTPUT_ZOOM?: number
    OUTPUT_DPI?: number
    DEBUG_LEVEL?: number
    DEBUG_OUTPUT?: 'file' | 'screen' | 'both'
    MAX_SCREEN_WIDTH?: number
    MAX_SCREEN_HEIGHT?: number
    NO_BINARY?: boolean
    SHRINK?: number
  }

  export const Config: ConfigOptions

  export function updateConfig(options: Partial<ConfigOptions>): void

  export function loadOpenCV(): Promise<void>

  export function getOpenCV(): unknown

  export class WarpedImage {
    constructor(imagePath: string)
    process(): Promise<void>
    destroy(): void
  }
}
