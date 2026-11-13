import { APIError, type CollectionBeforeChangeHook, type CollectionBeforeValidateHook, type CollectionConfig } from 'payload'
import { staffOnly } from '../access'
import {
  STOCK_REASON_LABEL,
  STOCK_REASON_SIGN,
  STOCK_REASONS,
  SYSTEM_MOVEMENT_CONTEXT,
  SYSTEM_STOCK_REASONS,
  type StockReason,
} from '../shop/constants'
import { applyStockDelta, isValidDelta } from '../shop/stock'

const bad = (message: string, status = 400) => new APIError(message, status, undefined, true)

const validateMovement: CollectionBeforeValidateHook = ({ data, operation, req }) => {
  if (operation !== 'create' || !data) return data
  const reason = data.reason as StockReason
  if (!STOCK_REASONS.includes(reason)) throw bad('Alasan tidak dikenal.')
  if ((SYSTEM_STOCK_REASONS as readonly string[]).includes(reason) && !req.context?.[SYSTEM_MOVEMENT_CONTEXT]) {
    throw bad('Alasan ini hanya bisa dicatat oleh sistem.', 403)
  }
  if (!isValidDelta(data.delta)) throw bad('Jumlah harus bilangan bulat bukan nol.')
  const sign = STOCK_REASON_SIGN[reason]
  if (sign === 'positive' && data.delta < 0) throw bad(`“${STOCK_REASON_LABEL[reason]}” harus bernilai positif.`)
  if (sign === 'negative' && data.delta > 0) throw bad(`“${STOCK_REASON_LABEL[reason]}” harus bernilai negatif.`)
  return data
}

// Satu-satunya tempat stok berubah: terapkan delta secara atomik lalu simpan stok sebelum/sesudah di baris riwayat.
// Nilai stockBefore/stockAfter/createdBy dari klien selalu ditimpa.
const applyMovement: CollectionBeforeChangeHook = async ({ data, operation, req }) => {
  if (operation !== 'create') return data
  const productId = Number(typeof data.product === 'object' && data.product ? data.product.id : data.product)
  const { before, after } = await applyStockDelta(req, productId, data.delta)
  return { ...data, stockBefore: before, stockAfter: after, createdBy: req.user?.id ?? null }
}

/** Buku besar stok: hanya tambah, tidak bisa diubah atau dihapus oleh siapa pun. */
export const StockMovements: CollectionConfig = {
  slug: 'stock-movements',
  labels: { singular: 'Pergerakan Stok', plural: 'Pergerakan Stok' },
  admin: {
    group: 'Toko',
    useAsTitle: 'reason',
    defaultColumns: ['product', 'reason', 'delta', 'stockAfter', 'createdAt'],
  },
  defaultSort: '-createdAt',
  access: {
    read: staffOnly,
    create: staffOnly,
    update: () => false,
    delete: () => false,
  },
  hooks: { beforeValidate: [validateMovement], beforeChange: [applyMovement] },
  fields: [
    { name: 'product', type: 'relationship', relationTo: 'products', required: true, index: true, label: 'Produk' },
    {
      name: 'reason',
      type: 'select',
      required: true,
      defaultValue: 'restock',
      label: 'Alasan',
      options: STOCK_REASONS.map((value) => ({ label: STOCK_REASON_LABEL[value], value })),
    },
    {
      name: 'delta',
      type: 'number',
      required: true,
      label: 'Jumlah (+ masuk, − keluar)',
      admin: { description: 'Bilangan bulat. Stok tidak boleh menjadi negatif.' },
    },
    { name: 'reference', type: 'text', maxLength: 100, label: 'Referensi', admin: { description: 'Mis. nomor PO atau nomor pesanan.' } },
    { name: 'note', type: 'text', maxLength: 300, label: 'Catatan' },
    { name: 'stockBefore', type: 'number', label: 'Stok sebelum', admin: { readOnly: true } },
    { name: 'stockAfter', type: 'number', label: 'Stok sesudah', admin: { readOnly: true } },
    { name: 'createdBy', type: 'relationship', relationTo: 'users', label: 'Dicatat oleh', admin: { readOnly: true } },
  ],
}
