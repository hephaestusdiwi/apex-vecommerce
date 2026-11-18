import { cache } from 'react'
import { getPayloadClient } from '@/lib/payload'
import { toMedia, toVideoAsset } from './mapper'
import type { MediaAsset, VideoAsset } from './types'

export type HomeFeatureStat = { id: string; label: string; value: string; icon: 'none' | 'video' }
export type HomeFeatureTab = {
  id: string
  tab: string
  title: string
  description: string
  image: MediaAsset | null
  video: VideoAsset | null
}

export type HomeFeatureSection = {
  id: string
  eyebrow: string
  heading: string
  body: string
  bodyHighlight: string
  stats: HomeFeatureStat[]
  imageLeft: MediaAsset | null
  imageRight: MediaAsset | null
  tabsHeading: string
  tabsSize: 'normal' | 'large' | 'full'
  tabs: HomeFeatureTab[]
}

export const getHomeFeatureSections = cache(async (): Promise<HomeFeatureSection[]> => {
  const payload = await getPayloadClient()
  try {
    const doc = await payload.findGlobal({ slug: 'home-features', depth: 1, overrideAccess: false })
    return (doc.sections ?? []).flatMap((row, index): HomeFeatureSection[] => {
      const heading = row.heading?.trim()
      if (row.enabled === false || !heading) return []
      const sectionId = row.id ?? `home-feature-${index}`
      return [
        {
          id: sectionId,
          eyebrow: row.eyebrow?.trim() ?? '',
          heading,
          body: row.body?.trim() ?? '',
          bodyHighlight: row.bodyHighlight?.trim() ?? '',
          stats: (row.stats ?? []).flatMap((stat, i): HomeFeatureStat[] => {
            const value = stat.value?.trim() ?? ''
            const icon = stat.icon === 'video' ? 'video' : 'none'
            return value || icon !== 'none'
              ? [{ id: stat.id ?? `${sectionId}-stat-${i}`, label: stat.label.trim(), value, icon }]
              : []
          }),
          imageLeft: toMedia(row.imageLeft),
          imageRight: toMedia(row.imageRight),
          tabsHeading: row.tabsHeading?.trim() ?? '',
          tabsSize: row.tabsSize === 'normal' || row.tabsSize === 'full' ? row.tabsSize : 'large',
          tabs: (row.tabs ?? []).flatMap((tab, i): HomeFeatureTab[] => {
            const image = toMedia(tab.image)
            const video = toVideoAsset(tab.video)
            if (!image && !video) return []
            return [
              {
                id: tab.id ?? `${sectionId}-tab-${i}`,
                tab: tab.tab.trim(),
                title: tab.title.trim(),
                description: tab.description.trim(),
                image,
                video,
              },
            ]
          }),
        },
      ]
    })
  } catch (err) {
    payload.logger.error({ err, msg: 'Gagal memuat seksi fitur beranda' })
    return []
  }
})