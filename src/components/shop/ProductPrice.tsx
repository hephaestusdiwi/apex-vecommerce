import { formatIdr } from '@/lib/price'

export function ProductPrice({
  price,
  compareAtPrice,
  large = false,
  compact = false,
  centered = false,
}: {
  price: number
  compareAtPrice: number | null
  large?: boolean
  compact?: boolean
  centered?: boolean
}) {
  const size = large ? 'text-2xl font-medium md:text-3xl' : compact ? 'text-sm' : 'text-lg font-medium'
  return (
    <p className={`flex flex-wrap items-baseline gap-x-3 gap-y-1 ${centered ? 'justify-center' : ''}`}>
      <span className={size}>{formatIdr(price)}</span>
      {compareAtPrice ? (
        <>
          <span className="sr-only">Harga sebelumnya</span>
          <s className="text-sm text-mute">{formatIdr(compareAtPrice)}</s>
        </>
      ) : null}
    </p>
  )
}
