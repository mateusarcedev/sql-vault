'use client'

import { usePathname } from '@/i18n/navigation'
import { Link } from '@/i18n/navigation'
import { useLocale, useTranslations } from 'next-intl'
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
import { LocaleSwitcher } from '@/components/locale-switcher'
import { ThemeToggle } from '@/components/theme-toggle'
import { useQueryStore } from '@/store/query-store'
import { useRoutineStore } from '@/store/routine-store'
import { useUIStore } from '@/store/ui-store'
import { useSession, signOut } from 'next-auth/react'

export function AppSidebar() {
  const t = useTranslations('nav')
  const tCommon = useTranslations('common')
  const locale = useLocale()
  const pathname = usePathname()
  const { data: session } = useSession()
  const { getStats } = useQueryStore()
  const { listRoutines } = useRoutineStore()
  const { openCommandPalette } = useUIStore()
  const stats = getStats()
  const activeRoutinesCount = listRoutines().length

  const mainNavItems = [
    { titleKey: 'dashboard', url: '/', icon: Home },
    { titleKey: 'queries', url: '/consultas', icon: FileCode2 },
    { titleKey: 'routines', url: '/routines', icon: Code2 },
    { titleKey: 'favorites', url: '/consultas?favoritas=true', icon: Star },
  ]

  const manageNavItems = [
    { titleKey: 'tags', url: '/tags', icon: Tags },
    { titleKey: 'trash', url: '/lixeira', icon: Trash2 },
    { titleKey: 'settings', url: '/settings', icon: Settings },
  ]

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
          <span className="flex-1 text-left">{t('search')}</span>
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
                {t('newQuery')}
              </Link>
            </Button>
          </div>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>{t('menu')}</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {mainNavItems.map((item) => (
                <SidebarMenuItem key={item.titleKey}>
                  <SidebarMenuButton asChild isActive={isActive(item.url)}>
                    <Link href={item.url} className="flex justify-between w-full">
                      <div className="flex items-center gap-2">
                        <item.icon className="h-4 w-4" />
                        <span>{t(item.titleKey as any)}</span>
                      </div>
                      {item.titleKey === 'routines' && activeRoutinesCount > 0 && (
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
          <SidebarGroupLabel>{t('manage')}</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {manageNavItems.map((item) => (
                <SidebarMenuItem key={item.titleKey}>
                  <SidebarMenuButton asChild isActive={isActive(item.url)}>
                    <Link href={item.url}>
                      <item.icon className="h-4 w-4" />
                      <span>{t(item.titleKey as any)}</span>
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
            {t('totalQueries')}
          </div>
          <div className="mt-1 text-2xl font-bold">{stats.totalQueries}</div>
          <div className="mt-2 flex items-center gap-4 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Star className="h-3 w-3" />
              {stats.favoriteCount}
            </span>
            <span className="flex items-center gap-1">
              <FileCode2 className="h-3 w-3" />
              {stats.totalCopies} {tCommon('copies')}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex-1">
            <LocaleSwitcher />
          </div>
          <ThemeToggle />
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
              onClick={() => signOut({ callbackUrl: `/${locale}/login` })}
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        )}
      </SidebarFooter>
    </Sidebar>
  )
}
