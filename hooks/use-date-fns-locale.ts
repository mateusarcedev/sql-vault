import { useLocale } from 'next-intl'
import { ptBR, enUS, type Locale } from 'date-fns/locale'

const localeMap: Record<string, Locale> = {
  'en': enUS,
  'pt-BR': ptBR,
}

export function useDateFnsLocale(): Locale {
  const locale = useLocale()
  return localeMap[locale] ?? enUS
}
