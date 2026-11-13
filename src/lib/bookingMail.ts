import type { Payload } from 'payload'
import type { Booking } from '@/payload-types'
import { SITE_URL } from '@/lib/seo'
import { formatDateId } from '@/lib/dateFormat'
import { escapeHtml, oneLine } from '@/lib/mail'

export type ClientMailKind = 'received' | 'confirmed' | 'rejected' | 'cancelled' | 'expired' | 'reminder'

const COPY: Record<ClientMailKind, { subject: string; lead: string }> = {
  received: { subject: 'Booking diterima', lead: 'Permintaan booking kamu sudah kami terima dan menunggu konfirmasi tim.' },
  confirmed: { subject: 'Booking dikonfirmasi', lead: 'Booking kamu sudah dikonfirmasi. Sampai jumpa di tanggal tersebut.' },
  rejected: { subject: 'Booking tidak dapat diproses', lead: 'Mohon maaf, kami belum bisa memproses booking ini.' },
  cancelled: { subject: 'Booking dibatalkan', lead: 'Booking kamu sudah dibatalkan.' },
  reminder: { subject: 'Pengingat booking besok', lead: 'Pengingat: booking kamu dijadwalkan besok.' },
  expired: {
    subject: 'Booking kedaluwarsa',
    lead: 'Booking kamu belum sempat dikonfirmasi dan slot tanggalnya sudah kami lepas. Kamu bisa membuat booking baru kapan saja.',
  },
}

const statusUrl = (b: Booking) => `${SITE_URL}/booking/${b.code}?token=${b.accessToken ?? ''}`

export function sendClientMail(payload: Payload, b: Booking, kind: ClientMailKind) {
  const { subject } = COPY[kind]
  const depositPercent = b.payment?.percent ?? 50
  const lead = kind === 'received' && b.payment?.gateway
    ? `Permintaan booking kamu sudah kami terima. Selesaikan pembayaran DP minimum ${depositPercent}% melalui tautan pembayaran berikut.`
    : COPY[kind].lead
  const note = kind === 'confirmed' || kind === 'rejected' || kind === 'cancelled' ? (b.statusNote ?? '').trim() : ''
  const date = formatDateId(b.date)

  const text = [
    `Halo ${b.name},`, '', lead, '',
    `Kode booking: ${b.code}`, `Paket: ${b.packageTitle ?? ''}`, `Tanggal: ${date}`,
    ...(kind === 'received' && b.payment?.gateway ? [`DP ${depositPercent}%: Rp${Number(b.payment.amount ?? 0).toLocaleString('id-ID')}`, `Tautan pembayaran: ${b.payment.checkoutUrl ?? ''}`] : []),
    ...(note ? ['', `Pesan dari tim: ${note}`] : []),
    '', `Status booking: ${statusUrl(b)}`,
  ].join('\n')

  const html = `
    <p>Halo ${escapeHtml(b.name)},</p>
    <p>${escapeHtml(lead)}</p>
    <p>Kode booking: <strong>${escapeHtml(b.code)}</strong><br />
    Paket: ${escapeHtml(b.packageTitle ?? '')}<br />
    Tanggal: ${escapeHtml(date)}</p>
    ${kind === 'received' && b.payment?.gateway ? `<p>DP ${depositPercent}%: <strong>Rp${Number(b.payment.amount ?? 0).toLocaleString('id-ID')}</strong></p><p><a href="${escapeHtml(b.payment.checkoutUrl ?? '')}">Bayar DP</a></p>` : ''}
    ${note ? `<p>Pesan dari tim:<br />${escapeHtml(note).replace(/\n/g, '<br />')}</p>` : ''}
    <p><a href="${escapeHtml(statusUrl(b))}">Lihat status booking</a></p>
  `

  // Sengaja tidak di-await: email tidak boleh menahan simpan/commit.
  payload
    .sendEmail({ to: b.email, subject: oneLine(`[${b.code}] ${subject}`), text, html })
    .catch((err: unknown) => payload.logger.error({ err, msg: `Gagal mengirim email booking ${b.code}` }))
}

async function staffRecipients(payload: Payload): Promise<string[]> {
  const s = await payload.findGlobal({ slug: 'booking-settings', depth: 0 })
  let to = (s.recipients ?? []).map((r) => r.email).filter(Boolean)
  if (to.length === 0) {
    const c = await payload.findGlobal({ slug: 'contact-settings', depth: 0 })
    to = (c.recipients ?? []).map((r) => r.email).filter(Boolean)
  }
  return to
}

/** Dipanggil SETELAH booking ter-commit: email ke client + ke tim. */
export async function notifyBookingCreated(payload: Payload, b: Booking) {
  try {
    sendClientMail(payload, b, b.status === 'confirmed' ? 'confirmed' : 'received')

    const to = await staffRecipients(payload)
    if (to.length === 0) {
      payload.logger.warn('Booking baru masuk, tapi belum ada email penerima di Pengaturan Booking/Kontak.')
      return
    }
    const date = formatDateId(b.date)
    const adminUrl = `${SITE_URL}/admin/collections/bookings/${b.id}`

    payload
      .sendEmail({
        to,
        replyTo: b.email,
        subject: oneLine(`[Booking] ${b.code} · ${b.packageTitle ?? ''} · ${b.date}`),
        text: [
          `Booking baru (${b.payment?.gateway ? `menunggu pembayaran DP ${b.payment.percent ?? 50}%` : b.status === 'confirmed' ? 'otomatis dikonfirmasi' : 'menunggu konfirmasi'})`, '',
          `Kode: ${b.code}`, `Paket: ${b.packageTitle ?? ''}`, `Tanggal: ${date}`,
          ...(b.payment?.gateway ? [`DP ${b.payment.percent ?? 50}%: Rp${Number(b.payment.amount ?? 0).toLocaleString('id-ID')}`, `Pembayaran: ${b.payment.status ?? 'pending'}`] : []),
          `Nama: ${b.name}`, `Email: ${b.email}`, `WhatsApp: ${b.phone}`,
          ...(b.notes ? ['', `Catatan: ${b.notes}`] : []),
          '', `Buka di admin: ${adminUrl}`,
        ].join('\n'),
        html: `
          <p><strong>Booking baru</strong> (${b.payment?.gateway ? `menunggu pembayaran DP ${b.payment.percent ?? 50}%` : b.status === 'confirmed' ? 'otomatis dikonfirmasi' : 'menunggu konfirmasi'})</p>
          <p>Kode: <strong>${escapeHtml(b.code)}</strong><br />
          Paket: ${escapeHtml(b.packageTitle ?? '')}<br />
          Tanggal: ${escapeHtml(date)}<br />
          ${b.payment?.gateway ? `DP ${b.payment.percent ?? 50}%: Rp${Number(b.payment.amount ?? 0).toLocaleString('id-ID')}<br />Pembayaran: ${escapeHtml(b.payment.status ?? 'pending')}<br />` : ''}
          Nama: ${escapeHtml(b.name)}<br />
          Email: ${escapeHtml(b.email)}<br />
          WhatsApp: ${escapeHtml(b.phone)}</p>
          ${b.notes ? `<p style="white-space:pre-wrap">${escapeHtml(b.notes)}</p>` : ''}
          <p><a href="${escapeHtml(adminUrl)}">Buka di admin</a></p>
        `,
      })
      .catch((err: unknown) => payload.logger.error({ err, msg: `Gagal mengirim email staff untuk ${b.code}` }))
  } catch (err) {
    payload.logger.error({ err, msg: 'Gagal menyiapkan email booking' })
  }
}

/** Notify the team after the payment provider confirms the configured deposit. */
export async function notifyPaymentReceived(payload: Payload, b: Booking) {
  try {
    const to = await staffRecipients(payload)
    if (to.length === 0) return
    const adminUrl = `${SITE_URL}/admin/collections/bookings/${b.id}`
    const amount = Number(b.payment?.amount ?? 0).toLocaleString('id-ID')
    const percent = b.payment?.percent ?? 50
    payload
      .sendEmail({
        to,
        replyTo: b.email,
        subject: oneLine(`[Pembayaran DP diterima] ${b.code} · ${b.packageTitle ?? ''}`),
        text: [
          `DP ${percent}% booking ${b.code} sudah terverifikasi.`,
          `Nominal: Rp${amount}`,
          `Paket: ${b.packageTitle ?? ''}`,
          `Tanggal: ${formatDateId(b.date)}`,
          `Nama: ${b.name}`,
          `Buka di admin: ${adminUrl}`,
        ].join('\n'),
        html: `<p>DP ${percent}% booking <strong>${escapeHtml(b.code)}</strong> sudah terverifikasi.</p>
          <p>Nominal: <strong>Rp${amount}</strong><br />Paket: ${escapeHtml(b.packageTitle ?? '')}<br />
          Tanggal: ${escapeHtml(formatDateId(b.date))}<br />Nama: ${escapeHtml(b.name)}</p>
          <p><a href="${escapeHtml(adminUrl)}">Buka booking di admin</a></p>`,
      })
      .catch((err: unknown) => payload.logger.error({ err, msg: `Gagal mengirim notifikasi pembayaran booking ${b.code}` }))
  } catch (err) {
    payload.logger.error({ err, msg: `Gagal menyiapkan notifikasi pembayaran booking ${b.code}` })
  }
}

export async function notifyCancelledByClient(payload: Payload, b: Booking) {
  try {
    const to = await staffRecipients(payload)
    if (to.length === 0) return
    const adminUrl = `${SITE_URL}/admin/collections/bookings/${b.id}`
    payload
      .sendEmail({
        to,
        subject: oneLine(`[Booking] DIBATALKAN client · ${b.code} · ${b.date}`),
        text: `Client membatalkan booking ${b.code}\nPaket: ${b.packageTitle ?? ''}\nTanggal: ${formatDateId(b.date)}\nNama: ${b.name}\nWhatsApp: ${b.phone}\n\nAdmin: ${adminUrl}`,
        html: `<p>Client membatalkan booking <strong>${escapeHtml(b.code)}</strong>.</p>
          <p>Paket: ${escapeHtml(b.packageTitle ?? '')}<br />Tanggal: ${escapeHtml(formatDateId(b.date))}<br />
          Nama: ${escapeHtml(b.name)}<br />WhatsApp: ${escapeHtml(b.phone)}</p>
          <p><a href="${escapeHtml(adminUrl)}">Buka di admin</a></p>`,
      })
      .catch((err: unknown) => payload.logger.error({ err, msg: `Gagal mengirim email pembatalan ${b.code}` }))
  } catch (err) {
    payload.logger.error({ err, msg: 'Gagal menyiapkan email pembatalan' })
  }
}
