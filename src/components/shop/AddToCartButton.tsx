'use client'

import Link from 'next/link'
import { useAddToCart } from './useAddToCart'

export function AddToCartButton({ productId, title, soldOut }: { productId: number; title: string; soldOut: boolean }) {
  const { add, busyId, feedback } = useAddToCart()
  const busy = busyId === productId

  return (
    <div className="flex flex-col items-center">
      <button
        type="button"
        onClick={() => void add(productId)}
        disabled={busy || soldOut}
        aria-label={soldOut ? `${title}: stok habis` : `Beli ${title}`}
        className="rounded-4xl bg-accent px-8 py-3.5 text-base font-medium text-white transition-opacity focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent disabled:cursor-not-allowed disabled:opacity-40"
      >
        {soldOut ? 'Stok habis' : busy ? 'Menambahkan…' : 'Pesan sekarang'}
      </button>
      <div role="status" aria-live="polite" className="min-h-6">
        {feedback ? (
          <p className={`mt-4 text-center text-sm ${feedback.kind === 'error' ? 'text-notice' : ''}`}>
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
  )
}
