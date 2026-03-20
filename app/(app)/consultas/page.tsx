'use client'

import { useState, useEffect, useMemo, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { toast } from 'sonner'
import {
  LayoutGrid,
  List,
  Filter,
  X,
  FileCode2,
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
import { QueryCard } from '@/components/query-card'
import { QueryCardSkeleton } from '@/components/query-card-skeleton'
import { QueryDrawer } from '@/components/query-drawer'
import { DeleteConfirmModal } from '@/components/delete-confirm-modal'
import { useQueryStore } from '@/store/query-store'
import { DATABASE_LABELS, type DatabaseType, type Query } from '@/types/query'

function QueryListContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  
  const {
    isLoading,
    isInitialized,
    isSubmitting,
    listQueries,
    tags,
    deleteQuery,
    getQuery,
    initialize,
    queries,
  } = useQueryStore()

  // View mode from localStorage
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')

  // Drawer state
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [editingQuery, setEditingQuery] = useState<Query | null>(null)

  // Delete modal state
  const [deleteModalOpen, setDeleteModalOpen] = useState(false)
  const [deletingQuery, setDeletingQuery] = useState<Query | null>(null)

  // Filters
  const [selectedDatabase, setSelectedDatabase] = useState<DatabaseType | 'all'>('all')
  const [selectedTags, setSelectedTags] = useState<string[]>([])

  // Initialize store
  useEffect(() => {
    if (!isInitialized && !isLoading) {
      initialize()
    }
  }, [initialize, isInitialized, isLoading])

  // Load view mode from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('query-view-mode')
    if (saved === 'grid' || saved === 'list') {
      setViewMode(saved)
    }
  }, [])

  // Handle URL params
  useEffect(() => {
    const nova = searchParams.get('nova')
    const editar = searchParams.get('editar')
    const favoritas = searchParams.get('favoritas')

    if (nova === 'true') {
      setEditingQuery(null)
      setDrawerOpen(true)
    } else if (editar) {
      const query = getQuery(editar)
      if (query) {
        setEditingQuery(query)
        setDrawerOpen(true)
      }
    }
  }, [searchParams, getQuery])

  // Get filtered queries
  const filteredQueries = useMemo(() => {
    const search = searchParams.get('busca') || ''
    const favoritas = searchParams.get('favoritas') === 'true'

    return listQueries({
      search: search || undefined,
      database: selectedDatabase !== 'all' ? selectedDatabase : undefined,
      tagIds: selectedTags.length > 0 ? selectedTags : undefined,
      isFavorite: favoritas || undefined,
    })
  }, [searchParams, selectedDatabase, selectedTags, listQueries])

  const handleViewModeChange = (mode: 'grid' | 'list') => {
    setViewMode(mode)
    localStorage.setItem('query-view-mode', mode)
  }

  const handleEdit = (query: Query) => {
    router.push(`/consultas?editar=${query.id}`)
  }

  const handleDelete = (query: Query) => {
    setDeletingQuery(query)
    setDeleteModalOpen(true)
  }

  const handleConfirmDelete = async () => {
    if (!deletingQuery) return
    await deleteQuery(deletingQuery.id)
    toast.success('Consulta movida para a lixeira')
    setDeleteModalOpen(false)
    setDeletingQuery(null)
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
    setSelectedTags([])
    router.push('/consultas')
  }

  const hasFilters = selectedDatabase !== 'all' || selectedTags.length > 0 || searchParams.get('busca') || searchParams.get('favoritas')

  const isFavoritesView = searchParams.get('favoritas') === 'true'

  return (
    <>
      <AppHeader 
        title={isFavoritesView ? 'Consultas Favoritas' : 'Consultas'} 
        showSearch 
        showNewButton 
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
            {filteredQueries.length} consulta{filteredQueries.length !== 1 && 's'} encontrada{filteredQueries.length !== 1 && 's'}
          </div>

          {/* Query list */}
          {isLoading ? (
            <div className={viewMode === 'grid' 
              ? 'grid gap-4 sm:grid-cols-2 lg:grid-cols-3' 
              : 'space-y-3'
            }>
              {Array.from({ length: 6 }).map((_, i) => (
                <QueryCardSkeleton key={i} />
              ))}
            </div>
          ) : filteredQueries.length > 0 ? (
            <div className={viewMode === 'grid' 
              ? 'grid gap-4 sm:grid-cols-2 lg:grid-cols-3' 
              : 'space-y-3'
            }>
              {filteredQueries.map((query) => (
                <QueryCard
                  key={query.id}
                  query={query}
                  onEdit={() => handleEdit(query)}
                  onDelete={() => handleDelete(query)}
                />
              ))}
            </div>
          ) : (
            <Empty className="border">
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <FileCode2 />
                </EmptyMedia>
                <EmptyTitle>Nenhuma consulta encontrada</EmptyTitle>
                <EmptyDescription>
                  {hasFilters
                    ? 'Tente ajustar os filtros ou criar uma nova consulta.'
                    : 'Comece criando sua primeira consulta SQL.'}
                </EmptyDescription>
              </EmptyHeader>
              <Button onClick={() => router.push('/consultas?nova=true')}>
                Criar Consulta
              </Button>
            </Empty>
          )}
        </div>
      </main>

      {/* Drawer */}
      <QueryDrawer
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        editQuery={editingQuery}
      />

      {/* Delete Modal */}
      <DeleteConfirmModal
        open={deleteModalOpen}
        onOpenChange={setDeleteModalOpen}
        title="Excluir Consulta"
        description={`Tem certeza que deseja excluir "${deletingQuery?.title}"? A consulta será movida para a lixeira.`}
        confirmText="EXCLUIR"
        isLoading={isSubmitting}
        onConfirm={handleConfirmDelete}
      />
    </>
  )
}

export default function QueryListPage() {
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
      <QueryListContent />
    </Suspense>
  )
}
