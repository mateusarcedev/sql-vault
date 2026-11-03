import type { Metadata } from 'next'
import { Geist_Mono } from 'next/font/google'
import { getTranslations } from 'next-intl/server'

import { LandingPage } from '@/components/landing/landing-page'

const landingMono = Geist_Mono({
  subsets: ['latin'],
  variable: '--font-landing-mono',
  display: 'swap',
})

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>
}): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'landing.meta' })

  return {
    title: t('title'),
    description: t('description'),
  }
}

export default function HomePage() {
  return (
    <div className={landingMono.variable}>
      <LandingPage />
    </div>
  )
}
