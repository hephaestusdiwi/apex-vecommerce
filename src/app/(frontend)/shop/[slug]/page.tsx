import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { AppleHeroPin, AppleReveal, AppleTextScrub } from '@/components/shop/AppleScrollEffects'
import { ProductFeatures } from '@/components/shop/ProductFeatures'
import { ProductGallery } from '@/components/shop/ProductGallery'
import { ProductHero } from '@/components/shop/ProductHero'
import { ProductHighlights } from '@/components/shop/ProductHighlights'
import { ProductSubnav } from '@/components/shop/ProductSubnav'
import { Shopfront } from '@/components/shop/Shopfront'
import { JsonLd } from '@/components/seo/JsonLd'
import { categoriesOf, getShopProductBySlug, getShopProducts } from '@/content/shop'
import { getSiteSettings } from '@/content/site'
import { productJsonLd } from '@/lib/jsonLd'
import { buildMetadata } from '@/lib/seo'

export const dynamic = 'force-dynamic'

type Props = { params: Promise<{ slug: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const [product, site] = await Promise.all([getShopProductBySlug(slug), getSiteSettings()])
  if (!product) return { title: 'Produk tidak ditemukan' }
  const description = (product.tagline || product.description).slice(0, 160) || undefined
  return buildMetadata({
    title: product.title,
    path: `/shop/${slug}`,
    seo: { description, image: product.images[0] ?? null, noIndex: false },
    site,
  })
}

export default async function ProductPage({ params }: Props) {
  const { slug } = await params
  const [product, site, all] = await Promise.all([getShopProductBySlug(slug), getSiteSettings(), getShopProducts()])
  if (!product || !product.slug) notFound()

  const { id, title, description, sku, images, soldOut, highlights, featuresHeading, featureSlides } = product
  const exploreHref = featureSlides.length > 0 ? '#keunggulan' : highlights.length > 0 ? '#sorotan' : null
  const others = all.filter((item) => item.id !== id)

  return (
    <div data-store="dark">
      <JsonLd data={productJsonLd(product, site)} />
      <ProductSubnav productId={id} title={title} soldOut={soldOut} exploreHref={exploreHref} />
      <article className="pb-24 md:pb-32">
        <AppleHeroPin>
          <ProductHero product={product} />
        </AppleHeroPin>

        <AppleReveal>
          <ProductFeatures heading={featuresHeading} slides={featureSlides} />
        </AppleReveal>

        <AppleReveal className="mt-12 md:mt-16">
          <ProductGallery images={images} title={title} />
        </AppleReveal>

        {description ? <AppleTextScrub text={description} sku={sku} /> : null}

        <AppleReveal>
          <ProductHighlights highlights={highlights} />
        </AppleReveal>

        {others.length > 0 ? (
          <section aria-labelledby="others-heading" className="mt-28 bg-tile py-16 md:mt-48 md:py-24">
            <div className="store-container">
              <AppleReveal>
                <h2 id="others-heading" className="mb-8 text-3xl font-semibold tracking-tight md:mb-10 md:text-4xl">
                  Jelajahi produk lainnya.
                </h2>
              </AppleReveal>
            </div>
            <AppleReveal delay={100}>
              <Shopfront products={others} categories={categoriesOf(others)} />
            </AppleReveal>
          </section>
        ) : null}
      </article>
    </div>
  )
}