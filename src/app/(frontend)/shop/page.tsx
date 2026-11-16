import { Shopfront } from '@/components/shop/Shopfront'
import { categoriesOf, getShopProducts } from '@/content/shop'

export const metadata = { title: 'Toko' }
export const dynamic = 'force-dynamic'

export default async function ShopPage() {
  const products = await getShopProducts()
  return (
    <div data-store="light">
      <section className="store-container pb-12 pt-24 md:pb-16 md:pt-32">
        <h1 className="text-[clamp(2.5rem,5vw,3.5rem)] font-semibold leading-[1.05] tracking-tight">Toko</h1>
      </section>
      <section aria-label="Katalog produk" className="bg-tile py-16 md:py-24">
        <Shopfront products={products} categories={categoriesOf(products)} />
      </section>
    </div>
  )
}
