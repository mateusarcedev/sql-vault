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
  FunctionSquare,
  GitBranch,
  Zap,
  Eye,
} from 'lucide-react'
import { useQueryClient } from '@tanstack/react-query'

import { AppHeader } from '@/components/app-header'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { DatabaseBadge } from '@/components/database-badge'
import { TagChip } from '@/components/tag-chip'
import { RoutineDrawer } from '@/components/routine-drawer'
import { DeleteConfirmModal } from '@/components/delete-confirm-modal'
import { VersionTimeline } from '@/components/version-timeline'
import { VersionDiffModal } from '@/components/version-diff-modal'
import { useRoutineStore } from '@/store/routine-store'
import { cn } from '@/lib/utils'
import type { RoutineType, RoutineVersion } from '@/types/routine'

interface RoutineDetailPageProps {
  params: Promise<{ id: string }>
}

const TYPE_CONFIG: Record<RoutineType, { icon: any; color: string; label: string }> = {
  function: { icon: FunctionSquare, color: '#8B5CF6', label: 'Function' },
  procedure: { icon: GitBranch, color: '#3B82F6', label: 'Procedure' },
  trigger: { icon: Zap, color: '#F59E0B', label: 'Trigger' },
  view: { icon: Eye, color: '#10B981', label: 'View' },
}

export default function RoutineDetailPage({ params }: RoutineDetailPageProps) {
  const { id } = use(params)
  const router = useRouter()
  const {
    loading: isLoading,
    isInitialized,
    isSubmitting,
    getById,
    toggleFavorite,
    incrementCopyCount,
    remove,
    initialize,
  } = useRoutineStore()

  const queryClient = useQueryClient()
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [deleteModalOpen, setDeleteModalOpen] = useState(false)
  const [diffModal, setDiffModal] = useState<{
    open: boolean
    versionA: RoutineVersion | null
    versionB: RoutineVersion | null
  }>({ open: false, versionA: null, versionB: null })

  useEffect(() => {
    if (!isInitialized && !isLoading) {
      initialize()
    }
  }, [initialize, isInitialized, isLoading])

  const routine = getById(id)

  const handleCopy = async (sql: string) => {
    try {
      await navigator.clipboard.writeText(sql)
      if (routine) {
        await incrementCopyCount(routine.id)
      }
      toast.success('SQL copiado para a área de transferência!')
    } catch {
      toast.error('Erro ao copiar SQL')
    }
  }

  const handleToggleFavorite = async () => {
    if (!routine) return
    await toggleFavorite(routine.id)
    toast.success(
      routine.isFavorite
        ? 'Removido dos favoritos'
        : 'Adicionado aos favoritos'
    )
  }

  const handleDelete = async () => {
    if (!routine) return
    await remove(routine.id)
    toast.success('Rotina movida para a lixeira')
    setDeleteModalOpen(false)
    router.push('/routines')
  }

  const handleRestore = () => {
    queryClient.invalidateQueries({ queryKey: ['routines', id] })
  }

  const handleCompare = (versionA: any, versionB: any) => {
    setDiffModal({
      open: true,
      versionA,
      versionB,
    })
  }

  if (isLoading || !isInitialized) {
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

  if (!routine) {
    return (
      <>
        <AppHeader title="Rotina não encontrada" showSearch={false} showNewButton={false} />
        <main className="flex-1 overflow-auto p-6">
          <div className="mx-auto max-w-4xl text-center">
            <h2 className="text-2xl font-bold">Rotina não encontrada</h2>
            <p className="mt-2 text-muted-foreground">
              A rotina que você está procurando não existe ou foi removida.
            </p>
            <Button asChild className="mt-4">
              <Link href="/routines">Voltar para Rotinas</Link>
            </Button>
          </div>
        </main>
      </>
    )
  }

  const routineTags = routine.tags
  const typeConfig = TYPE_CONFIG[routine.type]
  const TypeIcon = typeConfig.icon

  return (
    <>
      <AppHeader title={routine.name} showSearch={false} showNewButton={false} />
      
      <main className="flex-1 overflow-auto p-6">
        <div className="mx-auto max-w-4xl space-y-6">
          {/* Back button */}
          <Button variant="ghost" size="sm" asChild>
            <Link href="/routines">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Voltar
            </Link>
          </Button>

          {/* Header */}
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <span
                  className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium"
                  style={{ backgroundColor: `${typeConfig.color}20`, color: typeConfig.color }}
                >
                  <TypeIcon className="h-3 w-3" />
                  {typeConfig.label}
                </span>
                <h1 className="text-2xl font-bold">{routine.name}</h1>
                <DatabaseBadge database={routine.database} />
              </div>
              {routine.description && (
                <p className="text-muted-foreground">{routine.description}</p>
              )}
              {routineTags.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {routineTags.map((tag) => (
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
                  routine.isFavorite && 'text-yellow-500 border-yellow-500'
                )}
              >
                <Star
                  className={cn(
                    'mr-2 h-4 w-4',
                    routine.isFavorite && 'fill-current'
                  )}
                />
                {routine.isFavorite ? 'Favoritado' : 'Favoritar'}
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
              Criado em {format(new Date(routine.createdAt), "d 'de' MMMM 'de' yyyy", { locale: ptBR })}
            </span>
            <span className="flex items-center gap-1">
              <Copy className="h-4 w-4" />
              {routine.copyCount} cópias
            </span>
            <span className="flex items-center gap-1">
              <History className="h-4 w-4" />
              {routine.versions.length} versão{routine.versions.length !== 1 && 'ões'}
            </span>
            {routine.returnType && (
              <span className="flex items-center gap-1 ml-auto">
                <strong className="text-foreground">Retorno:</strong> {routine.returnType}
              </span>
            )}
          </div>

          {/* Parameters Table */}
          {routine.parameters && routine.parameters.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">Parâmetros</CardTitle>
                <CardDescription>
                  Argumentos aceitos por esta {routine.type}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="rounded-md border">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-muted/50">
                        <th className="p-3 text-left font-medium">Nome</th>
                        <th className="p-3 text-left font-medium">Tipo</th>
                        {routine.type === 'procedure' && (
                          <th className="p-3 text-left font-medium">Direção</th>
                        )}
                      </tr>
                    </thead>
                    <tbody>
                      {routine.parameters.map((param, i) => (
                        <tr key={i} className="border-b last:border-0 hover:bg-muted/30">
                          <td className="p-3">{param.name}</td>
                          <td className="p-3 font-mono text-muted-foreground">{param.type}</td>
                          {routine.type === 'procedure' && (
                            <td className="p-3">
                              <Badge variant="outline" className={cn(
                                param.direction === 'IN' && 'bg-blue-500/10 text-blue-500 border-blue-500/20',
                                param.direction === 'OUT' && 'bg-amber-500/10 text-amber-500 border-amber-500/20',
                                param.direction === 'INOUT' && 'bg-purple-500/10 text-purple-500 border-purple-500/20'
                              )}>
                                {param.direction}
                              </Badge>
                            </td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Current SQL */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <div>
                <CardTitle className="text-lg">Código SQL ({routine.type.toUpperCase()})</CardTitle>
                <CardDescription>Versão atual</CardDescription>
              </div>
              <Button size="sm" onClick={() => handleCopy(routine.sql)}>
                <Copy className="mr-2 h-4 w-4" />
                Copiar
              </Button>
            </CardHeader>
            <CardContent>
              <div className="overflow-hidden rounded-lg bg-muted p-4">
                <pre className="overflow-x-auto font-mono text-sm whitespace-pre-wrap">
                  {routine.sql}
                </pre>
              </div>
            </CardContent>
          </Card>

          {/* Version history */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Histórico de Versões</CardTitle>
              <CardDescription>
                Compare ou restaure versões anteriores desta rotina
              </CardDescription>
            </CardHeader>
            <CardContent>
              <VersionTimeline
                queryId={id}
                currentSql={routine.sql}
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
        versionA={diffModal.versionA as any}
        versionB={diffModal.versionB as any}
      />

      {/* Drawer */}
      <RoutineDrawer
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        editRoutine={routine}
      />

      {/* Delete Modal */}
      <DeleteConfirmModal
        open={deleteModalOpen}
        onOpenChange={setDeleteModalOpen}
        title="Excluir Rotina"
        description={`Tem certeza que deseja excluir "${routine.name}"? A rotina será movida para a lixeira.`}
        confirmText="EXCLUIR"
        isLoading={isSubmitting}
        onConfirm={handleDelete}
      />
    </>
  )
}
