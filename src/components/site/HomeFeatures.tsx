import Image from 'next/image'
import type { HomeFeatureSection } from '@/content/homeFeatures'
import type { MediaAsset } from '@/content/types'
import { focalPosition } from '@/lib/focal'
import { Reveal } from '../shop/Reveal'
import { FeatureTabs } from './FeatureTabs'

const TABS_WIDTH = { normal: 'max-w-[52rem]', large: 'max-w-5xl', full: 'max-w-none' } as const

const Picture = ({ image, sizes }: { image: MediaAsset; sizes: string }) => (
    <Image
        src={image.src}
        alt={image.src}
        width={image.width}
        height={image.height}
        sizes={sizes}
        className="h-auto w-full"
        style={{ objectPosition: focalPosition(image) }}
    />
)


const VideoIcon = () => (
  <svg
    viewBox="0 0 28 22"
    width="28"
    height="22"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.6"
    strokeLinejoin="round"
    role="img"
    aria-label="Tersedia"
  >
    <rect x="1.5" y="3" width="17" height="16" rx="4" />
    <path d="M19 9l7-4v12l-7-4" />
  </svg>
)

export function HomeFeatures({ sections }: { sections: HomeFeatureSection[] }) {
  return (
    <>
      {sections.map((section) => {
        const headingId = `home-feature-${section.id}`
        return (
          <section key={section.id} aria-labelledby={headingId} className="py-16 md:py-24">
            <div className="store-container">
              <Reveal className="mx-auto max-w-3xl">
                {section.eyebrow ? <p className="text-sm font-semibold">{section.eyebrow}</p> : null}
                <h2
                  id={headingId}
                  className="mt-2 whitespace-pre-line text-[clamp(2.25rem,5vw,3.5rem)] font-semibold leading-[1.05] tracking-tight"
                >
                  {section.heading}
                </h2>
                {section.body || section.bodyHighlight ? (
                  <p className="mt-6 max-w-[34rem] text-[0.9375rem] leading-relaxed text-mute">
                    {section.body}
                    {section.body && section.bodyHighlight ? ' ' : null}
                    {section.bodyHighlight ? <span className="text-ink">{section.bodyHighlight}</span> : null}
                  </p>
                ) : null}

                {section.stats.length > 0 || section.imageLeft || section.imageRight ? (
                  <div className="mt-12 grid items-start gap-10 md:grid-cols-2 md:gap-8">
                    <div className="flex flex-col gap-10">
                      {section.stats.length > 0 ? (
                        <dl className="grid grid-cols-2 gap-x-6 gap-y-8">
                          {section.stats.map((stat) => (
                            <div key={stat.id} className="flex flex-col">
                              <dt className="text-xs leading-snug">{stat.label}</dt>
                              <dd className="mt-1 text-[1.75rem] font-semibold leading-tight tracking-tight">
                                {stat.value || <VideoIcon />}
                              </dd>
                            </div>
                          ))}
                        </dl>
                      ) : null}
                      {section.imageLeft ? <Picture image={section.imageLeft} sizes="(min-width: 768px) 24rem, 90vw" /> : null}
                    </div>
                    {section.imageRight ? (
                      <div className="md:-mt-24">
                        <Picture image={section.imageRight} sizes="(min-width: 768px) 24rem, 90vw" />
                      </div>
                    ) : null}
                  </div>
                ) : null}
              </Reveal>

              {section.tabs.length > 0 ? (
                <Reveal className={`mx-auto mt-24 md:mt-32 ${TABS_WIDTH[section.tabsSize]}`}>
                  {section.tabsHeading ? (
                    <h3 className="mb-6 text-2xl font-semibold tracking-tight md:text-3xl">{section.tabsHeading}</h3>
                  ) : null}
                  <FeatureTabs tabs={section.tabs} />
                </Reveal>
              ) : null}
            </div>
          </section>
        )
      })}
    </>
  )
}