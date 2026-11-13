import type { GatewaySetting } from './types'

export async function readGatewaySetting(): Promise<GatewaySetting | null | undefined> {
  const { getPayloadClient } = await import('@/lib/payload')
  const payload = await getPayloadClient()
  const settings = await payload.findGlobal({ slug: 'booking-settings', depth: 0 })
  return settings.paymentGateway as GatewaySetting | null | undefined
}