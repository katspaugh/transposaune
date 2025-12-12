import { Select } from './ui'

interface TransposePreset {
  id: string
  name: string
  semitones: number
  description?: string
}

interface TransposeSectionProps {
  presets: TransposePreset[]
  selectedPreset: string
  customSemitones: number
  musicXml: string | null
  onPresetChange: (presetId: string) => void
  onCustomSemitonesChange: (semitones: number) => void
}

export function TransposeSection({
  presets,
  selectedPreset,
  customSemitones,
  musicXml,
  onPresetChange,
  onCustomSemitonesChange
}: TransposeSectionProps) {
  const transposeOptions = presets.map(p => ({
    value: p.id,
    label: p.name + (p.semitones !== 0 && p.id !== 'custom' ? ` (${p.semitones > 0 ? '+' : ''}${p.semitones})` : '')
  }))

  const selectedPresetData = presets.find(p => p.id === selectedPreset)

  return (
    <div className="control-group">
      <Select
        label="Transpose"
        options={transposeOptions}
        value={selectedPreset}
        onChange={(e) => onPresetChange(e.target.value)}
        disabled={!musicXml}
      />
      {selectedPreset === 'custom' && (
        <div className="custom-transpose">
          <label className="label" style={{ marginTop: 'var(--space-sm)' }}>
            Semitones
          </label>
          <input
            type="number"
            className="select"
            value={customSemitones}
            onChange={(e) => onCustomSemitonesChange(Number(e.target.value))}
            min={-12}
            max={12}
            disabled={!musicXml}
          />
          <p className="hint">
            Range: -12 to +12 semitones
          </p>
        </div>
      )}
      {selectedPreset !== 'custom' && selectedPreset !== 'concert' && selectedPresetData?.description && (
        <p className="hint">
          {selectedPresetData.description}
        </p>
      )}
    </div>
  )
}
