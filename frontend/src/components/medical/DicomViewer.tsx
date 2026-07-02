'use client'

import { useEffect, useRef, useState, MouseEvent as ReactMouseEvent } from 'react'
import { Brain, AlertTriangle, ZoomIn, ZoomOut, Maximize, RotateCcw, Minimize } from 'lucide-react'
import type { RenderingEngine, Types } from '@cornerstonejs/core'

interface DicomViewerProps {
  /** HTTPS/HTTP URL to a DICOM file OR a preview image (png/jpg). */
  src: string | null
  /** Optional caption shown beneath the viewer. */
  caption?: string
  /** Optional height override (px or CSS length). */
  height?: number | string
  /** Optional AI Mask overlay URL */
  maskSrc?: string | null
  /** Optional GradCAM heatmap overlay URL */
  heatmapSrc?: string | null
}

export default function DicomViewer({ src, caption, height = 360, maskSrc, heatmapSrc }: DicomViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const hostRef = useRef<HTMLDivElement>(null)
  const wheelTargetRef = useRef<HTMLDivElement>(null)
  const engineRef = useRef<RenderingEngine | null>(null)
  const viewportIdRef = useRef('curavision-viewport')
  
  const [error, setError] = useState<string | null>(null)
  const [initialised, setInitialised] = useState(false)
  
  // Controls state
  const [zoom, setZoom] = useState(1)
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const [showMask, setShowMask] = useState(false)
  const [maskOpacity, setMaskOpacity] = useState(70)
  const [showHeatmap, setShowHeatmap] = useState(false)
  const [heatmapOpacity, setHeatmapOpacity] = useState(70)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [isColorBlindMode, setIsColorBlindMode] = useState(false)

  // Interaction state
  const isDraggingLeft = useRef(false)
  const isDraggingRight = useRef(false)
  const lastMousePos = useRef({ x: 0, y: 0 })

  const isDicom =
    !!src &&
    (/\.dcm(\?.*)?$/i.test(src) ||
      src.startsWith('wadouri:') ||
      src.startsWith('wadors:'))

  // Initialize Cornerstone
  useEffect(() => {
    let disposed = false

    if (!src || !isDicom || !hostRef.current) return

    ;(async () => {
      try {
        const [{ init, RenderingEngine, Enums, imageLoader }, dicomImageLoader] = await Promise.all([
          import('@cornerstonejs/core'),
          import('@cornerstonejs/dicom-image-loader'),
        ])

        if (disposed) return

        await init()

        if (!initialised) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const dil = dicomImageLoader as any
          if (dil?.init) dil.init({ maxWebWorkers: 1 })
          setInitialised(true)
        }

        const renderingEngineId = 'curavision-engine'
        const viewportId = viewportIdRef.current

        let engine = engineRef.current
        if (!engine) {
            engine = new RenderingEngine(renderingEngineId)
            engineRef.current = engine
        }
        
        engine.enableElement({
          viewportId,
          element: hostRef.current as HTMLDivElement,
          type: Enums.ViewportType.STACK,
        })

        const viewport = engine.getViewport(viewportId) as Types.IStackViewport

        const imageId = src.startsWith('wadouri:') ? src : `wadouri:${src}`
        await imageLoader.loadImage(imageId)
        await viewport.setStack([imageId])
        viewport.render()
      } catch (err) {
        if (!disposed) {
          const message = err instanceof Error ? err.message : 'Failed to render DICOM'
          setError(message)
        }
      }
    })()

    return () => {
      disposed = true
      if (engineRef.current) {
        try {
          engineRef.current.destroy()
        } catch {}
        engineRef.current = null
      }
    }
  }, [src, isDicom, initialised])

  // Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === '+' || e.key === '=') setZoom(z => Math.min(z + 0.1, 5))
      if (e.key === '-') setZoom(z => Math.max(z - 0.1, 0.2))
      if (e.key === 'Escape') {
        if (document.fullscreenElement) {
          document.exitFullscreen()
        }
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  // Fullscreen Listener
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement)
    }
    document.addEventListener('fullscreenchange', handleFullscreenChange)
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange)
  }, [])

  // Non-passive wheel listener for zoom
  useEffect(() => {
    const el = wheelTargetRef.current
    if (!el) return
    const onWheel = (e: WheelEvent) => {
      e.preventDefault()
      setZoom(z => Math.min(Math.max(z - e.deltaY * 0.002, 0.2), 5))
    }
    el.addEventListener('wheel', onWheel, { passive: false })
    return () => el.removeEventListener('wheel', onWheel)
  }, [])

  const resetView = () => {
    setZoom(1)
    setPan({ x: 0, y: 0 })
    if (engineRef.current && isDicom) {
      const viewport = engineRef.current.getViewport(viewportIdRef.current) as Types.IStackViewport
      if (viewport) {
        viewport.resetProperties()
        viewport.render()
      }
    }
  }

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen().catch(() => {})
    } else {
      document.exitFullscreen()
    }
  }

  // Mouse Handlers for Pan and WindowLevel
  const handleMouseDown = (e: ReactMouseEvent) => {
    e.preventDefault()
    if (e.button === 0) {
      isDraggingLeft.current = true
    } else if (e.button === 2) {
      isDraggingRight.current = true
    }
    lastMousePos.current = { x: e.clientX, y: e.clientY }
  }

  const handleMouseMove = (e: ReactMouseEvent) => {
    if (!isDraggingLeft.current && !isDraggingRight.current) return
    
    const dx = e.clientX - lastMousePos.current.x
    const dy = e.clientY - lastMousePos.current.y
    lastMousePos.current = { x: e.clientX, y: e.clientY }

    if (isDraggingLeft.current) {
      setPan(p => ({ x: p.x + dx, y: p.y + dy }))
    } else if (isDraggingRight.current && engineRef.current && isDicom) {
      const viewport = engineRef.current.getViewport(viewportIdRef.current) as Types.IStackViewport
      if (viewport) {
        const props = viewport.getProperties()
        if (props.voiRange) {
          const { lower, upper } = props.voiRange
          const width = upper - lower
          const center = lower + width / 2
          
          const newWidth = Math.max(1, width + dx * 4)
          const newCenter = center + dy * 4
          
          viewport.setProperties({
            voiRange: {
              lower: newCenter - newWidth / 2,
              upper: newCenter + newWidth / 2
            }
          })
          viewport.render()
        }
      }
    }
  }

  const handleMouseUp = () => {
    isDraggingLeft.current = false
    isDraggingRight.current = false
  }

  return (
    <div ref={containerRef} className={`bg-card border border-border flex flex-col overflow-hidden transition-all ${isFullscreen ? 'fixed inset-0 z-50 rounded-none border-none' : 'rounded-xl relative'}`}>
      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between px-4 py-2 border-b border-border bg-surface/50 text-xs gap-2">
        <div className="flex items-center gap-2">
          <button onClick={resetView} className="p-1.5 rounded hover:bg-border/50 text-muted hover:text-white transition" title="Reset View">
            <RotateCcw size={16} />
          </button>
          <div className="w-px h-4 bg-border mx-1" />
          <button onClick={() => setZoom(z => Math.min(z + 0.1, 5))} className="p-1.5 rounded hover:bg-border/50 text-muted hover:text-white transition" title="Zoom In">
            <ZoomIn size={16} />
          </button>
          <button onClick={() => setZoom(z => Math.max(z - 0.1, 0.2))} className="p-1.5 rounded hover:bg-border/50 text-muted hover:text-white transition" title="Zoom Out">
            <ZoomOut size={16} />
          </button>
          <div className="text-muted ml-2 w-10">{Math.round(zoom * 100)}%</div>
        </div>

        <div className="flex flex-wrap items-center gap-4">
          {maskSrc && (
            <div className="flex items-center gap-2 bg-surface/50 px-2 py-1 rounded border border-border">
              <label className="flex items-center gap-1.5 cursor-pointer select-none text-muted hover:text-white transition font-medium">
                <input type="checkbox" checked={showMask} onChange={e => setShowMask(e.target.checked)} className="rounded border-border bg-surface accent-accent w-3.5 h-3.5 cursor-pointer" />
                AI Mask
              </label>
              {showMask && (
                <input type="range" min="0" max="100" value={maskOpacity} onChange={e => setMaskOpacity(parseInt(e.target.value))} className="w-16 md:w-20 accent-accent cursor-pointer" title="Mask Opacity" />
              )}
            </div>
          )}
          {heatmapSrc && (
            <div className="flex items-center gap-2 bg-surface/50 px-2 py-1 rounded border border-border">
              <label className="flex items-center gap-1.5 cursor-pointer select-none text-muted hover:text-white transition font-medium">
                <input type="checkbox" checked={showHeatmap} onChange={e => setShowHeatmap(e.target.checked)} className="rounded border-border bg-surface accent-blue w-3.5 h-3.5 cursor-pointer" />
                Heatmap
              </label>
              {showHeatmap && (
                <input type="range" min="0" max="100" value={heatmapOpacity} onChange={e => setHeatmapOpacity(parseInt(e.target.value))} className="w-16 md:w-20 accent-blue cursor-pointer" title="Heatmap Opacity" />
              )}
            </div>
          )}
          <div className="flex items-center gap-2 bg-surface/50 px-2 py-1 rounded border border-border">
            <label className="flex items-center gap-1.5 cursor-pointer select-none text-muted hover:text-white transition font-medium">
              <input type="checkbox" checked={isColorBlindMode} onChange={e => setIsColorBlindMode(e.target.checked)} className="rounded border-border bg-surface accent-blue w-3.5 h-3.5 cursor-pointer" />
              Color-Blind Mode
            </label>
          </div>
          <div className="w-px h-4 bg-border mx-1 hidden sm:block" />
          <button onClick={toggleFullscreen} className="p-1.5 rounded hover:bg-border/50 text-muted hover:text-white transition" title="Toggle Fullscreen">
            {isFullscreen ? <Minimize size={16} /> : <Maximize size={16} />}
          </button>
        </div>
      </div>

      {/* Viewer Canvas Wrapper */}
      <div 
        ref={wheelTargetRef}
        aria-label="DICOM scan viewer canvas"
        className="relative flex-1 bg-black overflow-hidden flex items-center justify-center cursor-crosshair select-none"
        style={{ height: isFullscreen ? '100%' : height }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onContextMenu={e => e.preventDefault()}
      >
        {!src ? (
          <div className="text-center text-muted text-sm">
            <Brain size={40} className="mx-auto mb-2 opacity-40" />
            No scan preview available
          </div>
        ) : error ? (
          <div className="text-center text-warn text-sm max-w-sm px-4">
            <AlertTriangle size={32} className="mx-auto mb-2" />
            {error}
          </div>
        ) : (
          <div 
            className="relative will-change-transform w-full h-full flex items-center justify-center"
            style={{ 
              transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`, 
              transformOrigin: 'center'
            }}
          >
            {isDicom ? (
              <div ref={hostRef} className="absolute inset-0 w-full h-full" />
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={src} alt={caption ?? 'scan preview'} className="absolute inset-0 w-full h-full object-contain pointer-events-none" />
            )}
            
            {/* AI Overlays */}
            {showMask && maskSrc && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={maskSrc}
                alt="AI Segmentation Mask"
                className="absolute inset-0 w-full h-full object-contain pointer-events-none transition-opacity duration-200"
                style={{ 
                  opacity: maskOpacity / 100, 
                  filter: isColorBlindMode ? 'hue-rotate(180deg)' : 'none' 
                }}
              />
            )}
            
            {showHeatmap && heatmapSrc && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={heatmapSrc}
                alt="Heatmap"
                className="absolute inset-0 w-full h-full object-contain pointer-events-none transition-opacity duration-200 mix-blend-screen"
                style={{ opacity: heatmapOpacity / 100 }}
              />
            )}
          </div>
        )}
      </div>

      {/* Footer */}
      {caption && (
        <div className="px-4 py-2 text-xs border-t border-border bg-surface/30 text-muted">
          {caption}
        </div>
      )}
    </div>
  )
}
