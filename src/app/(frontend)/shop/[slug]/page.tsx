import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { AddToCartButton } from '@/components/shop/AddToCartButton'
import { ProductGallery } from '@/components/shop/ProductGallery'
import { ProductHighlights } from '@/components/shop/ProductHighlights'
import { ProductPrice } from '@/components/shop/ProductPrice'
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

  const { id, title, tagline, description, sku, price, compareAtPrice, images, category, soldOut, lowStock, highlights } = product
  const others = all.filter((item) => item.id !== id)

  return (
    <div data-store="dark">
      <JsonLd data={productJsonLd(product, site)} />
      <ProductSubnav productId={id} title={title} price={price} soldOut={soldOut} />
      <article className="pb-24 md:pb-32">
        <header className="store-container pt-28 text-center md:pt-40">
          {category ? <p className="mb-3 text-sm text-mute">{category.title}</p> : null}
          <h1 className="mx-auto max-w-4xl text-[clamp(2.5rem,7vw,6rem)] font-medium leading-[1.03] tracking-tight">{title}</h1>
          {tagline ? <p className="mx-auto mt-4 max-w-xl text-xl text-mute md:text-2xl">{tagline}</p> : null}

          <div className="mt-6">
            <ProductPrice price={price} compareAtPrice={compareAtPrice} large centered />
            {soldOut ? (
              <p className="mt-2 text-sm text-mute">Stok sedang habis.</p>
            ) : lowStock ? (
              <p className="mt-2 text-sm text-accent">Stok terbatas.</p>
            ) : null}
          </div>

          <div id="product-cta" className="mt-8 flex justify-center">
            <AddToCartButton productId={id} title={title} soldOut={soldOut} />
          </div>
        </header>

        <div className="mt-12 md:mt-16">
          <ProductGallery images={images} title={title} />
        </div>

        {description ? (
          <section aria-label="Tentang produk ini" className="store-container mt-20 md:mt-32">
            <div className="mx-auto max-w-3xl text-center">
              <p className="whitespace-pre-line text-xl leading-relaxed md:text-3xl md:leading-snug">{description}</p>
              {sku ? <p className="mt-8 text-sm text-mute">SKU: {sku}</p> : null}
            </div>
          </section>
        ) : null}

        <ProductHighlights highlights={highlights} />

        {others.length > 0 ? (
          <section aria-labelledby="others-heading" className="mt-28 bg-tile py-16 md:mt-48 md:py-24">
            <div className="store-container">
              <h2 id="others-heading" className="mb-8 text-3xl font-semibold tracking-tight md:mb-10 md:text-4xl">
                Jelajahi produk lainnya.
              </h2>
            </div>
            <Shopfront products={others} categories={categoriesOf(others)} />
          </section>
        ) : null}
      </article>
    </div>
  )
}
