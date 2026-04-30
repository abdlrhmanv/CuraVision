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
export default function DicomViewer({ src, caption, height = 360 }: DicomViewerProps) {
  const hostRef = useRef<HTMLDivElement>(null)
  const [error, setError] = useState<string | null>(null)
  const [initialised, setInitialised] = useState(false)

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
      </div>
      {caption && (
        <div className="px-4 py-2 text-xs text-muted border-t border-border">
          {caption}
        </div>
      )}
    </div>
  )
}
