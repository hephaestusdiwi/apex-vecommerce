import { cache } from 'react'
import type { Product } from '@/payload-types'
import { getPayloadClient } from '@/lib/payload'
import { toMedia, toVideoAsset } from './mapper'
import type { MediaAsset, VideoAsset } from './types'

export type ShopCategory = { id: number; slug: string; title: string }

export type ShopHighlightLayout = 'media' | 'split' | 'statement' | 'explorer'
export type ShopStat = { value: string; label: string }
export type ShopExplorerItem = { id: string; title: string; body: string; image: MediaAsset }
export type ShopFeatureSlide = { id: string; text: string; image: MediaAsset | null; video: VideoAsset | null }

export type ShopHighlight = {
  id: string
  layout: ShopHighlightLayout
  eyebrow: string
  title: string
  text: string
  image: MediaAsset | null
  stats: ShopStat[]
  /** Hanya terisi untuk tata letak explorer; item tanpa judul atau gambar valid dilewati. */
  items: ShopExplorerItem[]
}

export type ShopProduct = {
  id: number
  /** Null hanya bila data lama tanpa slug: produk tetap tampil di katalog, tapi tanpa halaman detail. */
  slug: string | null
  title: string
  sku: string | null
  tagline: string
  description: string
  /** Ringkasan untuk kartu katalog: tagline bila ada, kalau tidak deskripsi. */
  summary: string
  price: number
  compareAtPrice: number | null
  images: MediaAsset[]
  category: ShopCategory | null
  soldOut: boolean
  lowStock: boolean
  /** Dibuat dalam 30 hari terakhir: dipakai untuk label "Baru". */
  isNew: boolean
  highlights: ShopHighlight[]
  heroVideo: VideoAsset | null
  featuresHeading: string
  /** Slide keunggulan di bawah hero; slide tanpa teks atau tanpa video/gambar dilewati. */
  featureSlides: ShopFeatureSlide[]
}

const ACTIVE = { active: { equals: true } }

const toCategory = (value: Product['category']): ShopCategory | null => {
  if (!value || typeof value !== 'object' || !value.slug || value.active === false) return null
  return { id: value.id, slug: value.slug, title: value.title }
}

/** Foto tanpa file/ukuran valid dilewati; teks alt per-foto dari produk menimpa alt bawaan media. */
const toImages = (doc: Product): MediaAsset[] =>
  (doc.images ?? []).flatMap((row): MediaAsset[] => {
    const media = toMedia(row.image)
    return media ? [{ ...media, alt: row.alt?.trim() || media.alt }] : []
  })

const toFeatureSlides = (doc: Product): ShopFeatureSlide[] =>
  (doc.featureSlides ?? []).flatMap((row, index): ShopFeatureSlide[] => {
    const image = toMedia(row.image)
    const video = toVideoAsset(row.video)
    const text = row.text?.trim()
    return text && (image || video) ? [{ id: row.id ?? `${doc.id}-slide-${index}`, text, image, video }] : []
  })

const toHighlights = (doc: Product): ShopHighlight[] =>
  (doc.highlights ?? []).flatMap((row, index): ShopHighlight[] => {
    const title = row.title?.trim()
    if (!title) return []
    const layout: ShopHighlightLayout =
      row.layout === 'split' || row.layout === 'statement' || row.layout === 'explorer' ? row.layout : 'media'
    const stats = (row.stats ?? []).flatMap((stat): ShopStat[] =>
      stat.value?.trim() ? [{ value: stat.value.trim(), label: stat.label?.trim() ?? '' }] : [],
    )
    return [
      {
        id: row.id ?? `${doc.id}-highlight-${index}`,
        layout,
        eyebrow: row.eyebrow?.trim() ?? '',
        title,
        text: row.text?.trim() ?? '',
        image: layout === 'statement' || layout === 'explorer' ? null : toMedia(row.image),
        stats,
        items:
          layout === 'explorer'
            ? (row.items ?? []).flatMap((item, itemIndex): ShopExplorerItem[] => {
                const image = toMedia(item.image)
                return item.title?.trim() && image
                  ? [{ id: item.id ?? `${doc.id}-${index}-item-${itemIndex}`, title: item.title.trim(), body: item.body?.trim() ?? '', image }]
                  : []
              })
            : [],
      },
    ]
  })

export const mapShopProduct = (doc: Product): ShopProduct => {
  const tagline = doc.tagline?.trim() ?? ''
  const description = doc.description?.trim() ?? ''
  const tracked = doc.trackStock !== false
  const stock = doc.stock ?? 0
  return {
    id: doc.id,
    slug: doc.slug?.trim() || null,
    title: doc.title,
    sku: doc.sku?.trim() || null,
    tagline,
    description,
    summary: tagline || description,
    price: doc.price,
    compareAtPrice: doc.compareAtPrice != null && doc.compareAtPrice > doc.price ? doc.compareAtPrice : null,
    images: toImages(doc),
    category: toCategory(doc.category),
    soldOut: tracked && stock < 1,
    lowStock: tracked && stock >= 1 && stock <= (doc.lowStockThreshold ?? 5),
    isNew: Date.now() - new Date(doc.createdAt).getTime() < 30 * 24 * 60 * 60 * 1000,
    highlights: toHighlights(doc),
    heroVideo: toVideoAsset(doc.heroVideo),
    featuresHeading: doc.featuresHeading?.trim() || 'Keunggulan demi keunggulan.',
    featureSlides: toFeatureSlides(doc),
  }
}

/**
 * Semua produk aktif untuk pengunjung publik. `overrideAccess: false` memakai access control koleksi
 * (publik hanya produk aktif); filter `active` tetap dipasang eksplisit sebagai pagar kedua.
 * Kategori nonaktif tidak ikut ter-populate, jadi produknya tampil tanpa kategori.
 */
export const getShopProducts = cache(async (): Promise<ShopProduct[]> => {
  const payload = await getPayloadClient()
  const { docs } = await payload.find({
    collection: 'products',
    where: ACTIVE,
    sort: '-createdAt',
    pagination: false,
    depth: 1,
    overrideAccess: false,
  })
  return docs.map(mapShopProduct)
})

/** Produk aktif berdasarkan slug; null bila tidak ada atau nonaktif. Di-cache per request (metadata + halaman). */
export const getShopProductBySlug = cache(async (slug: string): Promise<ShopProduct | null> => {
  const payload = await getPayloadClient()
  const { docs } = await payload.find({
    collection: 'products',
    where: { and: [ACTIVE, { slug: { equals: slug } }] },
    limit: 1,
    pagination: false,
    depth: 1,
    overrideAccess: false,
  })
  return docs[0] ? mapShopProduct(docs[0]) : null
})

/** Kategori yang punya minimal satu produk aktif, urut kemunculan pertama di katalog. */
export const categoriesOf = (products: ShopProduct[]): ShopCategory[] => {
  const seen = new Map<number, ShopCategory>()
  for (const { category } of products) if (category && !seen.has(category.id)) seen.set(category.id, category)
  return [...seen.values()]
}