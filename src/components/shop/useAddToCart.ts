'use client'

import { useState } from 'react'

export type CartFeedback = { kind: 'success' | 'error'; text: string } | null

/**
 * Satu-satunya jalur "tambah ke keranjang" di UI: POST /api/shop/cart/items.
 * Harga, stok, dan batas jumlah diperiksa server; UI hanya menampilkan hasilnya.
 */
export function useAddToCart() {
  const [busyId, setBusyId] = useState<number | null>(null)
  const [feedback, setFeedback] = useState<CartFeedback>(null)

  async function add(productId: number, quantity = 1) {
    setBusyId(productId)
    setFeedback(null)
    try {
      const response = await fetch('/api/shop/cart/items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId, quantity }),
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(data.message || 'Produk gagal ditambahkan.')
      setFeedback({ kind: 'success', text: 'Produk ditambahkan ke keranjang.' })
    } catch (error) {
      setFeedback({ kind: 'error', text: error instanceof Error ? error.message : 'Produk gagal ditambahkan.' })
    } finally {
      setBusyId(null)
    }
  }

  return { add, busyId, feedback }
}
