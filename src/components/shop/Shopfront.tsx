'use client'

import { useState } from 'react'
import type { Media } from '@/payload-types'

type ShopProduct = { id: number; title: string; slug?: string | null; sku?: string | null; price: number; description?: string | null; images?: { image: number | Media; alt?: string | null }[] | null }

export function Shopfront({ products }: { products: ShopProduct[] }) {
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState<number | null>(null)

  async function add(productId: number) {
    setBusy(productId)
    setMessage('')
    try {
      const response = await fetch('/api/shop/cart/items', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ productId, quantity: 1 }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.message || 'Produk gagal ditambahkan.')
      setMessage('Produk ditambahkan ke keranjang.')
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Produk gagal ditambahkan.')
    } finally { setBusy(null) }
  }

  return <>
    {message && <p className="mb-6 text-sm" role="status">{message}</p>}
    {products.length === 0 ? <p>Belum ada produk aktif.</p> : <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {products.map((product) => <article key={product.id} className="rounded-xl border border-line p-5">
        <h2 className="text-lg font-medium">{product.title}</h2>
        {product.description && <p className="mt-2 line-clamp-3 text-sm text-mute">{product.description}</p>}
        <p className="mt-5 font-medium">Rp{product.price.toLocaleString('id-ID')}</p>
        <button type="button" onClick={() => void add(product.id)} disabled={busy === product.id} className="mt-4 rounded-full border border-line px-4 py-2 text-sm disabled:opacity-50">
          {busy === product.id ? 'Menambahkan…' : 'Tambah ke keranjang'}
        </button>
      </article>)}
    </div>}
    <a href="/cart" className="mt-8 inline-block text-sm underline underline-offset-4">Lihat keranjang</a>
  </>
}
