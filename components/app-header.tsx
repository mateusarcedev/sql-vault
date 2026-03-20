'use client'

import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { Search, Plus } from 'lucide-react'
import { useState, useEffect, useCallback } from 'react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { SidebarTrigger } from '@/components/ui/sidebar'
import { Separator } from '@/components/ui/separator'

interface AppHeaderProps {
  title: string
  showSearch?: boolean
  showNewButton?: boolean
}

export function AppHeader({
  title,
  showSearch = true,
  showNewButton = true,
}: AppHeaderProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [searchValue, setSearchValue] = useState(searchParams.get('busca') || '')

  useEffect(() => {
    setSearchValue(searchParams.get('busca') || '')
  }, [searchParams])

  const handleSearch = useCallback(
    (value: string) => {
      setSearchValue(value)
      const params = new URLSearchParams(searchParams.toString())
      if (value) {
        params.set('busca', value)
      } else {
        params.delete('busca')
      }
      router.push(`${pathname}?${params.toString()}`)
    },
    [pathname, router, searchParams]
  )

  const handleNewQuery = () => {
    router.push('/consultas?nova=true')
  }

  return (
    <header className="flex h-14 shrink-0 items-center gap-2 border-b px-4">
      <SidebarTrigger className="-ml-1" />
      <Separator orientation="vertical" className="mr-2 h-4" />
      <h1 className="text-lg font-semibold">{title}</h1>
      <div className="ml-auto flex items-center gap-2">
        {showSearch && (
          <div className="relative w-64">
            <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Buscar consultas..."
              className="pl-8"
              value={searchValue}
              onChange={(e) => handleSearch(e.target.value)}
            />
          </div>
        )}
        {showNewButton && (
          <Button onClick={handleNewQuery} size="sm">
            <Plus className="mr-1 h-4 w-4" />
            Nova Consulta
          </Button>
        )}
      </div>
    </header>
  )
}
