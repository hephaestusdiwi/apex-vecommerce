import Image from 'next/image'
import Link from 'next/link'
import type { ShopProduct } from '@/content/shop'

/** Judul halaman toko di kiri, dengan baris thumbnail produk (gambar kecil, nama, label "Baru") yang menaut ke detail. */
export function StoreHero({ title, products }: { title: string; products: ShopProduct[] }) {
  const items = products.filter((product) => product.slug).slice(0, 10)
  return (
    <section className="store-container pb-4 pt-24 md:pt-32">
      <h1 className="text-[clamp(2.5rem,5vw,3.5rem)] font-semibold leading-[1.05] tracking-tight">{title}</h1>
      {items.length > 0 ? (
        <nav aria-label="Produk" className="mt-8 md:mt-10">
          <ul className="flex gap-8 overflow-x-auto pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {items.map(({ id, slug, title: name, images, isNew }) => (
              <li key={id} className="shrink-0">
                <Link href={`/shop/${slug}`} className="flex w-20 flex-col items-center text-center text-xs focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent">
                  <span className="relative block h-14 w-16">
                    {images[0] ? <Image src={images[0].src} alt="" fill sizes="64px" className="object-contain" /> : null}
                  </span>
                  <span className="mt-2 line-clamp-2">{name}</span>
                  {isNew ? <span className="mt-0.5 text-[0.6875rem] font-semibold text-notice">Baru</span> : null}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      ) : null}
    </section>
  )
}
