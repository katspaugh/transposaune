import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { useAudiveris } from '../useAudiveris'

describe('useAudiveris', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    global.window.api = {
      checkAudiveris: vi.fn().mockResolvedValue(true),
      processSheet: vi.fn(),
      selectFile: vi.fn(),
      print: vi.fn(),
      exportPdf: vi.fn(),
      exportMusicXml: vi.fn(),
      onProcessingProgress: vi.fn(() => () => {}),
    }
  })

  it('should initialize correctly', async () => {
    const { result } = renderHook(() => useAudiveris())
    
    await waitFor(() => {
      expect(result.current.isAvailable).toBe(true)
    })
    expect(result.current.isProcessing).toBe(false)
    expect(result.current.progress).toBeNull()
    expect(result.current.error).toBeNull()
  })

  it('should process file successfully', async () => {
    const mockMusicXML = '<score-partwise></score-partwise>'
    global.window.api.processSheet = vi.fn().mockResolvedValue({
      success: true,
      musicXml: mockMusicXML,
    })

    const { result } = renderHook(() => useAudiveris())

    await act(async () => {
      await result.current.processFile('/path/to/file.pdf')
    })

    expect(global.window.api.processSheet).toHaveBeenCalledWith('/path/to/file.pdf')
    expect(result.current.musicXml).toBe(mockMusicXML)
    expect(result.current.error).toBeNull()
  })

  it('should handle processing errors', async () => {
    const errorMessage = 'Processing failed'
    global.window.api.processSheet = vi.fn().mockResolvedValue({
      success: false,
      error: errorMessage,
    })

    const { result } = renderHook(() => useAudiveris())

    await act(async () => {
      await result.current.processFile('/path/to/file.pdf')
    })

    expect(result.current.error).toBe(errorMessage)
    expect(result.current.musicXml).toBeNull()
  })

  it('should reset state', async () => {
    const { result } = renderHook(() => useAudiveris())
    
    await act(async () => {
      result.current.reset()
    })

    expect(result.current.musicXml).toBeNull()
    expect(result.current.progress).toBeNull()
    expect(result.current.error).toBeNull()
  })
})
