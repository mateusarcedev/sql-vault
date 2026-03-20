'use client'

import { useState } from 'react'
import { formatDistanceToNow } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { History, RotateCcw, GitCompare, MoreVertical, Trash2, Clock } from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { useQueryVersions } from '@/hooks/use-query-versions'
import { Empty, EmptyHeader, EmptyTitle, EmptyDescription, EmptyMedia } from '@/components/ui/empty'
import type { QueryVersion } from '@/types/query'

interface VersionTimelineProps {
  queryId: string
  currentSql: string
  onRestore: () => void
  onCompare: (versionA: QueryVersion, versionB: QueryVersion) => void
}

export function VersionTimeline({ queryId, currentSql, onRestore, onCompare }: VersionTimelineProps) {
  const { versions, isLoading, refetch } = useQueryVersions(queryId)
  const [selectedA, setSelectedA] = useState<QueryVersion | null>(null)
  const [selectedB, setSelectedB] = useState<QueryVersion | null>(null)
  const [versionToRestore, setVersionToRestore] = useState<QueryVersion | null>(null)
  const [isRestoring, setIsRestoring] = useState(false)

  const handleRestore = async () => {
    if (!versionToRestore) return

    setIsRestoring(true)
    try {
      const response = await fetch(`/api/queries/${queryId}/versions/${versionToRestore.id}/restore`, {
        method: 'POST',
      })

      if (!response.ok) {
        throw new Error('Falha ao restaurar versão')
      }

      toast.success('Versão restaurada com sucesso')
      onRestore()
      refetch()
    } catch (error) {
      toast.error('Erro ao restaurar versão')
    } finally {
      setIsRestoring(false)
      setVersionToRestore(null)
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex items-center gap-4 rounded-lg border p-4">
            <Skeleton className="h-10 w-10 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-1/4" />
              <Skeleton className="h-4 w-3/4" />
            </div>
          </div>
        ))}
      </div>
    )
  }

  if (versions.length === 0) {
    return (
      <Empty className="border-none bg-muted/30">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <History className="h-5 w-5" />
          </EmptyMedia>
          <EmptyTitle>Nenhuma versão registrada ainda</EmptyTitle>
          <EmptyDescription>
            As versões são criadas automaticamente quando você altera o SQL de uma consulta.
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    )
  }

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        {versions.map((version, index) => {
          const isA = selectedA?.id === version.id
          const isB = selectedB?.id === version.id
          const versionNumber = versions.length - index

          return (
            <div
              key={version.id}
              className={`group relative flex items-start gap-4 rounded-lg border p-4 transition-colors hover:bg-muted/50 ${
                isA || isB ? 'border-primary bg-primary/5' : ''
              }`}
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-muted group-hover:bg-background">
                <Clock className="h-5 w-5 text-muted-foreground" />
              </div>

              <div className="min-w-0 flex-1 space-y-1">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold">v{versionNumber}</span>
                    <span className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(version.createdAt), {
                        addSuffix: true,
                        locale: ptBR,
                      })}
                    </span>
                    {version.description && (
                      <Badge variant="outline" className="text-[10px] font-normal">
                        {version.description}
                      </Badge>
                    )}
                  </div>

                  <div className="flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                    <Button
                      variant={isA ? 'default' : 'outline'}
                      size="xs"
                      onClick={() => setSelectedA(isA ? null : version)}
                      className="h-7 text-[10px]"
                    >
                      {isA ? 'Selecionado' : 'Sel. A'}
                    </Button>
                    <Button
                      variant={isB ? 'secondary' : 'outline'}
                      size="xs"
                      onClick={() => setSelectedB(isB ? null : version)}
                      className="h-7 text-[10px]"
                    >
                      {isB ? 'Selecionado' : 'Sel. B'}
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-primary hover:bg-primary/10"
                      onClick={() => setVersionToRestore(version)}
                    >
                      <RotateCcw className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>

                <p className="truncate text-sm text-muted-foreground font-mono bg-muted/50 px-2 py-1 rounded">
                  {version.sql.substring(0, 60)}...
                </p>
              </div>
            </div>
          )
        })}
      </div>

      {selectedA && selectedB && (
        <div className="sticky bottom-4 flex justify-center">
          <Button
            onClick={() => onCompare(selectedA, selectedB)}
            className="gap-2 shadow-lg"
            size="lg"
          >
            <GitCompare className="h-4 w-4" />
            Comparar versões (v{versions.length - versions.indexOf(selectedA)} vs v
            {versions.length - versions.indexOf(selectedB)})
          </Button>
        </div>
      )}

      <AlertDialog open={!!versionToRestore} onOpenChange={(open) => !open && setVersionToRestore(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Restaurar versão?</AlertDialogTitle>
            <AlertDialogDescription>
              Isso substituirá o código SQL atual. Uma versão de backup do código atual será criada automaticamente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isRestoring}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault()
                handleRestore()
              }}
              disabled={isRestoring}
              className="bg-primary text-primary-foreground"
            >
              {isRestoring ? 'Restaurando...' : 'Confirmar Restauração'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
