'use client'

import Image from 'next/image'
import type { MediaAsset } from '@/content/types'
import { focalPosition } from '@/lib/focal'
import { MediaSlider } from './MediaSlider'

/** Galeri foto produk dalam slider autoplay berpusat (potret di mobile, lanskap di desktop). Satu foto = tanpa kontrol. */
export function ProductGallery({ images, title }: { images: MediaAsset[]; title: string }) {
  const frame = 'relative aspect-[4/5] w-full overflow-hidden rounded-[1.75rem] bg-tile md:aspect-[16/9]'

  if (images.length === 0) {
    return (
      <div role="img" aria-label={`${title}: belum ada foto`} className={`${frame} flex items-center justify-center text-8xl font-light text-mute/40`}>
        {title.trim().charAt(0).toUpperCase()}
      </div>
    )
  }

  const slides = images.map((image, index) => (
    <div key={`${image.src}-${index}`} className={frame}>
      <Image
        src={image.src}
        alt={image.alt}
        fill
        priority={index === 0}
        sizes="(min-width: 1260px) 1196px, 92vw"
        className="object-cover"
        style={{ objectPosition: focalPosition(image) }}
      />
    </div>
  ))

  return <MediaSlider slides={slides} label={`Foto ${title}`} />
}
