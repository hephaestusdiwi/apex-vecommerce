'use client'

import { useEffect, useState } from 'react'
import { formatIdr } from '@/lib/price'
import { useAddToCart } from './useAddToCart'

/** Bar tipis di atas layar yang muncul setelah tombol beli di hero ter-scroll; nama produk di kiri, harga dan Beli di kanan. */
export function ProductSubnav({ productId, title, price, soldOut }: { productId: number; title: string; price: number; soldOut: boolean }) {
  const [visible, setVisible] = useState(false)
  const { add, busyId, feedback } = useAddToCart()

  useEffect(() => {
    const target = document.getElementById('product-cta')
    if (!target) return
    const observer = new IntersectionObserver(([entry]) => {
      // Tampil hanya setelah tombol hero lewat ke atas layar, bukan saat masih di bawah (awal halaman).
      setVisible(!entry.isIntersecting && entry.boundingClientRect.top < 0)
    })
    observer.observe(target)
    return () => observer.disconnect()
  }, [])

  const busy = busyId === productId

  return (
    <div
      inert={!visible}
      aria-hidden={!visible}
      className={`fixed inset-x-0 top-0 z-30 border-b border-hairline bg-paper/80 backdrop-blur-xl transition-transform duration-300 motion-reduce:transition-none ${
        visible ? 'translate-y-0' : '-translate-y-full'
      }`}
    >
      <div className="store-container flex items-center justify-between gap-4 py-3">
        <p className="truncate text-base font-medium md:text-lg">{title}</p>
        <div className="flex shrink-0 items-center gap-4">
          <p role="status" aria-live="polite" className="hidden text-sm text-mute sm:block">
            {feedback ? (feedback.kind === 'success' ? 'Ditambahkan ke keranjang' : feedback.text) : formatIdr(price)}
          </p>
          <button
            type="button"
            onClick={() => void add(productId)}
            disabled={busy || soldOut}
            aria-label={soldOut ? `${title}: stok habis` : `Beli ${title}`}
            className="rounded-full bg-accent px-5 py-2 text-sm font-medium text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:cursor-not-allowed disabled:opacity-40"
          >
            {soldOut ? 'Stok habis' : busy ? 'Menambahkan…' : 'Beli'}
          </button>
        </div>
      </div>
    </div>
  )
}
