import type { CollectionConfig } from 'payload'
import { staffOnly } from '../access'
import { ORDER_STATUSES, ORDER_STATUS_LABEL } from '../shop/orderStatus'

const statusOptions = ORDER_STATUSES.map((value) => ({ label: ORDER_STATUS_LABEL[value], value}))

/** Riwayat status pesanan: hanya tambah, ditulis otomatis oleh hook Orders. Pelanggan membacanya lewat /api/shop/orders. */

export const OrderStatusEvents: CollectionConfig = {
    slug: 'order-status-events',
    labels: { singular: 'Riwayat status pesanan', plural: 'Riwayat status pesanan ' },
    admin: { group: 'Toko', useAsTitle: 'toStatus', defaultColumns: ['order', 'fromStatus', 'toStatus', 'source', 'createdAt'] },
    defaultSort: '-createdAt',
    access: { read: staffOnly, create: () => false, update: () => false, delete: () => false },
    fields: [
        { name: 'order', type: 'relationship', relationTo: 'orders', required: true, index: true, label: 'Pesanan' },
        { name: 'fromStatus', type: 'select', options: statusOptions, label: 'Dari' },
        { name: 'toStatus', type: 'select', required: true, options: statusOptions, label: 'Menjadi' },
        {
            name: 'source',
            type: 'select',
            required: true,
            label: 'Sumber',
            options: [
                { label: 'Pelanggan', value: 'customer' },
                { label: 'Staf', value: 'staff' },
                { label: 'Sistem', value: 'system' },
                { label: 'Payment Gateway', value: 'gateway' },
            ],
        },
        { name: 'actor', type: 'relationship', relationTo: 'users', label: 'Users' },
        { name: 'note', type: 'text', maxLength: 300, label: 'Catatan' },
    ],
}