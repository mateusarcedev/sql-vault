'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  Database,
  Home,
  FileCode2,
  Tags,
  Trash2,
  Star,
  Plus,
  LogOut,
  User,
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
]

export function AppSidebar() {
  const pathname = usePathname()
  const { data: session } = useSession()
  const { getStats } = useQueryStore()
  const stats = getStats()

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
        <Link href="/" className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
            <Database className="h-4 w-4 text-primary-foreground" />
          </div>
          <span className="text-lg font-semibold">SQL Vault</span>
        </Link>
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
