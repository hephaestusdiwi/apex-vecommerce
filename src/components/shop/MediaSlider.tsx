'use client'

import { useCallback, useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react'

type Props = { slides: ReactNode[]; label: string; interval?: number }

// Lebar slide = lebar isi container toko; track selebar layar (full-bleed), jadi slide tetangga mengintip sampai tepi layar.
const SLIDE_WIDTH =
  'min(calc(100cqw - 2 * var(--store-pad, 1.25rem)), calc(var(--store-max, 1260px) - 2 * var(--store-pad, 1.25rem)))'

/**
 * Slider ala galeri Apple: slide aktif selalu di tengah (selebar container), tetangganya mengintip sampai tepi layar,
 * autoplay dengan timer yang terlihat (titik aktif memanjang dan terisi), tombol jeda/putar, loop di ujung.
 *
 * Timer = animasi CSS pada titik aktif; `animationend` memajukan slide, jadi jeda cukup menjeda animasinya dan
 * progres yang terlihat selalu sama dengan waktu sebenarnya. Autoplay berhenti saat slider keluar layar, tab
 * tersembunyi, fokus ada di dalam slider, atau pengunjung meminta reduced motion.
 *
 * Komponen ini sengaja diletakkan di luar `.store-container`: track-nya harus selebar layar.
 */
export function MediaSlider({ slides, label, interval = 5000 }: Props) {
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

  const running = multiple && userPlaying && !focused && inView && pageVisible && !reduced

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

  // Browser yang mendukung `scrollend` mengakhiri status "scroll terprogram" tepat saat animasi selesai.
  useEffect(() => {
    const track = trackRef.current
    if (!track) return
    track.addEventListener('scrollend', endProgrammatic)
    return () => track.removeEventListener('scrollend', endProgrammatic)
  }, [endProgrammatic])

  // Posisi tengah slide dihitung dari getBoundingClientRect, bukan offsetLeft: tidak bergantung pada offsetParent.
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
      // Selama scroll terprogram berjalan, abaikan deteksi scroll supaya slide aktif tidak berganti di tengah jalan.
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

  // Geser manual (swipe/trackpad): setelah berhenti, slide terdekat ke tengah menjadi aktif dan timer mulai dari awal.
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
      event.key === 'ArrowRight' ? Math.min(active + 1, count - 1) : event.key === 'ArrowLeft' ? Math.max(active - 1, 0) : event.key === 'Home' ? 0 : event.key === 'End' ? count - 1 : null
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
      aria-roledescription="carousel"
      aria-label={label}
      onFocusCapture={() => setFocused(true)}
      onBlurCapture={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setFocused(false)
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
                // Slide tetangga hanya memusatkan dirinya saat diklik atau difokuskan; isinya baru bisa dipakai setelah di tengah.
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
                // Fokus keyboard di track ditandai pada slide aktif saja; ring pada track akan melebar selebar layar.
                className={`flex shrink-0 snap-center rounded-[1.75rem] transition-opacity duration-500 motion-reduce:transition-none ${
                  current || !multiple
                    ? 'opacity-100 group-focus-visible/track:outline-2 group-focus-visible/track:outline-offset-4 group-focus-visible/track:outline-accent'
                    : 'opacity-60'
                }`}
              >
                {slide}
              </div>
            )
          })}
        </div>
      </div>

      {multiple ? (
        <div className="mt-6 flex items-center justify-center gap-3">
          <div className="flex items-center gap-2 rounded-full bg-hairline px-4 py-3">
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
                      key={cycle}
                      aria-hidden="true"
                      className="absolute inset-0 origin-left rounded-full bg-ink"
                      style={
                        reduced
                          ? undefined
                          : { animation: `slider-progress ${interval}ms linear forwards`, animationPlayState: running ? 'running' : 'paused' }
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
            className="flex size-10 items-center justify-center rounded-full bg-hairline text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
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
