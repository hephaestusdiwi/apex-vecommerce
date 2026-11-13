import { createHash, timingSafeEqual } from 'node:crypto'
import {
    PaymentGatewayError,
    type CreatePaymentInput,
    type Env,
    type FetchLike,
    type PaymentProviderId,
} from './types'

export const envValue = (env: Env, name: string): string | undefined => {
  const v = env[name]?.trim()
  return v ? v : undefined
}

export function safeEqual(a: string, b:string): boolean {
    const ha = createHash('sha256').update(a).digest()
    const hb = createHash('sha256').update(b).digest()
    return timingSafeEqual(ha, hb)
}

export const basicAuth = (secret: string) => `Basic ${Buffer.from(`${secret}:`).toString('base64')}`

const REFERENCE = /^[A-Za-z0-9._~-]{1,50}$/
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function assertValidInput(input: CreatePaymentInput, provider?: PaymentProviderId): void {
  const bad = (msg: string) => new PaymentGatewayError('invalid_input', msg, provider)
  if (!REFERENCE.test(input.reference))
    throw bad(
      'Referensi pembayaran tidak valid (hanya huruf, angka, titik, minus, garis bawah, tilde; maks 50 karakter).',
    )
  if (!Number.isSafeInteger(input.amount) || input.amount < 1)
    throw bad('Nominal pembayaran harus bilangan bulat rupiah lebih dari 0.')
  if (!input.description.trim()) throw bad('Deskripsi pembayaran wajib diisi.')
  if (!input.customer.name.trim()) throw bad('Nama pembayar wajib diisi.')
  if (!EMAIL.test(input.customer.email)) throw bad('Email pembayar tidak valid.')
  if (
    input.expiresInMinutes !== undefined &&
    (!Number.isInteger(input.expiresInMinutes) || input.expiresInMinutes < 1)
  ) {
    throw bad('Masa berlaku pembayaran harus bilangan bulat menit lebih dari 0.')
  }
}

const TIMEOUT_MS = 10_000

export async function callProvider(
  fetchImpl: FetchLike,
  provider: PaymentProviderId,
  label: string,
  url: string,
  init: RequestInit,
): Promise<{ status: number; ok: boolean; json: Record<string, unknown> }> {
  let res: Response
  try {
    res = await fetchImpl(url, { ...init, signal: AbortSignal.timeout(TIMEOUT_MS) })
  } catch {
    throw new PaymentGatewayError(
      'provider_unreachable',
      `Tidak bisa terhubung ke ${label}. Coba lagi beberapa saat lagi.`,
      provider,
    )
  }
  let json: Record<string, unknown> = {}
  try {
    const parsed: unknown = await res.json()
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed))
      json = parsed as Record<string, unknown>
  } catch {
    /* body kosong / bukan JSON: ditangani pemanggil lewat status */
  }
  return { status: res.status, ok: res.ok, json }
}

export const asString = (v: unknown): string | undefined =>
  typeof v === 'string' && v !== '' ? v : undefined

export function parseAmount(v: unknown): number | null {
    const n = typeof v === 'number' ? v : typeof v === 'string' && v.trim() !== '' ? Number(v) : NaN
    return Number.isFinite(n) ? n : null
}

export function parseJsonObject(raw: string): Record<string, unknown> | null {
  try {
    const parsed: unknown = JSON.parse(raw)
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : null
  } catch {
    return null
  }
}
