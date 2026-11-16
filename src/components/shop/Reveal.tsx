'use client'

import { useEffect, useRef, useState, type ReactNode } from 'react'

/**
 * Konten muncul halus (naik + memudar) saat masuk layar. Tanpa JavaScript atau dengan reduced motion, konten
 * tetap terlihat penuh; elemen yang sudah ada di layar saat dimuat tidak dianimasikan.
 */
export function Reveal({ children, className = '' }: { children: ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null)
  const [state, setState] = useState<'idle' | 'hidden' | 'shown'>('idle')

  useEffect(() => {
    const el = ref.current
    if (!el || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    if (el.getBoundingClientRect().top < window.innerHeight * 0.92) {
      setState('shown')
      return
    }
    setState('hidden')
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setState('shown')
          observer.disconnect()
        }
      },
      { threshold: 0.12 },
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  return (
    <div
      ref={ref}
      className={`transition-[opacity,transform] duration-700 ease-out motion-reduce:transition-none ${
        state === 'hidden' ? 'translate-y-10 opacity-0' : ''
      } ${className}`}
    >
      {children}
    </div>
  )
}
