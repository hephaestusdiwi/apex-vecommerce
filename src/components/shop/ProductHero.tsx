import Image from 'next/image'
import type { ShopProduct } from '@/content/shop'
import { focalPosition } from '@/lib/focal'
import { AutoVideo } from '../media/AutoVideo'
import { ProductHeroBuy } from './ProductHeroBuy'
import { ProductPrice } from './ProductPrice'

/**
 * Layar pertama halaman produk, latar video penuh, nama produk kecil dan tagline gede di kiri bawah
 * tombol pesan sekarang di kanan bawah, tanpa video. foto pertama produk jadi latar, tanpa dua duanya jadi blank hitam
 */
export function ProductHero({ product }: { product: ShopProduct }) {
    const { id, title, tagline, price, compareAtPrice, images, heroVideo, soldOut, lowStock } = product

    const poster = images[0] ?? null

    return(
        <section className="relative isolate flex h-[100svh] min-h-[32rem] flex-col justify-end overflow-hidden bg-black text-white">
            {heroVideo ? (
            <AutoVideo
                src={heroVideo.src}
                mimeType={heroVideo.mimeType}
                poster={poster?.src}
                preload="auto"
                className="absolute inset-0 -z-10 size-full object-cover"
                style={poster ? { objectPosition: focalPosition(poster) } : undefined}
                />
            ) : poster ? (
            <Image
                src={poster.src}
                alt=""
                fill
                priority
                sizes="100vw"
                className="-z-10 object-cover"
                style={{ objectPosition: focalPosition(poster) }}
                />
            ) : null}

            <div className="store-container flex flex-col items-start justify-between gap-6 pb-12 md:flex-row md:items-end md:pb-16">
                <div>
                {tagline ? (
                    <>
                    <h1 className="text-[clamp(1.5rem,2.2vw,1.75rem)] font-medium tracking-tight">{title}</h1>
                    <p className="mt-1 text-[clamp(2.75rem,6vw,4.5rem)] font-semibold leading-[1.05] tracking-tight">{tagline}</p>
                    </>
                ) : (
                    <h1 className="text-[clamp(2.75rem,6vw,4.5rem)] font-semibold leading-[1.05] tracking-tight">{title}</h1>
                )}
                {lowStock && !soldOut ? <p className="mt-3 text-sm text-white/80">Stok terbatas.</p> : null}
                </div>
                <ProductHeroBuy productId={id} title={title} soldOut={soldOut}>
                <ProductPrice price={price} compareAtPrice={compareAtPrice} compact />
                </ProductHeroBuy>
            </div>
        </section>
    )
}