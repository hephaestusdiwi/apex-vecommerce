import Image from 'next/image'
import type { ShopHighlight, ShopStat } from '@/content/shop'
import { focalPosition } from '@/lib/focal'
import { Reveal } from './Reveal'
import { SpecExplorer } from './SpecExplorer'

const Eyebrow = ({ children }: { children: string }) =>
  children ? <p className="mb-4 text-sm font-semibold text-mute md:text-base">{children}</p> : null

/** Angka besar dengan keterangan, ala baris statistik di halaman produk Apple. */
function Stats({ stats, center }: { stats: ShopStat[]; center: boolean }) {
  if (stats.length === 0) return null
  return (
    <dl className={`mt-10 grid gap-x-10 gap-y-8 md:mt-14 ${center ? 'justify-center text-center' : ''}`} style={{ gridTemplateColumns: `repeat(${Math.min(stats.length, 4)}, minmax(0, auto))`, justifyContent: center ? 'center' : 'start' }}>
      {stats.map(({ value, label }, index) => (
        <div key={`${value}-${index}`}>
          <dd className="text-4xl font-semibold leading-none tracking-tight md:text-6xl">{value}</dd>
          {label ? <dt className="mt-3 max-w-[12rem] text-sm text-mute md:text-base">{label}</dt> : null}
        </div>
      ))}
    </dl>
  )
}

function Visual({ image, className }: { image: NonNullable<ShopHighlight['image']>; className: string }) {
  return (
    <div className={`relative overflow-hidden rounded-[1.75rem] bg-tile ${className}`}>
      <Image src={image.src} alt={image.alt} fill sizes="(min-width: 1260px) 1196px, 92vw" className="object-cover" style={{ objectPosition: focalPosition(image) }} />
    </div>
  )
}

/**
 * Tiap sorotan jadi satu seksi penuh sesuai tata letaknya: pernyataan besar, gambar lebar, atau teks + gambar
 * berdampingan (bergantian kiri/kanan). Judul raksasa, banyak ruang kosong, dan muncul saat di-scroll.
 */
export function ProductHighlights({ highlights }: { highlights: ShopHighlight[] }) {
  if (highlights.length === 0) return null
  return (
    <div id="sorotan">
      {highlights.map((highlight, index) => {
        const { id, layout, eyebrow, title, text, image, stats, items } = highlight
        const labelId = `highlight-${id}`

        if (layout === 'explorer' && items.length > 0) {
          return (
            <section key={id} aria-labelledby={labelId} className="store-container mt-28 md:mt-48">
              <Reveal>
                <div className="mx-auto max-w-3xl text-center">
                  <Eyebrow>{eyebrow}</Eyebrow>
                  <h2 id={labelId} className="text-3xl font-semibold leading-[1.08] tracking-tight md:text-6xl">
                    {title}
                  </h2>
                  {text ? <p className="mt-5 whitespace-pre-line text-lg leading-relaxed text-mute md:text-xl">{text}</p> : null}
                </div>
                <div className="mt-10 md:mt-14">
                  <SpecExplorer items={items} label={title} />
                </div>
              </Reveal>
            </section>
          )
        }

        if (layout === 'statement' || layout === 'explorer' || (layout === 'media' && !image && stats.length === 0)) {
          return (
            <section key={id} aria-labelledby={labelId} className="store-container mt-32 md:mt-56">
              <Reveal className="mx-auto max-w-4xl text-center">
                <Eyebrow>{eyebrow}</Eyebrow>
                <h2 id={labelId} className="text-4xl font-semibold leading-[1.05] tracking-tight md:text-7xl">
                  {title}
                </h2>
                {text ? <p className="mx-auto mt-6 max-w-2xl whitespace-pre-line text-lg leading-relaxed text-mute md:mt-8 md:text-2xl">{text}</p> : null}
                <Stats stats={stats} center />
              </Reveal>
            </section>
          )
        }

        if (layout === 'split' && image) {
          const flip = index % 2 === 1
          return (
            <section key={id} aria-labelledby={labelId} className="store-container mt-28 md:mt-44">
              <Reveal className="grid items-center gap-10 md:grid-cols-2 md:gap-16">
                <div className={flip ? 'md:order-2' : ''}>
                  <Eyebrow>{eyebrow}</Eyebrow>
                  <h2 id={labelId} className="text-3xl font-semibold leading-[1.08] tracking-tight md:text-5xl">
                    {title}
                  </h2>
                  {text ? <p className="mt-5 whitespace-pre-line text-lg leading-relaxed text-mute md:text-xl">{text}</p> : null}
                  <Stats stats={stats} center={false} />
                </div>
                <Visual image={image} className="aspect-[4/5] md:aspect-square" />
              </Reveal>
            </section>
          )
        }

        // media (dan split tanpa gambar): judul di tengah, lalu gambar selebar container, lalu angka.
        return (
          <section key={id} aria-labelledby={labelId} className="store-container mt-28 md:mt-48">
            <Reveal>
              <div className="mx-auto max-w-3xl text-center">
                <Eyebrow>{eyebrow}</Eyebrow>
                <h2 id={labelId} className="text-3xl font-semibold leading-[1.08] tracking-tight md:text-6xl">
                  {title}
                </h2>
                {text ? <p className="mt-5 whitespace-pre-line text-lg leading-relaxed text-mute md:text-xl">{text}</p> : null}
              </div>
              {image ? <Visual image={image} className="mt-10 aspect-[4/5] md:mt-14 md:aspect-[16/9]" /> : null}
              <Stats stats={stats} center />
            </Reveal>
          </section>
        )
      })}
    </div>
  )
}
