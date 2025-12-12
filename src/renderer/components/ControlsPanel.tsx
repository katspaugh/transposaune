import { Panel } from './ui'
import { FileUploadSection } from './FileUploadSection'
import { PartSelector } from './PartSelector'
import { TransposeSection } from './TransposeSection'
import { ExportActions } from './ExportActions'
import { Part } from './SheetViewerVerovio'

interface TransposePreset {
  id: string
  name: string
  semitones: number
  description?: string
}

interface ControlsPanelProps {
  // File upload props
  isProcessing: boolean
  isAvailable: boolean | null
  musicXml: string | null
  progress: { stage: string; percent: number } | null
  onUpload: () => void
  onReset: () => void
  
  // Part selection props
  parts: Part[]
  selectedPart: string
  onPartChange: (partId: string) => void
  
  // Transpose props
  presets: TransposePreset[]
  selectedPreset: string
  customSemitones: number
  onPresetChange: (presetId: string) => void
  onCustomSemitonesChange: (semitones: number) => void
  
  // Export props
  onPrint: () => void
  onExportPdf: () => void
  onExportMusicXml: () => void
}

export function ControlsPanel({
  isProcessing,
  isAvailable,
  musicXml,
  progress,
  onUpload,
  onReset,
  parts,
  selectedPart,
  onPartChange,
  presets,
  selectedPreset,
  customSemitones,
  onPresetChange,
  onCustomSemitonesChange,
  onPrint,
  onExportPdf,
  onExportMusicXml
}: ControlsPanelProps) {
  return (
    <aside className="controls-panel">
      <Panel>
        <h2 className="panel-title">Controls</h2>

        <FileUploadSection
          isProcessing={isProcessing}
          isAvailable={isAvailable}
          musicXml={musicXml}
          progress={progress}
          onUpload={onUpload}
          onReset={onReset}
        />

        <PartSelector
          parts={parts}
          selectedPart={selectedPart}
          musicXml={musicXml}
          onChange={onPartChange}
        />

        <TransposeSection
          presets={presets}
          selectedPreset={selectedPreset}
          customSemitones={customSemitones}
          musicXml={musicXml}
          onPresetChange={onPresetChange}
          onCustomSemitonesChange={onCustomSemitonesChange}
        />

        <ExportActions
          musicXml={musicXml}
          onPrint={onPrint}
          onExportPdf={onExportPdf}
          onExportMusicXml={onExportMusicXml}
        />
      </Panel>
    </aside>
  )
}
