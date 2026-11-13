import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { getPayloadClient } from '@/lib/payload'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = { title: 'Status pesanan', robots: { index: false }, referrer: 'no-referrer' }

const LABELS: Record<string, string> = {
  pending: 'Menunggu pembayaran', paid: 'Pembayaran diterima', processing: 'Pesanan diproses',
  shipped: 'Pesanan dikirim', completed: 'Pesanan selesai', cancelled: 'Pesanan dibatalkan', expired: 'Pesanan kedaluwarsa',
}

export default async function OrderStatusPage({ params, searchParams }: {
  params: Promise<{ code: string }>; searchParams: Promise<{ token?: string }>
}) {
  const [{ code }, { token }] = await Promise.all([params, searchParams])
  if (!token) notFound()
  const payload = await getPayloadClient()
  const result = await payload.find({
    collection: 'orders', where: { and: [{ code: { equals: code } }, { accessToken: { equals: token } }] },
    limit: 1, depth: 0, overrideAccess: true,
  })
  const order = result.docs[0]
  if (!order) notFound()
  return <main className="mx-auto max-w-3xl px-6 py-16">
    <p className="text-sm text-mute">Pesanan {order.code}</p>
    <h1 className="mt-2 text-3xl font-semibold">{order.payment?.status === 'failed' ? 'Pembayaran gagal' : LABELS[order.status] ?? order.status}</h1>
    <p className="mt-3 text-sm">Total: Rp{Number(order.total).toLocaleString('id-ID')}</p>
    <ul className="mt-8 divide-y divide-line border-y border-line">
      {(order.items ?? []).map((item, index) => <li key={item.id ?? index} className="flex justify-between gap-4 py-4 text-sm">
        <span>{item.title} × {item.quantity}</span><span>Rp{Number(item.lineTotal).toLocaleString('id-ID')}</span>
      </li>)}
    </ul>
    {order.status === 'pending' && order.payment?.status !== 'expired' && order.payment?.checkoutUrl && <a className="mt-8 inline-block rounded-full border border-line px-5 py-3 text-sm" href={order.payment.checkoutUrl} rel="noreferrer">Lanjutkan pembayaran</a>}
    {order.inventoryReview && <p className="mt-6 text-sm">Pembayaran diterima. Tim toko sedang memastikan ketersediaan barang.</p>}
    {order.status === 'paid' && !order.inventoryReview && <p className="mt-6 text-sm">Pembayaran terverifikasi. Pesanan akan diproses oleh toko.</p>}
  </main>
}
