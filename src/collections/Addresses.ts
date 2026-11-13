import { APIError, type Access, type CollectionAfterChangeHook, type CollectionBeforeChangeHook, type CollectionBeforeValidateHook, type CollectionConfig } from 'payload'
import { isActiveLoggedIn, isAdmin, isStaff } from '@/access'
import { MAX_ADDRESSES_PER_CUSTOMER, PHONE_PATTERN, POSTAL_CODE_PATTERN } from '@/shop/constants'

const SKIP_DEFAULT = 'apexSkipDefaultAddress'

const ownerFilter = (id: number | string) => ({ customer: { equals: id } })

/** Pemilik atau staff (staff hanya membaca, untuk bantuan pelanggan). */
const readOwnerOrStaff: Access = ({ req: { user } }) => {
  if (!user) return false
  if (isStaff(user)) return true
  return isActiveLoggedIn(user) ? ownerFilter(user.id) : false
}

/** Pemilik atau admin. */
const writeOwnerOrAdmin: Access = ({ req: { user } }) => {
  if (!user) return false
  if (isAdmin(user)) return true
  return isActiveLoggedIn(user) ? ownerFilter(user.id) : false
}

// Non-admin selalu menulis untuk akunnya sendiri, apa pun isi `customer` dari klien.
const forceOwner: CollectionBeforeValidateHook = ({ data, operation, req }) => {
  if (!data) return data
  if (operation === 'create' && req.user && !isAdmin(req.user)) return { ...data, customer: req.user.id }
  return data
}

const limitAndDefault: CollectionBeforeChangeHook = async ({ data, operation, req }) => {
  if (operation !== 'create') return data
  const { totalDocs } = await req.payload.count({
    collection: 'addresses',
    where: { customer: { equals: data.customer } },
    overrideAccess: true,
    req,
  })
  if (totalDocs >= MAX_ADDRESSES_PER_CUSTOMER) {
    throw new APIError(`Maksimal ${MAX_ADDRESSES_PER_CUSTOMER} alamat.`, 400, undefined, true)
  }
  return totalDocs === 0 ? { ...data, isDefault: true } : data
}

// Hanya satu alamat utama per pelanggan.
const keepSingleDefault: CollectionAfterChangeHook = async ({ doc, req }) => {
  if (!doc.isDefault || req.context?.[SKIP_DEFAULT]) return doc
  const customerId = typeof doc.customer === 'object' && doc.customer ? doc.customer.id : doc.customer
  await req.payload.update({
    collection: 'addresses',
    where: { and: [{ customer: { equals: customerId } }, { id: { not_equals: doc.id } }, { isDefault: { equals: true } }] },
    data: { isDefault: false },
    overrideAccess: true,
    context: { [SKIP_DEFAULT]: true },
    req,
  })
  return doc
}

const required = (message: string) => (v: unknown) => (typeof v === 'string' && v.trim() !== '') || message

export const Addresses: CollectionConfig = {
  slug: 'addresses',
  labels: { singular: 'Alamat', plural: 'Alamat' },
  admin: {
    group: 'Toko',
    useAsTitle: 'recipientName',
    defaultColumns: ['recipientName', 'city', 'province', 'customer', 'isDefault'],
  },
  access: {
    create: ({ req }) => isActiveLoggedIn(req.user),
    read: readOwnerOrStaff,
    update: writeOwnerOrAdmin,
    delete: writeOwnerOrAdmin,
  },
  hooks: { beforeValidate: [forceOwner], beforeChange: [limitAndDefault], afterChange: [keepSingleDefault] },
  fields: [
    {
      name: 'customer',
      type: 'relationship',
      relationTo: 'users',
      required: true,
      index: true,
      label: 'Pelanggan',
      // Pemilik tidak bisa dipindahkan setelah dibuat, kecuali oleh admin.
      access: { update: ({ req }) => isAdmin(req.user) },
    },
    { name: 'label', type: 'text', maxLength: 40, defaultValue: 'Rumah', label: 'Label' },
    { name: 'recipientName', type: 'text', required: true, maxLength: 120, label: 'Nama penerima', validate: required('Nama penerima wajib diisi') },
    {
      name: 'phone',
      type: 'text',
      required: true,
      maxLength: 20,
      label: 'Telepon',
      validate: (v: string | null | undefined) => (typeof v === 'string' && PHONE_PATTERN.test(v.trim())) || 'Nomor telepon tidak valid',
    },
    { name: 'line1', type: 'text', required: true, maxLength: 255, label: 'Alamat lengkap', validate: required('Alamat wajib diisi') },
    { name: 'line2', type: 'text', maxLength: 255, label: 'Patokan / detail' },
    { name: 'district', type: 'text', maxLength: 100, label: 'Kecamatan' },
    { name: 'city', type: 'text', required: true, maxLength: 100, label: 'Kota / kabupaten', validate: required('Kota wajib diisi') },
    { name: 'province', type: 'text', required: true, maxLength: 100, label: 'Provinsi', validate: required('Provinsi wajib diisi') },
    {
      name: 'postalCode',
      type: 'text',
      required: true,
      maxLength: 5,
      label: 'Kode pos',
      validate: (v: string | null | undefined) => (typeof v === 'string' && POSTAL_CODE_PATTERN.test(v.trim())) || 'Kode pos harus 5 digit',
    },
    { name: 'isDefault', type: 'checkbox', defaultValue: false, label: 'Alamat utama' },
  ],
}
