import type { CollectionConfig } from 'payload'
import { staffOnly } from '../access'
import { MAX_LINE_QUANTITY } from '../shop/constants'

/**
 * Keranjang belanja. Hanya diakses lewat endpoint /api/shop/cart (Local API di server): REST langsung tidak bisa
 * membuat/mengubah/menghapus. Pemilik: akun pelanggan, atau tamu lewat cookie acak yang hanya disimpan sebagai hash.
 */
export const Carts: CollectionConfig = {
  slug: 'carts',
  labels: { singular: 'Keranjang', plural: 'Keranjang' },
  admin: { group: 'Toko', defaultColumns: ['customer', 'lastActiveAt', 'updatedAt'], useAsTitle: 'id' },
  access: { read: staffOnly, create: () => false, update: () => false, delete: () => false },
  fields: [
    { name: 'customer', type: 'relationship', relationTo: 'users', unique: true, index: true, label: 'Pelanggan' },
    { name: 'tokenHash', type: 'text', unique: true, index: true, label: 'Hash token tamu', admin: { readOnly: true } },
    {
      name: 'items',
      type: 'array',
      label: 'Isi keranjang',
      fields: [
        { name: 'product', type: 'relationship', relationTo: 'products', required: true },
        {
          name: 'quantity',
          type: 'number',
          required: true,
          min: 1,
          max: MAX_LINE_QUANTITY,
          validate: (v: number | null | undefined) => (Number.isInteger(v) && (v as number) >= 1 && (v as number) <= MAX_LINE_QUANTITY) || 'Jumlah tidak valid',
        },
        { name: 'priceSeen', type: 'number', label: 'Harga saat terakhir dilihat pelanggan', admin: { description: 'Hanya untuk mendeteksi perubahan harga. Tidak dipakai untuk menagih.' } },
      ],
    },
    { name: 'lastActiveAt', type: 'date', index: true, label: 'Terakhir aktif' },
  ],
}
