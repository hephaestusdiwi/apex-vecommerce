import Image from 'next/image'
import type { ShopFeatureSlide } from '@/content/shop'
import { focalPosition } from '@/lib/focal'
import { SlideVideo } from './SlideVideo'
import { MediaSlider } from './MediaSlider'
import { index } from '@payloadcms/db-postgres/drizzle/pg-core'

/**
 * Tagline slider kartu gede, tiap card video atau gambar dengan teks ditengah atas
 * titik dan tombol pause melayang ditengah bawah card yang aktif
 */
export function ProductFeatures({ heading, slides }: { heading: string; slides: ShopFeatureSlide[] }) {
  if (slides.length === 0) return null

  const cards = slides.map(({ id, text, image, video }, index) => (
    <div key={id} className="relative aspect-[4/5] w-full overflow-hidden rounded-[1.75rem] bg-black text-white md:aspect-[2/1]">
      {video ? (
        <SlideVideo
          src={video.src}
          mimeType={video.mimeType}
          poster={image?.src}
          className="absolute inset-0 size-full object-cover"
          style={image ? { objectPosition: focalPosition(image) } : undefined}
        />
      ) : image ? (
        <Image
          src={image.src}
          alt=""
          fill
          priority={index === 0}
          sizes="(min-width: 1260px) 1196px, 92vw"
          className="object-cover"
          style={{ objectPosition: focalPosition(image) }}
        />
      ) : null}
      <p className="absolute inset-x-0 top-[10%] mx-auto max-w-[30rem] whitespace-pre-line px-6 text-center text-[clamp(1.25rem,2.4vw,2rem)] font-semibold leading-tight">
        {text}
      </p>
    </div>
  ))

  return (
    <section id="keunggulan" aria-labelledby="keunggulan-heading" className="bg-tile py-16 md:py-24">
      <div className="store-container">
        <h2 id="keunggulan-heading" className="mb-8 text-[clamp(2rem,4vw,3rem)] font-semibold leading-[1.1] tracking-tight md:mb-10">
          {heading}
        </h2>
      </div>
      <MediaSlider slides={cards} label={heading} interval={5000} overlayControls />
    </section>
  )
}