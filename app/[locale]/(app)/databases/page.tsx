'use client'

import { useEffect, useMemo, useState } from 'react'
import { useTranslations } from 'next-intl'
import { toast } from 'sonner'
import { Plus, Pencil, Trash2, Database, Globe, UserRound } from 'lucide-react'

import { AppHeader } from '@/components/app-header'
import { DatabaseContextDrawer } from '@/components/database-context-drawer'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { useDatabaseContextStore } from '@/store/database-context-store'

type Scope = 'mine' | 'public' | 'all'

const TYPE_LABELS = {
  postgresql: 'PostgreSQL',
  mysql: 'MySQL',
  sqlite: 'SQLite',
  sqlserver: 'SQL Server',
  oracle: 'Oracle',
  other: 'Other',
} as const

export default function DatabasesPage() {
  const t = useTranslations('databaseContexts')
  const tCommon = useTranslations('common')

  const {
    isLoading,
    isInitialized,
    isSubmitting,
    scope,
    initialize,
    setScope,
    listContexts,
    deleteContext,
  } = useDatabaseContextStore()

  const [drawerOpen, setDrawerOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)

  useEffect(() => {
    if (!isInitialized && !isLoading) {
      initialize('mine')
    }
  }, [isInitialized, isLoading, initialize])

  const contexts = useMemo(() => listContexts(), [listContexts, scope, isLoading, isSubmitting])

  const handleCreate = () => {
    setEditingId(null)
    setDrawerOpen(true)
  }

  const handleEdit = (id: string) => {
    setEditingId(id)
    setDrawerOpen(true)
  }

  const handleDelete = async (id: string) => {
    try {
      await deleteContext(id)
      toast.success(t('deleteSuccess'))
    } catch {
      toast.error(t('deleteError'))
    }
  }

  const canManage = scope === 'mine'

  return (
    <>
      <AppHeader title={t('pageTitle')} showSearch={false} />

      <main className="flex-1 overflow-auto p-6">
        <div className="mx-auto max-w-7xl space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-2xl font-bold tracking-tight">{t('sectionTitle')}</h2>
              <p className="text-muted-foreground">{t('sectionDescription')}</p>
            </div>

            <Button onClick={handleCreate} className="gap-2">
              <Plus className="h-4 w-4" />
              {t('newContext')}
            </Button>
          </div>

          <Tabs value={scope} onValueChange={(value) => setScope(value as Scope)}>
            <TabsList className="h-11 w-full justify-start rounded-xl p-1 sm:w-fit">
              <TabsTrigger value="mine" className="h-9 px-4 text-sm font-medium data-[state=active]:font-semibold">
                {t('scopes.mine')}
              </TabsTrigger>
              <TabsTrigger value="public" className="h-9 px-4 text-sm font-medium data-[state=active]:font-semibold">
                {t('scopes.public')}
              </TabsTrigger>
              <TabsTrigger value="all" className="h-9 px-4 text-sm font-medium data-[state=active]:font-semibold">
                {t('scopes.all')}
              </TabsTrigger>
            </TabsList>
          </Tabs>

          <Card>
            <CardHeader>
              <CardTitle>{t('table.title')}</CardTitle>
              <CardDescription>
                {canManage ? t('table.descriptionMine') : t('table.descriptionReadOnly')}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="py-8 text-center text-muted-foreground">{t('loading')}</div>
              ) : contexts.length === 0 ? (
                <div className="py-12 border-2 border-dashed rounded-lg flex flex-col items-center justify-center text-muted-foreground">
                  <Database className="h-8 w-8 mb-2 opacity-20" />
                  <p>{t('empty')}</p>
                </div>
              ) : (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t('table.name')}</TableHead>
                        <TableHead>{t('table.type')}</TableHead>
                        <TableHead>{t('table.schemaFormat')}</TableHead>
                        <TableHead>{t('table.visibility')}</TableHead>
                        <TableHead>{t('table.owner')}</TableHead>
                        {canManage && <TableHead className="w-32" />}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {contexts.map((context) => (
                        <TableRow key={context.id}>
                          <TableCell>
                            <div>
                              <p className="font-medium">{context.name}</p>
                              {context.description && (
                                <p className="text-xs text-muted-foreground line-clamp-1">
                                  {context.description}
                                </p>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>{TYPE_LABELS[context.type]}</TableCell>
                          <TableCell className="uppercase">{context.schemaFormat}</TableCell>
                          <TableCell>
                            {context.isPublic ? (
                              <Badge variant="secondary" className="gap-1">
                                <Globe className="h-3 w-3" />
                                {t('visibility.public')}
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="gap-1">
                                <UserRound className="h-3 w-3" />
                                {t('visibility.private')}
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {context.owner?.name || t('ownerFallback')}
                          </TableCell>
                          {canManage && (
                            <TableCell>
                              <div className="flex items-center gap-1 justify-end">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8"
                                  onClick={() => handleEdit(context.id)}
                                >
                                  <Pencil className="h-4 w-4" />
                                </Button>
                                <AlertDialog>
                                  <AlertDialogTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </AlertDialogTrigger>
                                  <AlertDialogContent>
                                    <AlertDialogHeader>
                                      <AlertDialogTitle>{t('deleteTitle')}</AlertDialogTitle>
                                      <AlertDialogDescription>
                                        {t('deleteDescription', { name: context.name })}
                                      </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                      <AlertDialogCancel>{tCommon('cancel')}</AlertDialogCancel>
                                      <AlertDialogAction
                                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                        onClick={() => handleDelete(context.id)}
                                      >
                                        {tCommon('delete')}
                                      </AlertDialogAction>
                                    </AlertDialogFooter>
                                  </AlertDialogContent>
                                </AlertDialog>
                              </div>
                            </TableCell>
                          )}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>

      <DatabaseContextDrawer
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        contextId={editingId}
        onSaved={() => initialize(scope)}
      />
    </>
  )
}
