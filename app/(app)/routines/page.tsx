'use client'

import { useState, useEffect, useMemo, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { toast } from 'sonner'
import {
  LayoutGrid,
  List,
  Filter,
  X,
  Code2,
  FunctionSquare,
  GitBranch,
  Zap,
  Eye,
} from 'lucide-react'

import { AppHeader } from '@/components/app-header'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Badge } from '@/components/ui/badge'
import {
  Empty,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
  EmptyDescription,
} from '@/components/ui/empty'
import { RoutineCard } from '@/components/routine-card'
import { QueryCardSkeleton } from '@/components/query-card-skeleton'
import { RoutineDrawer } from '@/components/routine-drawer'
import { DeleteConfirmModal } from '@/components/delete-confirm-modal'
import { useRoutineStore } from '@/store/routine-store'
import { useQueryStore } from '@/store/query-store'
import { DATABASE_LABELS, type DatabaseType } from '@/types/query'
import type { Routine, RoutineType } from '@/types/routine'

const ROUTINE_TYPES: { value: RoutineType | 'all'; label: string; icon: any }[] = [
  { value: 'all', label: 'Todos os tipos', icon: null },
  { value: 'function', label: 'Function', icon: FunctionSquare },
  { value: 'procedure', label: 'Procedure', icon: GitBranch },
  { value: 'trigger', label: 'Trigger', icon: Zap },
  { value: 'view', label: 'View', icon: Eye },
]

function RoutineListContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  
  const {
    loading: isLoading,
    isInitialized,
    isSubmitting,
    listRoutines,
    remove,
    getById,
    initialize,
  } = useRoutineStore()

  // Mapped from queryStore to reuse same shared tags
  const { tags } = useQueryStore()

  // View mode from localStorage
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')

  // Drawer state
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [editingRoutine, setEditingRoutine] = useState<Routine | null>(null)

  // Delete modal state
  const [deleteModalOpen, setDeleteModalOpen] = useState(false)
  const [deletingRoutine, setDeletingRoutine] = useState<Routine | null>(null)

  // Filters
  const [selectedDatabase, setSelectedDatabase] = useState<DatabaseType | 'all'>('all')
  const [selectedType, setSelectedType] = useState<RoutineType | 'all'>('all')
  const [selectedTags, setSelectedTags] = useState<string[]>([])

  // Initialize store
  useEffect(() => {
    if (!isInitialized && !isLoading) {
      initialize()
    }
  }, [initialize, isInitialized, isLoading])

  // Load view mode from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('routine-view-mode')
    if (saved === 'grid' || saved === 'list') {
      setViewMode(saved)
    }
  }, [])

  // Handle URL params
  useEffect(() => {
    const drawerParam = searchParams.get('drawer')
    const editarParam = searchParams.get('editar')

    if (drawerParam === 'new') {
      setEditingRoutine(null)
      setDrawerOpen(true)
    } else if (drawerParam === 'edit' || editarParam) {
      // support both ?drawer=edit&id=xx or ?editar=xx
      const idToEdit = editarParam || searchParams.get('id')
      if (idToEdit) {
        const routine = getById(idToEdit)
        if (routine) {
          setEditingRoutine(routine)
          setDrawerOpen(true)
        }
      }
    }
  }, [searchParams, getById])

  // Get filtered routines
  const filteredRoutines = useMemo(() => {
    const search = searchParams.get('busca') || ''

    return listRoutines({
      search: search || undefined,
      database: selectedDatabase !== 'all' ? selectedDatabase : undefined,
      type: selectedType !== 'all' ? selectedType : undefined,
      tags: selectedTags.length > 0 ? selectedTags : undefined,
    })
  }, [searchParams, selectedDatabase, selectedType, selectedTags, listRoutines])

  const handleViewModeChange = (mode: 'grid' | 'list') => {
    setViewMode(mode)
    localStorage.setItem('routine-view-mode', mode)
  }

  const handleEdit = (routine: Routine) => {
    router.push(`/routines?drawer=edit&id=${routine.id}`)
  }

  const handleDelete = (routine: Routine) => {
    setDeletingRoutine(routine)
    setDeleteModalOpen(true)
  }

  const handleConfirmDelete = async () => {
    if (!deletingRoutine) return
    await remove(deletingRoutine.id)
    toast.success('Rotina movida para a lixeira')
    setDeleteModalOpen(false)
    setDeletingRoutine(null)
  }

  const handleToggleTag = (tagId: string) => {
    setSelectedTags((prev) =>
      prev.includes(tagId)
        ? prev.filter((id) => id !== tagId)
        : [...prev, tagId]
    )
  }

  const clearFilters = () => {
    setSelectedDatabase('all')
    setSelectedType('all')
    setSelectedTags([])
    router.push('/routines')
  }

  const hasFilters = selectedDatabase !== 'all' || selectedType !== 'all' || selectedTags.length > 0 || searchParams.get('busca')

  return (
    <>
      <AppHeader 
        title="Rotinas"
        showSearch 
        showNewButton 
        onNewClick={() => router.push('/routines?drawer=new')}
      />
      
      <main className="flex-1 overflow-auto p-6">
        <div className="mx-auto max-w-7xl space-y-6">
          {/* Filters bar */}
          <div className="flex flex-wrap items-center gap-3">
            <Select
              value={selectedDatabase}
              onValueChange={(v) => setSelectedDatabase(v as DatabaseType | 'all')}
            >
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Banco de dados" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os bancos</SelectItem>
                {Object.entries(DATABASE_LABELS).map(([key, label]) => (
                  <SelectItem key={key} value={key}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={selectedType}
              onValueChange={(v) => setSelectedType(v as RoutineType | 'all')}
            >
              <SelectTrigger className="w-44">
                <SelectValue placeholder="Tipo de rotina" />
              </SelectTrigger>
              <SelectContent>
                {ROUTINE_TYPES.map((t) => (
                  <SelectItem key={t.value} value={t.value}>
                    <div className="flex items-center gap-2">
                      {t.icon && <t.icon className="h-4 w-4 text-muted-foreground" />}
                      {t.label}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="gap-2">
                  <Filter className="h-4 w-4" />
                  Tags
                  {selectedTags.length > 0 && (
                    <Badge variant="secondary" className="ml-1">
                      {selectedTags.length}
                    </Badge>
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-48">
                <DropdownMenuLabel>Filtrar por tag</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {tags.map((tag) => (
                  <DropdownMenuCheckboxItem
                    key={tag.id}
                    checked={selectedTags.includes(tag.id)}
                    onCheckedChange={() => handleToggleTag(tag.id)}
                  >
                    <span
                      className="mr-2 h-2 w-2 rounded-full"
                      style={{ backgroundColor: tag.color }}
                    />
                    {tag.name}
                  </DropdownMenuCheckboxItem>
                ))}
                {tags.length === 0 && (
                  <div className="px-2 py-1.5 text-sm text-muted-foreground">
                    Nenhuma tag criada
                  </div>
                )}
              </DropdownMenuContent>
            </DropdownMenu>

            {hasFilters && (
              <Button variant="ghost" size="sm" onClick={clearFilters}>
                <X className="mr-1 h-4 w-4" />
                Limpar filtros
              </Button>
            )}

            <div className="ml-auto flex items-center gap-1 rounded-md border p-1">
              <Button
                variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
                size="icon-sm"
                onClick={() => handleViewModeChange('grid')}
              >
                <LayoutGrid className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === 'list' ? 'secondary' : 'ghost'}
                size="icon-sm"
                onClick={() => handleViewModeChange('list')}
              >
                <List className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Results count */}
          <div className="text-sm text-muted-foreground">
            {filteredRoutines.length} rotina{filteredRoutines.length !== 1 && 's'} encontrada{filteredRoutines.length !== 1 && 's'}
          </div>

          {/* Routine list */}
          {isLoading ? (
            <div className={viewMode === 'grid' 
              ? 'grid gap-4 sm:grid-cols-2 lg:grid-cols-3' 
              : 'space-y-3'
            }>
              {Array.from({ length: 6 }).map((_, i) => (
                <QueryCardSkeleton key={i} />
              ))}
            </div>
          ) : filteredRoutines.length > 0 ? (
            <div className={viewMode === 'grid' 
              ? 'grid gap-4 sm:grid-cols-2 lg:grid-cols-3' 
              : 'space-y-3'
            }>
              {filteredRoutines.map((routine) => (
                <RoutineCard
                  key={routine.id}
                  routine={routine}
                  onEdit={() => handleEdit(routine)}
                  onDelete={() => handleDelete(routine)}
                />
              ))}
            </div>
          ) : (
            <Empty className="border">
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <Code2 />
                </EmptyMedia>
                <EmptyTitle>Nenhuma rotina salva ainda</EmptyTitle>
                <EmptyDescription>
                  {hasFilters
                    ? 'Tente ajustar os filtros ou criar uma nova rotina.'
                    : 'Comece criando sua primeira rotina, view ou trigger.'}
                </EmptyDescription>
              </EmptyHeader>
              <Button onClick={() => router.push('/routines?drawer=new')}>
                Criar Rotina
              </Button>
            </Empty>
          )}
        </div>
      </main>

      {/* Drawer */}
      <RoutineDrawer
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        editRoutine={editingRoutine}
      />

      {/* Delete Modal */}
      <DeleteConfirmModal
        open={deleteModalOpen}
        onOpenChange={setDeleteModalOpen}
        title="Excluir Rotina"
        description={`Tem certeza que deseja excluir "${deletingRoutine?.name}"? A rotina será movida para a lixeira.`}
        confirmText="EXCLUIR"
        isLoading={isSubmitting}
        onConfirm={handleConfirmDelete}
      />
    </>
  )
}

export default function RoutineListPage() {
  return (
    <Suspense fallback={
      <div className="flex-1 p-6">
        <div className="mx-auto max-w-7xl space-y-6">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <QueryCardSkeleton key={i} />
            ))}
          </div>
        </div>
      </div>
    }>
      <RoutineListContent />
    </Suspense>
  )
}
