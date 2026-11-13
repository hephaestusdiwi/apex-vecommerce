import { getProvider } from './registry'
import { assertValidInput } from './support'
import {
  isGatewaySetting,
  isProviderId,
  PaymentGatewayError,
  type CreatedPayment,
  type CreatePaymentInput,
  type Env,
  type FetchLike,
  type PaymentErrorCode,
  type PaymentProviderId,
} from './types'

export type GatewayResolution =
  | { status: 'disabled' }
  | { status: 'invalid_setting'; message: string }
  | { status: 'misconfigured'; provider: PaymentProviderId; problems: string[]; message: string }
  | { status: 'ready'; provider: PaymentProviderId }

/**
 * Ubah nilai pengaturan admin menjadi keputusan: nonaktif / siap / konfigurasi server kurang.
 * Nilai tak dikenal TIDAK pernah dialihkan diam-diam ke provider lain.
 */
export function resolveGateway(setting: unknown, env: Env = process.env): GatewayResolution {
  if (setting === undefined || setting === null || setting === 'none') return { status: 'disabled' }

  if (!isGatewaySetting(setting) || !isProviderId(setting)) {
    return {
      status: 'invalid_setting',
      message:
        'Pengaturan payment gateway tidak dikenali. Buka Pengaturan Booking dan pilih ulang gateway.',
    }
  }

  const provider = getProvider(setting)
  const problems = provider.missingConfig(env)
  if (problems.length > 0) {
    return {
      status: 'misconfigured',
      provider: setting,
      problems,
      message: `Payment gateway ${provider.label} dipilih di Pengaturan Booking, tetapi konfigurasi server belum lengkap: ${problems.join(', ')}. Isi environment variable tersebut di server lalu restart aplikasi.`,
    }
  }
  return { status: 'ready', provider: setting }
}

export type CreatePaymentResult =
  | { ok: true; payment: CreatedPayment }
  | { ok: false; code: PaymentErrorCode; message: string; provider?: PaymentProviderId }

export type GatewayDeps = {
  /** Bawaan: baca dari global booking-settings. */
  getSetting?: () => Promise<unknown>
  env?: Env
  fetch?: FetchLike
}

/**
 * Satu-satunya pintu untuk membuat pembayaran. Alur booking memanggil fungsi ini tanpa tahu provider mana yang aktif.
 * Jika gateway nonaktif atau konfigurasi kurang, TIDAK ada panggilan jaringan dan TIDAK ada transaksi yang dibuat.
 */
export async function createGatewayPayment(
  input: CreatePaymentInput,
  deps: GatewayDeps = {},
): Promise<CreatePaymentResult> {
  const env = deps.env ?? process.env
  const getSetting =
    deps.getSetting ?? (async () => (await import('./settings')).readGatewaySetting())

  const resolution = resolveGateway(await getSetting(), env)
  switch (resolution.status) {
    case 'disabled':
      return { ok: false, code: 'disabled', message: 'Payment gateway nonaktif.' }
    case 'invalid_setting':
      return { ok: false, code: 'invalid_setting', message: resolution.message }
    case 'misconfigured':
      return {
        ok: false,
        code: 'misconfigured',
        message: resolution.message,
        provider: resolution.provider,
      }
    case 'ready':
      break
  }

  const provider = getProvider(resolution.provider)
  try {
    assertValidInput(input, provider.id)
    const payment = await provider.createPayment(input, { env, fetch: deps.fetch ?? fetch })
    return { ok: true, payment }
  } catch (err) {
    if (err instanceof PaymentGatewayError)
      return { ok: false, code: err.code, message: err.message, provider: err.provider }
    throw err
  }
}
