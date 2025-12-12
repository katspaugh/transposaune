import { Button } from './ui'

interface ExportActionsProps {
  musicXml: string | null
  onPrint: () => void
  onExportPdf: () => void
  onExportMusicXml: () => void
}

export function ExportActions({ musicXml, onPrint, onExportPdf, onExportMusicXml }: ExportActionsProps) {
  return (
    <div className="control-group action-buttons">
      <Button variant="success" onClick={onPrint} disabled={!musicXml}>
        Print
      </Button>
      <Button variant="outline" onClick={onExportPdf} disabled={!musicXml}>
        Export PDF
      </Button>
      <Button variant="outline" onClick={onExportMusicXml} disabled={!musicXml}>
        Export MusicXML
      </Button>
    </div>
  )
}
