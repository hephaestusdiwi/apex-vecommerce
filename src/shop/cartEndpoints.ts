import type { Endpoint, PayloadRequest } from 'payload'
import { rateLimit } from '@/lib/rateLimit'
import { addItem, clearCart, getCart, parseCartCookie, removeItem, setQuantity, clearCartCookie, type Actor, type CookieAction } from './cart'
import { CART_LIMIT } from './constants'
import { clientIp, isTrustedOrigin, readBody } from './http'
import { checkoutCart } from './orders'

const actorOf = (req: PayloadRequest): Actor => ({
  user: req.user ? { id: req.user.id, role: (req.user as { role?: string }).role, status: (req.user as { status?: string }).status } : null,
  token: parseCartCookie(req.headers.get('cookie')),
})

const respond = (body: unknown, cookie: CookieAction = {}, status = 200) => {
  const headers = new Headers({ 'Cache-Control': 'no-store' })
  if (cookie.set) headers.append('Set-Cookie', cookie.set)
  if (cookie.clear) headers.append('Set-Cookie', clearCartCookie())
  return Response.json(body, { status, headers })
}

const guard = (req: PayloadRequest, mutating: boolean) => {
  if (mutating && !isTrustedOrigin(req)) return respond({ message: 'Permintaan ditolak.' }, {}, 403)
  if (!rateLimit(`cart:${clientIp(req)}`, CART_LIMIT.max, CART_LIMIT.windowMs)) return respond({ message: 'Terlalu banyak permintaan. Coba lagi sebentar.' }, {}, 429)
  return null
}

const handle = (mutating: boolean, run: (req: PayloadRequest, actor: Actor) => Promise<{ view: unknown; cookie: CookieAction }>): Endpoint['handler'] =>
  async (req) => {
    const blocked = guard(req, mutating)
    if (blocked) return blocked
    try {
      const { view, cookie } = await run(req, actorOf(req))
      return respond(view, cookie)
    } catch (err) {
      const e = err as { status?: number; message?: string }
      if (e.status && e.status < 500) return respond({ message: e.message }, {}, e.status)
      req.payload.logger.error({ err }, 'cart endpoint')
      return respond({ message: 'Terjadi kesalahan.' }, {}, 500)
    }
  }

export const cartEndpoints: Endpoint[] = [
  {
    path: '/shop/cart/checkout',
    method: 'post',
    handler: async (req) => {
      const blocked = guard(req, true)
      if (blocked) return blocked
      try {
        const result = await checkoutCart(req.payload, actorOf(req), await readBody(req))
        return respond(result.view, result.cookie, 201)
      } catch (err) {
        const e = err as { status?: number; message?: string }
        if (e.status && e.status < 500) return respond({ message: e.message }, {}, e.status)
        req.payload.logger.error({ err }, 'cart checkout')
        return respond({ message: 'Checkout gagal. Silakan coba lagi.' }, {}, 500)
      }
    },
  },
  { path: '/shop/cart', method: 'get', handler: handle(false, (req, actor) => getCart(req.payload, actor)) },
  { path: '/shop/cart', method: 'delete', handler: handle(true, (req, actor) => clearCart(req.payload, actor)) },
  {
    path: '/shop/cart/items',
    method: 'post',
    handler: handle(true, async (req, actor) => {
      const body = await readBody(req)
      return addItem(req.payload, actor, body.productId, body.quantity ?? 1)
    }),
  },
  {
    path: '/shop/cart/items/:productId',
    method: 'patch',
    handler: handle(true, async (req, actor) => {
      const body = await readBody(req)
      return setQuantity(req.payload, actor, req.routeParams?.productId, body.quantity)
    }),
  },
  { path: '/shop/cart/items/:productId', method: 'delete', handler: handle(true, (req, actor) => removeItem(req.payload, actor, req.routeParams?.productId)) },
]
