'use client'

import Image from 'next/image'
import { act, useEffect, useId, useRef, useState, type KeyboardEvent } from 'react'
import type { HomeFeatureTab } from '@/content/homeFeatures'
import { focalPosition } from '@/lib/focal'

const withPeriod = (text: string) => (/[.!?…]$/.test(text) ? text : `${text}.`)

const Icon = ({ d }: { d: string }) => (
  <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor" aria-hidden="true">
    <path d={d} />
  </svg>
)

export function FeatureTabs({ tabs }: { tabs: HomeFeatureTab[] }) {
    const baseId = useId()
    const [active, setActive] = useState(0)
    const [playing, setPlaying] = useState(true)
    const videoRef = useRef<HTMLVideoElement>(null)
    const tabRefs = useRef<(HTMLButtonElement | null)[]>([])
    const current = tabs[active]

    useEffect(() => {
        if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) setPlaying(false)
    }, [])

    useEffect(() => {
        const video = videoRef.current
        if (!video) return
        if (playing) video.play().catch(() => setPlaying(false))
            else video.pause()
    }, [playing, active])

    const select = (index: number) => {
        setActive(index)
        tabRefs.current[index]?.focus()
    }

    const onKeyDown = (event: KeyboardEvent) => {
        const last = tabs.length - 1
        const next = 
        event.key === 'ArrowRight' ? (active === last ? 0 : active + 1)
        : event.key === 'ArrowLeft' ? (active === 0 ? last : active - 1)
        : event.key === 'Home' ? 0
        : event.key === 'End' ? last
        : null
        if (next === null) return
        event.preventDefault()
        select(next)
    }

    return (
    <div>
      <div
        id={`${baseId}-panel`}
        role="tabpanel"
        aria-labelledby={`${baseId}-tab-${active}`}
        className="relative aspect-[4/3] overflow-hidden rounded-[1.75rem] bg-tile md:aspect-video"
      >
        {tabs.map((tab, index) =>
          tab.image ? (
            <Image
              key={tab.id}
              src={tab.image.src}
              alt={active === index ? tab.image.alt : ''}
              aria-hidden={active !== index}
              fill
              sizes="(min-width: 872px) 832px, 100vw"
              className={`object-cover transition-opacity duration-500 motion-reduce:transition-none ${active === index ? 'opacity-100' : 'opacity-0'}`}
              style={{ objectPosition: focalPosition(tab.image) }}
            />
          ) : null,
        )}
        {current.video ? (
          <video
            key={current.id}
            ref={videoRef}
            muted
            loop
            playsInline
            preload="metadata"
            poster={current.image?.src}
            aria-hidden="true"
            tabIndex={-1}
            className="absolute inset-0 size-full object-cover"
          >
            <source src={`${current.video.src}#t=0.001`} type={current.video.mimeType} />
          </video>
        ) : null}
        {current.video ? (
          <button
            type="button"
            onClick={() => setPlaying((value) => !value)}
            aria-label={playing ? 'Jeda video' : 'Putar video'}
            className="absolute bottom-4 right-4 flex size-8 items-center justify-center rounded-full bg-black/45 text-white backdrop-blur focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          >
            <Icon d={playing ? 'M7 5h3.5v14H7zM13.5 5H17v14h-3.5z' : 'M8 5.5v13l11-6.5z'} />
          </button>
        ) : null}
      </div>

      <div className="mt-6 flex justify-center">
        <div
          role="tablist"
          aria-label="Fitur"
          onKeyDown={onKeyDown}
          className="inline-flex max-w-full gap-1 overflow-x-auto rounded-full bg-tile p-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {tabs.map((tab, index) => (
            <button
              key={tab.id}
              ref={(el) => {
                tabRefs.current[index] = el
              }}
              type="button"
              role="tab"
              id={`${baseId}-tab-${index}`}
              aria-selected={active === index}
              aria-controls={`${baseId}-panel`}
              tabIndex={active === index ? 0 : -1}
              onClick={() => setActive(index)}
              className={`shrink-0 whitespace-nowrap rounded-full px-4 py-2 text-sm transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent ${
                active === index ? 'bg-ink font-medium text-paper' : 'text-ink/70 can-hover:hover:text-ink'
              }`}
            >
              {tab.tab}
            </button>
          ))}
        </div>
      </div>

      <p aria-live="polite" className="mx-auto mt-5 max-w-xl text-center text-sm leading-relaxed text-mute">
        <strong className="font-semibold text-ink">{withPeriod(current.title)}</strong> {current.description}
      </p>
    </div>
  )
}