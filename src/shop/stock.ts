import { APIError, type Payload, type PayloadRequest } from 'payload'
import { MAX_STOCK_DELTA, SYSTEM_MOVEMENT_CONTEXT, type StockReason } from './constants'

type PgAdapter = {
  sessions: Record<string, { db: unknown }>
  execute: (args: { db?: unknown; raw?: string }) => Promise<{ rows?: Array<Record<string, unknown>> }>
}

export const isValidDelta = (delta: unknown): delta is number =>
  typeof delta === 'number' && Number.isInteger(delta) && delta !== 0 && Math.abs(delta) <= MAX_STOCK_DELTA

/**
 * Ubah stok produk secara atomik di dalam transaksi request. Satu UPDATE bersyarat (`stock + delta >= 0`) memegang
 * kunci baris, jadi dua permintaan bersamaan untuk unit terakhir diserialkan dan hanya satu yang lolos.
 * Trigger database mengizinkan perubahan kolom `stock` hanya dari jalur ini (flag `apex.stock_write`).
 */
export async function applyStockDelta(
  req: PayloadRequest,
  productId: number,
  delta: number,
): Promise<{ before: number; after: number }> {
  if (!Number.isInteger(productId) || !isValidDelta(delta)) throw new APIError('Perubahan stok tidak valid.', 400, undefined, true)

  const pg = req.payload.db as unknown as PgAdapter
  const session = pg.sessions[String(await req.transactionID)]
  if (!session) throw new Error('Transaksi tidak aktif')

  await pg.execute({ db: session.db, raw: `SELECT set_config('apex.stock_write', 'on', true)` })
  const result = await pg.execute({
    db: session.db,
    raw: `UPDATE "products" SET "stock" = "stock" + (${delta}) WHERE "id" = ${productId} AND "track_stock" = true AND "stock" + (${delta}) >= 0 RETURNING "stock"`,
  })

  const row = result.rows?.[0]
  if (row) {
    const after = Number(row.stock)
    return { before: after - delta, after }
  }

  // Tidak ada baris yang berubah: bedakan penyebabnya supaya pesan jelas.
  const product = await req.payload.findByID({
    collection: 'products',
    id: productId,
    depth: 0,
    overrideAccess: true,
    req,
    select: { trackStock: true, stock: true },
    disableErrors: true,
  })
  if (!product) throw new APIError('Produk tidak ditemukan.', 404, undefined, true)
  if (!product.trackStock) throw new APIError('Produk ini tidak melacak stok.', 400, undefined, true)
  throw new APIError(`Stok tidak mencukupi (tersisa ${product.stock ?? 0}).`, 409, undefined, true)
}

/** Catat pergerakan stok oleh sistem (checkout, pembatalan). Ikut transaksi `req` bila diberikan. */
export async function recordSystemMovement(
  payload: Payload,
  input: { productId: number; delta: number; reason: Extract<StockReason, 'order_reserve' | 'order_release'>; reference?: string; note?: string },
  req?: PayloadRequest,
) {
  return payload.create({
    collection: 'stock-movements',
    data: { product: input.productId, delta: input.delta, reason: input.reason, reference: input.reference, note: input.note },
    overrideAccess: true,
    context: { [SYSTEM_MOVEMENT_CONTEXT]: true },
    req,
  })
}
