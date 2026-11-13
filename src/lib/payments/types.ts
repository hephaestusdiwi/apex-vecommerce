/**
 * Tipe bersama lapisan payment gateway.
 * File ini TIDAK boleh membaca environment variable: dipakai juga oleh konfigurasi Payload (BookingSettings).
 */

export const PAYMENT_PROVIDER_IDS = ['midtrans', 'xendit'] as const
export type PaymentProviderId = (typeof PAYMENT_PROVIDER_IDS)[number]

/** Nilai pengaturan admin. Satu nilai = satu gateway aktif; 'none' = alur booking tanpa pembayaran online. */
export const GATEWAY_SETTING_VALUES = ['none', ...PAYMENT_PROVIDER_IDS] as const
export type GatewaySetting = (typeof GATEWAY_SETTING_VALUES)[number]

export const isProviderId = (v: unknown): v is PaymentProviderId =>
  typeof v === 'string' && (PAYMENT_PROVIDER_IDS as readonly string[]).includes(v)

export const isGatewaySetting = (v: unknown): v is GatewaySetting =>
  typeof v === 'string' && (GATEWAY_SETTING_VALUES as readonly string[]).includes(v)

/** Status internal yang sudah dinormalkan. Status mentah provider disimpan terpisah (rawStatus). */
export type PaymentStatus =
  | 'pending'
  | 'paid'
  | 'failed'
  | 'expired'
  | 'cancelled'
  | 'partially_refunded'
  | 'refunded'
  | 'unknown' // status tidak dikenali / tidak cukup bukti: JANGAN dianggap lunas

export type Env = Readonly<Record<string, string | undefined>>
export type FetchLike = (input: string, init?: RequestInit) => Promise<Response>
export type ProviderContext = { env: Env; fetch: FetchLike }

export type CreatePaymentInput = {
  /** ID transaksi dari sisi kita (order_id Midtrans / external_id Xendit). Unik per percobaan bayar. */
  reference: string
  /** Rupiah, bilangan bulat > 0. */
  amount: number
  description: string
  customer: { name: string; email: string; phone?: string }
  /** Halaman tujuan setelah bayar. Hanya UX: status pembayaran TIDAK PERNAH dibaca dari redirect ini. */
  returnUrl?: string
  expiresInMinutes?: number
}

export type CreatedPayment = {
  provider: PaymentProviderId
  reference: string
  /** Xendit memberi ID invoice saat dibuat; Midtrans baru memberi transaction_id lewat notifikasi/Status API. */
  providerTransactionId: string | null
  checkoutUrl: string
  expiresAt: string | null
}

export type PaymentEvent = {
  provider: PaymentProviderId
  reference: string
  providerTransactionId: string
  status: PaymentStatus
  rawStatus: string
  /** Rupiah menurut provider; pemanggil wajib mencocokkan dengan nominal yang ditagihkan. */
  amount: number | null
  /** Kunci idempotensi: event dengan kunci sama = event yang sama (retry provider). */
  eventKey: string
}

export type WebhookRequest = {
  headers: { get(name: string): string | null }
  rawBody: string
}

export type WebhookVerification =
  | { ok: true; event: PaymentEvent }
  | { ok: false; reason: 'not_configured' | 'bad_signature' | 'malformed' }

export type PaymentErrorCode =
  | 'disabled'
  | 'invalid_setting'
  | 'misconfigured'
  | 'invalid_input'
  | 'provider_rejected'
  | 'provider_unreachable'
  | 'provider_bad_response'

export class PaymentGatewayError extends Error {
  constructor(
    public readonly code: PaymentErrorCode,
    message: string,
    public readonly provider?: PaymentProviderId,
  ) {
    super(message)
    this.name = 'PaymentGatewayError'
  }
}

export interface PaymentProvider {
  readonly id: PaymentProviderId
  readonly label: string
  /** Daftar environment variable wajib (hanya nama, untuk pesan error dan dokumentasi). */
  readonly requiredEnv: readonly string[]
  /** Kosong = konfigurasi lengkap. Isi = deskripsi variabel yang belum ada/tidak valid (tanpa nilai rahasia). */
  missingConfig(env: Env): string[]
  createPayment(input: CreatePaymentInput, ctx: ProviderContext): Promise<CreatedPayment>
  /** Verifikasi keaslian notifikasi. Tidak memanggil jaringan. */
  verifyWebhook(req: WebhookRequest, env: Env): WebhookVerification
  /** Ambil status resmi dari API provider; isi notifikasi saja tidak dipercaya untuk menentukan lunas. */
  confirmEvent(event: PaymentEvent, ctx: ProviderContext): Promise<PaymentEvent>
}
