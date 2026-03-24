'use client'

import * as React from 'react'
import { useTranslations } from 'next-intl'
import { useRouter } from '@/i18n/navigation'
import { useQuery } from '@tanstack/react-query'
import { useDebounce } from '@/hooks/use-debounce'
import {
  FileCode2,
  Plus,
  Download,
  Settings,
  Hash,
  Database,
} from 'lucide-react'

import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command'
import { useUIStore } from '@/store/ui-store'
import { DATABASE_COLORS, type Query, type Tag } from '@/types/query'

export function CommandPalette() {
  const t = useTranslations('commandPalette')
  const router = useRouter()
  const { commandPaletteOpen, closeCommandPalette } = useUIStore()
  const [internalSearch, setInternalSearch] = React.useState('')
  const [debouncedSearch] = useDebounce(internalSearch, 200)

  const isTagSearch = debouncedSearch.startsWith('#')
  const searchTerm = isTagSearch
    ? debouncedSearch.slice(1).trim()
    : debouncedSearch.trim()

  const { data: searchResults, isLoading } = useQuery({
    queryKey: ['search', isTagSearch ? 'tags' : 'queries', searchTerm],
    queryFn: async () => {
      if (!searchTerm && !isTagSearch) return { queries: [], tags: [] }

      if (isTagSearch) {
        const res = await fetch('/api/tags')
        if (!res.ok) return { queries: [], tags: [] }
        const tags: Tag[] = await res.json()
        const term = searchTerm.toLowerCase()
        return {
          queries: [],
          tags: tags.filter(t => t.name.toLowerCase().includes(term))
        }
      }

      const res = await fetch(`/api/queries?search=${encodeURIComponent(searchTerm)}`)
      if (!res.ok) return { queries: [], tags: [] }
      const queries: Query[] = await res.json()
      return { queries: queries.slice(0, 8), tags: [] }
    },
    enabled: commandPaletteOpen
  })

  React.useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if ((e.key === 'k' || e.key === 'K') && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        useUIStore.getState().toggleCommandPalette()
      }
    }
    document.addEventListener('keydown', down)
    return () => document.removeEventListener('keydown', down)
  }, [])

  const runCommand = React.useCallback(
    (command: () => unknown) => {
      closeCommandPalette()
      setInternalSearch('')
      command()
    },
    [closeCommandPalette]
  )

  const queries = searchResults?.queries || []
  const tags = searchResults?.tags || []

  return (
    <CommandDialog open={commandPaletteOpen} onOpenChange={(open) => {
      if (!open) closeCommandPalette()
    }}>
      <CommandInput
        placeholder={t('placeholder')}
        value={internalSearch}
        onValueChange={setInternalSearch}
      />
      <CommandList>
        <CommandEmpty>
          {isLoading ? t('searching') : t('noResults', { search: internalSearch })}
        </CommandEmpty>

        {!isTagSearch && queries.length > 0 && (
          <CommandGroup heading={t('queriesGroup')}>
            {queries.map((query) => (
              <CommandItem
                key={query.id}
                value={query.title + query.id}
                onSelect={() => runCommand(() => router.push(`/consultas/${query.id}`))}
                className="flex items-center gap-2"
              >
                <div
                  className="h-2 w-2 rounded-full shrink-0"
                  style={{ backgroundColor: DATABASE_COLORS[query.database] || '#ccc' }}
                />
                <span className="truncate">{query.title}</span>
                <span className="ml-auto text-xs text-muted-foreground uppercase">
                  {query.database}
                </span>
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        {isTagSearch && tags.length > 0 && (
          <CommandGroup heading={t('tagsGroup')}>
            {tags.map((tag) => (
              <CommandItem
                key={tag.id}
                value={tag.name + tag.id}
                onSelect={() => runCommand(() => router.push(`/consultas?tag=${tag.id}`))}
                className="flex items-center gap-2"
              >
                <Hash className="h-4 w-4 shrink-0" style={{ color: tag.color || '#ccc' }} />
                <span>{tag.name}</span>
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        {!isTagSearch && !internalSearch && (
          <>
            <CommandGroup heading={t('quickActions')}>
              <CommandItem onSelect={() => runCommand(() => router.push('/consultas?nova=true'))}>
                <Plus className="mr-2 h-4 w-4" />
                <span>{t('newQuery')}</span>
              </CommandItem>
              <CommandItem onSelect={() => runCommand(() => {
                window.location.href = '/api/export'
              })}>
                <Download className="mr-2 h-4 w-4" />
                <span>{t('exportData')}</span>
              </CommandItem>
              <CommandItem onSelect={() => runCommand(() => router.push('/settings'))}>
                <Settings className="mr-2 h-4 w-4" />
                <span>{t('settings')}</span>
              </CommandItem>
            </CommandGroup>
          </>
        )}
      </CommandList>
    </CommandDialog>
  )
}
