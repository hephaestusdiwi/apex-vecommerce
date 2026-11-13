const idr = new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 })
export const formatIdr = (n: number) => idr.format(n)

export const priceLabel = (p: { priceType: string; price: number | null }) =>
    p.priceType === 'custom' || p.price === null
        ? 'Hubungi kami'
        : `${p.priceType === 'from' ? 'Mulai ' : ''}${formatIdr(p.price)}`

export const normalizeDepositPercent = (value: unknown): number =>
  typeof value === 'number' && Number.isInteger(value) && value >= 1 && value <= 100 ? value : 50

/** Rupiah has no fractional units; round upward so the configured minimum is never underpaid. */
export const depositAmount = (price: number, percent: number): number => Math.ceil((price * percent) / 100)
