'use client'

import Link from 'next/link'
import { useCallback, useEffect, useRef, useState, type CSSProperties } from 'react'
import type { ShopCategory, ShopProduct } from '@/content/shop'
import { ProductCard } from './ProductCard'
import { useAddToCart } from './useAddToCart'

// Track lineup selebar layar: kartu pertama sejajar dengan tepi kiri container, sisanya meluber ke kanan sampai tepi layar (seperti Apple).
const LEAD =
  'max(var(--store-pad, 1.25rem), calc((100cqw - var(--store-max, 1260px)) / 2 + var(--store-pad, 1.25rem)))'
const LEAD_STYLE = {
  '--lead': LEAD,
  paddingInline: 'var(--lead)',
  scrollPaddingInline: 'var(--lead)',
} as CSSProperties

const Chevron = ({ flip = false }: { flip?: boolean }) => (
  <svg
    viewBox="0 0 24 24"
    width="18"
    height="18"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
    className={flip ? 'rotate-180' : ''}
  >
    <path d="M9 5l7 7-7 7" />
  </svg>
)

/** Katalog bersama untuk `/`, `/shop`, dan detail produk: carousel kartu, filter kategori (bila ada lebih dari satu), umpan balik keranjang. */
export function Shopfront({
  products,
  categories,
}: {
  products: ShopProduct[]
  categories: ShopCategory[]
}) {
  const [categoryId, setCategoryId] = useState<number | null>(null)
  const [edge, setEdge] = useState({ start: true, end: true })
  const trackRef = useRef<HTMLDivElement>(null)
  const { add, busyId, feedback } = useAddToCart()

  const visible =
    categoryId === null
      ? products
      : products.filter((product) => product.category?.id === categoryId)

  const measure = useCallback(() => {
    const el = trackRef.current
    if (!el) return
    setEdge({
      start: el.scrollLeft <= 4,
      end: el.scrollLeft + el.clientWidth >= el.scrollWidth - 4,
    })
  }, [])

  useEffect(() => {
    trackRef.current?.scrollTo({ left: 0 })
    measure()
    window.addEventListener('resize', measure)
    return () => window.removeEventListener('resize', measure)
  }, [categoryId, products.length, measure])

  function slide(direction: 1 | -1) {
    const el = trackRef.current
    if (!el) return
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    el.scrollBy({ left: direction * el.clientWidth * 0.8, behavior: reduce ? 'auto' : 'smooth' })
  }

  const chip = (active: boolean) =>
    `rounded-full px-4 py-2 text-sm transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent ${
      active ? 'bg-ink text-paper' : 'bg-hairline text-ink'
    }`
  const arrow =
    'flex size-10 items-center justify-center rounded-full bg-hairline text-ink transition-opacity focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:cursor-not-allowed disabled:opacity-30'

  if (products.length === 0) {
    return (
      <div className="store-container">
        <div className="rounded-[1.75rem] bg-tile px-6 py-16 text-center">
          <p className="text-lg font-medium">Belum ada produk yang dijual.</p>
          <p className="mt-2 text-sm text-mute">
            Produk akan muncul di sini setelah diaktifkan di CMS.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div>
      <div className="store-container">
        {categories.length > 1 ? (
          <nav aria-label="Kategori produk" className="mb-8 flex flex-wrap gap-2">
            <button
              type="button"
              aria-pressed={categoryId === null}
              onClick={() => setCategoryId(null)}
              className={chip(categoryId === null)}
            >
              Semua
            </button>
            {categories.map((category) => (
              <button
                key={category.id}
                type="button"
                aria-pressed={categoryId === category.id}
                onClick={() => setCategoryId(category.id)}
                className={chip(categoryId === category.id)}
              >
                {category.title}
              </button>
            ))}
          </nav>
        ) : null}

        <div role="status" aria-live="polite" className="min-h-6">
          {feedback ? (
            <p className={`mb-6 text-sm ${feedback.kind === 'error' ? 'text-notice' : ''}`}>
              {feedback.text}{' '}
              {feedback.kind === 'success' ? (
                <Link href="/cart" className="text-accent underline underline-offset-4">
                  Lihat keranjang
                </Link>
              ) : null}
            </p>
          ) : null}
        </div>
      </div>

      <div className="@container">
        <div
          ref={trackRef}
          onScroll={measure}
          role="region"
          aria-label="Daftar produk, geser untuk melihat lainnya"
          tabIndex={0}
          style={LEAD_STYLE}
          className="snap-x snap-mandatory overflow-x-auto overscroll-x-contain pb-2 [scrollbar-width:none] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent [&::-webkit-scrollbar]:hidden"
        >
          <ul className="flex gap-5">
            {visible.map((product, index) => (
              <li
                key={product.id}
                className="flex w-[72vw] shrink-0 snap-start sm:w-[17rem] lg:w-[19rem]"
              >
                <ProductCard
                  product={product}
                  busy={busyId === product.id}
                  onAdd={(id) => void add(id)}
                  priority={index < 3}
                />
              </li>
            ))}
          </ul>
        </div>
      </div>

      {visible.length > 1 ? (
        <div className="store-container mt-8 hidden justify-center gap-3 md:flex">
          <button
            type="button"
            onClick={() => slide(-1)}
            disabled={edge.start}
            aria-label="Produk sebelumnya"
            className={arrow}
          >
            <Chevron flip />
          </button>
          <button
            type="button"
            onClick={() => slide(1)}
            disabled={edge.end}
            aria-label="Produk berikutnya"
            className={arrow}
          >
            <Chevron />
          </button>
        </div>
      ) : null}
    </div>
  )
}
