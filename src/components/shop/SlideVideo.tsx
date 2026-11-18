'use client'

import { type CSSProperties, type SyntheticEvent, useContext, useEffect, useRef } from 'react'
import { SlideStateContext } from './MediaSlider'

type Props = { src: string; mimeType: string; poster?: string; className?: string; style?: CSSProperties }

export function SlideVideo({ src, mimeType, poster, className, style }: Props) {
  const ref = useRef<HTMLVideoElement>(null)
  const { current, playing, reportDuration } = useContext(SlideStateContext)
  const play = current && playing

  const handleLoadedMetadata = (event: SyntheticEvent<HTMLVideoElement>) => {
    const duration = event.currentTarget.duration
    if (Number.isFinite(duration) && duration > 0) {
      reportDuration?.(Math.round(duration * 1000))
    }
  }

  // Jaga-jaga jika metadata video sudah ter-cache oleh browser sebelum React selesai mount
  useEffect(() => {
    const video = ref.current
    if (!video) return
    if (video.readyState >= 1 && Number.isFinite(video.duration) && video.duration > 0) {
      reportDuration?.(Math.round(video.duration * 1000))
    }
  }, [reportDuration])

  // Putar atau jeda video mengikuti status aktif & tombol pause slider
  useEffect(() => {
    const video = ref.current
    if (!video) return
    if (play) {
      video.play().catch(() => {})
    } else {
      video.pause()
    }
  }, [play])

  // Reset posisi video ke awal setelah transisi keluar slide selesai
  useEffect(() => {
    if (current) return
    const timer = setTimeout(() => {
      if (ref.current) ref.current.currentTime = 0
    }, 600)
    return () => clearTimeout(timer)
  }, [current])

  return (
    <video
      ref={ref}
      muted
      loop
      playsInline
      preload="auto"
      poster={poster}
      aria-hidden="true"
      tabIndex={-1}
      onLoadedMetadata={handleLoadedMetadata}
      className={className}
      style={style}
    >
      {/* #t=0.001 membuat browser menampilkan frame pertama kalau tidak ada poster */}
      <source src={`${src}#t=0.001`} type={mimeType} />
    </video>
  )
}