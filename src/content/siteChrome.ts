import { cache } from 'react'
import { getPayloadClient } from '@/lib/payload'
import { isSafeHref } from '@/lib/href'

export type ChromeLink = { label: string; href: string }
export type FooterColumn = { id: string; title: string; links: ChromeLink[] }
export type SiteChrome = {
  showCart: boolean
  footer: {
    note: string[]
    columns: FooterColumn[]
    legalText: string
    legalLinks: ChromeLink[]
    regionLabel: string
  }
}

const EMPTY: SiteChrome = {
  showCart: true,
  footer: { note: [], columns: [], legalText: '', legalLinks: [], regionLabel: '' },
}

const toLinks = (rows: { label: string; href: string }[] | null | undefined): ChromeLink[] =>
  (rows ?? []).filter((row) => isSafeHref(row.href)).map(({ label, href }) => ({ label: label.trim(), href: href.trim() }))

/** Pengaturan navbar dan footer dari global `site-chrome`. Gagal memuat = pakai bawaan (footer lama tetap tampil). */
export const getSiteChrome = cache(async (): Promise<SiteChrome> => {
  const payload = await getPayloadClient()
  try {
    const doc = await payload.findGlobal({ slug: 'site-chrome', depth: 0, overrideAccess: false })
    return {
      showCart: doc.navbar?.showCart ?? true,
      footer: {
        note: (doc.footer?.note ?? '')
          .split(/\n{2,}/)
          .map((part) => part.trim())
          .filter(Boolean),
        columns: (doc.footer?.columns ?? []).flatMap((column, index): FooterColumn[] => {
          const links = toLinks(column.links)
          return links.length > 0 ? [{ id: column.id ?? `column-${index}`, title: column.title.trim(), links }] : []
        }),
        legalText: doc.footer?.legalText?.trim() ?? '',
        legalLinks: toLinks(doc.footer?.legalLinks),
        regionLabel: doc.footer?.regionLabel?.trim() ?? '',
      },
    }
  } catch (err) {
    payload.logger.error({ err, msg: 'Gagal memuat pengaturan navbar dan footer' })
    return EMPTY
  }
})