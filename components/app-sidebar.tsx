'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  Database,
  Home,
  FileCode2,
  Code2,
  Tags,
  Trash2,
  Star,
  Plus,
  LogOut,
  User,
  Settings,
  Search,
} from 'lucide-react'

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarSeparator,
} from '@/components/ui/sidebar'
import { Button } from '@/components/ui/button'
import { useQueryStore } from '@/store/query-store'
import { useRoutineStore } from '@/store/routine-store'
import { useUIStore } from '@/store/ui-store'
import { useSession, signOut } from 'next-auth/react'

const mainNavItems = [
  {
    title: 'Dashboard',
    url: '/',
    icon: Home,
  },
  {
    title: 'Consultas',
    url: '/consultas',
    icon: FileCode2,
  },
  {
    title: 'Rotinas',
    url: '/routines',
    icon: Code2,
  },
  {
    title: 'Favoritas',
    url: '/consultas?favoritas=true',
    icon: Star,
  },
]

const manageNavItems = [
  {
    title: 'Tags',
    url: '/tags',
    icon: Tags,
  },
  {
    title: 'Lixeira',
    url: '/lixeira',
    icon: Trash2,
  },
  {
    title: 'Configurações',
    url: '/settings',
    icon: Settings,
  },
]

export function AppSidebar() {
  const pathname = usePathname()
  const { data: session } = useSession()
  const { getStats } = useQueryStore()
  const { listRoutines } = useRoutineStore()
  const { openCommandPalette } = useUIStore()
  const stats = getStats()
  const activeRoutinesCount = listRoutines().length

  const isActive = (url: string) => {
    if (url === '/') return pathname === '/'
    if (url.includes('?')) {
      return pathname + (typeof window !== 'undefined' ? window.location.search : '') === url
    }
    return pathname.startsWith(url)
  }

  return (
    <Sidebar>
      <SidebarHeader className="p-4">
        <Link href="/" className="flex items-center gap-2 mb-4">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
            <Database className="h-4 w-4 text-primary-foreground" />
          </div>
          <span className="text-lg font-semibold">SQL Vault</span>
        </Link>
        <Button
          variant="outline"
          className="w-full justify-start text-muted-foreground shadow-none"
          onClick={openCommandPalette}
        >
          <Search className="mr-2 h-4 w-4" />
          <span className="flex-1 text-left">Buscar...</span>
          <kbd className="pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground opacity-100">
            <span className="text-xs">⌘</span>K
          </kbd>
        </Button>
      </SidebarHeader>

      <SidebarSeparator />

      <SidebarContent>
        <SidebarGroup>
          <div className="px-2 py-2">
            <Button asChild className="w-full justify-start gap-2">
              <Link href="/consultas?nova=true">
                <Plus className="h-4 w-4" />
                Nova Consulta
              </Link>
            </Button>
          </div>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Menu</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {mainNavItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild isActive={isActive(item.url)}>
                    <Link href={item.url} className="flex justify-between w-full">
                      <div className="flex items-center gap-2">
                        <item.icon className="h-4 w-4" />
                        <span>{item.title}</span>
                      </div>
                      {item.title === 'Rotinas' && activeRoutinesCount > 0 && (
                        <span className="ml-auto inline-flex items-center justify-center rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">
                          {activeRoutinesCount}
                        </span>
                      )}
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Gerenciar</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {manageNavItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild isActive={isActive(item.url)}>
                    <Link href={item.url}>
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-4 space-y-4">
        <div className="rounded-lg border bg-muted/50 p-3">
          <div className="text-xs font-medium text-muted-foreground">
            Total de consultas
          </div>
          <div className="mt-1 text-2xl font-bold">{stats.totalQueries}</div>
          <div className="mt-2 flex items-center gap-4 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Star className="h-3 w-3" />
              {stats.favoriteCount}
            </span>
            <span className="flex items-center gap-1">
              <FileCode2 className="h-3 w-3" />
              {stats.totalCopies} cópias
            </span>
          </div>
        </div>

        {session?.user && (
          <div className="flex items-center justify-between gap-2 px-1">
            <div className="flex items-center gap-2 overflow-hidden">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-zinc-800">
                <User className="h-4 w-4" />
              </div>
              <div className="flex flex-col overflow-hidden">
                <span className="truncate text-sm font-medium">
                  {session.user.name || session.user.email}
                </span>
                <span className="truncate text-xs text-muted-foreground">
                  {session.user.email}
                </span>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground hover:text-destructive"
              onClick={() => signOut({ callbackUrl: '/login' })}
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        )}
      </SidebarFooter>
    </Sidebar>
  )
}
