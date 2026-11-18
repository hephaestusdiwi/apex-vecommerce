'use client'

import Link from 'next/link'
import type { ReactNode } from 'react'
import { useAddToCart } from './useAddToCart'

export function ProductHeroBuy({
    productId,
    title,
    soldOut,
    children,
}: {
    productId: number
    title: string
    soldOut: boolean
    children?: ReactNode
}) {
    const { add, busyId, feedback } = useAddToCart()
    const busy = busyId === productId

  return (
    <div id="product-cta" className="flex flex-col items-start gap-2 md:items-end">
      <div className="flex items-center gap-5">
        {children}
        <button
          type="button"
          onClick={() => void add(productId)}
          disabled={busy || soldOut}
          aria-label={soldOut ? `${title}: stok habis` : `Pesan Sekarang${title}`}
          className="rounded-full bg-accent px-6 py-2.5 text-base font-medium text-white transition-opacity focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent disabled:cursor-not-allowed disabled:opacity-40"
        >
          {soldOut ? 'Stok habis' : busy ? 'Menambahkan…' : 'Pesan Sekarang'}
        </button>
      </div>
      <div role="status" aria-live="polite" className="min-h-5">
        {feedback ? (
          <p className={`text-sm ${feedback.kind === 'error' ? 'text-notice' : 'text-white/80'}`}>
            {feedback.text}{' '}
            {feedback.kind === 'success' ? (
              <Link href="/cart" className="text-white underline underline-offset-4">
                Lihat keranjang
              </Link>
            ) : null}
          </p>
        ) : null}
      </div>
    </div>
  )
}