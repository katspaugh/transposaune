import { Panel } from './ui'
import { SheetViewer, Part } from './SheetViewerVerovio'
import { EmptyState } from './EmptyState'

interface SheetMusicViewerProps {
  musicXml: string | null
  selectedPart: string
  transpose: number
  isAudiverisAvailable: boolean | null
  onPartsLoaded: (parts: Part[]) => void
}

export function SheetMusicViewer({
  musicXml,
  selectedPart,
  transpose,
  isAudiverisAvailable,
  onPartsLoaded
}: SheetMusicViewerProps) {
  return (
    <div className="viewer-container">
      <Panel className="viewer-panel">
        {musicXml ? (
          <SheetViewer
            musicXml={musicXml}
            selectedPart={selectedPart}
            transpose={transpose}
            onPartsLoaded={onPartsLoaded}
          />
        ) : (
          <EmptyState isAudiverisAvailable={isAudiverisAvailable} />
        )}
      </Panel>
    </div>
  )
}
