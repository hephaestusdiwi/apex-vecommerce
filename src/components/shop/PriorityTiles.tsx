'use client'

import Image from 'next/image'
import Link from 'next/link'
import type { ShopProduct } from '@/content/shop'
import { MediaSlider } from './MediaSlider'
import { useAddToCart } from './useAddToCart'

/**
 * Tile hero ala katalog Apple di dalam slider autoplay: nama dan ringkasan di kiri atas, Beli + Selengkapnya
 * di kanan atas, produk di bawah. Tile berselang-seling terang/gelap.
 */
export function PriorityTiles({ products }: { products: ShopProduct[] }) {
  const { add, busyId, feedback } = useAddToCart()
  const tiles = products.slice(0, 5)
  if (tiles.length === 0) return null

  const slides = tiles.map((product, index) => {
    const { id, title, slug, summary, images, soldOut } = product
    const cover = images[0]
    const dark = index % 2 === 1
    return (
      <div
        key={id}
        className={`relative isolate flex min-h-[30rem] w-full flex-col overflow-hidden rounded-[1.75rem] md:min-h-[36rem] ${
          dark ? 'bg-black text-white' : 'bg-tile text-ink'
        }`}
      >
        {cover ? (
          <div className="absolute inset-x-0 bottom-0 top-[34%]">
            <Image
              src={cover.src}
              alt={cover.alt}
              fill
              priority={index < 2}
              sizes="(min-width: 1260px) 1196px, 92vw"
              className="object-contain object-bottom"
            />
          </div>
        ) : null}
        <div className="relative z-10 flex flex-wrap items-start justify-between gap-x-4 gap-y-4 p-6 md:p-8">
          <div className="min-w-0">
            <h2 className="text-3xl font-semibold leading-tight tracking-tight md:text-4xl">{title}</h2>
            {summary ? <p className="mt-1 line-clamp-2 max-w-sm text-lg md:text-xl">{summary}</p> : null}
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => void add(id)}
              disabled={busyId === id || soldOut}
              aria-label={soldOut ? `${title}: stok habis` : `Beli ${title}`}
              className="rounded-full border border-accent px-4 py-1.5 text-sm font-medium text-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:cursor-not-allowed disabled:opacity-40"
            >
              {soldOut ? 'Stok habis' : busyId === id ? 'Menambahkan…' : 'Beli'}
            </button>
            {slug ? (
              <Link
                href={`/shop/${slug}`}
                aria-label={`Selengkapnya tentang ${title}`}
                className="rounded-full bg-accent px-4 py-1.5 text-sm font-medium text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
              >
                Selengkapnya
              </Link>
            ) : null}
          </div>
        </div>
      </div>
    )
  })

  return (
    <section aria-label="Produk unggulan" className="pt-6 md:pt-8">
      <MediaSlider slides={slides} label="Produk unggulan" />
      <div role="status" aria-live="polite" className="store-container min-h-6">
        {feedback ? (
          <p className={`mt-4 text-sm ${feedback.kind === 'error' ? 'text-notice' : ''}`}>
            {feedback.text}{' '}
            {feedback.kind === 'success' ? (
              <Link href="/cart" className="text-accent underline underline-offset-4">
                Lihat keranjang
              </Link>
            ) : null}
          </p>
        ) : null}
      </div>
    </section>
  )
}
