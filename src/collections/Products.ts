import { APIError, type CollectionBeforeChangeHook, type CollectionBeforeDeleteHook, type CollectionBeforeValidateHook, type CollectionConfig } from 'payload'
import { adminOnly, isStaff, staffOnly } from '../access'
import { slugField } from '../fields/slug'

const isRupiah = (v: unknown): v is number => typeof v === 'number' && Number.isInteger(v) && v >= 0

const validatePrice = (v: number | null | undefined) => (isRupiah(v) ? true : 'Harga harus bilangan bulat Rupiah (tanpa desimal), minimal 0')

const checkPricing: CollectionBeforeValidateHook = ({ data, originalDoc }) => {
  if (!data) return data
  const price = data.price ?? originalDoc?.price
  const compareAt = data.compareAtPrice ?? originalDoc?.compareAtPrice
  const active = data.active ?? originalDoc?.active
  // Produk aktif tidak boleh berharga 0: harga selalu dihitung server dari sini, jadi salah ketik = pesanan gratis.
  if (active && !(typeof price === 'number' && price >= 1)) {
    throw new APIError('Produk aktif wajib punya harga minimal Rp 1.', 400, undefined, true)
  }
  if (compareAt != null && typeof price === 'number' && compareAt <= price) {
    throw new APIError('Harga coret harus lebih besar dari harga jual.', 400, undefined, true)
  }
  return data
}

// Stok hanya berubah lewat pergerakan stok. Nilai dari form/REST diabaikan; trigger database menjadi pagar terakhir.
const ignoreStockInput: CollectionBeforeChangeHook = ({ data, operation }) => {
  if (operation === 'create') return { ...data, stock: 0 }
  const { stock: _ignored, ...rest } = data
  void _ignored
  return rest
}

// Produk yang punya riwayat stok tidak boleh dihapus (riwayat harus tetap bisa ditelusuri): nonaktifkan saja.
const blockDeleteWithHistory: CollectionBeforeDeleteHook = async ({ id, req }) => {
  const { totalDocs } = await req.payload.count({ collection: 'stock-movements', where: { product: { equals: id } }, overrideAccess: true, req })
  if (totalDocs > 0) throw new APIError('Produk ini punya riwayat stok. Nonaktifkan saja, jangan dihapus.', 409, undefined, true)
}

export const Products: CollectionConfig = {
  slug: 'products',
  labels: { singular: 'Produk', plural: 'Produk' },
  admin: {
    group: 'Toko',
    useAsTitle: 'title',
    defaultColumns: ['title', 'sku', 'price', 'stock', 'active', 'category'],
  },
  access: {
    read: ({ req }) => (isStaff(req.user) ? true : { active: { equals: true } }),
    create: staffOnly,
    update: staffOnly,
    delete: adminOnly,
  },
  hooks: { beforeValidate: [checkPricing], beforeChange: [ignoreStockInput], beforeDelete: [blockDeleteWithHistory] },
  fields: [
    { name: 'title', type: 'text', required: true, maxLength: 200 },
    slugField(),
    { name: 'sku', type: 'text', unique: true, index: true, maxLength: 64, label: 'SKU', admin: { position: 'sidebar' } },
    {
      name: 'tagline',
      type: 'text',
      maxLength: 160,
      label: 'Tagline',
      admin: { description: 'Opsional. Kalimat singkat di bawah nama produk (kartu katalog dan halaman detail).' },
    },
    {
      name: 'heroVideo',
      type: 'upload',
      relationTo: 'videos',
      admin: {
        description: 'Opsional, latar layar penuh di bagian paling atas halaman detail. Foto pertama produk jadi banner, tanpa video',
      },
    },
    {
      name: 'featuresHeading',
      type: 'text',
      maxLength: 120,
      label: 'Judul slide keunggulan',
      admin: { description: 'Kosong = Keunggulan demi keunggulan' },
    },
    {
      name: 'featureSlides',
      type: 'array',
      label: 'Slide keunggulan',
      maxRows: 8,
      admin: {
        description: 'Opsional, tiap slide = satu video atau gambar dengan teks di tengah atas, tampil sebagai slider dibawah hero',
      },
      fields: [
        { name: 'text', type: 'textarea', required: true, maxLength: 300, label: 'Teks slide', admin: { description: 'Tekan Enter untuk pindah baris.' } },
        { name: 'video', type: 'upload', relationTo: 'videos', label: 'Video', admin: { description: 'Diputar tanpa suara dan berulang.' } },
        { name: 'image', type: 'upload', relationTo: 'media', label: 'Gambar', admin: { description: 'Poster video, atau latar kalau tanpa video. Isi video atau gambar.' } },
      ],
    },
    { name: 'description', type: 'textarea', maxLength: 5000 },
    {
      name: 'highlights',
      type: 'array',
      label: 'Sorotan fitur',
      maxRows: 8,
      admin: { description: 'Opsional. Tampil sebagai bagian sorotan di halaman detail, sesuai urutan di sini.' },
      fields: [
        {
          name: 'layout',
          type: 'select',
          defaultValue: 'media',
          label: 'Tata letak',
          options: [
            { label: 'Gambar lebar', value: 'media' },
            { label: 'Teks dan gambar berdampingan', value: 'split' },
            { label: 'Pernyataan besar (tanpa gambar)', value: 'statement' },
            { label: 'Explorer spesifikasi (daftar yang bisa dibuka, gambar berganti)', value: 'explorer' },
          ],
          admin: { description: 'Bentuk seksi ini di halaman detail.' },
        },
        { name: 'eyebrow', type: 'text', maxLength: 60, label: 'Label kecil', admin: { description: 'Opsional. Teks kecil di atas judul.' } },
        { name: 'title', type: 'text', required: true, maxLength: 120 },
        { name: 'text', type: 'textarea', maxLength: 600 },
        { name: 'image', type: 'upload', relationTo: 'media', admin: { description: 'Opsional. Tidak dipakai pada tata letak pernyataan besar.' } },
        {
          name: 'stats',
          type: 'array',
          label: 'Angka sorotan',
          maxRows: 4,
          admin: { description: 'Opsional. Angka besar dengan keterangan, misalnya "48 MP" dan "Kamera utama".' },
          fields: [
            { name: 'value', type: 'text', required: true, maxLength: 24, label: 'Angka' },
            { name: 'label', type: 'text', maxLength: 80, label: 'Keterangan' },
          ],
        },
        {
          name: 'items',
          type: 'array',
          label: 'Item explorer',
          minRows: 2,
          maxRows: 10,
          admin: {
            description: 'Hanya untuk tata letak Explorer. Tiap item: judul, penjelasan, dan gambar yang tampil saat item dibuka.',
            condition: (_data, siblingData) => siblingData?.layout === 'explorer',
          },
          fields: [
            { name: 'title', type: 'text', required: true, maxLength: 80, label: 'Judul' },
            { name: 'body', type: 'textarea', required: true, maxLength: 500, label: 'Penjelasan' },
            { name: 'image', type: 'upload', relationTo: 'media', required: true, label: 'Gambar' },
          ],
        },
      ],
    },
    { name: 'category', type: 'relationship', relationTo: 'product-categories', index: true, label: 'Kategori' },
    {
      name: 'images',
      type: 'array',
      label: 'Gambar',
      maxRows: 10,
      fields: [
        { name: 'image', type: 'upload', relationTo: 'media', required: true },
        { name: 'alt', type: 'text', maxLength: 200 },
      ],
    },
    {
      type: 'row',
      fields: [
        {
          name: 'price',
          type: 'number',
          required: true,
          min: 0,
          label: 'Harga (Rp)',
          validate: validatePrice,
          admin: { width: '50%', description: 'Rupiah, bilangan bulat. Server selalu memakai harga ini saat checkout.' },
        },
        {
          name: 'compareAtPrice',
          type: 'number',
          min: 0,
          label: 'Harga coret (Rp)',
          validate: (v: number | null | undefined) => v == null || validatePrice(v),
          admin: { width: '50%', description: 'Opsional. Harus lebih besar dari harga jual.' },
        },
      ],
    },
    { name: 'active', type: 'checkbox', defaultValue: false, index: true, label: 'Aktif (tampil & bisa dibeli)', admin: { position: 'sidebar' } },
    { name: 'trackStock', type: 'checkbox', defaultValue: true, label: 'Lacak stok', admin: { position: 'sidebar', description: 'Matikan untuk produk tanpa batas stok.' } },
    {
      name: 'stock',
      type: 'number',
      defaultValue: 0,
      min: 0,
      label: 'Stok',
      admin: {
        position: 'sidebar',
        readOnly: true,
        description: 'Hanya berubah lewat menu “Pergerakan Stok” (stok masuk, koreksi, rusak) atau pesanan.',
      },
    },
    { name: 'lowStockThreshold', type: 'number', defaultValue: 5, min: 0, label: 'Batas stok menipis', admin: { position: 'sidebar' } },
    { name: 'weightGrams', type: 'number', min: 0, label: 'Berat (gram)', admin: { position: 'sidebar', description: 'Untuk ongkir di tahap berikutnya.' } },
  ],
}
