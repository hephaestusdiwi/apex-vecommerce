import { randomBytes } from 'node:crypto'
import { timingSafeEqual } from 'node:crypto'
import { APIError, type Payload, type Where } from 'payload'
import { isActiveLoggedIn } from '@/access'
import type { Actor } from './cart'
import { hashToken } from './cart'
import { withAdvisoryLock } from './lock'
import { recordSystemMovement } from './stock'
import { canTransition, isOrderStatus, ORDER_STATUS_LABEL, type OrderStatus, type TransitionSource } from './orderStatus'
import { createGatewayPayment, resolveGateway, type PaymentEvent } from '@/lib/payments'
import { SITE_URL } from '@/lib/seo'

type SnapshotLine = { productId: string; title: string; sku?: string | null; unitPrice: number; quantity: number; lineTotal: number; trackStock: boolean }
type StoredOrder = {
  id: number; code: string; accessToken: string; items?: SnapshotLine[] | null; payment?: Record<string, unknown> | null
  status?: string | null; stockReleasedAt?: string | null; total: number; holdUntil?: string | null; cart?: number | { id: number } | null
}

const fail = (status: number, message: string) => new APIError(message, status, undefined, true)
const str = (value: unknown) => typeof value === 'string' ? value.trim() : ''
const codeOf = () => `ORD-${randomBytes(8).toString('hex').toUpperCase()}`
const tokenOf = () => randomBytes(24).toString('base64url')
const orderLock = (id: number | string) => `order:${id}`
const cartLock = (actor: Actor) => actor.user && isActiveLoggedIn(actor.user)
  ? `cart:u${actor.user.id}`
  : `cart:t${hashToken(actor.token ?? 'none').slice(0, 32)}`

const idOf = (value: unknown) => Number(typeof value === 'object' && value ? (value as { id: number }).id : value)

/** Revalidates cart prices and reserves tracked inventory before creating a hosted checkout session. */
export async function checkoutCart(payload: Payload, actor: Actor, raw: Record<string, unknown>) {
  const name = str(raw.name)
  const email = str(raw.email).toLowerCase()
  const phone = str(raw.phone)
  const shippingAddress = str(raw.shippingAddress)
  const notes = str(raw.notes)
  if (!name || name.length > 120) throw fail(400, 'Nama wajib diisi (maksimal 120 karakter).')
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) throw fail(400, 'Email pembeli tidak valid.')
  if (!/^\+?[0-9\s-]{8,20}$/.test(phone)) throw fail(400, 'Nomor telepon tidak valid.')
  if (shippingAddress.length < 8 || shippingAddress.length > 500) throw fail(400, 'Alamat pengiriman wajib diisi (8–500 karakter).')
  if (notes.length > 1000) throw fail(400, 'Catatan maksimal 1000 karakter.')

  const settings = await payload.findGlobal({ slug: 'booking-settings', depth: 0, overrideAccess: true })
  const gatewaySetting = settings.paymentGateway ?? 'none'
  const gateway = resolveGateway(gatewaySetting)
  if (gateway.status !== 'ready') {
    const message = gateway.status === 'disabled' ? 'Pembayaran online belum diaktifkan. Hubungi pemilik toko.' :
      gateway.status === 'misconfigured' ? gateway.message : 'Pengaturan payment gateway tidak valid.'
    throw fail(503, message)
  }

  // A signed-in customer may have both a guest cart and an account cart; merge them first.
  const { getCart } = await import('./cart')
  const mergedCart = await getCart(payload, actor)

  const code = codeOf()
  const accessToken = tokenOf()
  const holdHours = Math.min(168, Math.max(1, Number(settings.holdHours) || 48))
  const holdUntil = new Date(Date.now() + holdHours * 3_600_000).toISOString()

  const order = await withAdvisoryLock(payload, cartLock(actor), async (req) => {
    const where: Where | null = actor.user && isActiveLoggedIn(actor.user)
      ? { customer: { equals: actor.user.id } }
      : actor.token ? { tokenHash: { equals: hashToken(actor.token) } } : null
    if (!where) throw fail(401, 'Keranjang tidak ditemukan. Muat ulang halaman lalu coba lagi.')
    const cart = (await payload.find({ collection: 'carts', where, limit: 1, depth: 0, overrideAccess: true, req })).docs[0]
    const cartItems = cart?.items ?? []
    if (!cart || !cartItems.length) throw fail(400, 'Keranjang kosong.')

    const productIds = cartItems.map((item) => idOf(item.product))
    const productsResult = await payload.find({
      collection: 'products', where: { id: { in: productIds } }, limit: productIds.length, depth: 0, pagination: false, overrideAccess: true, req,
    })
    const products = new Map(productsResult.docs.map((product) => [Number(product.id), product]))
    const lines: SnapshotLine[] = cartItems.map((item) => {
      const product = products.get(idOf(item.product))
      const quantity = Number(item.quantity)
      if (!product || !product.active) throw fail(409, 'Ada produk yang sudah tidak tersedia. Perbarui keranjang.')
      if (!Number.isInteger(quantity) || quantity < 1 || quantity > 20) throw fail(409, 'Jumlah produk di keranjang tidak valid.')
      if (item.priceSeen != null && Number(item.priceSeen) !== Number(product.price)) throw fail(409, `Harga ${product.title} berubah. Perbarui jumlah produk di keranjang untuk menyetujui harga terbaru.`)
      if (product.trackStock && Number(product.stock ?? 0) < quantity) throw fail(409, `Stok ${product.title} tidak mencukupi.`)
      return {
        productId: String(product.id), title: product.title, sku: product.sku ?? null,
        unitPrice: Number(product.price), quantity, lineTotal: Number(product.price) * quantity, trackStock: product.trackStock === true,
      }
    })
    const total = lines.reduce((sum, line) => sum + line.lineTotal, 0)
    if (!Number.isSafeInteger(total) || total < 1) throw fail(409, 'Total pesanan tidak valid.')

    for (const line of lines) {
      if (line.trackStock) await recordSystemMovement(payload, {
        productId: Number(line.productId), delta: -line.quantity, reason: 'order_reserve', reference: code,
        note: 'Reservasi stok saat checkout pembayaran.',
      }, req)
    }

    const doc = await payload.create({
      collection: 'orders', overrideAccess: true, req,
      data: {
        code, accessToken, cart: cart.id, customer: actor.user && isActiveLoggedIn(actor.user) ? Number(actor.user.id) : undefined,
        customerName: name, customerEmail: email, customerPhone: phone, shippingAddress, notes: notes || undefined,
        items: lines as never, subtotal: total, total, status: 'pending', holdUntil,
        payment: { gateway: gateway.provider, reference: code, amount: total, status: 'pending' },
      },
    })
    await payload.update({ collection: 'carts', id: cart.id, data: { items: [], lastActiveAt: new Date().toISOString() }, overrideAccess: true, req })
    return doc as unknown as StoredOrder
  })

  const returnUrl = new URL(`/order/${encodeURIComponent(order.code)}`, SITE_URL)
  returnUrl.searchParams.set('token', order.accessToken)
  const payment = await createGatewayPayment({
    reference: order.code, amount: order.total, description: `Pesanan ${order.code}`,
    customer: { name, email, phone }, returnUrl: returnUrl.toString(), expiresInMinutes: holdHours * 60,
  })

  if (!payment.ok) {
    await withAdvisoryLock(payload, orderLock(order.id), async (req) => {
      const current = await payload.findByID({ collection: 'orders', id: order.id, depth: 0, overrideAccess: true, req }) as unknown as StoredOrder
      const cartId = current.cart ? idOf(current.cart) : 0
      if (cartId) await payload.update({
        collection: 'carts', id: cartId, overrideAccess: true, req,
        data: { items: (current.items ?? []).map((line) => ({ product: Number(line.productId), quantity: line.quantity, priceSeen: line.unitPrice })) as never, lastActiveAt: new Date().toISOString() },
      })
      // Hook Orders mengembalikan stok reservasi dan mencatat riwayat.
      await payload.update({
        collection: 'orders', id: current.id, overrideAccess: true, req,
        context: { orderTransition: { source: 'system', note: 'Sesi pembayaran gagal dibuat.' } },
        data: { status: 'cancelled', payment: { ...current.payment, status: 'failed' } as never },
      })
    })
    throw fail(502, payment.message)
  }

  const updated = await withAdvisoryLock(payload, orderLock(order.id), async (req) => {
    const current = await payload.findByID({ collection: 'orders', id: order.id, depth: 0, overrideAccess: true, req })
    return payload.update({
      collection: 'orders', id: order.id, overrideAccess: true, req,
      data: { payment: { ...current.payment, gateway: payment.payment.provider, reference: order.code, amount: order.total,
        status: current.payment?.status ?? 'pending', checkoutUrl: payment.payment.checkoutUrl,
        providerTransactionId: current.payment?.providerTransactionId ?? payment.payment.providerTransactionId } },
    })
  })
  return {
    view: { order: { code: updated.code, total: updated.total, checkoutUrl: updated.payment?.checkoutUrl, token: updated.accessToken } },
    cookie: mergedCart.cookie,
  }
}

/** Apply a verified provider event to an order exactly once; expired orders release reserved stock. */
export async function handleOrderPaymentEvent(payload: Payload, event: PaymentEvent) {
  const result = await payload.find({ collection: 'orders', where: { code: { equals: event.reference } }, limit: 1, depth: 0, overrideAccess: true })
  const found = result.docs[0] as unknown as StoredOrder | undefined
  if (!found) return false

  await withAdvisoryLock(payload, orderLock(found.id), async (req) => {
    const order = await payload.findByID({ collection: 'orders', id: found.id, depth: 0, overrideAccess: true, req }) as unknown as StoredOrder
    const payment = order.payment ?? {}
    if ((payment.gateway && payment.gateway !== event.provider) || payment.reference !== event.reference) throw fail(409, 'Provider atau referensi transaksi tidak cocok.')
    if (event.amount === null || event.amount !== Number(payment.amount)) throw fail(409, 'Nominal transaksi tidak cocok.')
    const currentStatus = String(payment.status ?? 'pending')
    if (currentStatus === 'paid' && !['paid', 'refunded', 'partially_refunded'].includes(event.status)) return

    const current = (isOrderStatus(order.status) ? order.status : 'pending') as OrderStatus
    const wanted: OrderStatus | null = event.status === 'paid' ? 'paid' : event.status === 'expired' ? 'expired' : null
    const change = wanted && canTransition(current, wanted, 'gateway') ? wanted : null
    // Pembayaran terlambat (stok sudah dilepas): diterima, tetapi ditandai agar staf meninjau stok/refund.
    const inventoryReview = event.status === 'paid' ? Boolean(order.stockReleasedAt) : false
    await payload.update({
      collection: 'orders', id: order.id, overrideAccess: true, req,
      context: { orderTransition: { source: 'gateway', note: `Notifikasi ${event.provider}: ${event.status}.` } },
      data: {
        ...(change ? { status: change } : {}),
        inventoryReview,
        payment: { ...payment, gateway: event.provider, reference: event.reference, status: event.status,
          providerTransactionId: event.providerTransactionId, paidAt: event.status === 'paid' ? (payment.paidAt ?? new Date().toISOString()) : payment.paidAt } as never,
      },
    })
  })
  return true
}

export async function expireOrder(payload: Payload, id: number | string) {
  await withAdvisoryLock(payload, orderLock(id), async (req) => {
    const order = await payload.findByID({ collection: 'orders', id, depth: 0, overrideAccess: true, req }) as unknown as StoredOrder
    if (order.status !== 'pending' || !order.holdUntil || new Date(order.holdUntil).getTime() > Date.now() || order.payment?.status === 'paid') return
    await payload.update({
      collection: 'orders', id, overrideAccess: true, req,
      context: { orderTransition: { source: 'system', note: 'Batas waktu pembayaran habis.' } },
      data: { status: 'expired', payment: { ...order.payment, status: order.payment?.status === 'pending' ? 'expired' : order.payment?.status } as never },
    })
  })
}

// ---------------------------------------------------------------------------------------------------------------------
// Akun pelanggan: daftar, detail, dan pembatalan pesanan.
// ---------------------------------------------------------------------------------------------------------------------

export type OrderEventView = { from: OrderStatus | null; to: OrderStatus; label: string; at: string }
export type OrderView = {
  code: string; status: OrderStatus; statusLabel: string; paymentStatus: string | null
  subtotal: number; total: number; createdAt: string; holdUntil: string | null
  shippingAddress: string; notes: string | null
  items: Array<{ productId: string; title: string; sku: string | null; unitPrice: number; quantity: number; lineTotal: number }>
  checkoutUrl: string | null; canCancel: boolean; history: OrderEventView[]
}

const safeEqual = (a: string, b: string) => {
  const x = Buffer.from(a)
  const y = Buffer.from(b)
  return x.length === y.length && timingSafeEqual(x, y)
}

/** Pesanan milik akun yang login, atau yang `token`-nya cocok. Selain itu dianggap tidak ada (404), agar nomor pesanan tidak bisa ditebak. */
async function findAccessible(payload: Payload, code: string, user: Actor['user'], token: string | null) {
  const found = (await payload.find({ collection: 'orders', where: { code: { equals: code } }, limit: 1, depth: 0, overrideAccess: true })).docs[0]
  if (!found) return null
  const owner = user && isActiveLoggedIn(user) && found.customer != null && String(idOf(found.customer)) === String(user.id)
  const byToken = !!token && safeEqual(token, found.accessToken)
  return owner || byToken ? found : null
}

async function toOrderView(payload: Payload, order: NonNullable<Awaited<ReturnType<typeof findAccessible>>>): Promise<OrderView> {
  const events = await payload.find({ collection: 'order-status-events', where: { order: { equals: order.id } }, sort: 'createdAt', limit: 100, depth: 0, overrideAccess: true })
  const status = (isOrderStatus(order.status) ? order.status : 'pending') as OrderStatus
  const pay = order.payment?.status ?? null
  return {
    code: order.code, status, statusLabel: ORDER_STATUS_LABEL[status], paymentStatus: pay,
    subtotal: order.subtotal, total: order.total, createdAt: order.createdAt, holdUntil: order.holdUntil ?? null,
    shippingAddress: order.shippingAddress, notes: order.notes ?? null,
    items: (order.items ?? []).map((i) => ({ productId: i.productId, title: i.title, sku: i.sku ?? null, unitPrice: i.unitPrice, quantity: i.quantity, lineTotal: i.lineTotal })),
    checkoutUrl: status === 'pending' && pay === 'pending' ? order.payment?.checkoutUrl ?? null : null,
    canCancel: status === 'pending' && pay !== 'paid',
    history: events.docs.map((e) => ({
      from: isOrderStatus(e.fromStatus) ? e.fromStatus : null, to: e.toStatus as OrderStatus,
      label: ORDER_STATUS_LABEL[e.toStatus as OrderStatus], at: e.createdAt,
    })),
  }
}

export async function listOrdersForCustomer(payload: Payload, user: NonNullable<Actor['user']>, page = 1) {
  if (!isActiveLoggedIn(user)) throw fail(401, 'Silakan masuk.')
  const res = await payload.find({
    collection: 'orders', where: { customer: { equals: user.id } }, sort: '-createdAt', limit: 20, page: Math.max(1, Math.floor(page) || 1), depth: 0, overrideAccess: true,
  })
  return {
    orders: res.docs.map((o) => ({
      code: o.code, status: o.status as OrderStatus, statusLabel: ORDER_STATUS_LABEL[o.status as OrderStatus], paymentStatus: o.payment?.status ?? null,
      total: o.total, itemCount: (o.items ?? []).reduce((n, i) => n + i.quantity, 0), createdAt: o.createdAt,
    })),
    page: res.page ?? 1, totalPages: res.totalPages,
  }
}

export async function getOrderForCustomer(payload: Payload, actor: Actor, code: string, token: string | null) {
  const order = await findAccessible(payload, code, actor.user, token)
  if (!order) throw fail(404, 'Pesanan tidak ditemukan.')
  return toOrderView(payload, order)
}

/** Pelanggan membatalkan pesanan yang belum dibayar; stok reservasi dikembalikan oleh hook Orders. */
export async function cancelOrderByCustomer(payload: Payload, actor: Actor, code: string, token: string | null) {
  const found = await findAccessible(payload, code, actor.user, token)
  if (!found) throw fail(404, 'Pesanan tidak ditemukan.')
  await withAdvisoryLock(payload, orderLock(found.id), async (req) => {
    const order = await payload.findByID({ collection: 'orders', id: found.id, depth: 0, overrideAccess: true, req })
    if (order.status !== 'pending' || order.payment?.status === 'paid' || !canTransition('pending', 'cancelled', 'customer')) {
      throw fail(409, 'Pesanan ini sudah tidak bisa dibatalkan.')
    }
    await payload.update({
      collection: 'orders', id: order.id, overrideAccess: true, req,
      context: { orderTransition: { source: 'customer', note: 'Dibatalkan oleh pelanggan.' } },
      data: { status: 'cancelled', payment: { ...order.payment, status: order.payment?.status === 'pending' ? 'cancelled' : order.payment?.status } as never },
    })
  })
  return getOrderForCustomer(payload, actor, code, token)
}
