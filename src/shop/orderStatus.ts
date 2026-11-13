export const ORDER_STATUSES = ['pending', 'paid', 'processing', 'shipped', 'completed', 'cancelled', 'expired'] as const
export type OrderStatus = (typeof ORDER_STATUSES)[number]
export type TransitionSource = 'customer' | 'staff' | 'system' | 'gateway'

export const ORDER_STATUS_LABEL: Record<OrderStatus, string> = {
  pending: 'Menunggu pembayaran',
  paid: 'Dibayar',
  processing: 'Diproses',
  shipped: 'Dikirim',
  completed: 'Selesai',
  cancelled: 'Dibatalkan',
  expired: 'Kedaluwarsa',
}

/** Transisi yang diizinkan. Status akhir: completed, cancelled, expired (kecuali pembayaran terlambat, lihat canTransition). */
const FLOW: Record<OrderStatus, OrderStatus[]> = {
  pending: ['paid', 'cancelled', 'expired'],
  paid: ['processing', 'cancelled'],
  processing: ['shipped', 'cancelled'],
  shipped: ['completed'],
  completed: [],
  cancelled: [],
  expired: [],
}

/** Stok yang sudah direservasi dikembalikan hanya bila pesanan batal/kedaluwarsa sebelum dikirim. */
export const RELEASES_STOCK_ON: OrderStatus[] = ['cancelled', 'expired']
export const STOCK_HELD_IN: OrderStatus[] = ['pending', 'paid', 'processing']

/**
 * Pelanggan hanya boleh membatalkan pesanan yang belum dibayar. Pembayaran dari gateway adalah fakta (uang sudah masuk),
 * jadi selalu diterima dari pending/expired/cancelled; stok yang sudah dilepas ditandai untuk ditinjau staf.
 */
export function canTransition(from: OrderStatus, to: OrderStatus, source: TransitionSource): boolean {
  if (from === to) return false
  if (source === 'gateway' && to === 'paid' && ['pending', 'expired', 'cancelled'].includes(from)) return true
  if (source === 'customer') return from === 'pending' && to === 'cancelled'
  return FLOW[from].includes(to)
}

export const isOrderStatus = (v: unknown): v is OrderStatus => ORDER_STATUSES.some((s) => s === v)
