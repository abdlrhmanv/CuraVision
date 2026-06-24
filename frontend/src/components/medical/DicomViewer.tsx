'use client'

import { useEffect, useRef, useState } from 'react'
import { Brain, AlertTriangle } from 'lucide-react'

interface DicomViewerProps {
  /** HTTPS/HTTP URL to a DICOM file OR a preview image (png/jpg). */
  src: string | null
  /** Optional caption shown beneath the viewer. */
  caption?: string
  /** Optional height override (px or CSS length). */
  height?: number | string
  /** Optional overlay image URL */
  overlaySrc?: string | null
}

/**
 * Lightweight DICOM-or-image viewer.
 *
 * For the MVP:
 *   - If `src` ends in a DICOM-ish extension (.dcm / wadouri: / wadors:),
 *     initialises Cornerstone.js on demand and renders the first frame.
 *   - Otherwise falls back to a plain <img>, which is the common case for
 *     the Grad-CAM heatmap PNGs and DICOM preview thumbnails.
 *
 * The Cornerstone bundle is loaded dynamically so that it does not bloat
 * the initial client JS, and so Next.js SSR never touches it.
 */
export default function DicomViewer({ src, caption, height = 360, overlaySrc }: DicomViewerProps) {
  const hostRef = useRef<HTMLDivElement>(null)
  const [error, setError] = useState<string | null>(null)
  const [initialised, setInitialised] = useState(false)
  const [opacity, setOpacity] = useState(100)

  const isDicom =
    !!src &&
    (/\.dcm(\?.*)?$/i.test(src) ||
      src.startsWith('wadouri:') ||
      src.startsWith('wadors:'))

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

        // Wire the DICOM image loader into cornerstone core the first time.
        if (!initialised) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const dil = dicomImageLoader as any
          if (dil?.init) dil.init({ maxWebWorkers: 1 })
          setInitialised(true)
        }

        const renderingEngineId = 'curavision-engine'
        const viewportId = 'curavision-viewport'

        const engine = new RenderingEngine(renderingEngineId)
        engine.enableElement({
          viewportId,
          element: hostRef.current as HTMLDivElement,
          type: Enums.ViewportType.STACK,
        })

        const viewport = engine.getViewport(viewportId) as unknown as {
          setStack: (ids: string[]) => Promise<void>
          render: () => void
        }

        const imageId = src.startsWith('wadouri:') ? src : `wadouri:${src}`
        await imageLoader.loadImage(imageId)
        await viewport.setStack([imageId])
        viewport.render()

        return () => {
          try {
            engine.destroy()
          } catch {
            /* ignore */
          }
        }
      } catch (err) {
        if (!disposed) {
          const message = err instanceof Error ? err.message : 'Failed to render DICOM'
          setError(message)
        }
      }
    })()

    return () => {
      disposed = true
    }
  }, [src, isDicom, initialised])

  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden">
      <div
        className="relative w-full bg-black flex items-center justify-center"
        style={{ height }}
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
            <div className="text-xs text-muted mt-2">
              Displaying fallback preview.
            </div>
          </div>
        ) : isDicom ? (
          <div ref={hostRef} className="w-full h-full" />
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={src}
            alt={caption ?? 'scan preview'}
            className="max-h-full max-w-full object-contain"
          />
        )}
        
        {overlaySrc && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={overlaySrc}
            alt="heatmap overlay"
            className="absolute inset-0 max-h-full max-w-full m-auto object-contain pointer-events-none transition-opacity duration-200"
            style={{ opacity: opacity / 100 }}
          />
        )}
      </div>
      {(caption || overlaySrc) && (
        <div className="px-4 py-3 text-xs border-t border-border flex items-center justify-between bg-surface/50">
          <span className="text-muted">{caption}</span>
          {overlaySrc && (
            <div className="flex items-center gap-3 bg-surface px-3 py-1.5 rounded-md border border-border">
              <span className="text-muted font-semibold">Grad-CAM Opacity: {opacity}%</span>
              <input
                type="range"
                min="0"
                max="100"
                value={opacity}
                onChange={(e) => setOpacity(parseInt(e.target.value))}
                className="w-24 md:w-32 accent-blue cursor-pointer"
              />
            </div>
          )}
        </div>
      )}
    </div>
  )
}
