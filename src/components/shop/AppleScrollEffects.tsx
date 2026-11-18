'use client'

import { useEffect, useRef, useState, type ReactNode } from 'react'
import Image from 'next/image'

function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(false)
  useEffect(() => {
    const query = window.matchMedia('(prefers-reduced-motion: reduce)')
    setReduced(query.matches)
    const onChange = () => setReduced(query.matches)
    query.addEventListener('change', onChange)
    return () => query.removeEventListener('change', onChange)
  }, [])
  return reduced
}

/* ============================================================================
   1. APPLE HERO PIN
   Membungkus ProductHero agar mengecil halus (scale-down) & sudutnya membulat
   saat halaman mulai di-scroll ke bawah.
   ============================================================================ */
export function AppleHeroPin({ children }: { children: ReactNode }) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [progress, setProgress] = useState(0)
  const reduced = usePrefersReducedMotion()

  useEffect(() => {
    if (reduced) return
    let rafId = 0

    const update = () => {
      const el = containerRef.current
      if (!el) return
      const rect = el.getBoundingClientRect()
      const range = Math.max(rect.height * 0.65, 1)
      const p = Math.min(Math.max(-rect.top / range, 0), 1)
      setProgress(p)
    }

    const onScroll = () => {
      cancelAnimationFrame(rafId)
      rafId = requestAnimationFrame(update)
    }

    update()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll, { passive: true })
    return () => {
      cancelAnimationFrame(rafId)
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
    }
  }, [reduced])

  const scale = reduced ? 1 : 1 - progress * 0.06
  const radius = reduced ? 0 : progress * 28
  const opacity = reduced ? 1 : 1 - progress * 0.25

  return (
    <div ref={containerRef} className="overflow-x-clip">
      <div
        style={{
          transform: `scale(${scale})`,
          borderRadius: `${radius}px`,
          opacity,
        }}
        className="overflow-hidden transition-shadow will-change-transform"
      >
        {children}
      </div>
    </div>
  )
}

/* ============================================================================
   2. APPLE TEXT SCRUB
   Setiap baris deskripsi menyala terang secara bertahap mengikuti posisi scroll.
   ============================================================================ */
export function AppleTextScrub({ text, sku }: { text: string; sku?: string | null }) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [progress, setProgress] = useState(0)
  const reduced = usePrefersReducedMotion()

  const lines = text
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)

  useEffect(() => {
    if (reduced) return
    let rafId = 0

    const update = () => {
      const el = containerRef.current
      if (!el) return
      const rect = el.getBoundingClientRect()
      const vh = window.innerHeight
      const start = vh * 0.8
      const end = vh * 0.3
      const p = Math.min(Math.max((start - rect.top) / (start - end + rect.height * 0.35), 0), 1)
      setProgress(p)
    }

    const onScroll = () => {
      cancelAnimationFrame(rafId)
      rafId = requestAnimationFrame(update)
    }

    update()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      cancelAnimationFrame(rafId)
      window.removeEventListener('scroll', onScroll)
    }
  }, [reduced])

  return (
    <section aria-label="Tentang produk ini" className="store-container mt-20 md:mt-32">
      <div ref={containerRef} className="mx-auto max-w-3xl text-center">
        <div className="space-y-3 text-xl font-medium leading-relaxed md:text-3xl md:leading-snug">
          {lines.map((line, index) => {
            const step = 1 / Math.max(lines.length, 1)
            const lineStart = index * step
            const lineProgress = reduced ? 1 : Math.min(Math.max((progress - lineStart) / step, 0), 1)
            const opacity = 0.2 + lineProgress * 0.8

            return (
              <p key={index} style={{ opacity }} className="transition-opacity duration-150">
                {line}
              </p>
            )
          })}
        </div>
        {sku ? <p className="mt-8 text-sm text-mute">SKU: {sku}</p> : null}
      </div>
    </section>
  )
}

/* ============================================================================
   3. APPLE STICKY SHOWCASE (2 KOLOM SPLIT-SCREEN)
   Media di kiri tetap menempel (sticky), berganti crossfade saat blok teks
   di kanan masuk ke tengah layar.
   ============================================================================ */
export type ShowcaseItem = {
  id: string
  eyebrow?: string
  title: string
  description: string
  imageSrc?: string
  videoSrc?: string
}

export function AppleStickyShowcase({ heading, items }: { heading: string; items: ShowcaseItem[] }) {
  const [activeIndex, setActiveIndex] = useState(0)
  const itemRefs = useRef<(HTMLDivElement | null)[]>([])

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const idx = Number(entry.target.getAttribute('data-index'))
            if (!Number.isNaN(idx)) setActiveIndex(idx)
          }
        })
      },
      { rootMargin: '-40% 0px -40% 0px', threshold: 0 },
    )

    itemRefs.current.forEach((el) => {
      if (el) observer.observe(el)
    })

    return () => observer.disconnect()
  }, [items.length])

  if (items.length === 0) return null

  return (
    <section className="py-20 md:py-32">
      <div className="store-container">
        <h2 className="mb-12 text-[clamp(2rem,4vw,3.25rem)] font-semibold leading-[1.1] tracking-tight md:mb-16">
          {heading}
        </h2>

        <div className="grid grid-cols-1 gap-12 md:grid-cols-12 md:gap-10">
          {/* Kolom Kiri: Sticky Media Viewer */}
          <div className="hidden md:col-span-7 md:block">
            <div className="sticky top-24 aspect-[4/3] w-full overflow-hidden rounded-[1.75rem] bg-neutral-900">
              {items.map((item, idx) => {
                const isActive = idx === activeIndex
                return (
                  <div
                    key={item.id}
                    aria-hidden={!isActive}
                    className={`absolute inset-0 transition-opacity duration-700 ease-out ${
                      isActive ? 'opacity-100' : 'pointer-events-none opacity-0'
                    }`}
                  >
                    {item.videoSrc ? (
                      <video
                        src={item.videoSrc}
                        poster={item.imageSrc}
                        autoPlay
                        muted
                        loop
                        playsInline
                        className="size-full object-cover"
                      />
                    ) : item.imageSrc ? (
                      <Image src={item.imageSrc} alt={item.title} fill className="object-cover" />
                    ) : null}
                  </div>
                )
              })}
            </div>
          </div>

          {/* Kolom Kanan: Blok Teks yang Di-scroll */}
          <div className="space-y-20 md:col-span-5 md:space-y-44 md:py-24">
            {items.map((item, idx) => {
              const isActive = idx === activeIndex
              return (
                <div
                  key={item.id}
                  data-index={idx}
                  ref={(el) => {
                    itemRefs.current[idx] = el
                  }}
                  className={`transition-opacity duration-500 ${
                    isActive ? 'opacity-100' : 'md:opacity-35'
                  }`}
                >
                  <div className="relative mb-6 aspect-[4/3] w-full overflow-hidden rounded-2xl bg-neutral-900 md:hidden">
                    {item.videoSrc ? (
                      <video
                        src={item.videoSrc}
                        poster={item.imageSrc}
                        autoPlay
                        muted
                        loop
                        playsInline
                        className="size-full object-cover"
                      />
                    ) : item.imageSrc ? (
                      <Image src={item.imageSrc} alt={item.title} fill className="object-cover" />
                    ) : null}
                  </div>

                  {item.eyebrow ? (
                    <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-accent">
                      {item.eyebrow}
                    </p>
                  ) : null}
                  <h3 className="mb-3 text-2xl font-semibold leading-snug tracking-tight md:text-3xl">
                    {item.title}
                  </h3>
                  <p className="text-base leading-relaxed text-mute md:text-lg">
                    {item.description}
                  </p>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </section>
  )
}

/* ============================================================================
   4. APPLE REVEAL
   Animasi masuk halus dengan kurva easing Apple [0.22, 1, 0.36, 1].
   ============================================================================ */
export function AppleReveal({
  children,
  delay = 0,
  className = '',
}: {
  children: ReactNode
  delay?: number
  className?: string
}) {
  const ref = useRef<HTMLDivElement>(null)
  const [visible, setVisible] = useState(false)
  const reduced = usePrefersReducedMotion()

  useEffect(() => {
    if (reduced) {
      setVisible(true)
      return
    }
    const el = ref.current
    if (!el) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true)
          observer.disconnect()
        }
      },
      { threshold: 0.12 },
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [reduced])

  return (
    <div
      ref={ref}
      style={{
        transitionDelay: `${delay}ms`,
        transitionTimingFunction: 'cubic-bezier(0.22, 1, 0.36, 1)',
      }}
      className={`transition-all duration-700 ${
        visible ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'
      } ${className}`}
    >
      {children}
    </div>
  )
}