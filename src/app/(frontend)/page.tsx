import type { Metadata } from 'next'
import { buildMetadata } from '@/lib/seo'
import { PriorityTiles } from '@/components/shop/PriorityTiles'
import { Shopfront } from '@/components/shop/Shopfront'
import { StoreHero } from '@/components/shop/StoreHero'
import { categoriesOf, getShopProducts } from '@/content/shop'
import { getSiteSettings } from '@/content/site'
import { JsonLd } from '@/components/seo/JsonLd'
import { siteJsonLd } from '@/lib/jsonLd'

export const dynamic = 'force-dynamic'

export async function generateMetadata(): Promise<Metadata> {
  const site = await getSiteSettings()
  return buildMetadata({ title: site.siteName, path: '/', seo: site.seo, site, absolute: true })
}

export default async function HomePage() {
  const [site, products] = await Promise.all([getSiteSettings(), getShopProducts()])
  return (
    <div data-store="light">
      <JsonLd data={siteJsonLd(site)} />
      <StoreHero title={site.siteName} products={products} />
      <PriorityTiles products={products} />
      <section aria-labelledby="lineup-heading" className="mt-16 bg-tile py-16 md:mt-24 md:py-24">
        <div className="store-container">
          <h2 id="lineup-heading" className="mb-8 text-3xl font-semibold tracking-tight md:mb-10 md:text-4xl">
            Jelajahi semua produk.
          </h2>
        </div>
        <Shopfront products={products} categories={categoriesOf(products)} />
      </section>
    </div>
  )
}
