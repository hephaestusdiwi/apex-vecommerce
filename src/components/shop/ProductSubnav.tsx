'use client'

import { useEffect, useState } from 'react'
import { useAddToCart } from './useAddToCart'

/** Pill tipis di atas layar yang muncul setelah tombol Beli di hero ter-scroll: nama produk di kiri, Jelajahi dan Beli di kanan. */
export function ProductSubnav({
  productId,
  title,
  soldOut,
  exploreHref,
}: {
  productId: number
  title: string
  soldOut: boolean
  exploreHref: string | null
}) {
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
      className={`fixed inset-x-0 top-3 z-30 px-3 transition-transform duration-300 motion-reduce:transition-none ${
        visible ? 'translate-y-0' : '-translate-y-[200%]'
      }`}
    >
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 rounded-2xl border border-hairline bg-paper/80 py-2.5 pl-5 pr-3 backdrop-blur-xl">
        <p className="truncate text-base font-semibold">{title}</p>
        <div className="flex shrink-0 items-center gap-3">
          <p role="status" aria-live="polite" className="hidden text-xs text-mute sm:block">
            {feedback ? (feedback.kind === 'success' ? 'Ditambahkan ke keranjang' : feedback.text) : null}
          </p>
          {exploreHref ? (
            <a
              href={exploreHref}
              className="rounded-full border border-ink/60 px-3.5 py-1 text-xs font-medium focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
            >
              Jelajahi
            </a>
          ) : null}
          <button
            type="button"
            onClick={() => void add(productId)}
            disabled={busy || soldOut}
            aria-label={soldOut ? `${title}: stok habis` : `Pesan Sekarang ${title}`}
            className="rounded-full bg-accent px-3.5 py-1 text-xs font-medium text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:cursor-not-allowed disabled:opacity-40"
          >
            {soldOut ? 'Stok habis' : busy ? 'Menambahkan…' : ' Pesan Sekarang'}
          </button>
        </div>
      </div>
    </div>
  )
}