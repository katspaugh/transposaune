import '@testing-library/jest-dom'
import { vi } from 'vitest'

// Mock Electron API (matching preload structure)
global.window = Object.assign(global.window || {}, {
  api: {
    checkAudiveris: vi.fn().mockResolvedValue(true),
    processSheet: vi.fn(),
    selectFile: vi.fn(),
    print: vi.fn(),
    exportPdf: vi.fn(),
    onProcessingProgress: vi.fn(() => () => {}),
  },
  electron: {},
})

// Mock OpenSheetMusicDisplay
vi.mock('opensheetmusicdisplay', () => ({
  OpenSheetMusicDisplay: vi.fn().mockImplementation(() => ({
    load: vi.fn().mockResolvedValue(undefined),
    render: vi.fn().mockResolvedValue(undefined),
    TransposeCalculator: {
      transpose: vi.fn(),
    },
  })),
}))
