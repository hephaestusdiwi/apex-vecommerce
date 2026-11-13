import { midtrans } from './providers/midtrans'
import { xendit } from './providers/xendit'
import type { PaymentProvider, PaymentProviderId } from './types'

const PROVIDERS: Record<PaymentProviderId, PaymentProvider> = { midtrans, xendit }

export const getProvider = (id: PaymentProviderId): PaymentProvider => PROVIDERS[id]