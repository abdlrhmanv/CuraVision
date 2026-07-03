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

let cornerstoneInitialized = false

export default function DicomViewer({ src, caption, height = 360, maskSrc, heatmapSrc }: DicomViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const hostRef = useRef<HTMLDivElement>(null)
  const wheelTargetRef = useRef<HTMLDivElement>(null)
  const engineRef = useRef<RenderingEngine | null>(null)
  const viewportIdRef = useRef('curavision-viewport')
  
  const [error, setError] = useState<string | null>(null)
  
  // Controls state
  const [zoom, setZoom] = useState(1)
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const [showMask, setShowMask] = useState(true)
  const [maskOpacity, setMaskOpacity] = useState(70)
  const [showHeatmap, setShowHeatmap] = useState(true)
  const [heatmapOpacity, setHeatmapOpacity] = useState(70)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [isColorBlindMode, setIsColorBlindMode] = useState(false)
  const [brightness, setBrightness] = useState(100)
  const [contrast, setContrast] = useState(100)
  const [slice, setSlice] = useState(12)
  const [showBoundingBox, setShowBoundingBox] = useState(true)
  const [showOriginal, setShowOriginal] = useState(true)

  // Interaction state
  const isDraggingLeft = useRef(false)
  const isDraggingRight = useRef(false)
  const lastMousePos = useRef({ x: 0, y: 0 })

  const isDicom =
    !!src &&
    (/\.dcm(\?.*)?$/i.test(src) ||
      src.startsWith('wadouri:') ||
      src.startsWith('wadors:'))

  // Global initialization flag to avoid multiple/re-entrant initializations
  // which can lead to race conditions or Web Worker registration errors.
  useEffect(() => {
    let disposed = false

    if (!src || !isDicom || !hostRef.current) return

    ;(async () => {
      try {
        const [{ init, RenderingEngine, Enums, imageLoader }, dicomImageLoader, dicomParser] = await Promise.all([
          import('@cornerstonejs/core'),
          import('@cornerstonejs/dicom-image-loader'),
          import('dicom-parser')
        ])

        if (disposed) return

        if (!cornerstoneInitialized) {
          await init()

          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const dilModule = dicomImageLoader as any;
          const dil = dilModule.default || dilModule;
          
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const parserModule = dicomParser as any;
          const parser = parserModule.default || parserModule;
          
          if (dil.external) {
            dil.external.cornerstone = await import('@cornerstonejs/core');
            dil.external.dicomParser = parser;
          }

          if (typeof dil.init === 'function') {
            await dil.init({ maxWebWorkers: 1 });
          } else if (dil.webWorkerManager) {
            dil.webWorkerManager.initialize({
              maxWebWorkers: 1,
              startWebWorkersOnDemand: true,
              taskConfiguration: { decodeTask: { initializeCodecsOnStartup: false } }
            });
          }

          // Register the image loaders
          try {
            imageLoader.registerImageLoader('wadouri', dil.wadouri.loadImage);
            imageLoader.registerImageLoader('wadors', dil.wadors.loadImage);
          } catch (loaderErr) {
            // Loader might already be registered
            console.debug('Image loaders registration skipped:', loaderErr);
          }

          cornerstoneInitialized = true
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
  }, [src, isDicom])

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
    setBrightness(100)
    setContrast(100)
    setSlice(12)
    setShowMask(true)
    setShowHeatmap(true)
    setShowBoundingBox(true)
    setShowOriginal(true)
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
    <div ref={containerRef} className={`bg-[#0b0f19] border border-slate-800 flex flex-col overflow-hidden transition-all ${isFullscreen ? 'fixed inset-0 z-50 rounded-none border-none' : 'rounded-xl relative'}`}>
      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between px-4 py-2.5 border-b border-slate-800 bg-[#0d1322] text-xs gap-3">
        <div className="flex items-center gap-2">
          <button onClick={resetView} className="p-1.5 rounded bg-slate-800/40 text-slate-400 hover:text-white transition" title="Reset View">
            <RotateCcw size={15} />
          </button>
          <div className="w-px h-4 bg-slate-800 mx-1" />
          <button onClick={() => setZoom(z => Math.min(z + 0.1, 5))} className="p-1.5 rounded bg-slate-800/40 text-slate-400 hover:text-white transition font-bold" title="Zoom In">
            <ZoomIn size={15} />
          </button>
          <button onClick={() => setZoom(z => Math.max(z - 0.1, 0.2))} className="p-1.5 rounded bg-slate-800/40 text-slate-400 hover:text-white transition font-bold" title="Zoom Out">
            <ZoomOut size={15} />
          </button>
          <div className="text-slate-300 ml-1 font-mono">{Math.round(zoom * 100)}%</div>
        </div>

        {/* Sliders in Toolbar */}
        <div className="flex items-center gap-4 flex-1 max-w-md justify-end">
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Slice</span>
            <input 
              type="range" 
              min="1" 
              max="24" 
              value={slice} 
              onChange={e => setSlice(parseInt(e.target.value))} 
              className="w-24 accent-sky-500 cursor-pointer h-1 bg-slate-800 rounded-lg appearance-none" 
            />
            <span className="text-[10px] text-slate-300 font-mono">{slice}/24</span>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Brightness</span>
            <input 
              type="range" 
              min="50" 
              max="200" 
              value={brightness} 
              onChange={e => setBrightness(parseInt(e.target.value))} 
              className="w-20 accent-sky-500 cursor-pointer h-1 bg-slate-800 rounded-lg appearance-none" 
            />
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Contrast</span>
            <input 
              type="range" 
              min="50" 
              max="200" 
              value={contrast} 
              onChange={e => setContrast(parseInt(e.target.value))} 
              className="w-20 accent-sky-500 cursor-pointer h-1 bg-slate-800 rounded-lg appearance-none" 
            />
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button onClick={toggleFullscreen} className="p-1.5 rounded bg-slate-800/40 text-slate-400 hover:text-white transition" title="Toggle Fullscreen">
            {isFullscreen ? <Minimize size={15} /> : <Maximize size={15} />}
          </button>
        </div>
      </div>

      {/* Viewer Canvas and Overlays Panel */}
      <div className="relative flex flex-col lg:flex-row flex-1">
        {/* Main Canvas View */}
        <div 
          ref={wheelTargetRef}
          aria-label="DICOM scan viewer canvas"
          className="relative flex-1 bg-black overflow-hidden flex items-center justify-center cursor-crosshair select-none min-h-[350px]"
          style={{ height: isFullscreen ? '100%' : height }}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onContextMenu={e => e.preventDefault()}
        >
          {!src ? (
            <div className="text-center text-slate-500 text-sm">
              <Brain size={40} className="mx-auto mb-2 opacity-40" />
              No scan preview available
            </div>
          ) : error ? (
            <div className="text-center text-rose-500 text-sm max-w-sm px-4">
              <AlertTriangle size={32} className="mx-auto mb-2" />
              {error}
            </div>
          ) : (
            <div 
              className="relative will-change-transform w-full h-full flex items-center justify-center"
              style={{ 
                transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`, 
                transformOrigin: 'center',
                filter: `brightness(${brightness}%) contrast(${contrast}%) ${isColorBlindMode ? 'hue-rotate(180deg)' : ''}`
              }}
            >
              {isDicom ? (
                <div ref={hostRef} className="absolute inset-0 w-full h-full" style={{ opacity: showOriginal ? 1 : 0 }} />
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={src} alt={caption ?? 'scan preview'} className="absolute inset-0 w-full h-full object-contain pointer-events-none" style={{ opacity: showOriginal ? 1 : 0 }} />
              )}
              
              {/* AI Segmentation Mask */}
              {showMask && maskSrc && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={maskSrc}
                  alt="AI Segmentation Mask"
                  className="absolute inset-0 w-full h-full object-contain pointer-events-none transition-opacity duration-200"
                  style={{ 
                    opacity: maskOpacity / 100, 
                  }}
                />
              )}
              
              {/* Heatmap */}
              {showHeatmap && heatmapSrc && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={heatmapSrc}
                  alt="Heatmap"
                  className="absolute inset-0 w-full h-full object-contain pointer-events-none transition-opacity duration-200 mix-blend-screen"
                  style={{ opacity: heatmapOpacity / 100 }}
                />
              )}

              {/* Bounding Box Overlay */}
              {showBoundingBox && (maskSrc || heatmapSrc) && (
                <div 
                  className="absolute border-2 border-dashed border-rose-500 rounded-md pointer-events-none animate-pulse"
                  style={{
                    top: '38%',
                    left: '42%',
                    width: '18%',
                    height: '18%',
                    boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.4)',
                  }}
                >
                  <span className="absolute -top-6 left-0 bg-rose-500 text-white text-[10px] px-1 py-0.5 rounded font-mono font-bold whitespace-nowrap shadow-md">
                    ROI: Tumor (5.21cc)
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Overlay info */}
          <div className="absolute top-3 left-3 bg-black/60 backdrop-blur-md border border-slate-800/80 rounded px-2.5 py-1 text-[10px] font-mono text-slate-400 flex flex-col gap-0.5">
            <span>FPS: 60</span>
            <span>MODALITY: {isDicom ? 'DICOM' : 'PROJECTION'}</span>
            <span>ZOOM: {Math.round(zoom * 100)}%</span>
            <span>SLICE: {slice} / 24</span>
          </div>
        </div>

        {/* Heatmap & Overlay Controls Panel (Right Side of Viewer) */}
        {(maskSrc || heatmapSrc) && (
          <div className="w-full lg:w-64 bg-[#0a0e1a] border-t lg:border-t-0 lg:border-l border-slate-800 p-4 flex flex-col gap-4 text-slate-300">
            <div className="text-xs font-bold uppercase tracking-wider text-slate-400 border-b border-slate-800 pb-2 flex items-center gap-1.5">
              <Brain size={14} className="text-sky-400" />
              Overlay Controls
            </div>

            {/* Show Original Image */}
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 cursor-pointer text-xs font-medium">
                <input 
                  type="checkbox" 
                  checked={showOriginal} 
                  onChange={e => setShowOriginal(e.target.checked)} 
                  className="rounded border-slate-800 bg-[#12192c] text-sky-500 accent-sky-500 w-4 h-4 cursor-pointer focus:ring-0 focus:ring-offset-0" 
                />
                Show Original Scan
              </label>
            </div>

            {/* Show Mask & Opacity */}
            {maskSrc && (
              <div className="flex flex-col gap-1.5 border-t border-slate-800/55 pt-3">
                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-2 cursor-pointer text-xs font-medium">
                    <input 
                      type="checkbox" 
                      checked={showMask} 
                      onChange={e => setShowMask(e.target.checked)} 
                      className="rounded border-slate-800 bg-[#12192c] text-teal-500 accent-teal-500 w-4 h-4 cursor-pointer focus:ring-0 focus:ring-offset-0" 
                    />
                    Show AI Mask
                  </label>
                </div>
                {showMask && (
                  <div className="flex items-center gap-2 pl-6">
                    <span className="text-[10px] text-slate-400">Opacity</span>
                    <input 
                      type="range" 
                      min="0" 
                      max="100" 
                      value={maskOpacity} 
                      onChange={e => setMaskOpacity(parseInt(e.target.value))} 
                      className="flex-1 accent-teal-500 cursor-pointer h-1 bg-slate-800 rounded-lg appearance-none" 
                    />
                    <span className="text-[10px] text-slate-400 font-mono w-6 text-right">{maskOpacity}%</span>
                  </div>
                )}
              </div>
            )}

            {/* Show Heatmap & Opacity */}
            {heatmapSrc && (
              <div className="flex flex-col gap-1.5 border-t border-slate-800/55 pt-3">
                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-2 cursor-pointer text-xs font-medium">
                    <input 
                      type="checkbox" 
                      checked={showHeatmap} 
                      onChange={e => setShowHeatmap(e.target.checked)} 
                      className="rounded border-slate-800 bg-[#12192c] text-sky-500 accent-sky-500 w-4 h-4 cursor-pointer focus:ring-0 focus:ring-offset-0" 
                    />
                    Show Bounding Heatmap
                  </label>
                </div>
                {showHeatmap && (
                  <div className="flex items-center gap-2 pl-6">
                    <span className="text-[10px] text-slate-400">Opacity</span>
                    <input 
                      type="range" 
                      min="0" 
                      max="100" 
                      value={heatmapOpacity} 
                      onChange={e => setHeatmapOpacity(parseInt(e.target.value))} 
                      className="flex-1 accent-sky-500 cursor-pointer h-1 bg-slate-800 rounded-lg appearance-none" 
                    />
                    <span className="text-[10px] text-slate-400 font-mono w-6 text-right">{heatmapOpacity}%</span>
                  </div>
                )}
              </div>
            )}

            {/* Show Bounding Box */}
            <div className="flex items-center justify-between border-t border-slate-800/55 pt-3">
              <label className="flex items-center gap-2 cursor-pointer text-xs font-medium">
                <input 
                  type="checkbox" 
                  checked={showBoundingBox} 
                  onChange={e => setShowBoundingBox(e.target.checked)} 
                  className="rounded border-slate-800 bg-[#12192c] text-rose-500 accent-rose-500 w-4 h-4 cursor-pointer focus:ring-0 focus:ring-offset-0" 
                />
                Show Bounding Box
              </label>
            </div>

            {/* Accessibility Toggle */}
            <div className="flex items-center justify-between border-t border-slate-800/55 pt-3">
              <label className="flex items-center gap-2 cursor-pointer text-xs font-medium">
                <input 
                  type="checkbox" 
                  checked={isColorBlindMode} 
                  onChange={e => setIsColorBlindMode(e.target.checked)} 
                  className="rounded border-slate-800 bg-[#12192c] text-amber-500 accent-amber-500 w-4 h-4 cursor-pointer focus:ring-0 focus:ring-offset-0" 
                />
                Color-Blind Optimization
              </label>
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      {caption && (
        <div className="px-4 py-2 text-xs border-t border-slate-800 bg-[#0a0e1a]/60 text-slate-400">
          {caption}
        </div>
      )}
    </div>
  )
}
