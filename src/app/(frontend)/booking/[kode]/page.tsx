import type { Metadata } from 'next'
import { headers } from 'next/headers'
import { notFound } from 'next/navigation'
import { CancelButton } from '@/components/booking/CancelButton'
import { canClientCancel, findBookingByToken } from '@/lib/bookingAccess'
import { formatDateId } from '@/lib/dateFormat'
import { getPayloadClient } from '@/lib/payload'
import { rateLimit } from '@/lib/rateLimit'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
    title: 'Status booking',
    robots: { index: false },
    referrer: 'no-referrer'
}

const STATUS: Record<string, { label: string; hint: string }> = {
    pending: {
        label: 'Menunggu konfirmasi',
        hint: 'Tim akan menghubungi kamu lewat Whatsapp atau Email'
    },
    confirmed: {
        label: 'Dikonfirmasi',
        hint: 'Sampai jumpa di tanggal tersebut'
    },
    rejected: {
        label: 'Tidak dapat diproses',
        hint: 'Silahkan buat booking baru dengan tanggal lain'
    },
    cancelled: {
        label: 'Dibatalkan',
        hint: ''
    },
    expired: {
        label: 'Kedaluwarsa',
        hint: 'Slot sudah dilepas, silahkan buat booking baru'
    },
    completed: {
        label: 'Selesai',
        hint: 'Terima kasih'
    },
}

const PAYMENT_STATUS: Record<string, string> = {
  pending: 'Menunggu pembayaran DP',
  paid: 'DP terverifikasi lunas',
  failed: 'Pembayaran gagal',
  expired: 'Pembayaran kedaluwarsa',
  cancelled: 'Pembayaran dibatalkan',
  partially_refunded: 'Dikembalikan sebagian',
  refunded: 'Dikembalikan',
  unknown: 'Status pembayaran belum diketahui',
}

export default async function BookingStatusPage({
    params,
    searchParams,
}: {
    params: Promise<{ kode: string }>
    searchParams: Promise<{ token?: string}>
}) {
    const [{ kode }, { token }] = await Promise.all([params, searchParams])

    const h = await headers()
    const ip = h.get('x-forwared-for')?.split(',')[0]?.trim() || h.get('x-real-ip') ||  'unknown'
    if (!rateLimit(`status:${ip}`, 30, 60_000)) notFound()

    const payload = await getPayloadClient()
    const b = await findBookingByToken(payload, kode, typeof token === 'string' ? token : '')
    if (!b) notFound()

    const s = STATUS[b.status] ?? { label: b.status, hint: '' }
    const note = ['confirmed', 'rejected', 'cancelled'].includes(b.status) ? (b.statusNote ?? '').trim() : ''

    return (
    <section className="mx-auto w-full max-w-7xl px-5 pt-28 pb-24 md:px-10 md:pt-36">
      <p className="text-xs text-mute">Kode booking</p>
      <h1 className="text-3xl tracking-widest">{b.code}</h1>

      <p data-testid="booking-status" className="mt-8 text-lg">{s.label}</p>
      {s.hint ? <p className="mt-2 text-sm text-mute">{s.hint}</p> : null}

      <dl className="mt-10 grid max-w-xl gap-3 text-sm sm:grid-cols-[8rem_1fr]">
        <dt className="text-mute">Paket</dt><dd>{b.packageTitle}</dd>
        <dt className="text-mute">Tanggal</dt><dd>{formatDateId(b.date)}</dd>
        <dt className="text-mute">Nama</dt><dd>{b.name}</dd>
        {note ? (<><dt className="text-mute">Pesan tim</dt><dd className="whitespace-pre-wrap">{note}</dd></>) : null}
      </dl>

      {b.payment?.gateway ? (
        <div className="mt-10 max-w-xl border-t border-mute/30 pt-6">
          <h2 className="text-sm">Pembayaran DP {b.payment.percent ?? 50}%</h2>
          <p className="mt-2 text-sm">Rp{Number(b.payment.amount ?? 0).toLocaleString('id-ID')} · {PAYMENT_STATUS[b.payment.status ?? 'pending'] ?? 'Status tidak diketahui'}</p>
          {b.status === 'pending' && b.payment.status === 'pending' && b.payment.checkoutUrl ? (
            <a className="mt-4 inline-block text-sm underline underline-offset-[6px]" href={b.payment.checkoutUrl} rel="noreferrer">Lanjutkan pembayaran</a>
          ) : null}
          {b.payment.status === 'paid' && b.status === 'pending' ? (
            <p className="mt-2 text-xs text-mute">DP sudah diterima. Booking menunggu konfirmasi tim.</p>
          ) : null}
        </div>
      ) : null}

      {canClientCancel(b) ? <CancelButton code={b.code} token={token ?? ''} /> : null}
    </section>
  )
}
