'use client'

import { createContext, useCallback, useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react'

// 1. Tambahkan reportDuration ke Context
export const SlideStateContext = createContext<{
  current: boolean
  playing: boolean
  reportDuration?: (ms: number) => void
}>({
  current: true,
  playing: true,
})

type Props = { slides: ReactNode[]; label: string; interval?: number; overlayControls?: boolean }

const SLIDE_WIDTH =
  'min(calc(100cqw - 2 * var(--store-pad, 1.25rem)), calc(var(--store-max, 1260px) - 2 * var(--store-pad, 1.25rem)))'

export function MediaSlider({ slides, label, interval = 5000, overlayControls = false }: Props) {
  const count = slides.length
  const multiple = count > 1
  const rootRef = useRef<HTMLDivElement>(null)
  const trackRef = useRef<HTMLDivElement>(null)
  const slideRefs = useRef<(HTMLDivElement | null)[]>([])
  const programmatic = useRef<ReturnType<typeof setTimeout> | null>(null)
  const settle = useRef<ReturnType<typeof setTimeout> | null>(null)
  const activeRef = useRef(0)

  const [active, setActive] = useState(0)
  const [cycle, setCycle] = useState(0)
  const [userPlaying, setUserPlaying] = useState(true)
  const [reduced, setReduced] = useState(false)
  const [focused, setFocused] = useState(false)
  const [inView, setInView] = useState(true)
  const [pageVisible, setPageVisible] = useState(true)

  // 2. Simpan durasi khusus tiap slide (dalam ms)
  const [durations, setDurations] = useState<Record<number, number>>({})

  const setSlideDuration = useCallback((index: number, ms: number) => {
    setDurations((prev) => (prev[index] === ms ? prev : { ...prev, [index]: ms }))
  }, [])

  const mediaPlaying = userPlaying && !focused && inView && pageVisible && !reduced
  const running = multiple && mediaPlaying

  // Durasi untuk slide yang sedang aktif (fallback ke prop `interval` jika bukan video / belum load)
  const currentDuration = durations[active] ?? interval

  // ... (bagian useEffect, slideCenterOffset, goTo, next, onScroll, onKeyDown tetap sama persis) ...
  useEffect(() => {
    const query = window.matchMedia('(prefers-reduced-motion: reduce)')
    setReduced(query.matches)
    if (query.matches) setUserPlaying(false)
  }, [])

  useEffect(() => {
    const root = rootRef.current
    if (!root) return
    const observer = new IntersectionObserver(([entry]) => setInView(entry.isIntersecting), { threshold: 0.35 })
    observer.observe(root)
    const onVisibility = () => setPageVisible(document.visibilityState === 'visible')
    document.addEventListener('visibilitychange', onVisibility)
    return () => {
      observer.disconnect()
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [])

  const endProgrammatic = useCallback(() => {
    if (programmatic.current) clearTimeout(programmatic.current)
    programmatic.current = null
  }, [])

  useEffect(() => {
    const track = trackRef.current
    if (!track) return
    track.addEventListener('scrollend', endProgrammatic)
    return () => track.removeEventListener('scrollend', endProgrammatic)
  }, [endProgrammatic])

  const slideCenterOffset = (track: HTMLElement, slide: HTMLElement) => {
    const trackRect = track.getBoundingClientRect()
    const slideRect = slide.getBoundingClientRect()
    return slideRect.left + slideRect.width / 2 - (trackRect.left + track.clientWidth / 2)
  }

  const goTo = useCallback(
    (index: number) => {
      const track = trackRef.current
      const slide = slideRefs.current[index]
      if (!track || !slide) return
      endProgrammatic()
      programmatic.current = setTimeout(() => (programmatic.current = null), 1500)
      track.scrollTo({ left: track.scrollLeft + slideCenterOffset(track, slide), behavior: reduced ? 'auto' : 'smooth' })
      activeRef.current = index
      setActive(index)
      setCycle((value) => value + 1)
    },
    [reduced, endProgrammatic],
  )

  const next = () => goTo((activeRef.current + 1) % count)

  const onScroll = () => {
    if (programmatic.current) return
    if (settle.current) clearTimeout(settle.current)
    settle.current = setTimeout(() => {
      const track = trackRef.current
      if (!track) return
      let best = 0
      let distance = Infinity
      slideRefs.current.forEach((slide, index) => {
        if (!slide) return
        const d = Math.abs(slideCenterOffset(track, slide))
        if (d < distance) {
          distance = d
          best = index
        }
      })
      if (best !== activeRef.current) {
        activeRef.current = best
        setActive(best)
        setCycle((value) => value + 1)
      }
    }, 120)
  }

  const onKeyDown = (event: React.KeyboardEvent) => {
    if (!multiple) return
    const target =
      event.key === 'ArrowRight'
        ? Math.min(active + 1, count - 1)
        : event.key === 'ArrowLeft'
          ? Math.max(active - 1, 0)
          : event.key === 'Home'
            ? 0
            : event.key === 'End'
              ? count - 1
              : null
    if (target === null) return
    event.preventDefault()
    goTo(target)
  }

  useEffect(
    () => () => {
      if (programmatic.current) clearTimeout(programmatic.current)
      if (settle.current) clearTimeout(settle.current)
    },
    [],
  )

  const trackStyle = { '--slide-w': SLIDE_WIDTH, paddingInline: 'calc((100cqw - var(--slide-w)) / 2)' } as CSSProperties

  return (
    <div
      ref={rootRef}
      role="region"
      className="relative"
      aria-roledescription="carousel"
      aria-label={label}
      onFocusCapture={(event) => {
        // Hanya pause jika fokus berasal dari navigasi keyboard (:focus-visible), bukan klik mouse/tap
        if (event.target.matches(':focus-visible')) {
          setFocused(true)
        }
      }}
      onBlurCapture={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
          setFocused(false)
        }
      }}
    >
      <div className="@container">
        <div
          ref={trackRef}
          onScroll={onScroll}
          onKeyDown={onKeyDown}
          tabIndex={multiple ? 0 : undefined}
          aria-live={running ? 'off' : 'polite'}
          style={trackStyle}
          className="group/track flex snap-x snap-mandatory gap-3 overflow-x-auto overscroll-x-contain outline-none [scrollbar-width:none] md:gap-4 [&::-webkit-scrollbar]:hidden"
        >
          {slides.map((slide, index) => {
            const current = index === active
            return (
              <div
                key={index}
                ref={(element) => {
                  slideRefs.current[index] = element
                }}
                role="group"
                aria-roledescription="slide"
                aria-label={`${index + 1} dari ${count}`}
                onClickCapture={(event) => {
                  if (multiple && !current) {
                    event.preventDefault()
                    event.stopPropagation()
                    goTo(index)
                  }
                }}
                onFocusCapture={() => {
                  if (multiple && !current) goTo(index)
                }}
                style={{ width: 'var(--slide-w)' }}
                className={`flex shrink-0 snap-center rounded-[1.75rem] transition-opacity duration-500 motion-reduce:transition-none ${
                  current || !multiple
                    ? 'opacity-100 group-focus-visible/track:outline-2 group-focus-visible/track:outline-offset-4 group-focus-visible/track:outline-accent'
                    : 'opacity-60'
                }`}
              >
                {/* 3. Kirim reportDuration khusus untuk index slide ini */}
                <SlideStateContext.Provider
                  value={{
                    current: current || !multiple,
                    playing: mediaPlaying,
                    reportDuration: (ms) => setSlideDuration(index, ms),
                  }}
                >
                  {slide}
                </SlideStateContext.Provider>
              </div>
            )
          })}
        </div>
      </div>

      {multiple ? (
        <div className={overlayControls ? 'absolute inset-x-0 bottom-6 flex items-center justify-center gap-3' : 'mt-6 flex items-center justify-center gap-3'}>
          <div className={`flex items-center gap-2 rounded-full px-4 py-3 ${overlayControls ? 'bg-black/35 backdrop-blur-xl' : 'bg-hairline'}`}>
            {slides.map((_, index) => {
              const current = index === active
              return (
                <button
                  key={index}
                  type="button"
                  onClick={() => goTo(index)}
                  aria-label={`Ke slide ${index + 1} dari ${count}`}
                  aria-current={current}
                  className={`relative h-2 overflow-hidden rounded-full bg-mute/50 transition-[width] duration-300 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent motion-reduce:transition-none ${
                    current ? 'w-8' : 'w-2'
                  }`}
                >
                  {current ? (
                    <span
                      // 4. Tambahkan currentDuration di key agar animasi reset jika durasi video baru terbaca
                      key={`${cycle}-${currentDuration}`}
                      aria-hidden="true"
                      className="absolute inset-0 origin-left rounded-full bg-ink"
                      style={
                        reduced
                          ? undefined
                          : {
                              animation: `slider-progress ${currentDuration}ms linear forwards`,
                              animationPlayState: running ? 'running' : 'paused',
                            }
                      }
                      onAnimationEnd={next}
                    />
                  ) : null}
                </button>
              )
            })}
          </div>
          <button
            type="button"
            onClick={() => setUserPlaying((value) => !value)}
            aria-label={userPlaying ? 'Jeda pemutaran otomatis' : 'Putar otomatis'}
            className={`flex size-10 items-center justify-center rounded-full text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent ${overlayControls ? 'bg-black/35 backdrop-blur-xl' : 'bg-hairline'}`}
          >
            {userPlaying ? (
              <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor" aria-hidden="true">
                <rect x="6" y="4" width="4" height="16" rx="1" />
                <rect x="14" y="4" width="4" height="16" rx="1" />
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor" aria-hidden="true">
                <path d="M7 4.5v15a1 1 0 0 0 1.5.86l12-7.5a1 1 0 0 0 0-1.72l-12-7.5A1 1 0 0 0 7 4.5z" />
              </svg>
            )}
          </button>
        </div>
      ) : null}
    </div>
  )
}