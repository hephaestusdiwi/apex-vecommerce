import { handlePaymentNotification } from '@/lib/payments/handleWebhook'

export const POST = (request: Request) => handlePaymentNotification(request, 'xendit')
