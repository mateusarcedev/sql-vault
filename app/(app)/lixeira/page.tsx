'use client'

import { useEffect, useState } from 'react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { toast } from 'sonner'
import {
  Trash2,
  RotateCcw,
  AlertTriangle,
  Clock,
} from 'lucide-react'

import { AppHeader } from '@/components/app-header'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import {
  Empty,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
  EmptyDescription,
} from '@/components/ui/empty'
import { Skeleton } from '@/components/ui/skeleton'
import { DatabaseBadge } from '@/components/database-badge'
import { DeleteConfirmModal } from '@/components/delete-confirm-modal'
import { useQueryStore } from '@/store/query-store'
import type { Query } from '@/types/query'

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { useRoutineStore } from '@/store/routine-store'
import type { Routine } from '@/types/routine'

function TrashedQueryCard({
  query,
  onRestore,
  onDelete,
}: {
  query: Query
  onRestore: () => void
  onDelete: () => void
}) {
  return (
    <Card className="group">
      <CardContent className="flex items-center gap-4 p-4">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="truncate font-medium">{query.title}</p>
            <DatabaseBadge database={query.database} showLabel={false} />
          </div>
          <div className="mt-1 flex items-center gap-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              Excluído em {format(new Date(query.deletedAt!), "d 'de' MMM", { locale: ptBR })}
            </span>
          </div>
          {query.description && (
            <p className="mt-1 truncate text-sm text-muted-foreground">
              {query.description}
            </p>
          )}
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={onRestore}
            className="gap-1"
          >
            <RotateCcw className="h-4 w-4" />
            Restaurar
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={onDelete}
            className="gap-1 text-destructive hover:text-destructive"
          >
            <Trash2 className="h-4 w-4" />
            Excluir
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

function TrashedRoutineCard({
  routine,
  onRestore,
  onDelete,
}: {
  routine: Routine
  onRestore: () => void
  onDelete: () => void
}) {
  return (
    <Card className="group">
      <CardContent className="flex items-center gap-4 p-4">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="truncate font-medium">{routine.name}</p>
            <DatabaseBadge database={routine.database} showLabel={false} />
            <Badge variant="outline" className="text-[10px] uppercase">
              {routine.type}
            </Badge>
          </div>
          <div className="mt-1 flex items-center gap-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              Excluído em {format(new Date(routine.deletedAt!), "d 'de' MMM", { locale: ptBR })}
            </span>
          </div>
          {routine.description && (
            <p className="mt-1 truncate text-sm text-muted-foreground">
              {routine.description}
            </p>
          )}
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={onRestore}
            className="gap-1"
          >
            <RotateCcw className="h-4 w-4" />
            Restaurar
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={onDelete}
            className="gap-1 text-destructive hover:text-destructive"
          >
            <Trash2 className="h-4 w-4" />
            Excluir
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

export default function TrashPage() {
  const queryStore = useQueryStore()
  const routineStore = useRoutineStore()

  const [activeTab, setActiveTab] = useState('queries')
  
  const [deleteModalOpen, setDeleteModalOpen] = useState(false)
  const [deletingItem, setDeletingItem] = useState<{ id: string, title: string, type: 'query' | 'routine' } | null>(null)
  const [emptyTrashModalOpen, setEmptyTrashModalOpen] = useState(false)

  useEffect(() => {
    if (!queryStore.isInitialized && !queryStore.isLoading) {
      queryStore.initialize()
    }
  }, [queryStore.initialize, queryStore.isInitialized, queryStore.isLoading])

  useEffect(() => {
    if (!routineStore.isInitialized && !routineStore.loading) {
      routineStore.initialize()
    }
  }, [routineStore.initialize, routineStore.isInitialized, routineStore.loading])

  const trashedQueries = queryStore.listTrashed()
  const trashedRoutines = routineStore.listTrashed()

  const handleRestoreQuery = async (query: Query) => {
    await queryStore.restoreQuery(query.id)
    toast.success('Consulta restaurada com sucesso!')
  }

  const handleRestoreRoutine = async (routine: Routine) => {
    await routineStore.restore(routine.id)
    toast.success('Rotina restaurada com sucesso!')
  }

  const handleDelete = async () => {
    if (!deletingItem) return
    
    if (deletingItem.type === 'query') {
      await queryStore.permanentDeleteQuery(deletingItem.id)
    } else {
      await routineStore.permanentDelete(deletingItem.id)
    }
    
    toast.success(`${deletingItem.type === 'query' ? 'Consulta' : 'Rotina'} excluída permanentemente!`)
    setDeleteModalOpen(false)
    setDeletingItem(null)
  }

  const handleEmptyTrash = async () => {
    if (activeTab === 'queries') {
      for (const query of trashedQueries) {
        await queryStore.permanentDeleteQuery(query.id)
      }
      toast.success('Lixeira de consultas esvaziada!')
    } else {
      for (const routine of trashedRoutines) {
        await routineStore.permanentDelete(routine.id)
      }
      toast.success('Lixeira de rotinas esvaziada!')
    }
    setEmptyTrashModalOpen(false)
  }

  const openDeleteModal = (id: string, title: string, type: 'query' | 'routine') => {
    setDeletingItem({ id, title, type })
    setDeleteModalOpen(true)
  }

  if (queryStore.isLoading || routineStore.loading) {
    return (
      <>
        <AppHeader title="Lixeira" showSearch={false} showNewButton={false} />
        <main className="flex-1 overflow-auto p-6">
          <div className="mx-auto max-w-3xl space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-24 w-full" />
            ))}
          </div>
        </main>
      </>
    )
  }

  const currentCount = activeTab === 'queries' ? trashedQueries.length : trashedRoutines.length
  const currentItemsName = activeTab === 'queries' ? 'consulta' : 'rotina'

  return (
    <>
      <AppHeader title="Lixeira" showSearch={false} showNewButton={false} />
      
      <main className="flex-1 overflow-auto p-6">
        <div className="mx-auto max-w-3xl space-y-6">
          
          <Tabs defaultValue="queries" value={activeTab} onValueChange={setActiveTab}>
            
            <div className="flex items-center justify-between mb-6">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                <TabsList>
                  <TabsTrigger value="queries">Consultas</TabsTrigger>
                  <TabsTrigger value="routines">Rotinas</TabsTrigger>
                </TabsList>
                <p className="text-sm text-muted-foreground">
                  {currentCount} {currentItemsName}{currentCount !== 1 && 's'} na lixeira
                </p>
              </div>

              {currentCount > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setEmptyTrashModalOpen(true)}
                  className="text-destructive hover:text-destructive"
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Esvaziar {activeTab === 'queries' ? 'Consultas' : 'Rotinas'}
                </Button>
              )}
            </div>

            {/* Warning */}
            {currentCount > 0 && (
              <div className="mb-6 flex items-start gap-3 rounded-lg border border-yellow-200 bg-yellow-50 p-4 dark:border-yellow-900 dark:bg-yellow-950">
                <AlertTriangle className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
                <div className="text-sm">
                  <p className="font-medium text-yellow-800 dark:text-yellow-200">
                    Itens na lixeira podem ser restaurados
                  </p>
                  <p className="text-yellow-700 dark:text-yellow-300">
                    Ao excluir permanentemente, a ação não poderá ser desfeita.
                  </p>
                </div>
              </div>
            )}

            <TabsContent value="queries" className="mt-0">
              {trashedQueries.length > 0 ? (
                <div className="space-y-3">
                  {trashedQueries.map((query) => (
                    <TrashedQueryCard
                      key={query.id}
                      query={query}
                      onRestore={() => handleRestoreQuery(query)}
                      onDelete={() => openDeleteModal(query.id, query.title, 'query')}
                    />
                  ))}
                </div>
              ) : (
                <Empty className="border">
                  <EmptyHeader>
                    <EmptyMedia variant="icon">
                      <Trash2 />
                    </EmptyMedia>
                    <EmptyTitle>Lixeira de consultas vazia</EmptyTitle>
                    <EmptyDescription>
                      Consultas excluídas aparecerão aqui para restauração.
                    </EmptyDescription>
                  </EmptyHeader>
                </Empty>
              )}
            </TabsContent>

            <TabsContent value="routines" className="mt-0">
              {trashedRoutines.length > 0 ? (
                <div className="space-y-3">
                  {trashedRoutines.map((routine) => (
                    <TrashedRoutineCard
                      key={routine.id}
                      routine={routine}
                      onRestore={() => handleRestoreRoutine(routine)}
                      onDelete={() => openDeleteModal(routine.id, routine.name, 'routine')}
                    />
                  ))}
                </div>
              ) : (
                <Empty className="border">
                  <EmptyHeader>
                    <EmptyMedia variant="icon">
                      <Trash2 />
                    </EmptyMedia>
                    <EmptyTitle>Lixeira de rotinas vazia</EmptyTitle>
                    <EmptyDescription>
                      Rotinas excluídas aparecerão aqui para restauração.
                    </EmptyDescription>
                  </EmptyHeader>
                </Empty>
              )}
            </TabsContent>

          </Tabs>
        </div>
      </main>

      {/* Delete single item modal */}
      <DeleteConfirmModal
        open={deleteModalOpen}
        onOpenChange={setDeleteModalOpen}
        title="Excluir Permanentemente"
        description={`Tem certeza que deseja excluir "${deletingItem?.title}" permanentemente? Esta ação não pode ser desfeita.`}
        confirmText="DELETAR"
        isLoading={queryStore.isSubmitting || routineStore.isSubmitting}
        onConfirm={handleDelete}
      />

      {/* Empty trash modal */}
      <DeleteConfirmModal
        open={emptyTrashModalOpen}
        onOpenChange={setEmptyTrashModalOpen}
        title={`Esvaziar Lixeira de ${activeTab === 'queries' ? 'Consultas' : 'Rotinas'}`}
        description={`Tem certeza que deseja excluir permanentemente tod${activeTab === 'queries' ? 'a' : 'a'}s as ${currentCount} ${currentItemsName}${currentCount !== 1 ? 's' : ''} na lixeira? Esta ação não pode ser desfeita.`}
        confirmText="ESVAZIAR"
        isLoading={queryStore.isSubmitting || routineStore.isSubmitting}
        onConfirm={handleEmptyTrash}
      />
    </>
  )
}
