import { createHash, randomBytes } from 'node:crypto'
import { APIError, type Payload, type PayloadRequest, type Where } from 'payload'
import { isActiveLoggedIn } from '@/access'
import type { Cart, Media, Product } from '@/payload-types'
import { CART_COOKIE, CART_TTL_DAYS, MAX_CART_LINES, MAX_LINE_QUANTITY } from './constants'
import { withAdvisoryLock } from './lock'

export type Actor = { user: { id: number | string; role?: string | null; status?: string | null } | null; token: string | null }
export type CookieAction = { set?: string; clear?: boolean }

export type CartIssue = 'unavailable' | 'out_of_stock' | 'insufficient_stock' | 'price_changed'

export type CartLine = {
  productId: number
  title: string
  slug: string | null
  sku: string | null
  imageUrl: string | null
  unitPrice: number
  quantity: number
  lineTotal: number
  /** Sisa stok yang bisa dibeli (null = stok tidak dilacak). */
  available: number | null
  issues: CartIssue[]
  priceChangedFrom: number | null
}

export type CartView = {
  lines: CartLine[]
  itemCount: number
  subtotal: number
  /** Siap checkout: tidak kosong dan semua baris lolos validasi stok/ketersediaan. */
  checkoutReady: boolean
}

export const hashToken = (token: string) => createHash('sha256').update(token).digest('hex')
export const newToken = () => randomBytes(32).toString('base64url')
const TOKEN_PATTERN = /^[A-Za-z0-9_-]{43}$/

export const parseCartCookie = (header: string | null): string | null => {
  if (!header) return null
  for (const part of header.split(';')) {
    const [name, ...rest] = part.trim().split('=')
    if (name === CART_COOKIE) {
      const value = rest.join('=')
      return TOKEN_PATTERN.test(value) ? value : null
    }
  }
  return null
}

export const cartCookie = (token: string): string =>
  `${CART_COOKIE}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${CART_TTL_DAYS * 86400}${process.env.COOKIE_SECURE === 'true' ? '; Secure' : ''}`
export const clearCartCookie = (): string =>
  `${CART_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${process.env.COOKIE_SECURE === 'true' ? '; Secure' : ''}`

const fail = (status: number, message: string) => new APIError(message, status, undefined, true)
const idOf = (v: unknown): number => Number(typeof v === 'object' && v ? (v as { id: number }).id : v)

type Item = { product: number | Product; quantity: number; priceSeen?: number | null; id?: string | null }

const ownerKey = (actor: Actor, token: string | null) =>
  actor.user && isActiveLoggedIn(actor.user) ? `cart:u${actor.user.id}` : `cart:t${hashToken(token ?? 'none').slice(0, 32)}`

const productFor = async (payload: Payload, id: number, req?: PayloadRequest) =>
  payload.findByID({ collection: 'products', id, depth: 0, overrideAccess: true, disableErrors: true, req })

/** Validasi menambah/menetapkan jumlah satu produk. Melempar APIError bila tidak boleh. */
async function assertPurchasable(payload: Payload, productId: number, quantity: number, req?: PayloadRequest): Promise<Product> {
  if (!Number.isInteger(quantity) || quantity < 1) throw fail(400, 'Jumlah harus bilangan bulat minimal 1.')
  if (quantity > MAX_LINE_QUANTITY) throw fail(400, `Maksimal ${MAX_LINE_QUANTITY} per produk.`)
  const product = await productFor(payload, productId, req)
  if (!product || !product.active) throw fail(404, 'Produk tidak tersedia.')
  if (product.trackStock) {
    const stock = product.stock ?? 0
    if (stock < 1) throw fail(409, 'Stok habis.')
    if (quantity > stock) throw fail(409, `Stok tidak mencukupi (tersisa ${stock}).`)
  }
  return product
}

/**
 * Cari keranjang milik pelanggan/tamu. Pelanggan yang login juga menerima keranjang tamunya (digabung), lalu cookie tamu dihapus.
 * Dipanggil di dalam lock, jadi aman dari penggabungan ganda.
 */
async function findOrCreate(payload: Payload, req: PayloadRequest, actor: Actor, create: boolean): Promise<{ cart: Cart | null; cookie: CookieAction }> {
  const find = async (where: Where) =>
    (await payload.find({ collection: 'carts', where, limit: 1, depth: 0, overrideAccess: true, req })).docs[0] ?? null
  const now = new Date().toISOString()

  if (actor.user && isActiveLoggedIn(actor.user)) {
    let mine = await find({ customer: { equals: actor.user.id } })
    const guest = actor.token ? await find({ tokenHash: { equals: hashToken(actor.token) } }) : null
    const cookie: CookieAction = actor.token ? { clear: true } : {}
    if (guest && !mine) {
      mine = await payload.update({ collection: 'carts', id: guest.id, data: { customer: actor.user.id as number, tokenHash: null, lastActiveAt: now }, overrideAccess: true, req })
    } else if (guest && mine) {
      const merged = new Map<number, Item>()
      for (const it of (mine.items ?? []) as Item[]) merged.set(idOf(it.product), { product: idOf(it.product), quantity: it.quantity, priceSeen: it.priceSeen })
      for (const it of (guest.items ?? []) as Item[]) {
        const pid = idOf(it.product)
        const prev = merged.get(pid)
        merged.set(pid, { product: pid, quantity: Math.min(MAX_LINE_QUANTITY, (prev?.quantity ?? 0) + it.quantity), priceSeen: prev?.priceSeen ?? it.priceSeen })
      }
      const items = [...merged.values()].slice(0, MAX_CART_LINES)
      mine = await payload.update({ collection: 'carts', id: mine.id, data: { items: items as never, lastActiveAt: now }, overrideAccess: true, req })
      await payload.delete({ collection: 'carts', id: guest.id, overrideAccess: true, req })
    }
    if (!mine && create) mine = await payload.create({ collection: 'carts', data: { customer: actor.user.id as number, items: [], lastActiveAt: now }, overrideAccess: true, req })
    return { cart: mine, cookie }
  }

  if (actor.token) {
    const guest = await find({ tokenHash: { equals: hashToken(actor.token) } })
    if (guest) return { cart: guest, cookie: {} }
  }
  if (!create) return { cart: null, cookie: {} }
  const token = newToken()
  const cart = await payload.create({ collection: 'carts', data: { tokenHash: hashToken(token), items: [], lastActiveAt: now }, overrideAccess: true, req })
  return { cart, cookie: { set: cartCookie(token) } }
}

const toView = async (payload: Payload, cart: Cart | null, req?: PayloadRequest): Promise<CartView> => {
  const items = ((cart?.items ?? []) as Item[]).map((i) => ({ pid: idOf(i.product), quantity: i.quantity, priceSeen: i.priceSeen ?? null }))
  if (items.length === 0) return { lines: [], itemCount: 0, subtotal: 0, checkoutReady: false }

  const found = await payload.find({ collection: 'products', where: { id: { in: items.map((i) => i.pid) } }, depth: 1, pagination: false, overrideAccess: true, req })
  const byId = new Map(found.docs.map((p) => [p.id, p]))

  const lines: CartLine[] = items.map(({ pid, quantity, priceSeen }) => {
    const p = byId.get(pid)
    const issues: CartIssue[] = []
    if (!p || !p.active) {
      return { productId: pid, title: p?.title ?? 'Produk tidak tersedia', slug: p?.slug ?? null, sku: p?.sku ?? null, imageUrl: null, unitPrice: 0, quantity, lineTotal: 0, available: 0, issues: ['unavailable'], priceChangedFrom: null }
    }
    const stock = p.trackStock ? (p.stock ?? 0) : null
    if (stock !== null && stock < 1) issues.push('out_of_stock')
    else if (stock !== null && quantity > stock) issues.push('insufficient_stock')
    const changed = priceSeen != null && priceSeen !== p.price
    if (changed) issues.push('price_changed')
    const first = p.images?.[0]?.image
    const media = first && typeof first === 'object' ? (first as Media) : null
    return {
      productId: pid, title: p.title, slug: p.slug ?? null, sku: p.sku ?? null, imageUrl: media?.url ?? null,
      unitPrice: p.price, quantity, lineTotal: p.price * quantity, available: stock, issues, priceChangedFrom: changed ? priceSeen : null,
    }
  })
  const blocking = (l: CartLine) => l.issues.some((i) => i !== 'price_changed')
  return {
    lines,
    itemCount: lines.reduce((n, l) => n + l.quantity, 0),
    subtotal: lines.reduce((n, l) => n + l.lineTotal, 0),
    checkoutReady: lines.length > 0 && !lines.some(blocking),
  }
}

const result = async (payload: Payload, cart: Cart | null, cookie: CookieAction, req?: PayloadRequest) => ({ view: await toView(payload, cart, req), cookie })

export async function getCart(payload: Payload, actor: Actor) {
  return withAdvisoryLock(payload, ownerKey(actor, actor.token), async (req) => {
    const { cart, cookie } = await findOrCreate(payload, req, actor, false)
    return result(payload, cart, cookie, req)
  })
}

/** Tambah `quantity` ke baris produk (membuat baris bila belum ada). Harga dari klien tidak pernah dipakai. */
export async function addItem(payload: Payload, actor: Actor, productId: unknown, quantity: unknown) {
  const pid = Number(productId)
  const qty = Number(quantity)
  if (!Number.isInteger(pid) || pid < 1) throw fail(400, 'Produk tidak valid.')
  return withAdvisoryLock(payload, ownerKey(actor, actor.token), async (req) => {
    const { cart, cookie } = await findOrCreate(payload, req, actor, true)
    const items = ((cart!.items ?? []) as Item[]).map((i) => ({ product: idOf(i.product), quantity: i.quantity, priceSeen: i.priceSeen ?? null }))
    const existing = items.find((i) => i.product === pid)
    if (!existing && items.length >= MAX_CART_LINES) throw fail(400, `Keranjang maksimal ${MAX_CART_LINES} jenis produk.`)
    const product = await assertPurchasable(payload, pid, (existing?.quantity ?? 0) + qty, req)
    if (existing) {
      existing.quantity += qty
      existing.priceSeen = product.price
    } else items.push({ product: pid, quantity: qty, priceSeen: product.price })
    const updated = await payload.update({ collection: 'carts', id: cart!.id, data: { items: items as never, lastActiveAt: new Date().toISOString() }, overrideAccess: true, req })
    return result(payload, updated, cookie, req)
  })
}

/** Tetapkan jumlah satu baris (1..maks). Sekaligus "menyetujui" harga terbaru untuk baris itu. */
export async function setQuantity(payload: Payload, actor: Actor, productId: unknown, quantity: unknown) {
  const pid = Number(productId)
  const qty = Number(quantity)
  if (!Number.isInteger(pid) || pid < 1) throw fail(400, 'Produk tidak valid.')
  return withAdvisoryLock(payload, ownerKey(actor, actor.token), async (req) => {
    const { cart, cookie } = await findOrCreate(payload, req, actor, false)
    const items = ((cart?.items ?? []) as Item[]).map((i) => ({ product: idOf(i.product), quantity: i.quantity, priceSeen: i.priceSeen ?? null }))
    const line = items.find((i) => i.product === pid)
    if (!cart || !line) throw fail(404, 'Produk tidak ada di keranjang.')
    const product = await assertPurchasable(payload, pid, qty, req)
    line.quantity = qty
    line.priceSeen = product.price
    const updated = await payload.update({ collection: 'carts', id: cart.id, data: { items: items as never, lastActiveAt: new Date().toISOString() }, overrideAccess: true, req })
    return result(payload, updated, cookie, req)
  })
}

export async function removeItem(payload: Payload, actor: Actor, productId: unknown) {
  const pid = Number(productId)
  return withAdvisoryLock(payload, ownerKey(actor, actor.token), async (req) => {
    const { cart, cookie } = await findOrCreate(payload, req, actor, false)
    if (!cart) return result(payload, null, cookie, req)
    const items = ((cart.items ?? []) as Item[]).filter((i) => idOf(i.product) !== pid).map((i) => ({ product: idOf(i.product), quantity: i.quantity, priceSeen: i.priceSeen ?? null }))
    const updated = await payload.update({ collection: 'carts', id: cart.id, data: { items: items as never, lastActiveAt: new Date().toISOString() }, overrideAccess: true, req })
    return result(payload, updated, cookie, req)
  })
}

export async function clearCart(payload: Payload, actor: Actor) {
  return withAdvisoryLock(payload, ownerKey(actor, actor.token), async (req) => {
    const { cart, cookie } = await findOrCreate(payload, req, actor, false)
    const updated = cart ? await payload.update({ collection: 'carts', id: cart.id, data: { items: [], lastActiveAt: new Date().toISOString() }, overrideAccess: true, req }) : null
    return result(payload, updated, cookie, req)
  })
}
