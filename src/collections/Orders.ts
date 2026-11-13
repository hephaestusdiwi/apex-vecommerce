import type { CollectionConfig } from 'payload'
import { adminOnly, staffOnly } from '@/access'

const ro = { readOnly: true }

export const Orders: CollectionConfig = {
  slug: 'orders',
  labels: { singular: 'Pesanan', plural: 'Pesanan' },
  admin: {
    group: 'Toko',
    useAsTitle: 'code',
    defaultColumns: ['code', 'customerName', 'total', 'status', 'payment.status', 'createdAt'],
    listSearchableFields: ['code', 'customerName', 'customerEmail', 'customerPhone'],
  },
  access: { create: () => false, read: staffOnly, update: staffOnly, delete: adminOnly },
  fields: [
    { name: 'code', type: 'text', required: true, unique: true, index: true, label: 'Nomor pesanan', access: { update: () => false }, admin: ro },
    { name: 'accessToken', type: 'text', required: true, access: { update: () => false }, admin: { hidden: true, readOnly: true } },
    { name: 'cart', type: 'relationship', relationTo: 'carts', index: true, access: { update: () => false }, admin: { hidden: true, readOnly: true } },
    { name: 'customer', type: 'relationship', relationTo: 'users', index: true, label: 'Akun pelanggan', access: { update: () => false }, admin: ro },
    {
      type: 'row',
      fields: [
        { name: 'customerName', type: 'text', required: true, maxLength: 120, label: 'Nama pembeli', access: { update: () => false }, admin: { ...ro, width: '50%' } },
        { name: 'customerEmail', type: 'email', required: true, label: 'Email pembeli', access: { update: () => false }, admin: { ...ro, width: '50%' } },
      ],
    },
    { name: 'customerPhone', type: 'text', required: true, maxLength: 20, label: 'Telepon / WhatsApp', access: { update: () => false }, admin: ro },
    { name: 'shippingAddress', type: 'textarea', required: true, maxLength: 500, label: 'Alamat pengiriman', access: { update: () => false }, admin: ro },
    { name: 'notes', type: 'textarea', maxLength: 1000, label: 'Catatan pembeli', access: { update: () => false }, admin: ro },
    {
      name: 'items',
      type: 'array',
      required: true,
      label: 'Produk yang dibeli',
      access: { update: () => false },
      admin: { readOnly: true },
      fields: [
        { name: 'productId', type: 'text', required: true, label: 'ID produk', admin: ro },
        { name: 'title', type: 'text', required: true, label: 'Nama produk', admin: ro },
        { name: 'sku', type: 'text', label: 'SKU', admin: ro },
        { name: 'unitPrice', type: 'number', required: true, label: 'Harga satuan', admin: ro },
        { name: 'quantity', type: 'number', required: true, label: 'Jumlah', admin: ro },
        { name: 'lineTotal', type: 'number', required: true, label: 'Total baris', admin: ro },
        { name: 'trackStock', type: 'checkbox', defaultValue: false, label: 'Stok dilacak', admin: { ...ro, hidden: true } },
      ],
    },
    { name: 'subtotal', type: 'number', required: true, label: 'Subtotal (Rp)', access: { update: () => false }, admin: ro },
    { name: 'total', type: 'number', required: true, label: 'Total (Rp)', access: { update: () => false }, admin: ro },
    {
      name: 'payment',
      type: 'group',
      label: 'Pembayaran',
      access: { update: () => false },
      fields: [
        { name: 'gateway', type: 'select', options: [{ label: 'Midtrans', value: 'midtrans' }, { label: 'Xendit', value: 'xendit' }], admin: ro },
        { name: 'reference', type: 'text', admin: ro },
        { name: 'amount', type: 'number', admin: ro },
        {
          name: 'status', type: 'select', defaultValue: 'pending',
          options: [
            { label: 'Menunggu pembayaran', value: 'pending' }, { label: 'Lunas', value: 'paid' },
            { label: 'Gagal', value: 'failed' }, { label: 'Kedaluwarsa', value: 'expired' },
            { label: 'Dibatalkan', value: 'cancelled' }, { label: 'Dikembalikan sebagian', value: 'partially_refunded' },
            { label: 'Dikembalikan', value: 'refunded' }, { label: 'Tidak diketahui', value: 'unknown' },
          ],
          admin: ro,
        },
        { name: 'checkoutUrl', type: 'text', admin: ro },
        { name: 'providerTransactionId', type: 'text', admin: ro },
        { name: 'paidAt', type: 'date', admin: ro },
      ],
    },
    {
      name: 'status', type: 'select', required: true, defaultValue: 'pending', index: true, label: 'Status pesanan',
      options: [
        { label: 'Menunggu pembayaran', value: 'pending' }, { label: 'Dibayar', value: 'paid' },
        { label: 'Diproses', value: 'processing' }, { label: 'Dikirim', value: 'shipped' },
        { label: 'Selesai', value: 'completed' }, { label: 'Dibatalkan', value: 'cancelled' },
        { label: 'Kedaluwarsa', value: 'expired' },
      ],
    },
    { name: 'holdUntil', type: 'date', label: 'Reservasi stok sampai', access: { update: () => false }, admin: { position: 'sidebar', readOnly: true } },
    { name: 'stockReleasedAt', type: 'date', label: 'Stok dilepas pada', access: { update: () => false }, admin: { position: 'sidebar', readOnly: true } },
    { name: 'inventoryReview', type: 'checkbox', defaultValue: false, label: 'Perlu tinjauan stok', access: { update: () => false }, admin: { position: 'sidebar', readOnly: true } },
  ],
}
