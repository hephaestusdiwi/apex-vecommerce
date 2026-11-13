export const PASSWORD_MIN_LENGTH = 8
export const PASSWORD_MAX_LENGTH = 128
export const PHONE_PATTERN = /^\+?[0-9\s-]{8,20}$/
export const POSTAL_CODE_PATTERN = /^\d{5}$/
export const MAX_ADDRESSES_PER_CUSTOMER = 10
export const REGISTER_LIMIT = { max: 5, windowMs: 15 * 60 * 1000 }

/** Alasan pergerakan stok. Yang manual boleh dicatat staff; yang sistem hanya dari kode server (checkout, pembatalan). */
export const MANUAL_STOCK_REASONS = ['restock', 'correction', 'damaged'] as const
export const SYSTEM_STOCK_REASONS = ['order_reserve', 'order_release'] as const
export const STOCK_REASONS = [...MANUAL_STOCK_REASONS, ...SYSTEM_STOCK_REASONS] as const
export type StockReason = (typeof STOCK_REASONS)[number]

export const STOCK_REASON_LABEL: Record<StockReason, string> = {
  restock: 'Stok masuk',
  correction: 'Koreksi / stok opname',
  damaged: 'Rusak / hilang',
  order_reserve: 'Dipesan (pesanan)',
  order_release: 'Dikembalikan (pesanan batal)',
}

/** Tanda delta yang diwajibkan tiap alasan; `correction` boleh keduanya. */
export const STOCK_REASON_SIGN: Record<StockReason, 'positive' | 'negative' | 'any'> = {
  restock: 'positive',
  correction: 'any',
  damaged: 'negative',
  order_reserve: 'negative',
  order_release: 'positive',
}

export const MAX_STOCK_DELTA = 1_000_000

/** Penanda context Local API: hanya kode server yang bisa menyetelnya (REST tidak bisa). */
export const SYSTEM_MOVEMENT_CONTEXT = 'apexSystemStockMovement'

/** Keranjang. Harga TIDAK pernah disimpan sebagai acuan bayar: selalu dihitung ulang dari produk saat dibaca. */
export const CART_COOKIE = 'apex_cart'
export const CART_TTL_DAYS = 30
export const MAX_LINE_QUANTITY = 20
export const MAX_CART_LINES = 50
export const CART_LIMIT = { max: 120, windowMs: 60 * 1000 }
