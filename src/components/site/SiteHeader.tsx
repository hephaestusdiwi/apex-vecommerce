import Image from 'next/image'
import Link from 'next/link'
import type { SiteSettings } from '@/content/site'
import { SiteNav } from './SiteNav'

/** Navbar ala Apple: bar tipis translucent, logo di kiri, menu di tengah, ikon tas di kanan. */
export function SiteHeader({
  siteName,
  logo,
  navigation,
  showCart,
}: Pick<SiteSettings, 'siteName' | 'logo' | 'navigation'> & { showCart: boolean }) {
  return (
    <header className="absolute inset-x-0 top-0 z-20 px-[4%]">
      <div aria-hidden="true" className="absolute inset-0 -z-10 bg-paper/80 backdrop-blur-xl" />
      <div className="flex h-12 items-center gap-6">
        <Link href="/" className="shrink-0 text-base font-semibold tracking-tight">
          {logo ? (
            <Image
              src={logo.src}
              alt={logo.alt}
              width={logo.width}
              height={logo.height}
              priority
              className="h-6 w-auto"
            />
          ) : (
            siteName
          )}
        </Link>
        <SiteNav items={navigation} showCart={showCart} />
      </div>
    </header>
  )
}