'use client'

import { useLocale } from 'next-intl'
import { usePathname, useRouter } from '@/i18n/navigation'
import { routing } from '@/i18n/routing'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

const LOCALE_LABELS: Record<string, string> = {
  'en': 'English',
  'pt-BR': 'Português (BR)',
}

export function LocaleSwitcher() {
  const locale = useLocale()
  const router = useRouter()
  const pathname = usePathname()

  const handleChange = (newLocale: string) => {
    router.replace(pathname, { locale: newLocale })
  }

  return (
    <Select value={locale} onValueChange={handleChange}>
      <SelectTrigger className="w-full h-8 text-xs">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {routing.locales.map((loc) => (
          <SelectItem key={loc} value={loc} className="text-xs">
            {LOCALE_LABELS[loc]}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
