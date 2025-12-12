import { Select } from './ui'
import { Part } from './SheetViewerVerovio'

interface PartSelectorProps {
  parts: Part[]
  selectedPart: string
  musicXml: string | null
  onChange: (partId: string) => void
}

export function PartSelector({ parts, selectedPart, musicXml, onChange }: PartSelectorProps) {
  const partOptions = parts.map(p => ({ value: p.id, label: p.name }))

  return (
    <div className="control-group">
      <Select
        label="Select Part"
        options={partOptions}
        value={selectedPart}
        onChange={(e) => onChange(e.target.value)}
        disabled={!musicXml || parts.length === 0}
      />
    </div>
  )
}
