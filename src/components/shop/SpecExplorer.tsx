'use client'

import Image from 'next/image'
import { useId, useState } from 'react'
import type { ShopExplorerItem } from '@/content/shop'
import { focalPosition } from '@/lib/focal'

const Icon = ({ d, size = 18 }: { d: string; size?: number }) => (
  <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d={d} />
  </svg>
)

export function SpecExplorer({ items, label }: { items: ShopExplorerItem[]; label: string }) {
  const baseId = useId()
  const [active, setActive] = useState<number | null>(0)
  const [shown, setShown] = useState(0)

  const open = (index: number | null) => {
    setActive(index)
    if (index !== null) setShown(index)
  }
const move = (delta: 1 | -1) => open(Math.min(Math.max((active ?? (delta === 1 ? -1 : items.length)) + delta, 0), items.length - 1))

const circle = 'flex size-10 items-center justify-center rounded-full bg-hairline text-ink transition-opacity focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:cursor-not-allowed disabled:opacity-30'


return (
    <div
      role="group"
      aria-label={label}
      onKeyDown={(event) => {
        if (event.key === 'Escape' && active !== null) open(null)
      }}
      className="relative grid gap-8 rounded-[1.75rem] bg-tile p-6 md:grid-cols-[minmax(0,26rem)_minmax(0,1fr)] md:gap-12 md:p-12"
    >
      <button
        type="button"
        onClick={() => open(null)}
        disabled={active === null}
        aria-label="Tutup semua"
        className={`absolute right-4 top-4 z-10 md:right-6 md:top-6 ${circle}`}
      >
        <Icon d="M6 6l12 12M18 6L6 18" />
      </button>

      <div className="flex items-center gap-4 md:gap-6">
        <div className="hidden shrink-0 flex-col gap-3 md:flex">
          <button type="button" onClick={() => move(-1)} disabled={active === 0} aria-label="Item sebelumnya" className={circle}>
            <Icon d="M6 15l6-6 6 6" />
          </button>
          <button type="button" onClick={() => move(1)} disabled={active === items.length - 1} aria-label="Item berikutnya" className={circle}>
            <Icon d="M6 9l6 6 6-6" />
          </button>
        </div>

        <ul className="flex w-full flex-col items-start gap-3 pt-10 md:pt-0">
          {items.map((item, index) => {
            const expanded = active === index
            const panelId = `${baseId}-panel-${index}`
            const buttonId = `${baseId}-button-${index}`
            return (
              <li
                key={item.id}
                // Pil tertutup selebar teksnya sendiri (md:w-fit); yang terbuka melebar jadi gelembung penjelasan.
                className={`w-full overflow-hidden bg-hairline transition-[border-radius] duration-300 motion-reduce:transition-none ${
                  expanded ? 'rounded-3xl md:w-[min(24rem,100%)]' : 'rounded-full md:w-fit'
                }`}
              >
                <h3>
                  <button
                    type="button"
                    id={buttonId}
                    aria-expanded={expanded}
                    aria-controls={panelId}
                    onClick={() => open(expanded ? null : index)}
                    className="flex w-full items-center gap-4 px-5 py-4 text-left text-base font-semibold focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-accent"
                  >
                    {expanded ? null : (
                      <span className="flex size-6 shrink-0 items-center justify-center rounded-full border-[1.5px] border-current">
                        <Icon d="M12 7v10M7 12h10" size={14} />
                      </span>
                    )}
                    <span className={expanded ? 'sr-only' : ''}>{item.title}</span>
                  </button>
                </h3>
                {/* Tinggi dianimasikan lewat grid-template-rows 0fr → 1fr: tanpa mengukur tinggi di JS. */}
                <div
                  id={panelId}
                  role="region"
                  aria-labelledby={buttonId}
                  className={`grid transition-[grid-template-rows] duration-300 [contain:inline-size] motion-reduce:transition-none ${expanded ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}
                >
                  <div className="overflow-hidden">
                    <p className="px-6 pb-6 pt-1 text-base leading-relaxed">
                      <strong className="font-semibold">{item.title}.</strong> {item.body}
                    </p>
                  </div>
                </div>
              </li>
            )
          })}
        </ul>
      </div>

      <div className="relative aspect-[4/5] overflow-hidden rounded-xl bg-paper md:aspect-auto md:min-h-[34rem]">
        {items.map((item, index) => (
          <Image
            key={item.id}
            src={item.image.src}
            alt={shown === index ? item.image.alt : ''}
            aria-hidden={shown !== index}
            fill
            sizes="(min-width: 768px) 55vw, 92vw"
            className={`object-cover transition-opacity duration-500 motion-reduce:transition-none ${shown === index ? 'opacity-100' : 'opacity-0'}`}
            style={{ objectPosition: focalPosition(item.image) }}
          />
        ))}
      </div>
    </div>
  )
}