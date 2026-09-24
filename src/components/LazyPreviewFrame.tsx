import { useEffect, useRef, useState } from 'react'

interface LazyPreviewFrameProps {
  srcDoc: string
  title: string
}

const PREVIEW_ROOT_MARGIN = '240px 0px'

export function LazyPreviewFrame({ srcDoc, title }: LazyPreviewFrameProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [isNearViewport, setIsNearViewport] = useState(false)
  const [isPageVisible, setIsPageVisible] = useState(true)
  const shouldMountFrame = isNearViewport && isPageVisible

  useEffect(() => {
    const updatePageVisibility = () => setIsPageVisible(document.visibilityState !== 'hidden')
    updatePageVisibility()
    document.addEventListener('visibilitychange', updatePageVisibility)
    return () => document.removeEventListener('visibilitychange', updatePageVisibility)
  }, [])

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    if (typeof IntersectionObserver === 'undefined') {
      setIsNearViewport(true)
      return
    }

    const observer = new IntersectionObserver(
      ([entry]) => setIsNearViewport(entry.isIntersecting),
      { rootMargin: PREVIEW_ROOT_MARGIN, threshold: 0 },
    )
    observer.observe(container)
    return () => observer.disconnect()
  }, [])

  return (
    <div ref={containerRef} className="relative size-full min-h-0 min-w-0 overflow-hidden bg-surface-soft" aria-busy={!shouldMountFrame}>
      {shouldMountFrame ? (
        <iframe className="absolute inset-0 block size-full border-0 bg-white" title={title} srcDoc={srcDoc} sandbox="" referrerPolicy="no-referrer" loading="lazy" />
      ) : (
        <div className="flex size-full animate-pulse flex-col gap-3 bg-surface-soft p-4 motion-reduce:animate-none" aria-hidden="true">
          <div className="h-8 w-2/5 rounded bg-white/[0.04]" />
          <div className="min-h-0 flex-1 rounded bg-white/[0.025]" />
        </div>
      )}
    </div>
  )
}
