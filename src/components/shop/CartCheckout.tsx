'use client'

import { useEffect, useState, type FormEvent } from 'react'

type Line = { productId: number; title: string; unitPrice: number; quantity: number; lineTotal: number; available: number | null; issues: string[] }
type CartView = { lines: Line[]; itemCount: number; subtotal: number; checkoutReady: boolean }

const money = (n: number) => `Rp${n.toLocaleString('id-ID')}`

export function CartCheckout() {
  const [cart, setCart] = useState<CartView | null>(null)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')

  async function load() {
    const response = await fetch('/api/shop/cart', { cache: 'no-store' })
    const data = await response.json()
    if (!response.ok) throw new Error(data.message || 'Keranjang gagal dimuat.')
    setCart(data as CartView)
  }

  useEffect(() => { void load().catch((error) => setMessage(error.message || 'Keranjang gagal dimuat.')) }, [])

  async function mutate(url: string, method: string, body?: unknown) {
    setBusy(true); setMessage('')
    try {
      const response = await fetch(url, { method, headers: body ? { 'Content-Type': 'application/json' } : undefined, body: body ? JSON.stringify(body) : undefined })
      const data = await response.json()
      if (!response.ok) throw new Error(data.message || 'Keranjang gagal diperbarui.')
      setCart(data as CartView)
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Keranjang gagal diperbarui.') }
    finally { setBusy(false) }
  }

  async function checkout(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setMessage('')
    const form = new FormData(event.currentTarget)
    try {
      const response = await fetch('/api/shop/cart/checkout', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, phone, shippingAddress: form.get('shippingAddress'), notes: form.get('notes') }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.message || 'Checkout gagal.')
      window.location.assign(data.order.checkoutUrl)
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Checkout gagal.'); setBusy(false); void load() }
  }

  return <div className="grid gap-12 lg:grid-cols-[1.3fr_0.7fr]">
    <section>
      <h2 className="text-xl font-medium">Isi keranjang</h2>
      {!cart ? <p className="mt-5 text-sm text-mute">Memuat keranjang…</p> : cart.lines.length === 0 ? <p className="mt-5 text-sm text-mute">Keranjang masih kosong. <a className="underline" href="/shop">Lihat toko</a></p> : <>
        <ul className="mt-5 divide-y divide-line">
          {cart.lines.map((line) => <li key={line.productId} className="flex flex-wrap items-center justify-between gap-4 py-5">
            <div><p className="font-medium">{line.title}</p><p className="mt-1 text-sm text-mute">{money(line.unitPrice)} · {money(line.lineTotal)}</p>
              {line.issues.map((issue) => <p key={issue} className="mt-1 text-xs text-red-600">{issue === 'price_changed' ? 'Harga berubah, setujui harga terbaru dengan memperbarui jumlah.' : 'Stok atau ketersediaan produk perlu diperiksa.'}</p>)}
            </div>
            <div className="flex items-center gap-2">
              <button type="button" aria-label={`Kurangi jumlah ${line.title}`} disabled={busy || line.quantity <= 1} onClick={() => void mutate(`/api/shop/cart/items/${line.productId}`, 'PATCH', { quantity: line.quantity - 1 })}>−</button>
              <span className="min-w-6 text-center">{line.quantity}</span>
              <button type="button" aria-label={`Tambah jumlah ${line.title}`} disabled={busy || line.quantity >= 20} onClick={() => void mutate(`/api/shop/cart/items/${line.productId}`, 'PATCH', { quantity: line.quantity + 1 })}>+</button>
              <button type="button" className="ml-3 text-sm underline" disabled={busy} onClick={() => void mutate(`/api/shop/cart/items/${line.productId}`, 'DELETE')}>Hapus</button>
            </div>
          </li>)}
        </ul>
        <p className="mt-5 flex justify-between border-t border-line pt-5 font-medium"><span>Subtotal</span><span>{money(cart.subtotal)}</span></p>
      </>}
    </section>
    <section>
      <h2 className="text-xl font-medium">Data pembeli</h2>
      <form className="mt-5 grid gap-4" onSubmit={(event) => void checkout(event)}>
        <label className="grid gap-1 text-sm">Nama lengkap<input required maxLength={120} autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} className="rounded-md border border-line px-3 py-2" /></label>
        <label className="grid gap-1 text-sm">Email<input required type="email" maxLength={254} autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} className="rounded-md border border-line px-3 py-2" /></label>
        <label className="grid gap-1 text-sm">Telepon / WhatsApp<input required type="tel" autoComplete="tel" value={phone} onChange={(e) => setPhone(e.target.value)} className="rounded-md border border-line px-3 py-2" /></label>
        <label className="grid gap-1 text-sm">Alamat pengiriman<textarea name="shippingAddress" required minLength={8} maxLength={500} rows={3} autoComplete="street-address" className="rounded-md border border-line px-3 py-2" /></label>
        <label className="grid gap-1 text-sm">Catatan (opsional)<textarea name="notes" maxLength={1000} rows={3} className="rounded-md border border-line px-3 py-2" /></label>
        {message && <p role="alert" className="text-sm text-red-600">{message}</p>}
        <p className="text-xs text-mute">Subtotal belum termasuk ongkos kirim. Toko akan mengatur pengiriman setelah pembayaran.</p>
        <p className="text-xs text-mute">Pembayaran diproses melalui gateway yang dipilih pemilik toko.</p>
        <button type="submit" disabled={busy || !cart?.checkoutReady} className="rounded-full border border-line px-5 py-3 text-sm disabled:opacity-50">
          {busy ? 'Memproses…' : 'Lanjut ke pembayaran'}
        </button>
      </form>
    </section>
  </div>
}
