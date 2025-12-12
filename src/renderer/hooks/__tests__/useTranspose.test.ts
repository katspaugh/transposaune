import { describe, it, expect, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useTranspose, TRANSPOSE_PRESETS } from '../useTranspose'

describe('useTranspose', () => {
  beforeEach(() => {
    // Clear any state between tests
  })

  it('should initialize with default values', () => {
    const { result } = renderHook(() => useTranspose())
    expect(result.current.selectedPreset).toBe('concert')
    expect(result.current.effectiveSemitones).toBe(0)
    expect(result.current.presets).toEqual(TRANSPOSE_PRESETS)
  })

  it('should update preset', () => {
    const { result } = renderHook(() => useTranspose())
    act(() => {
      result.current.setSelectedPreset('bb')
    })
    expect(result.current.selectedPreset).toBe('bb')
    expect(result.current.effectiveSemitones).toBe(2)
  })

  it('should set custom semitones', () => {
    const { result } = renderHook(() => useTranspose())
    act(() => {
      result.current.setSelectedPreset('custom')
      result.current.setCustomSemitones(5)
    })
    expect(result.current.selectedPreset).toBe('custom')
    expect(result.current.customSemitones).toBe(5)
    expect(result.current.effectiveSemitones).toBe(5)
  })

  it('should update custom semitones when changing to preset', () => {
    const { result } = renderHook(() => useTranspose())
    act(() => {
      result.current.setSelectedPreset('bb')
    })
    expect(result.current.customSemitones).toBe(2)
    expect(result.current.effectiveSemitones).toBe(2)
  })
})
