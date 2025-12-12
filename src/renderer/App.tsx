import { useState, useCallback, useEffect } from 'react'
import { useAudiveris } from './hooks/useAudiveris'
import { useTranspose } from './hooks/useTranspose'
import { useStatusText } from './hooks/useStatusText'
import { StatusBar } from './components/ui'
import { AppHeader, ControlsPanel, SheetMusicViewer, Part } from './components'
import './styles/theme.css'
import './styles/app.css'

function App() {
  const {
    isAvailable,
    isProcessing,
    progress,
    error,
    musicXml,
    processFile,
    selectAndProcess,
    reset
  } = useAudiveris()

  const {
    presets,
    selectedPreset,
    customSemitones,
    effectiveSemitones,
    setSelectedPreset,
    setCustomSemitones
  } = useTranspose()

  const [parts, setParts] = useState<Part[]>([])
  const [selectedPart, setSelectedPart] = useState<string>('')
  
  // Expose processFile for E2E testing
  useEffect(() => {
    if (typeof window !== 'undefined') {
      (window as any).__testProcessFile = processFile
    }
  }, [processFile])

  const handlePartsLoaded = useCallback((loadedParts: Part[]) => {
    console.log('Parts loaded:', loadedParts)
    setParts(loadedParts)
    setSelectedPart(prev => {
      if (prev && loadedParts.some(p => p.id === prev)) {
        return prev
      }
      return 'all'
    })
  }, [])

  const handlePrint = () => window.api.print()
  const handleExportPdf = () => window.api.exportPdf()
  const handleExportMusicXml = () => {
    if (musicXml) {
      window.api.exportMusicXml(musicXml)
    }
  }

  const statusText = useStatusText({
    isAvailable,
    isProcessing,
    progress,
    error,
    musicXml,
    parts,
    effectiveSemitones
  })

  return (
    <div className="app">
      <AppHeader />

      <main className="app-main">
        <ControlsPanel
          isProcessing={isProcessing}
          isAvailable={isAvailable}
          musicXml={musicXml}
          progress={progress}
          onUpload={selectAndProcess}
          onReset={reset}
          parts={parts}
          selectedPart={selectedPart}
          onPartChange={setSelectedPart}
          presets={presets}
          selectedPreset={selectedPreset}
          customSemitones={customSemitones}
          onPresetChange={setSelectedPreset}
          onCustomSemitonesChange={setCustomSemitones}
          onPrint={handlePrint}
          onExportPdf={handleExportPdf}
          onExportMusicXml={handleExportMusicXml}
        />

        <SheetMusicViewer
          musicXml={musicXml}
          selectedPart={selectedPart}
          transpose={effectiveSemitones}
          isAudiverisAvailable={isAvailable}
          onPartsLoaded={handlePartsLoaded}
        />
      </main>

      <StatusBar variant={error ? 'error' : 'default'}>
        Status: {statusText}
      </StatusBar>
    </div>
  )
}

export default App
