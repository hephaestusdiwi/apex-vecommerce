import { createHash } from 'node:crypto'
import { 
    PaymentGatewayError,
    type CreatedPayment,
    type CreatePaymentInput,
    type Env,
    type PaymentEvent,
    type PaymentProvider,
    type PaymentStatus,
    type ProviderContext,
    type WebhookRequest,
    type WebhookVerification,
} from '../types'
import {
    asString,
    assertValidInput,
    basicAuth,
    callProvider,
    envValue,
    parseAmount,
    parseJsonObject,
    safeEqual,
} from '../support'

/**
 * Midtrans Snap (redirect). Rujukan resmi (docs.midtrans.com):
 * - Snap: POST {app.sandbox.midtrans.com|app.midtrans.com}/snap/v1/transactions, Basic auth (Server Key sebagai username, password kosong)
 * - Notifikasi: signature_key = SHA512(order_id + status_code + gross_amount + ServerKey)
 * - Status API: GET {api.sandbox.midtrans.com|api.midtrans.com}/v2/{order_id}/status
 * - Pembayaran sukses = status_code 200 + fraud_status accept + transaction_status settlement/capture
 */

const ENV_SERVER_KEY = 'MIDTRANS_SERVER_KEY'
const ENV_IS_PRODUCTION = 'MIDTRANS_IS_PRODUCTION'

const SNAP_URL = {
    sandbox: 'https://app.sandbox.midtrans.com/snap/v1/transactions',
    production: 'https://app.midtrans.com/snap/v1/transactions',
}

const API_URL = {
    sandbox: 'https://api.sandbox.midtrans.com',
    production: 'https://api.midtrans.com',
}

const LABEL = 'Midtrans'

function mode(env: Env): 'sandbox' | 'production' | undefined {
  const v = envValue(env, ENV_IS_PRODUCTION)
  return v === 'true' ? 'production' : v === 'false' ? 'sandbox' : undefined
}

function credentials(env: Env): { serverKey: string; mode: 'sandbox' | 'production' } {
    const serverKey = envValue(env, ENV_SERVER_KEY)
    const m = mode(env)
    if (!serverKey || !m)
        throw new PaymentGatewayError(
            'misconfigured',
            'Konfigurasi Midtrans di server belum lengkap.',
            'midtrans',
            )
        return { serverKey, mode: m }
}

export function mapMidtransStatus(
  transactionStatus: unknown,
  fraudStatus: unknown,
  statusCode: unknown,
): PaymentStatus {
    const ts = typeof transactionStatus === 'string' ? transactionStatus : ''
    const fraud = typeof fraudStatus === 'string' ? fraudStatus : ''
    if (fraud === 'deny') return 'failed'
    switch (ts) {
        case 'capture':
        case 'settlement':
            return (!fraud || fraud === 'accept') && String(statusCode) === '200' ? 'paid' : 'unknown'
        case 'pending':
        case 'authorize':
            return 'pending'
        case 'deny':
        case 'failure':
            return 'failed'
        case 'cancel':
            return 'cancelled'
        case 'expire':
            return 'expired'
        case 'refund':
            return 'refunded'
        case 'partial_refund':
            return 'partially_refunded'
        default:
            return 'unknown'
    }
}

const eventKey = (
  transactionId: string,
  transactionStatus: string,
  fraudStatus: string | undefined,
) => `midtrans:${transactionId}:${transactionStatus}:${fraudStatus ?? '-'}`

export const midtrans: PaymentProvider = {
  id: 'midtrans',
  label: LABEL,
  requiredEnv: [ENV_SERVER_KEY, ENV_IS_PRODUCTION],

  missingConfig(env) {
    const problems: string[] = []
    if (!envValue(env, ENV_SERVER_KEY)) problems.push(ENV_SERVER_KEY)
    if (!mode(env)) problems.push(`${ENV_IS_PRODUCTION} (isi "true" atau "false")`)
    return problems
  },

  async createPayment(input: CreatePaymentInput, ctx: ProviderContext): Promise<CreatedPayment> {
    assertValidInput(input, 'midtrans')
    const { serverKey, mode: m } = credentials(ctx.env)

    const body = {
      transaction_details: { order_id: input.reference, gross_amount: input.amount },
      customer_details: {
        first_name: input.customer.name,
        email: input.customer.email,
        ...(input.customer.phone ? { phone: input.customer.phone } : {}),
      },
      ...(input.returnUrl ? { callbacks: { finish: input.returnUrl } } : {}),
      ...(input.expiresInMinutes
        ? { expiry: { unit: 'minutes', duration: input.expiresInMinutes } }
        : {}),
    }

    const res = await callProvider(ctx.fetch, 'midtrans', LABEL, SNAP_URL[m], {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        Authorization: basicAuth(serverKey),
      },
      body: JSON.stringify(body),
    })

    if (!res.ok) {
      if (res.status === 401) {
        throw new PaymentGatewayError(
          'provider_rejected',
          'Midtrans menolak kredensial. Periksa MIDTRANS_SERVER_KEY dan mode MIDTRANS_IS_PRODUCTION (sandbox/production harus sesuai kunci).',
          'midtrans',
        )
      }
      const detail = Array.isArray(res.json.error_messages)
        ? res.json.error_messages.filter((x) => typeof x === 'string').join('; ')
        : ''
      throw new PaymentGatewayError(
        'provider_rejected',
        `Midtrans menolak permintaan pembayaran${detail ? `: ${detail}` : '.'}`,
        'midtrans',
      )
    }

    const checkoutUrl = asString(res.json.redirect_url)
    if (!checkoutUrl)
      throw new PaymentGatewayError(
        'provider_bad_response',
        'Respons Midtrans tidak berisi redirect_url.',
        'midtrans',
      )

    return {
      provider: 'midtrans',
      reference: input.reference,
      providerTransactionId: null,
      checkoutUrl,
      expiresAt: null,
    }
  },

  verifyWebhook(req: WebhookRequest, env: Env): WebhookVerification {
    const serverKey = envValue(env, ENV_SERVER_KEY)
    if (!serverKey) return { ok: false, reason: 'not_configured' }

    const n = parseJsonObject(req.rawBody)
    if (!n) return { ok: false, reason: 'malformed' }

    const orderId = asString(n.order_id)
    const statusCode = asString(n.status_code)
    const grossAmount = asString(n.gross_amount)
    const signature = asString(n.signature_key)
    const transactionStatus = asString(n.transaction_status)
    const transactionId = asString(n.transaction_id)
    if (
      !orderId ||
      !statusCode ||
      !grossAmount ||
      !signature ||
      !transactionStatus ||
      !transactionId
    ) {
      return { ok: false, reason: 'malformed' }
    }

    const expected = createHash('sha512')
      .update(orderId + statusCode + grossAmount + serverKey)
      .digest('hex')
    if (!safeEqual(signature.toLowerCase(), expected)) return { ok: false, reason: 'bad_signature' }

    const fraud = asString(n.fraud_status)
    return {
      ok: true,
      event: {
        provider: 'midtrans',
        reference: orderId,
        providerTransactionId: transactionId,
        status: mapMidtransStatus(transactionStatus, fraud, statusCode),
        rawStatus: transactionStatus,
        amount: parseAmount(grossAmount),
        eventKey: eventKey(transactionId, transactionStatus, fraud),
      },
    }
  },

  async confirmEvent(event: PaymentEvent, ctx: ProviderContext): Promise<PaymentEvent> {
    const { serverKey, mode: m } = credentials(ctx.env)
    const res = await callProvider(
      ctx.fetch,
      'midtrans',
      LABEL,
      `${API_URL[m]}/v2/${encodeURIComponent(event.reference)}/status`,
      {
        method: 'GET',
        headers: { Accept: 'application/json', Authorization: basicAuth(serverKey) },
      },
    )

    // Dokumen resmi: error 404 bisa datang di body (status_code "404") walau HTTP 200.
    if (!res.ok || String(res.json.status_code) === '404') {
      throw new PaymentGatewayError(
        'provider_rejected',
        `Midtrans tidak mengembalikan status untuk transaksi ${event.reference}.`,
        'midtrans',
      )
    }
    if (asString(res.json.order_id) !== event.reference) {
      throw new PaymentGatewayError(
        'provider_bad_response',
        'Respons status Midtrans tidak cocok dengan transaksi yang diminta.',
        'midtrans',
      )
    }

    const transactionStatus = asString(res.json.transaction_status)
    if (!transactionStatus)
      throw new PaymentGatewayError(
        'provider_bad_response',
        'Respons status Midtrans tidak berisi transaction_status.',
        'midtrans',
      )
    const fraud = asString(res.json.fraud_status)
    const transactionId = asString(res.json.transaction_id) ?? event.providerTransactionId

    return {
      provider: 'midtrans',
      reference: event.reference,
      providerTransactionId: transactionId,
      status: mapMidtransStatus(transactionStatus, fraud, res.json.status_code),
      rawStatus: transactionStatus,
      amount: parseAmount(res.json.gross_amount),
      eventKey: eventKey(transactionId, transactionStatus, fraud),
    }
  },
}
