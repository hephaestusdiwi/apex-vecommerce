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

const ENV_SECRET_KEY = 'XENDIT_SECRET_KEY'
const ENV_CALLBACK_TOKEN = 'XENDIT_CALLBACK_TOKEN'
const INVOICES_URL = 'https://api.xendit.co/v2/invoices'
const LABEL = 'Xendit'

export function mapXenditStatus(status: unknown): PaymentStatus {
    switch (status) {
        case 'PENDING':
            return 'pending'
        case 'PAID':
        case 'SETTLED':
            return 'paid'
        case 'EXPIRED':
            return 'expired'
        default:
            return 'unknown'
    }
}

const eventKey = (invoiceId: string, status: string) => `xendit:${invoiceId}:${status}`

function secretKey(env: Env): string {
    const key = envValue(env, ENV_SECRET_KEY)
    if (!key)
        throw new PaymentGatewayError(
            'misconfigured',
            'Konfigurasi Xendit di server belum lengkap.',
            'xendit',
        )
    return key
}

export const xendit: PaymentProvider = {
  id: 'xendit',
  label: LABEL,
  requiredEnv: [ENV_SECRET_KEY, ENV_CALLBACK_TOKEN],

  missingConfig(env) {
    return [ENV_SECRET_KEY, ENV_CALLBACK_TOKEN].filter((name) => !envValue(env, name))
  },

  async createPayment(input: CreatePaymentInput, ctx: ProviderContext): Promise<CreatedPayment> {
    assertValidInput(input, 'xendit')
    const key = secretKey(ctx.env)

    const body = {
      external_id: input.reference,
      amount: input.amount,
      currency: 'IDR',
      description: input.description,
      customer: { given_names: input.customer.name, email: input.customer.email },
      ...(input.returnUrl
        ? { success_redirect_url: input.returnUrl, failure_redirect_url: input.returnUrl }
        : {}),
      ...(input.expiresInMinutes ? { invoice_duration: input.expiresInMinutes * 60 } : {}), // detik
    }

    const res = await callProvider(ctx.fetch, 'xendit', LABEL, INVOICES_URL, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        Authorization: basicAuth(key),
      },
      body: JSON.stringify(body),
    })

    if (!res.ok) {
      if (res.status === 401 || res.status === 403) {
        throw new PaymentGatewayError(
          'provider_rejected',
          'Xendit menolak kredensial. Periksa XENDIT_SECRET_KEY dan izin Write untuk produk Money-In.',
          'xendit',
        )
      }
      const detail = asString(res.json.message)
      throw new PaymentGatewayError(
        'provider_rejected',
        `Xendit menolak permintaan pembayaran${detail ? `: ${detail}` : '.'}`,
        'xendit',
      )
    }

    const id = asString(res.json.id)
    const checkoutUrl = asString(res.json.invoice_url)
    if (!id || !checkoutUrl)
      throw new PaymentGatewayError(
        'provider_bad_response',
        'Respons Xendit tidak berisi id atau invoice_url.',
        'xendit',
      )

    return {
      provider: 'xendit',
      reference: input.reference,
      providerTransactionId: id,
      checkoutUrl,
      expiresAt: asString(res.json.expiry_date) ?? null,
    }
  },

  verifyWebhook(req: WebhookRequest, env: Env): WebhookVerification {
    const token = envValue(env, ENV_CALLBACK_TOKEN)
    if (!token) return { ok: false, reason: 'not_configured' } // gagal tertutup: token kosong tidak boleh cocok dengan header kosong

    const received = req.headers.get('x-callback-token')
    if (!received || !safeEqual(received, token)) return { ok: false, reason: 'bad_signature' }

    const n = parseJsonObject(req.rawBody)
    if (!n || 'event' in n) return { ok: false, reason: 'malformed' } // hanya callback invoice yang ditangani

    const id = asString(n.id)
    const externalId = asString(n.external_id)
    const status = asString(n.status)
    if (!id || !externalId || !status) return { ok: false, reason: 'malformed' }

    return {
      ok: true,
      event: {
        provider: 'xendit',
        reference: externalId,
        providerTransactionId: id,
        status: mapXenditStatus(status),
        rawStatus: status,
        amount: parseAmount(n.paid_amount ?? n.amount),
        eventKey: eventKey(id, status),
      },
    }
  },

  async confirmEvent(event: PaymentEvent, ctx: ProviderContext): Promise<PaymentEvent> {
    const key = secretKey(ctx.env)
    const res = await callProvider(
      ctx.fetch,
      'xendit',
      LABEL,
      `${INVOICES_URL}/${encodeURIComponent(event.providerTransactionId)}`,
      {
        method: 'GET',
        headers: { Accept: 'application/json', Authorization: basicAuth(key) },
      },
    )

    if (!res.ok) {
      throw new PaymentGatewayError(
        'provider_rejected',
        `Xendit tidak mengembalikan invoice ${event.providerTransactionId}.`,
        'xendit',
      )
    }
    if (
      asString(res.json.id) !== event.providerTransactionId ||
      asString(res.json.external_id) !== event.reference
    ) {
      throw new PaymentGatewayError(
        'provider_bad_response',
        'Respons invoice Xendit tidak cocok dengan transaksi yang diminta.',
        'xendit',
      )
    }
    const status = asString(res.json.status)
    if (!status)
      throw new PaymentGatewayError(
        'provider_bad_response',
        'Respons invoice Xendit tidak berisi status.',
        'xendit',
      )

    return {
      provider: 'xendit',
      reference: event.reference,
      providerTransactionId: event.providerTransactionId,
      status: mapXenditStatus(status),
      rawStatus: status,
      amount: parseAmount(res.json.paid_amount ?? res.json.amount),
      eventKey: eventKey(event.providerTransactionId, status),
    }
  },
}
