'use client'

import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Plus, Edit2, Trash2, Check, X, Tags as TagsIcon, Loader2 } from 'lucide-react'

import { AppHeader } from '@/components/app-header'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import {
  Empty,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
  EmptyDescription,
} from '@/components/ui/empty'
import { Skeleton } from '@/components/ui/skeleton'
import { DeleteConfirmModal } from '@/components/delete-confirm-modal'
import { useQueryStore } from '@/store/query-store'
import { TAG_COLORS, type Tag } from '@/types/query'
import { cn } from '@/lib/utils'

interface TagFormData {
  name: string
  color: string
}

function TagCard({
  tag,
  queryCount,
  onEdit,
  onDelete,
}: {
  tag: Tag
  queryCount: number
  onEdit: () => void
  onDelete: () => void
}) {
  return (
    <Card className="group">
      <CardContent className="flex items-center justify-between p-4">
        <div className="flex items-center gap-3">
          <div
            className="h-4 w-4 rounded-full"
            style={{ backgroundColor: tag.color }}
          />
          <div>
            <p className="font-medium">{tag.name}</p>
            <p className="text-xs text-muted-foreground">
              {queryCount} consulta{queryCount !== 1 && 's'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
          <Button variant="ghost" size="icon-sm" onClick={onEdit}>
            <Edit2 className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={onDelete}
            className="text-destructive hover:text-destructive"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

function TagForm({
  initialData,
  onSubmit,
  onCancel,
  isLoading,
}: {
  initialData?: TagFormData
  onSubmit: (data: TagFormData) => void
  onCancel: () => void
  isLoading: boolean
}) {
  const [name, setName] = useState(initialData?.name || '')
  const [color, setColor] = useState(initialData?.color || TAG_COLORS[0])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) {
      toast.error('Nome da tag é obrigatório')
      return
    }
    onSubmit({ name: name.trim(), color })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <label className="text-sm font-medium">Nome da Tag</label>
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Ex: Performance"
          autoFocus
        />
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium">Cor</label>
        <div className="flex flex-wrap gap-2">
          {TAG_COLORS.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setColor(c)}
              className={cn(
                'h-8 w-8 rounded-full border-2 transition-transform hover:scale-110',
                color === c ? 'border-foreground scale-110' : 'border-transparent'
              )}
              style={{ backgroundColor: c }}
            />
          ))}
        </div>
      </div>

      <div className="flex items-center gap-2 pt-2">
        <Button type="submit" size="sm" disabled={isLoading}>
          {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          <Check className="mr-1 h-4 w-4" />
          Salvar
        </Button>
        <Button type="button" variant="ghost" size="sm" onClick={onCancel}>
          <X className="mr-1 h-4 w-4" />
          Cancelar
        </Button>
      </div>
    </form>
  )
}

export default function TagsPage() {
  const {
    isLoading,
    isInitialized,
    isSubmitting,
    tags,
    listQueries,
    createTag,
    updateTag,
    deleteTag,
    initialize,
    queries,
  } = useQueryStore()

  const [isCreating, setIsCreating] = useState(false)
  const [editingTag, setEditingTag] = useState<Tag | null>(null)
  const [deleteModalOpen, setDeleteModalOpen] = useState(false)
  const [deletingTag, setDeletingTag] = useState<Tag | null>(null)

  useEffect(() => {
    if (!isInitialized && !isLoading) {
      initialize()
    }
  }, [initialize, isInitialized, isLoading])

  const getQueryCountForTag = (tagId: string) => {
    return listQueries({ tagIds: [tagId] }).length
  }

  const handleCreate = async (data: TagFormData) => {
    await createTag(data.name, data.color)
    toast.success('Tag criada com sucesso!')
    setIsCreating(false)
  }

  const handleUpdate = async (data: TagFormData) => {
    if (!editingTag) return
    await updateTag(editingTag.id, data.name, data.color)
    toast.success('Tag atualizada com sucesso!')
    setEditingTag(null)
  }

  const handleDelete = async () => {
    if (!deletingTag) return
    await deleteTag(deletingTag.id)
    toast.success('Tag excluída com sucesso!')
    setDeleteModalOpen(false)
    setDeletingTag(null)
  }

  const openDeleteModal = (tag: Tag) => {
    setDeletingTag(tag)
    setDeleteModalOpen(true)
  }

  if (isLoading) {
    return (
      <>
        <AppHeader title="Tags" showSearch={false} showNewButton={false} />
        <main className="flex-1 overflow-auto p-6">
          <div className="mx-auto max-w-2xl space-y-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        </main>
      </>
    )
  }

  return (
    <>
      <AppHeader title="Tags" showSearch={false} showNewButton={false} />
      
      <main className="flex-1 overflow-auto p-6">
        <div className="mx-auto max-w-2xl space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold">Gerenciar Tags</h2>
              <p className="text-sm text-muted-foreground">
                Organize suas consultas com tags personalizadas
              </p>
            </div>
            {!isCreating && !editingTag && (
              <Button onClick={() => setIsCreating(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Nova Tag
              </Button>
            )}
          </div>

          {/* Create form */}
          {isCreating && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Nova Tag</CardTitle>
              </CardHeader>
              <CardContent>
                <TagForm
                  onSubmit={handleCreate}
                  onCancel={() => setIsCreating(false)}
                  isLoading={isSubmitting}
                />
              </CardContent>
            </Card>
          )}

          {/* Tags list */}
          {tags.length > 0 ? (
            <div className="space-y-3">
              {tags.map((tag) => (
                editingTag?.id === tag.id ? (
                  <Card key={tag.id}>
                    <CardHeader>
                      <CardTitle className="text-base">Editar Tag</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <TagForm
                        initialData={{ name: tag.name, color: tag.color }}
                        onSubmit={handleUpdate}
                        onCancel={() => setEditingTag(null)}
                        isLoading={isSubmitting}
                      />
                    </CardContent>
                  </Card>
                ) : (
                  <TagCard
                    key={tag.id}
                    tag={tag}
                    queryCount={getQueryCountForTag(tag.id)}
                    onEdit={() => setEditingTag(tag)}
                    onDelete={() => openDeleteModal(tag)}
                  />
                )
              ))}
            </div>
          ) : !isCreating && (
            <Empty className="border">
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <TagsIcon />
                </EmptyMedia>
                <EmptyTitle>Nenhuma tag criada</EmptyTitle>
                <EmptyDescription>
                  Tags ajudam a organizar e filtrar suas consultas SQL.
                </EmptyDescription>
              </EmptyHeader>
              <Button onClick={() => setIsCreating(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Criar primeira tag
              </Button>
            </Empty>
          )}
        </div>
      </main>

      {/* Delete Modal */}
      <DeleteConfirmModal
        open={deleteModalOpen}
        onOpenChange={setDeleteModalOpen}
        title="Excluir Tag"
        description={`Tem certeza que deseja excluir a tag "${deletingTag?.name}"? Ela será removida de todas as consultas associadas.`}
        confirmText="EXCLUIR"
        isLoading={isSubmitting}
        onConfirm={handleDelete}
      />
    </>
  )
}
