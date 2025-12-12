import { useState, useCallback } from 'react'

export interface TransposePreset {
  id: string
  name: string
  semitones: number
  description: string
}

export const TRANSPOSE_PRESETS: TransposePreset[] = [
  { id: 'concert', name: 'Concert Pitch', semitones: 0, description: 'No transposition' },
  { id: 'bb', name: 'Bb Instruments', semitones: 2, description: 'Clarinet, Trumpet, Tenor Sax' },
  { id: 'eb-alto', name: 'Eb Alto Instruments', semitones: 9, description: 'Alto Sax, Eb Clarinet' },
  { id: 'f', name: 'F Instruments', semitones: 7, description: 'French Horn, English Horn' },
  { id: 'eb-bari', name: 'Eb Baritone', semitones: -9, description: 'Baritone Sax (sounds octave + 6th lower)' },
  { id: 'custom', name: 'Custom', semitones: 0, description: 'Set your own interval' }
]

interface UseTransposeReturn {
  presets: TransposePreset[]
  selectedPreset: string
  customSemitones: number
  effectiveSemitones: number
  setSelectedPreset: (id: string) => void
  setCustomSemitones: (semitones: number) => void
}

export function useTranspose(): UseTransposeReturn {
  const [selectedPreset, setSelectedPreset] = useState<string>('concert')
  const [customSemitones, setCustomSemitones] = useState<number>(0)

  const handlePresetChange = useCallback((id: string) => {
    setSelectedPreset(id)
    if (id !== 'custom') {
      const preset = TRANSPOSE_PRESETS.find(p => p.id === id)
      if (preset) {
        setCustomSemitones(preset.semitones)
      }
    }
  }, [])

  const effectiveSemitones = selectedPreset === 'custom'
    ? customSemitones
    : TRANSPOSE_PRESETS.find(p => p.id === selectedPreset)?.semitones ?? 0

  return {
    presets: TRANSPOSE_PRESETS,
    selectedPreset,
    customSemitones,
    effectiveSemitones,
    setSelectedPreset: handlePresetChange,
    setCustomSemitones
  }
}
