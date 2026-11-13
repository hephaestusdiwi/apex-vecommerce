import type { PayloadRequest } from 'payload'

export const json = (body: unknown, status = 200) =>
  Response.json(body, { status, headers: { 'Cache-Control': 'no-store' } })

export async function readBody(req: PayloadRequest): Promise<Record<string, unknown>> {
  try {
    const body = await req.json?.()
    return body && typeof body === 'object' ? (body as Record<string, unknown>) : {}
  } catch {
    return {}
  }
}

const siteOrigin = (): string => {
  try {
    return new URL(process.env.SITE_URL || 'http://localhost:3000').origin
  } catch {
    return ''
  }
}

const allowedOrigins = (): string[] => [
  siteOrigin(),
  ...(process.env.ALLOWED_ORIGINS || '').split(',').map((o) => o.trim().replace(/\/$/, '')).filter(Boolean),
]

/** Pelindung CSRF tambahan untuk endpoint yang mengubah data: bila browser mengirim Origin, harus dari situs sendiri. */
export const isTrustedOrigin = (req: PayloadRequest): boolean => {
  const origin = req.headers.get('origin')
  return !origin || allowedOrigins().includes(origin)
}

export const clientIp = (req: PayloadRequest): string =>
  req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || req.headers.get('x-real-ip') || 'unknown'
