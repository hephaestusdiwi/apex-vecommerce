'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import type { SiteSettings } from '@/content/site'

const isActive = (href: string, pathname: string): boolean => {
  if (href === '/') return pathname === '/' || pathname.startsWith('/work')
  if (!href.startsWith('/')) return false
  return pathname === href || pathname.startsWith(`${href}/`)
}

const focusRing = 'focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent'

export function SiteNav({ items, showCart }: { items: SiteSettings['navigation']; showCart: boolean }) {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)
  const links = [
    ...items,
    ...[{ label: 'Toko', href: '/shop' }, ...(showCart ? [] : [{ label: 'Keranjang', href: '/cart' }])].filter(
      (defaultLink) => !items.some((item) => item.href === defaultLink.href),
    ),
  ]

  useEffect(() => {
    setOpen(false)
  }, [pathname])

  useEffect(() => {
    if (!open) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  const renderLink = (item: { label: string; href: string }, className: string, active: boolean) =>
    item.href.startsWith('/') ? (
      <Link href={item.href} className={className} aria-current={active ? 'page' : undefined}>
        {item.label}
      </Link>
    ) : (
      <a href={item.href} className={className}>
        {item.label}
      </a>
    )

  return (
    <>
      <nav aria-label="Utama" className="hidden flex-1 md:block">
        <ul className="flex items-center justify-center gap-8">
          {links.map((item, i) => {
            const active = isActive(item.href, pathname)
            return (
              <li key={`${item.href}-${i}`}>
                {renderLink(
                  item,
                  `text-xs transition-colors ${focusRing} ${active ? 'text-ink' : 'text-ink/80 can-hover:hover:text-ink'}`,
                  active,
                )}
              </li>
            )
          })}
        </ul>
      </nav>

      <div className="ml-auto flex items-center gap-5 md:ml-0">
        {showCart ? (
          <Link href="/cart" aria-label="Keranjang" className={`text-ink/80 transition-colors can-hover:hover:text-ink ${focusRing}`}>
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" aria-hidden="true">
              <path d="M5.5 8.5h13l-1 11h-11z" />
              <path d="M9 8.5V7a3 3 0 0 1 6 0v1.5" />
            </svg>
          </Link>
        ) : null}
        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          aria-expanded={open}
          aria-controls="site-menu"
          aria-label={open ? 'Tutup menu' : 'Buka menu'}
          className={`md:hidden ${focusRing}`}
        >
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" aria-hidden="true">
            {open ? <path d="M6 6l12 12M18 6L6 18" /> : <path d="M4 9h16M4 15h16" />}
          </svg>
        </button>
      </div>

      {open ? (
        <nav
          id="site-menu"
          aria-label="Menu"
          className="absolute inset-x-0 top-full border-t border-hairline bg-paper/95 px-[4%] pb-8 pt-4 backdrop-blur-xl md:hidden"
        >
          <ul>
            {links.map((item, i) => {
              const active = isActive(item.href, pathname)
              return (
                <li key={`${item.href}-${i}`}>
                  {renderLink(item, `block py-3 text-2xl font-semibold tracking-tight ${focusRing}`, active)}
                </li>
              )
            })}
          </ul>
        </nav>
      ) : null}
    </>
  )
}