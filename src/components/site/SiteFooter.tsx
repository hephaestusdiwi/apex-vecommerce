import Link from 'next/link'
import type { SiteSettings } from '@/content/site'
import type { ChromeLink, SiteChrome } from '@/content/siteChrome'

function InstagramIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.2" cy="6.8" r="0.9" fill="currentColor" stroke="none" />
    </svg>
  )
}

function FooterLink({ item, className }: { item: ChromeLink; className?: string }) {
  return item.href.startsWith('/') ? (
    <Link href={item.href} className={className}>
      {item.label}
    </Link>
  ) : (
    <a href={item.href} className={className}>
      {item.label}
    </a>
  )
}

const linkClass = 'transition-colors can-hover:hover:text-ink can-hover:hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent'

export function SiteFooter({
  siteName,
  navigation,
  instagramUrl,
  footer,
}: Pick<SiteSettings, 'siteName' | 'navigation' | 'instagramUrl'> & { footer: SiteChrome['footer'] }) {
  const configured = footer.note.length > 0 || footer.columns.length > 0 || footer.legalLinks.length > 0 || footer.legalText !== ''

  if (!configured) {
    const links = navigation.filter((item) => item.href !== '/')
    if (links.length === 0 && !instagramUrl) return null
    return (
      <footer className="mt-28 pb-12 md:mt-40 md:pb-16">
        <div className="flex items-center justify-between px-[4%] text-xs md:px-[19%]">
          <ul className="flex gap-4 underline underline-offset-4">
            {links.map((item, i) => (
              <li key={`${item.href}-${i}`}>
                <FooterLink item={item} />
              </li>
            ))}
          </ul>
          {instagramUrl ? (
            <a href={instagramUrl} target="_blank" rel="noopener noreferrer" aria-label="Instagram">
              <InstagramIcon />
            </a>
          ) : null}
        </div>
      </footer>
    )
  }

  const legalText = footer.legalText || `© ${new Date().getFullYear()} ${siteName}. Semua hak dilindungi.`

  return (
    <footer className="mt-24 bg-tile text-xs leading-relaxed text-mute md:mt-32">
      <div className="store-container">
        {footer.note.length > 0 ? (
          <div className="space-y-3 border-b border-hairline pb-5 pt-10">
            {footer.note.map((paragraph, i) => (
              <p key={i}>{paragraph}</p>
            ))}
          </div>
        ) : null}

        {footer.columns.length > 0 ? (
          <div className="grid grid-cols-2 gap-x-6 gap-y-8 border-b border-hairline py-8 md:grid-cols-[repeat(auto-fit,minmax(10rem,1fr))]">
            {footer.columns.map((column) => (
              <div key={column.id}>
                <h2 className="text-xs font-semibold text-ink">{column.title}</h2>
                <ul className="mt-3 space-y-2">
                  {column.links.map((item, i) => (
                    <li key={`${item.href}-${i}`}>
                      <FooterLink item={item} className={linkClass} />
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        ) : null}

        <div className="flex flex-col gap-3 py-5 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:gap-6">
            <p>{legalText}</p>
            {footer.legalLinks.length > 0 ? (
              <ul className="flex flex-wrap gap-y-2 [&>li+li]:ml-4 [&>li+li]:border-l [&>li+li]:border-hairline [&>li+li]:pl-4">
                {footer.legalLinks.map((item, i) => (
                  <li key={`${item.href}-${i}`}>
                    <FooterLink item={item} className={linkClass} />
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
          <div className="flex items-center gap-4">
            {footer.regionLabel ? <p>{footer.regionLabel}</p> : null}
            {instagramUrl ? (
              <a href={instagramUrl} target="_blank" rel="noopener noreferrer" aria-label="Instagram" className={linkClass}>
                <InstagramIcon />
              </a>
            ) : null}
          </div>
        </div>
      </div>
    </footer>
  )
}