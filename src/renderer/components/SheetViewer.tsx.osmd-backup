import { useEffect, useRef, useState, useCallback } from 'react'
import { OpenSheetMusicDisplay, IOSMDOptions } from 'opensheetmusicdisplay'

export interface Part {
  id: string
  name: string
  index: number
  voiceIndex?: number // For individual voices within a part
}

export interface MusicMetadata {
  title?: string
  subtitle?: string
  composer?: string
  lyricist?: string
  copyright?: string
}

interface SheetViewerProps {
  musicXml: string | null
  selectedPart: string
  transpose: number
  onPartsLoaded: (parts: Part[]) => void
  onMetadataLoaded?: (metadata: MusicMetadata) => void
}

export function SheetViewer({ musicXml, selectedPart, transpose, onPartsLoaded, onMetadataLoaded }: SheetViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const osmdRef = useRef<OpenSheetMusicDisplay | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const loadedPartsRef = useRef<Part[]>([]) // Store parts to avoid re-calling callback

  // Initialize OSMD
  useEffect(() => {
    if (!containerRef.current) return

    const options: IOSMDOptions = {
      autoResize: true,
      drawTitle: false,
      drawComposer: false,
      drawCredits: false,
      drawPartNames: true,
      drawMeasureNumbers: true,
      drawTimeSignatures: true,
      drawingParameters: 'default'
    }

    osmdRef.current = new OpenSheetMusicDisplay(containerRef.current, options)

    return () => {
      osmdRef.current = null
    }
  }, [])

  // Apply part/voice highlighting by directly manipulating SVG (OSMD's API doesn't work)
  const applyPartHighlighting = useCallback(() => {
    if (!containerRef.current || !selectedPart) return
    
    const svg = containerRef.current.querySelector('svg')
    if (!svg) return
    
    console.log('Applying highlighting for part:', selectedPart)
    
    // For simplicity, grey out alternating measures or staffs
    // This is a placeholder - proper voice detection would require analyzing OSMD's data structure
    const staffGroups = svg.querySelectorAll('[class*="vf-staff"]')
    const selectedIndex = parseInt(selectedPart.match(/v(\d+)/)?.[1] || '1', 10) - 1
    
    staffGroups.forEach((staff, index) => {
      const shouldHighlight = index === selectedIndex
      const opacity = shouldHighlight ? '1.0' : '0.3'
      staff.setAttribute('opacity', opacity)
    })
    
    console.log(`Applied highlighting: ${staffGroups.length} staff groups, selected index ${selectedIndex}`)
  }, [selectedPart])

  // Load MusicXML and apply transpose/highlighting (reloads when any of these change)
  useEffect(() => {
    if (!musicXml || !osmdRef.current) return

    const loadSheet = async () => {
      setIsLoading(true)
      setError(null)

      try {
        console.log('Loading sheet with transpose:', transpose, 'selectedPart:', selectedPart)
        
        // Load the sheet from scratch
        await osmdRef.current!.load(musicXml)
        
        const sheet = osmdRef.current!.Sheet
        
        // Extract parts AND voices from the loaded sheet
        const parts: Part[] = []
        if (sheet && sheet.Instruments) {
          sheet.Instruments.forEach((instrument, partIndex) => {
            // Check if this instrument has multiple voices
            const voices = instrument.Voices
            
            if (voices && voices.length > 1) {
              // Multiple voices - list each separately (e.g., SATB)
              voices.forEach((voice) => {
                const voiceId = voice.VoiceId
                const voiceName = instrument.Name ? 
                  `${instrument.Name} - Voice ${voiceId}` :
                  `Part ${partIndex + 1} - Voice ${voiceId}`
                
                parts.push({
                  id: `${instrument.IdString}-v${voiceId}`,
                  name: voiceName,
                  index: partIndex,
                  voiceIndex: voiceId
                })
              })
            } else {
              // Single voice part
              parts.push({
                id: instrument.IdString || `Part ${partIndex + 1}`,
                name: instrument.Name || `Part ${partIndex + 1}`,
                index: partIndex
              })
            }
          })
        }

        // Only call onPartsLoaded if parts actually changed (to avoid state update loops)
        const partsChanged = JSON.stringify(parts) !== JSON.stringify(loadedPartsRef.current)
        if (partsChanged) {
          loadedPartsRef.current = parts
          onPartsLoaded(parts)
        }

        // Extract metadata
        if (onMetadataLoaded && sheet) {
          const title = sheet.TitleString
          console.log('OSMD TitleString:', title, '(empty/undefined means no title in MusicXML)')
          
          const metadata: MusicMetadata = {
            // Only use title if it's not the default "Untitled Score" from OSMD
            title: (title && title !== 'Untitled Score' && title !== 'Untitled') ? title : undefined,
            subtitle: sheet.SubtitleString || undefined,
            composer: sheet.ComposerString || undefined,
            lyricist: sheet.LyricistString || undefined,
            copyright: sheet.CopyrightString || undefined
          }
          console.log('Extracted metadata:', metadata)
          onMetadataLoaded(metadata)
        }

        // Apply transposition to the sheet BEFORE rendering
        if (sheet && transpose !== 0) {
          if (selectedPart) {
            // Transpose only selected instrument
            sheet.Instruments.forEach(inst => inst.Transpose = 0)
            const match = selectedPart.match(/^(.+)-v(\d+)$/)
            const instrumentId = match ? match[1] : selectedPart
            const selectedInstrument = sheet.Instruments.find(inst => inst.IdString === instrumentId)
            if (selectedInstrument) {
              selectedInstrument.Transpose = transpose
              console.log('Applied transpose to instrument:', instrumentId, transpose)
            }
          } else {
            // Transpose all
            sheet.Transpose = transpose
            console.log('Applied global transpose:', transpose)
          }
          
          // Recalculate after setting transpose
          osmdRef.current!.updateGraphic()
        }
        
        // Apply initial rendering
        osmdRef.current!.render()
        
        // Apply highlighting after render
        requestAnimationFrame(() => {
          applyPartHighlighting()
        })
        
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load sheet music')
      } finally {
        setIsLoading(false)
      }
    }

    loadSheet()
  }, [musicXml, transpose, selectedPart, onPartsLoaded, onMetadataLoaded, applyPartHighlighting])



  if (error) {
    return (
      <div className="sheet-viewer-error">
        <p>Failed to load sheet music</p>
        <p style={{ fontSize: 'var(--font-size-sm)', marginTop: 'var(--space-sm)' }}>{error}</p>
      </div>
    )
  }

  return (
    <div
      ref={containerRef}
      className="sheet-viewer"
      style={{
        width: '100%',
        height: '100%',
        overflow: 'auto',
        opacity: isLoading ? 0.5 : 1
      }}
    >
      {isLoading && (
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)'
        }}>
          Loading sheet music...
        </div>
      )}
    </div>
  )
}
