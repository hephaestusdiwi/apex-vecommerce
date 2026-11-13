import type { TaskConfig } from 'payload'
import { expireOrder } from '@/shop/orders'

export const expireOrdersTask: TaskConfig<'expireOrders'> = {
  slug: 'expireOrders',
  label: 'Kedaluwarsakan pesanan yang belum dibayar',
  schedule: [{ cron: '*/10 * * * *', queue: 'default' }],
  outputSchema: [{ name: 'expired', type: 'number' }],
  handler: async ({ req }) => {
    const { payload } = req
    const { docs } = await payload.find({
      collection: 'orders',
      where: { and: [{ status: { equals: 'pending' } }, { holdUntil: { less_than: new Date().toISOString() } }] },
      limit: 100,
      depth: 0,
      overrideAccess: true,
    })

    let expired = 0
    for (const order of docs) {
      try {
        await expireOrder(payload, order.id)
        expired++
      } catch (err) {
        payload.logger.error({ err, msg: `Gagal mengedaluwarsakan pesanan ${order.code}` })
      }
    }
    return { output: { expired } }
  },
}
