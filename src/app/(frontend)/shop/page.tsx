import { Shopfront } from '@/components/shop/Shopfront'
import { getPayloadClient } from '@/lib/payload'

export const metadata = { title: 'Toko' }

export default async function ShopPage() {
  const payload = await getPayloadClient()
  const result = await payload.find({ collection: 'products', where: { active: { equals: true } }, limit: 100, depth: 1, pagination: false, overrideAccess: true })
  return <main className="mx-auto max-w-6xl px-6 py-16">
    <h1 className="text-3xl font-semibold">Toko</h1>
    <p className="mt-3 mb-10 text-sm text-mute">Pilih produk untuk dimasukkan ke keranjang.</p>
    <Shopfront products={result.docs.map(({ id, title, slug, sku, price, description, images }) => ({ id: Number(id), title, slug, sku, price, description, images }))} />
  </main>
}
