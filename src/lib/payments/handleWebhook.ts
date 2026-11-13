import { getPayloadClient } from '@/lib/payload'
import type { Booking } from '@/payload-types'
import { notifyPaymentReceived } from '@/lib/bookingMail'
import { handleOrderPaymentEvent } from '@/shop/orders'
import { getProvider } from './registry'
import { isProviderId, type PaymentProviderId } from './types'

const json = (body: Record<string, unknown>, status = 200) =>
  Response.json(body, { status, headers: { 'Cache-Control': 'no-store' } })

/** Webhook: verify signature/token, then confirm the current status directly with the provider. */
export async function handlePaymentNotification(request: Request, rawProvider: string): Promise<Response> {
  if (!isProviderId(rawProvider)) return json({ error: 'Provider tidak dikenal.' }, 404)

  const providerId: PaymentProviderId = rawProvider
  const provider = getProvider(providerId)
  const rawBody = await request.text()
  if (rawBody.length > 64_000) return json({ error: 'Payload terlalu besar.' }, 413)

  const verified = provider.verifyWebhook({ headers: request.headers, rawBody }, process.env)
  if (!verified.ok) {
    const status = verified.reason === 'not_configured' ? 503 : verified.reason === 'bad_signature' ? 401 : 400
    return json({ error: `Notifikasi tidak valid (${verified.reason}).` }, status)
  }

  try {
    const event = await provider.confirmEvent(verified.event, { env: process.env, fetch })
    if (event.provider !== providerId || event.reference !== verified.event.reference || !event.providerTransactionId) {
      return json({ error: 'Konfirmasi transaksi provider tidak cocok.' }, 400)
    }

    if (event.reference.startsWith('ORD-')) {
      const found = await handleOrderPaymentEvent(await getPayloadClient(), event)
      return found ? json({ ok: true }) : json({ error: 'Pesanan untuk transaksi ini tidak ditemukan.' }, 404)
    }

    const payload = await getPayloadClient()
    const result = await payload.find({
      collection: 'bookings',
      where: { code: { equals: event.reference } },
      limit: 1,
      depth: 0,
      overrideAccess: true,
    })
    const booking = result.docs[0]
    if (!booking || booking.payment?.gateway !== providerId || booking.payment.reference !== event.reference) {
      return json({ error: 'Booking untuk transaksi ini tidak ditemukan.' }, 404)
    }
    if (event.amount === null || event.amount !== Number(booking.payment.amount)) {
      payload.logger.error({
        msg: `Nominal webhook payment tidak cocok untuk booking ${booking.code}`,
        expected: booking.payment.amount,
        received: event.amount,
      })
      return json({ error: 'Nominal transaksi tidak cocok.' }, 409)
    }

    // An out-of-order retry must not downgrade a payment that is already paid.
    const currentStatus = booking.payment.status
    const stalePending = currentStatus === 'paid' && !['paid', 'refunded', 'partially_refunded'].includes(event.status)
    if (stalePending) return json({ ok: true, ignored: 'stale_event' })

    const paymentStatus = event.status
    const data: Partial<Booking> = {
      payment: {
        ...booking.payment,
        gateway: providerId,
        reference: event.reference,
        amount: booking.payment.amount,
        status: paymentStatus,
        providerTransactionId: event.providerTransactionId,
        paidAt: paymentStatus === 'paid' ? (booking.payment.paidAt ?? new Date().toISOString()) : booking.payment.paidAt,
      },
    }

    const settings = await payload.findGlobal({ slug: 'booking-settings', depth: 0, overrideAccess: true })
    const updated = await payload.update({ collection: 'bookings', id: booking.id, data, overrideAccess: true })
    if (paymentStatus === 'paid' && currentStatus !== 'paid') void notifyPaymentReceived(payload, updated)

    // Payment state is committed first, so a capacity race cannot erase a verified payment.
    if (paymentStatus === 'paid' && settings.autoConfirm && booking.status === 'pending') {
      try {
        await payload.update({ collection: 'bookings', id: booking.id, data: { status: 'confirmed' }, overrideAccess: true })
      } catch (error) {
        payload.logger.error({ err: error, msg: `DP booking ${booking.code} sudah lunas; konfirmasi otomatis perlu ditinjau tim` })
      }
    } else if (paymentStatus === 'expired' && booking.status === 'pending') {
      try {
        await payload.update({ collection: 'bookings', id: booking.id, data: { status: 'expired' }, overrideAccess: true })
      } catch (error) {
        payload.logger.error({ err: error, msg: `Pembayaran booking ${booking.code} kedaluwarsa; pelepasan slot perlu ditinjau tim` })
      }
    }
    return json({ ok: true })
  } catch (error) {
    const payload = await getPayloadClient().catch(() => null)
    payload?.logger.error({ err: error, msg: `Gagal memproses notifikasi ${providerId}` })
    return json({ error: 'Notifikasi belum dapat diproses.' }, 500)
  }
}
