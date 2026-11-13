// @vitest-environment node
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { getPayload, type Payload } from 'payload'
import config from '@/payload.config'
import { recordSystemMovement } from '@/shop/stock'

const P = '__cat_test_'
const PASSWORD = 'password-uji-123'
let payload: Payload
let editor: object
let customer: object

const asUser = (user: object) => ({ ...user, collection: 'users' }) as never
const newProduct = (n: string, extra: Record<string, unknown> = {}) =>
  payload.create({ collection: 'products', data: { title: `Produk ${n}`, sku: `${P}${n}`, price: 50000, active: true, ...extra }, overrideAccess: true })
const stockOf = async (id: number) => (await payload.findByID({ collection: 'products', id, overrideAccess: true })).stock

const cleanup = async () => {
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
  editor = await payload.create({ collection: 'users', data: { email: `${P}editor@example.test`, password: PASSWORD, role: 'editor', status: 'active' } })
  customer = await payload.create({ collection: 'users', data: { email: `${P}cust@example.test`, password: PASSWORD, role: 'customer', status: 'active' } })
}, 60_000)

afterAll(cleanup, 60_000)

describe('katalog & akses', () => {
  it('publik hanya melihat produk aktif; hanya staff yang boleh membuat/mengubah; harga aktif tidak boleh 0', async () => {
    const on = await newProduct('on')
    const off = await newProduct('off', { active: false })

    const publicView = await payload.find({ collection: 'products', where: { sku: { like: P } }, overrideAccess: false })
    expect(publicView.docs.map((d) => d.id)).toEqual([on.id])

    const staffView = await payload.find({ collection: 'products', where: { sku: { like: P } }, user: asUser(editor), overrideAccess: false })
    expect(staffView.docs.map((d) => d.id).sort()).toEqual([on.id, off.id].sort())

    await expect(
      payload.create({ collection: 'products', data: { title: 'X', price: 1000, active: true }, user: asUser(customer), overrideAccess: false }),
    ).rejects.toThrow()
    await expect(newProduct('free', { price: 0 })).rejects.toThrow(/harga minimal/i)
  }, 30_000)
})

describe('stok & buku besar', () => {
  it('stok hanya berubah lewat pergerakan, tercatat sebelum/sesudah, dan tidak bisa negatif', async () => {
    const p = await newProduct('ledger')
    const move = (delta: number, reason: 'restock' | 'damaged' | 'correction') =>
      payload.create({ collection: 'stock-movements', data: { product: p.id, delta, reason }, user: asUser(editor), overrideAccess: false })

    const m1 = await move(10, 'restock')
    expect([m1.stockBefore, m1.stockAfter]).toEqual([0, 10])
    const m2 = await move(-3, 'damaged')
    expect([m2.stockBefore, m2.stockAfter]).toEqual([10, 7])

    await expect(move(-8, 'correction')).rejects.toThrow(/tidak mencukupi/i)
    expect(await stockOf(p.id)).toBe(7)

    // Penulisan stok langsung (form admin/REST maupun SQL biasa) tidak berpengaruh.
    await payload.update({ collection: 'products', id: p.id, data: { stock: 999, title: 'Ganti judul' }, user: asUser(editor), overrideAccess: false })
    expect(await stockOf(p.id)).toBe(7)
    const pool = (payload.db as unknown as { pool: { query: (q: string, v: unknown[]) => Promise<unknown> } }).pool
    await pool.query('UPDATE products SET stock = 999 WHERE id = $1', [p.id])
    expect(await stockOf(p.id)).toBe(7)
  }, 30_000)

  it('alasan sistem ditolak dari staff, riwayat tidak bisa diubah/dihapus, produk berriwayat tidak bisa dihapus', async () => {
    const p = await newProduct('guards')
    await expect(
      payload.create({ collection: 'stock-movements', data: { product: p.id, delta: -1, reason: 'order_reserve' }, user: asUser(editor), overrideAccess: false }),
    ).rejects.toThrow(/hanya bisa dicatat oleh sistem/i)

    const m = await payload.create({ collection: 'stock-movements', data: { product: p.id, delta: 5, reason: 'restock' }, user: asUser(editor), overrideAccess: false })
    await expect(payload.update({ collection: 'stock-movements', id: m.id, data: { delta: 99 }, user: asUser(editor), overrideAccess: false })).rejects.toThrow()
    await expect(payload.delete({ collection: 'stock-movements', id: m.id, user: asUser(editor), overrideAccess: false })).rejects.toThrow()
    await expect(payload.delete({ collection: 'products', id: p.id, overrideAccess: true })).rejects.toThrow(/riwayat stok/i)
  }, 30_000)

  it('dua permintaan bersamaan untuk unit terakhir: hanya satu yang berhasil, stok tidak negatif', async () => {
    const p = await newProduct('race')
    await payload.create({ collection: 'stock-movements', data: { product: p.id, delta: 1, reason: 'restock' }, overrideAccess: true })

    const results = await Promise.allSettled([1, 2].map((n) => recordSystemMovement(payload, { productId: p.id, delta: -1, reason: 'order_reserve', reference: `T-${n}` })))
    expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1)
    expect(await stockOf(p.id)).toBe(0)

    const q = await newProduct('race5')
    await payload.create({ collection: 'stock-movements', data: { product: q.id, delta: 3, reason: 'restock' }, overrideAccess: true })
    const many = await Promise.allSettled(Array.from({ length: 6 }, (_, n) => recordSystemMovement(payload, { productId: q.id, delta: -1, reason: 'order_reserve', reference: `M-${n}` })))
    expect(many.filter((r) => r.status === 'fulfilled')).toHaveLength(3)
    expect(await stockOf(q.id)).toBe(0)
  }, 60_000)
})
