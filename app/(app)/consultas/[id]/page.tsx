'use client'

import { useEffect, useState, use } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { toast } from 'sonner'
import {
  ArrowLeft,
  Star,
  Copy,
  Edit,
  Trash2,
  Clock,
  History,
} from 'lucide-react'
import { useQueryClient } from '@tanstack/react-query'

import { AppHeader } from '@/components/app-header'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import { DatabaseBadge } from '@/components/database-badge'
import { TagChip } from '@/components/tag-chip'
import { QueryDrawer } from '@/components/query-drawer'
import { DeleteConfirmModal } from '@/components/delete-confirm-modal'
import { VersionTimeline } from '@/components/version-timeline'
import { VersionDiffModal } from '@/components/version-diff-modal'
import { useQueryStore } from '@/store/query-store'
import { cn } from '@/lib/utils'
import type { QueryVersion } from '@/types/query'

interface QueryDetailPageProps {
  params: Promise<{ id: string }>
}

export default function QueryDetailPage({ params }: QueryDetailPageProps) {
  const { id } = use(params)
  const router = useRouter()
  const {
    isLoading,
    isInitialized,
    isSubmitting,
    getQuery,
    getTag,
    toggleFavorite,
    incrementCopyCount,
    deleteQuery,
    initialize,
    queries,
  } = useQueryStore()

  const queryClient = useQueryClient()
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [deleteModalOpen, setDeleteModalOpen] = useState(false)
  const [diffModal, setDiffModal] = useState<{
    open: boolean
    versionA: QueryVersion | null
    versionB: QueryVersion | null
  }>({ open: false, versionA: null, versionB: null })

  useEffect(() => {
    if (!isInitialized && !isLoading) {
      initialize()
    }
  }, [initialize, isInitialized, isLoading])

  const query = getQuery(id)

  const handleCopy = async (sql: string) => {
    try {
      await navigator.clipboard.writeText(sql)
      if (query) {
        await incrementCopyCount(query.id)
      }
      toast.success('SQL copiado para a área de transferência!')
    } catch {
      toast.error('Erro ao copiar SQL')
    }
  }

  const handleToggleFavorite = async () => {
    if (!query) return
    await toggleFavorite(query.id)
    toast.success(
      query.isFavorite
        ? 'Removido dos favoritos'
        : 'Adicionado aos favoritos'
    )
  }

  const handleDelete = async () => {
    if (!query) return
    await deleteQuery(query.id)
    toast.success('Consulta movida para a lixeira')
    setDeleteModalOpen(false)
    router.push('/consultas')
  }

  const handleRestore = () => {
    queryClient.invalidateQueries({ queryKey: ['queries', id] })
  }

  const handleCompare = (versionA: QueryVersion, versionB: QueryVersion) => {
    setDiffModal({
      open: true,
      versionA,
      versionB,
    })
  }

  if (isLoading) {
    return (
      <>
        <AppHeader title="Carregando..." showSearch={false} showNewButton={false} />
        <main className="flex-1 overflow-auto p-6">
          <div className="mx-auto max-w-4xl space-y-6">
            <Skeleton className="h-8 w-64" />
            <Skeleton className="h-4 w-96" />
            <Skeleton className="h-64 w-full" />
          </div>
        </main>
      </>
    )
  }

  if (!query) {
    return (
      <>
        <AppHeader title="Consulta não encontrada" showSearch={false} showNewButton={false} />
        <main className="flex-1 overflow-auto p-6">
          <div className="mx-auto max-w-4xl text-center">
            <h2 className="text-2xl font-bold">Consulta não encontrada</h2>
            <p className="mt-2 text-muted-foreground">
              A consulta que você está procurando não existe ou foi removida.
            </p>
            <Button asChild className="mt-4">
              <Link href="/consultas">Voltar para Consultas</Link>
            </Button>
          </div>
        </main>
      </>
    )
  }

  const queryTags = query.tags

  return (
    <>
      <AppHeader title={query.title} showSearch={false} showNewButton={false} />
      
      <main className="flex-1 overflow-auto p-6">
        <div className="mx-auto max-w-4xl space-y-6">
          {/* Back button */}
          <Button variant="ghost" size="sm" asChild>
            <Link href="/consultas">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Voltar
            </Link>
          </Button>

          {/* Header */}
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold">{query.title}</h1>
                <DatabaseBadge database={query.database} />
              </div>
              {query.description && (
                <p className="text-muted-foreground">{query.description}</p>
              )}
              {queryTags.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {queryTags.map((tag) => (
                    <TagChip key={tag!.id} name={tag!.name} color={tag!.color} />
                  ))}
                </div>
              )}
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleToggleFavorite}
                className={cn(
                  query.isFavorite && 'text-yellow-500 border-yellow-500'
                )}
              >
                <Star
                  className={cn(
                    'mr-2 h-4 w-4',
                    query.isFavorite && 'fill-current'
                  )}
                />
                {query.isFavorite ? 'Favoritado' : 'Favoritar'}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setDrawerOpen(true)}
              >
                <Edit className="mr-2 h-4 w-4" />
                Editar
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setDeleteModalOpen(true)}
                className="text-destructive hover:text-destructive"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Excluir
              </Button>
            </div>
          </div>

          {/* Stats */}
          <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
            <span className="flex items-center gap-1">
              <Clock className="h-4 w-4" />
              Criado em {format(new Date(query.createdAt), "d 'de' MMMM 'de' yyyy", { locale: ptBR })}
            </span>
            <span className="flex items-center gap-1">
              <Copy className="h-4 w-4" />
              {query.copyCount} cópias
            </span>
            <span className="flex items-center gap-1">
              <History className="h-4 w-4" />
              {query.versions.length} versão{query.versions.length !== 1 && 'ões'}
            </span>
          </div>

          {/* Current SQL */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <div>
                <CardTitle className="text-lg">Código SQL</CardTitle>
                <CardDescription>Versão atual</CardDescription>
              </div>
              <Button size="sm" onClick={() => handleCopy(query.sql)}>
                <Copy className="mr-2 h-4 w-4" />
                Copiar
              </Button>
            </CardHeader>
            <CardContent>
              <div className="overflow-hidden rounded-lg bg-muted p-4">
                <pre className="overflow-x-auto font-mono text-sm whitespace-pre-wrap">
                  {query.sql}
                </pre>
              </div>
            </CardContent>
          </Card>

          {/* Version history */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Histórico de Versões</CardTitle>
              <CardDescription>
                Compare ou restaure versões anteriores desta consulta
              </CardDescription>
            </CardHeader>
            <CardContent>
              <VersionTimeline
                queryId={id}
                currentSql={query.sql}
                onRestore={handleRestore}
                onCompare={handleCompare}
              />
            </CardContent>
          </Card>
        </div>
      </main>

      <VersionDiffModal
        open={diffModal.open}
        onClose={() => setDiffModal({ ...diffModal, open: false })}
        versionA={diffModal.versionA}
        versionB={diffModal.versionB}
      />

      {/* Drawer */}
      <QueryDrawer
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        editQuery={query}
      />

      {/* Delete Modal */}
      <DeleteConfirmModal
        open={deleteModalOpen}
        onOpenChange={setDeleteModalOpen}
        title="Excluir Consulta"
        description={`Tem certeza que deseja excluir "${query.title}"? A consulta será movida para a lixeira.`}
        confirmText="EXCLUIR"
        isLoading={isSubmitting}
        onConfirm={handleDelete}
      />
    </>
  )
}
