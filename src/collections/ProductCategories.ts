import type { CollectionConfig } from 'payload'
import { adminOnly, isStaff, staffOnly } from '../access'
import { slugField } from '../fields/slug'

/** Kategori produk toko. Publik hanya melihat yang aktif; staff melihat semua. */
export const ProductCategories: CollectionConfig = {
  slug: 'product-categories',
  labels: { singular: 'Kategori Produk', plural: 'Kategori Produk' },
  admin: {
    group: 'Toko',
    useAsTitle: 'title',
    defaultColumns: ['title', 'slug', 'active', 'updatedAt'],
  },
  access: {
    read: ({ req }) => (isStaff(req.user) ? true : { active: { equals: true } }),
    create: staffOnly,
    update: staffOnly,
    delete: adminOnly,
  },
  fields: [
    { name: 'title', type: 'text', required: true, maxLength: 120 },
    slugField(),
    { name: 'description', type: 'textarea', maxLength: 500 },
    { name: 'image', type: 'upload', relationTo: 'media' },
    { name: 'active', type: 'checkbox', defaultValue: true, index: true, label: 'Aktif', admin: { position: 'sidebar' } },
  ],
}
