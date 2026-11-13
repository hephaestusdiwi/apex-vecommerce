import type { Endpoint } from 'payload'
import { rateLimit } from '@/lib/rateLimit'
import { REGISTER_LIMIT } from './constants'
import { registerCustomer } from './customers'
import { cartEndpoints } from './cartEndpoints'
import { clientIp, isTrustedOrigin, json, readBody } from './http'

/**
 * Endpoint toko (Local API di server). Login, logout, `me`, lupa/reset password memakai endpoint bawaan Payload
 * di /api/users/*; yang di sini hanya yang tidak disediakan Payload.
 */
export const shopEndpoints: Endpoint[] = [
  ...cartEndpoints,
  {
    path: '/shop/register',
    method: 'post',
    handler: async (req) => {
      if (!isTrustedOrigin(req)) return json({ message: 'Permintaan ditolak.' }, 403)
      if (!rateLimit(`register:${clientIp(req)}`, REGISTER_LIMIT.max, REGISTER_LIMIT.windowMs)) {
        return json({ message: 'Terlalu banyak percobaan. Coba lagi beberapa menit lagi.' }, 429)
      }

      const body = await readBody(req)
      // Honeypot: bot mengisi kolom tersembunyi. Balas seolah berhasil, tapi tidak membuat akun.
      if (typeof body.website === 'string' && body.website.trim() !== '') return json({ ok: true })

      const result = await registerCustomer(req.payload, body)
      if (!result.ok) return json({ message: result.message, field: result.field }, result.status)
      return json({ ok: true }, 201)
    },
  },
]
