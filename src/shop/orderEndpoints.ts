import type { Endpoint, PayloadRequest } from 'payload'
import { rateLimit } from '@/lib/rateLimit'
import { parseCartCookie, type Actor } from './cart'
import { CART_LIMIT } from './constants'
import { clientIp, isTrustedOrigin, json } from './http'
import { cancelOrderByCustomer, getOrderForCustomer, listOrdersForCustomer } from './orders'

const actorOf = (req: PayloadRequest): Actor => ({
    user: req.user ? { id: req.user.id, role: (req.user as { role?: string }).role, status: (req.user as { status?: string }).status } : null,
    token: parseCartCookie(req.headers.get('cookie')),
})
const tokenOf = (req: PayloadRequest) => (req.query?.token as string | undefined) || req.headers.get('x-order-token') || null

const guard = (req: PayloadRequest, mutating: boolean) => {
    if (mutating && !isTrustedOrigin(req)) return json({ message: 'Permintaan ditolak' }, 403)
        if (!rateLimit(`orders:${clientIp(req)}`, CART_LIMIT.max, CART_LIMIT.windowMs)) return json({ message: 'Terlalu banyak request'}, 429)
            return null
} 

const run = (mutating: boolean, fn: (req: PayloadRequest, actor: Actor) => Promise<unknown>): Endpoint['handler'] => async (req) => {
  const blocked = guard(req, mutating)
  if (blocked) return blocked
  try {
    return json(await fn(req, actorOf(req)))
  } catch (err) {
    const e = err as { status?: number; message?: string }
    if (e.status && e.status < 500) return json({ message: e.message }, e.status)
    req.payload.logger.error({ err }, 'order endpoint')
    return json({ message: 'Terjadi kesalahan.' }, 500)
  }
}

/** Akun customer */
export const orderEndpoints: Endpoint[] = [
    {
        path: '/shop/orders',
        method: 'get',
        handler: run(false, async (req, actor) => {
            if (!actor.user) throw Object.assign(new Error('Silahkan masuk'), { status: 401 })
                return listOrdersForCustomer(req.payload, actor.user, Number(req.query?.page) || 1)
        }),
    },
    { path: '/shop/orders/:code', method: 'get', handler: run(false, (req, actor) => getOrderForCustomer(req.payload, actor, String(req.routeParams?.code ?? ''), tokenOf(req))) },
    { path: '/shop/orders/:code/cancel', method: 'post', handler: run(true, (req, actor) => cancelOrderByCustomer(req.payload, actor, String(req.routeParams?.code ?? ''), tokenOf(req))) },
]