import Image from 'next/image'
import Link from 'next/link'
import type { ShopProduct } from '@/content/shop'
import { focalPosition } from '@/lib/focal'
import { ProductPrice } from './ProductPrice'

type Props = { product: ShopProduct; busy: boolean; onAdd: (productId: number) => void; priority?: boolean }

/** Kartu lineup ala Apple: tile foto tanpa bingkai, lalu label Baru, nama, ringkasan, harga, Selengkapnya dan Beli, semua di tengah. */
export function ProductCard({ product, busy, onAdd, priority = false }: Props) {
  const { title, slug, summary, price, compareAtPrice, images, soldOut, lowStock, isNew } = product
  const cover = images[0]
  const href = slug ? `/shop/${slug}` : null

  const visual = cover ? (
    <Image
      src={cover.src}
      alt={cover.alt}
      fill
      priority={priority}
      sizes="(min-width: 1024px) 304px, (min-width: 640px) 272px, 72vw"
      className="object-cover"
      style={{ objectPosition: focalPosition(cover) }}
    />
  ) : (
    // Tanpa foto: panel kosong dengan inisial supaya kartu tetap sejajar dengan yang lain.
    <span aria-hidden="true" className="absolute inset-0 flex items-center justify-center text-7xl font-light text-mute/40">
      {title.trim().charAt(0).toUpperCase()}
    </span>
  )
  const tile = 'relative block aspect-[4/5] w-full overflow-hidden rounded-[1.75rem] bg-white'

  return (
    <article className="flex h-full w-full flex-col items-center text-center">
      {href ? (
        <Link href={href} tabIndex={-1} aria-hidden="true" className={tile}>
          {visual}
        </Link>
      ) : (
        <div className={tile}>{visual}</div>
      )}
      <div className="flex w-full flex-1 flex-col items-center pt-6">
        {isNew ? <p className="mb-1 text-xs font-semibold text-notice">Baru</p> : null}
        <h2 className="text-xl font-semibold leading-snug">{title}</h2>
        {summary ? <p className="mt-2 line-clamp-3 max-w-[16rem] text-sm leading-snug">{summary}</p> : null}
        <div className="mt-3 text-mute">
          <ProductPrice price={price} compareAtPrice={compareAtPrice} compact centered />
          {lowStock && !soldOut ? <p className="mt-0.5 text-xs font-medium text-notice">Stok terbatas</p> : null}
        </div>
        <div className="mt-auto flex items-center justify-center gap-5 pt-6">
          {href ? (
            <Link
              href={href}
              aria-label={`Selengkapnya tentang ${title}`}
              className="rounded-full bg-accent px-4 py-2 text-sm font-medium text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
            >
              Selengkapnya
            </Link>
          ) : null}
          <button
            type="button"
            onClick={() => onAdd(product.id)}
            disabled={busy || soldOut}
            aria-label={soldOut ? `${title}: stok habis` : `Beli ${title}`}
            className="inline-flex items-center gap-0.5 text-sm text-accent hover:underline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent disabled:cursor-not-allowed disabled:no-underline disabled:opacity-40"
          >
            {soldOut ? 'Stok habis' : busy ? 'Menambahkan…' : 'Beli'}
            {soldOut || busy ? null : (
              <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M9 5l7 7-7 7" />
              </svg>
            )}
          </button>
        </div>
      </div>
    </article>
  )
}
