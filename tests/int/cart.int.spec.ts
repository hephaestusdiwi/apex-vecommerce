// @vitest-environment node
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { getPayload, type Payload } from 'payload'
import config from '@/payload.config'
import { addItem, getCart, parseCartCookie, setQuantity, type Actor } from '@/shop/cart'

const P = '__cart_test_'
const PASSWORD = 'password-uji-123'
let payload: Payload
let customer: { id: number; role: string; status: string }

const guest = (token: string | null): Actor => ({ user: null, token })
const tokenOf = (cookie: { set?: string }) => parseCartCookie(cookie.set ?? null)
const product = (n: string, extra: Record<string, unknown> = {}) =>
  payload.create({ collection: 'products', data: { title: `Produk ${n}`, sku: `${P}${n}`, price: 25000, active: true, ...extra }, overrideAccess: true })
const restock = (id: number, qty: number) =>
  payload.create({ collection: 'stock-movements', data: { product: id, delta: qty, reason: 'restock' }, overrideAccess: true })

const cleanup = async () => {
  await payload.delete({ collection: 'carts', where: { or: [{ customer: { exists: true } }, { tokenHash: { exists: true } }] }, overrideAccess: true })
  const products = await payload.find({ collection: 'products', where: { sku: { like: P } }, limit: 100, overrideAccess: true })
  const ids = products.docs.map((d) => d.id)
  if (ids.length) {
    await payload.delete({ collection: 'stock-movements', where: { product: { in: ids } }, overrideAccess: true })
    await payload.delete({ collection: 'products', where: { id: { in: ids } }, overrideAccess: true })
  }
  await payload.delete({ collection: 'users', where: { email: { like: P } }, overrideAccess: true })
}

beforeAll(async () => {
  payload = await getPayload({ config: await config })
  await cleanup()
  const u = await payload.create({ collection: 'users', data: { email: `${P}cust@example.test`, password: PASSWORD, role: 'customer', status: 'active' } })
  customer = { id: u.id, role: 'customer', status: 'active' }
}, 60_000)

afterAll(cleanup, 60_000)

describe('keranjang', () => {
  it('tamu: harga & stok dihitung server, perubahan harga terdeteksi, produk nonaktif memblokir checkout', async () => {
    const p = await product('a')
    await restock(p.id, 3)

    const first = await addItem(payload, guest(null), p.id, 1)
    const token = tokenOf(first.cookie)
    expect(token).toBeTruthy()
    const more = await addItem(payload, guest(token), p.id, 1)
    expect(more.view.lines[0]).toMatchObject({ quantity: 2, unitPrice: 25000, lineTotal: 50000 })
    expect(more.view.checkoutReady).toBe(true)

    // Melebihi stok ditolak, jumlah tidak berubah.
    await expect(addItem(payload, guest(token), p.id, 5)).rejects.toThrow(/tidak mencukupi/i)
    expect((await getCart(payload, guest(token))).view.itemCount).toBe(2)

    // Harga naik: total memakai harga baru dan baris ditandai; setQuantity "menyetujui" harga baru.
    await payload.update({ collection: 'products', id: p.id, data: { price: 30000 }, overrideAccess: true })
    const changed = (await getCart(payload, guest(token))).view
    expect(changed.subtotal).toBe(60000)
    expect(changed.lines[0]).toMatchObject({ unitPrice: 30000, priceChangedFrom: 25000 })
    expect(changed.lines[0].issues).toContain('price_changed')
    const ack = await setQuantity(payload, guest(token), p.id, 2)
    expect(ack.view.lines[0].priceChangedFrom).toBeNull()

    // Produk dinonaktifkan: tidak bisa dibeli.
    await payload.update({ collection: 'products', id: p.id, data: { active: false }, overrideAccess: true })
    const off = (await getCart(payload, guest(token))).view
    expect(off.lines[0].issues).toContain('unavailable')
    expect(off.checkoutReady).toBe(false)
    await expect(addItem(payload, guest(token), p.id, 1)).rejects.toThrow(/tidak tersedia/i)
  }, 60_000)

  it('login menggabungkan keranjang tamu ke keranjang pelanggan dan menghapus cookie tamu', async () => {
    const p = await product('m')
    await restock(p.id, 10)
    const q = await product('n')
    await restock(q.id, 10)

    // Keranjang pelanggan: 2 x p. Keranjang tamu: 1 x p dan 3 x q.
    await addItem(payload, { user: customer, token: null }, p.id, 2)
    const g = await addItem(payload, guest(null), p.id, 1)
    const token = tokenOf(g.cookie)!
    await addItem(payload, guest(token), q.id, 3)

    const merged = await getCart(payload, { user: customer, token })
    expect(merged.cookie.clear).toBe(true)
    const qty = Object.fromEntries(merged.view.lines.map((l) => [l.productId, l.quantity]))
    expect(qty).toEqual({ [p.id]: 3, [q.id]: 3 })
    // Keranjang tamu sudah hilang.
    expect((await getCart(payload, guest(token))).view.lines).toHaveLength(0)
  }, 60_000)

  it('penambahan bersamaan ke keranjang yang sama tidak saling menimpa', async () => {
    const p = await product('c')
    await restock(p.id, 20)
    const token = tokenOf((await addItem(payload, guest(null), p.id, 1)).cookie)
    await Promise.all(Array.from({ length: 5 }, () => addItem(payload, guest(token), p.id, 1)))
    expect((await getCart(payload, guest(token))).view.lines[0].quantity).toBe(6)
  }, 60_000)
})
