'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import { useLocale, useTranslations } from 'next-intl'
import { Moon, Sun } from 'lucide-react'

import { Link } from '@/i18n/navigation'
import styles from './landing.module.css'

const REPO_URL = 'https://github.com/mateusarcedev/sql-vault'
const DOCS_URL = `${REPO_URL}#readme`
const MARKETPLACE_URL =
  'https://marketplace.visualstudio.com/items?itemName=mateusarcedev.sqlvault'
const AUTHOR_URL = 'https://www.mateusarce.dev/'
const THEME_STORAGE_KEY = 'sql-vault-landing-theme'

type Theme = 'dark' | 'light'

const FEATURE_KEYS = ['queries', 'routines', 'versions', 'portability', 'palette', 'ai'] as const
const STAT_KEYS = ['postgres', 'crypto', 'portability', 'locales'] as const
const SECURITY_KEYS = ['isolation', 'keys', 'credentials', 'auth'] as const

const SHOWCASE = [
  { key: 'queries', src: '/screenshots/consultas.jpg' },
  { key: 'detail', src: '/screenshots/detalhe-consulta.jpg' },
  { key: 'routines', src: '/screenshots/rotinas.jpg' },
] as const

const SELF_HOSTED_STEPS = [
  {
    key: 'stepClone',
    command: 'git clone https://github.com/mateusarcedev/sql-vault.git && cd sql-vault && cp .env.example .env',
  },
  { key: 'stepSecrets', command: null },
  { key: 'stepUp', command: 'docker compose up --build -d' },
  { key: 'stepOpen', command: null },
] as const

const LOCALE_OPTIONS = [
  { code: 'en', label: 'EN' },
  { code: 'pt-BR', label: 'PT' },
] as const

function useLandingTheme() {
  const [theme, setTheme] = useState<Theme>('dark')

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(THEME_STORAGE_KEY)
      if (stored === 'light' || stored === 'dark') setTheme(stored)
    } catch {
      // Storage indisponível: o tema escuro continua como padrão.
    }
  }, [])

  const toggleTheme = () => {
    const next: Theme = theme === 'dark' ? 'light' : 'dark'
    setTheme(next)
    try {
      window.localStorage.setItem(THEME_STORAGE_KEY, next)
    } catch {
      // Sem persistência: a preferência vale apenas para esta visita.
    }
  }

  return { theme, toggleTheme }
}

function SectionHead({ id, num, title }: { id: string; num: string; title: string }) {
  return (
    <div className={styles.secHead}>
      <span className={styles.secNum}>{num}</span>
      <h2 id={id} className={styles.secTitle}>
        {title}
      </h2>
      <span className={styles.secRule} aria-hidden="true" />
    </div>
  )
}

export function LandingPage() {
  const t = useTranslations('landing')
  const locale = useLocale()
  const { theme, toggleTheme } = useLandingTheme()

  return (
    <div className={styles.root} data-theme={theme}>
      <header className={styles.topbar}>
        <div className={styles.topbarInner}>
          <Link href="/" className={styles.brand} aria-label="SQL Vault">
            <span className={styles.brandMark} aria-hidden="true">
              &gt;_
            </span>
            <span>SQL Vault</span>
          </Link>

          <nav className={styles.topbarNav} aria-label={t('nav.features')}>
            <a href="#features">{t('nav.features')}</a>
            <a href="#vscode">{t('nav.vscode')}</a>
            <a href="#self-hosted">{t('nav.selfHosted')}</a>
          </nav>

          <div className={styles.topbarActions}>
            <div className={styles.segmented} role="group" aria-label={t('nav.language')}>
              {LOCALE_OPTIONS.map((option) => (
                <Link
                  key={option.code}
                  href="/"
                  locale={option.code}
                  hrefLang={option.code}
                  className={styles.segment}
                  aria-current={locale === option.code ? 'true' : undefined}
                >
                  {option.label}
                </Link>
              ))}
            </div>

            <button
              type="button"
              className={styles.iconBtn}
              onClick={toggleTheme}
              aria-label={t('nav.theme')}
              title={t('nav.theme')}
            >
              {theme === 'dark' ? (
                <Sun size={15} aria-hidden="true" />
              ) : (
                <Moon size={15} aria-hidden="true" />
              )}
            </button>

            <a href="#self-hosted" className={`${styles.btn} ${styles.btnPrimary}`}>
              {t('nav.install')}
            </a>
          </div>
        </div>
      </header>

      <main>
        <section className={styles.hero} aria-labelledby="hero-title">
          <div className={styles.container}>
            <div className={styles.heroGrid}>
              <div>
                <span className={styles.badge}>{t('hero.eyebrow')}</span>
                <h1 id="hero-title" className={styles.heroTitle}>
                  {t('hero.titleLead')} <span className={styles.accent}>{t('hero.titleAccent')}</span>
                </h1>
                <p className={styles.lead}>{t('hero.description')}</p>
                <div className={styles.actions}>
                  <a href="#self-hosted" className={`${styles.btn} ${styles.btnPrimary}`}>
                    {t('hero.ctaPrimary')}
                  </a>
                  <a
                    href={REPO_URL}
                    target="_blank"
                    rel="noreferrer"
                    className={`${styles.btn} ${styles.btnGhost}`}
                  >
                    {t('hero.ctaSecondary')}
                  </a>
                </div>
              </div>

              <div className={styles.consoleWindow}>
                <div className={styles.consoleTop}>
                  <span className={styles.lights} aria-hidden="true">
                    <span />
                    <span />
                    <span />
                  </span>
                  <span className={styles.path}>{t('hero.consolePath')}</span>
                  <span className={styles.live}>
                    <span className={styles.statusDot} aria-hidden="true" />
                    {t('hero.consoleLive')}
                  </span>
                </div>
                <Image
                  src="/screenshots/dashboard.jpg"
                  alt={t('hero.screenshotAlt')}
                  width={1918}
                  height={928}
                  priority
                  sizes="(min-width: 960px) 58vw, 100vw"
                  className={styles.shot}
                />
              </div>
            </div>
          </div>
        </section>

        <div className={styles.container}>
          <dl className={styles.stats}>
            {STAT_KEYS.map((key) => (
              <div className={styles.stat} key={key}>
                <dt className={styles.statValue}>{t(`stats.${key}.value`)}</dt>
                <dd className={styles.statLabel}>{t(`stats.${key}.label`)}</dd>
              </div>
            ))}
          </dl>
        </div>

        <section id="features" className={styles.section} aria-labelledby="features-title">
          <div className={styles.container}>
            <SectionHead id="features-title" num="01" title={t('features.title')} />
            <div className={styles.grid3}>
              {FEATURE_KEYS.map((key) => (
                <article key={key} className={styles.card}>
                  <span className={styles.cardMark} aria-hidden="true">
                    &gt;
                  </span>
                  <h3 className={styles.cardTitle}>{t(`features.${key}.title`)}</h3>
                  <p className={styles.cardText}>{t(`features.${key}.description`)}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className={styles.section} aria-labelledby="showcase-title">
          <div className={styles.container}>
            <SectionHead id="showcase-title" num="02" title={t('showcase.title')} />
            <div className={styles.shots}>
              {SHOWCASE.map(({ key, src }) => (
                <figure key={key} className={styles.shotFigure}>
                  <div className={styles.shotFrame}>
                    <Image
                      src={src}
                      alt=""
                      width={1918}
                      height={928}
                      sizes="(min-width: 960px) 30vw, 100vw"
                      className={styles.shot}
                    />
                  </div>
                  <figcaption className={styles.shotCaption}>{t(`showcase.${key}`)}</figcaption>
                </figure>
              ))}
            </div>
          </div>
        </section>

        <section id="vscode" className={styles.section} aria-labelledby="vscode-title">
          <div className={styles.container}>
            <SectionHead id="vscode-title" num="03" title={t('vscode.title')} />
            <div className={styles.split}>
              <div>
                <p className={styles.lead}>{t('vscode.description')}</p>
                <ul className={styles.bullets}>
                  <li>{t('vscode.pointSearch')}</li>
                  <li>{t('vscode.pointSave')}</li>
                  <li>{t('vscode.pointToken')}</li>
                </ul>
                <a
                  href={MARKETPLACE_URL}
                  target="_blank"
                  rel="noreferrer"
                  className={`${styles.btn} ${styles.btnGhost}`}
                >
                  {t('vscode.cta')}
                </a>
              </div>
              <figure className={styles.shotFigure}>
                <div className={styles.shotFrame}>
                  <Image
                    src="/screenshots/extensao-vscode-salvar-query.jpg"
                    alt=""
                    width={2920}
                    height={1664}
                    sizes="(min-width: 960px) 55vw, 100vw"
                    className={styles.shot}
                  />
                </div>
                <figcaption className={styles.shotCaption}>{t('vscode.caption')}</figcaption>
              </figure>
            </div>
          </div>
        </section>

        <section id="self-hosted" className={styles.section} aria-labelledby="self-hosted-title">
          <div className={styles.container}>
            <SectionHead id="self-hosted-title" num="04" title={t('selfHosted.title')} />
            <div className={styles.split}>
              <div>
                <p className={styles.lead}>{t('selfHosted.description')}</p>
                <p className={styles.note}>{t('selfHosted.note')}</p>
              </div>
              <ol className={styles.steps}>
                {SELF_HOSTED_STEPS.map(({ key, command }) => (
                  <li key={key} className={styles.step}>
                    <p className={styles.stepLabel}>{t(`selfHosted.${key}`)}</p>
                    {command && (
                      <pre className={styles.code}>
                        <span className={styles.prompt} aria-hidden="true">
                          ${' '}
                        </span>
                        {command}
                      </pre>
                    )}
                  </li>
                ))}
              </ol>
            </div>
          </div>
        </section>

        <section className={styles.section} aria-labelledby="security-title">
          <div className={styles.container}>
            <SectionHead id="security-title" num="05" title={t('security.title')} />
            <div className={styles.grid2}>
              {SECURITY_KEYS.map((key) => (
                <article key={key} className={styles.card}>
                  <span className={styles.cardMark} aria-hidden="true">
                    &gt;
                  </span>
                  <h3 className={styles.cardTitle}>{t(`security.${key}Title`)}</h3>
                  <p className={styles.cardText}>{t(`security.${key}Text`)}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className={styles.section} aria-labelledby="cta-title">
          <div className={styles.container}>
            <div className={styles.ctaBox}>
              <h2 id="cta-title" className={styles.ctaTitle}>
                {t('cta.title')}
              </h2>
              <div className={styles.actions}>
                <a href="#self-hosted" className={`${styles.btn} ${styles.btnPrimary}`}>
                  {t('cta.primary')}
                </a>
                <a
                  href={REPO_URL}
                  target="_blank"
                  rel="noreferrer"
                  className={`${styles.btn} ${styles.btnGhost}`}
                >
                  {t('cta.secondary')}
                </a>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className={styles.footer}>
        <div className={`${styles.container} ${styles.footerInner}`}>
          <span>
            {t('footer.license')} · <a href={AUTHOR_URL} target="_blank" rel="noreferrer">{t('footer.credit')}</a>
          </span>
          <nav className={styles.footerLinks} aria-label="Links">
            <a href={REPO_URL} target="_blank" rel="noreferrer">
              {t('footer.github')}
            </a>
            <a href={DOCS_URL} target="_blank" rel="noreferrer">
              {t('footer.docs')}
            </a>
            <a href={MARKETPLACE_URL} target="_blank" rel="noreferrer">
              {t('footer.marketplace')}
            </a>
          </nav>
        </div>
      </footer>
    </div>
  )
}
