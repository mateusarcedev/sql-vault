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

export default function TrashPage() {
  const {
    isLoading,
    isSubmitting,
    listTrashed,
    restoreQuery,
    permanentDeleteQuery,
    initialize,
    queries,
  } = useQueryStore()

  const [deleteModalOpen, setDeleteModalOpen] = useState(false)
  const [deletingQuery, setDeletingQuery] = useState<Query | null>(null)
  const [emptyTrashModalOpen, setEmptyTrashModalOpen] = useState(false)

  useEffect(() => {
    if (queries.length === 0 && !isLoading) {
      initialize()
    }
  }, [initialize, queries.length, isLoading])

  const trashedQueries = listTrashed()

  const handleRestore = async (query: Query) => {
    await restoreQuery(query.id)
    toast.success('Consulta restaurada com sucesso!')
  }

  const handleDelete = async () => {
    if (!deletingQuery) return
    await permanentDeleteQuery(deletingQuery.id)
    toast.success('Consulta excluída permanentemente!')
    setDeleteModalOpen(false)
    setDeletingQuery(null)
  }

  const handleEmptyTrash = async () => {
    for (const query of trashedQueries) {
      await permanentDeleteQuery(query.id)
    }
    toast.success('Lixeira esvaziada!')
    setEmptyTrashModalOpen(false)
  }

  const openDeleteModal = (query: Query) => {
    setDeletingQuery(query)
    setDeleteModalOpen(true)
  }

  if (isLoading) {
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

  return (
    <>
      <AppHeader title="Lixeira" showSearch={false} showNewButton={false} />
      
      <main className="flex-1 overflow-auto p-6">
        <div className="mx-auto max-w-3xl space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold">Itens Excluídos</h2>
              <p className="text-sm text-muted-foreground">
                {trashedQueries.length} consulta{trashedQueries.length !== 1 && 's'} na lixeira
              </p>
            </div>
            {trashedQueries.length > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setEmptyTrashModalOpen(true)}
                className="text-destructive hover:text-destructive"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Esvaziar Lixeira
              </Button>
            )}
          </div>

          {/* Warning */}
          {trashedQueries.length > 0 && (
            <div className="flex items-start gap-3 rounded-lg border border-yellow-200 bg-yellow-50 p-4 dark:border-yellow-900 dark:bg-yellow-950">
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

          {/* Trashed list */}
          {trashedQueries.length > 0 ? (
            <div className="space-y-3">
              {trashedQueries.map((query) => (
                <TrashedQueryCard
                  key={query.id}
                  query={query}
                  onRestore={() => handleRestore(query)}
                  onDelete={() => openDeleteModal(query)}
                />
              ))}
            </div>
          ) : (
            <Empty className="border">
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <Trash2 />
                </EmptyMedia>
                <EmptyTitle>Lixeira vazia</EmptyTitle>
                <EmptyDescription>
                  Consultas excluídas aparecerão aqui para restauração.
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          )}
        </div>
      </main>

      {/* Delete single query modal */}
      <DeleteConfirmModal
        open={deleteModalOpen}
        onOpenChange={setDeleteModalOpen}
        title="Excluir Permanentemente"
        description={`Tem certeza que deseja excluir "${deletingQuery?.title}" permanentemente? Esta ação não pode ser desfeita.`}
        confirmText="DELETAR"
        isLoading={isSubmitting}
        onConfirm={handleDelete}
      />

      {/* Empty trash modal */}
      <DeleteConfirmModal
        open={emptyTrashModalOpen}
        onOpenChange={setEmptyTrashModalOpen}
        title="Esvaziar Lixeira"
        description={`Tem certeza que deseja excluir permanentemente todas as ${trashedQueries.length} consulta${trashedQueries.length !== 1 ? 's' : ''} na lixeira? Esta ação não pode ser desfeita.`}
        confirmText="ESVAZIAR"
        isLoading={isSubmitting}
        onConfirm={handleEmptyTrash}
      />
    </>
  )
}
