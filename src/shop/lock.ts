import { commitTransaction, createLocalReq, initTransaction, killTransaction, type Payload, type PayloadRequest } from 'payload'

type PgAdapter = {
  sessions: Record<string, { db: unknown }>
  execute: (args: { db?: unknown; raw?: string }) => Promise<unknown>
}

/**
 * Jalankan `fn` dalam satu transaksi dengan advisory lock per kunci: permintaan lain dengan kunci sama menunggu sampai
 * transaksi ini selesai. Dipakai untuk baca-ubah-tulis yang tidak boleh saling menimpa (mis. isi keranjang).
 */
export async function withAdvisoryLock<T>(payload: Payload, key: string, fn: (req: PayloadRequest) => Promise<T>): Promise<T> {
  if (!/^[A-Za-z0-9:_-]{1,200}$/.test(key)) throw new Error('Kunci lock tidak valid')
  const req = await createLocalReq({}, payload)
  const started = await initTransaction(req)
  try {
    const pg = payload.db as unknown as PgAdapter
    const session = pg.sessions[String(await req.transactionID)]
    if (!session) throw new Error('Transaksi tidak aktif')
    await pg.execute({ db: session.db, raw: `SELECT pg_advisory_xact_lock(hashtext('${key}'))` })
    const result = await fn(req)
    if (started) await commitTransaction(req)
    return result
  } catch (err) {
    if (started) await killTransaction(req)
    throw err
  }
}
