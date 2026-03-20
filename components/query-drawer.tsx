'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { format as formatSQL } from 'sql-formatter'
import CodeMirror from '@uiw/react-codemirror'
import { sql } from '@codemirror/lang-sql'
import { toast } from 'sonner'
import { Wand2, X, Loader2 } from 'lucide-react'

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { Switch } from '@/components/ui/switch'
import { TagChip } from '@/components/tag-chip'
import { useQueryStore } from '@/store/query-store'
import { DATABASE_LABELS, type DatabaseType, type Query } from '@/types/query'

interface QueryDrawerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  editQuery?: Query | null
}

export function QueryDrawer({ open, onOpenChange, editQuery }: QueryDrawerProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { createQuery, updateQuery, addVersion, tags, isSubmitting } = useQueryStore()

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [sqlCode, setSqlCode] = useState('')
  const [database, setDatabase] = useState<DatabaseType>('postgresql')
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [isFavorite, setIsFavorite] = useState(false)
  const [status, setStatus] = useState<'active' | 'draft'>('active')
  const [saveAsNewVersion, setSaveAsNewVersion] = useState(false)
  const [versionDescription, setVersionDescription] = useState('')

  const isEditing = !!editQuery

  useEffect(() => {
    if (editQuery) {
      setTitle(editQuery.title)
      setDescription(editQuery.description)
      setSqlCode(editQuery.sql)
      setDatabase(editQuery.database)
      setSelectedTags(editQuery.tags.map(t => t.id))
      setIsFavorite(editQuery.isFavorite)
      setStatus(editQuery.status)
      setSaveAsNewVersion(false)
      setVersionDescription('')
    } else {
      setTitle('')
      setDescription('')
      setSqlCode('')
      setDatabase('postgresql')
      setSelectedTags([])
      setIsFavorite(false)
      setStatus('active')
      setSaveAsNewVersion(false)
      setVersionDescription('')
    }
  }, [editQuery, open])

  const handleFormatSQL = useCallback(() => {
    try {
      const formatted = formatSQL(sqlCode, {
        language: database === 'postgresql' ? 'postgresql' : 
                  database === 'mysql' ? 'mysql' : 
                  database === 'sqlserver' ? 'tsql' : 
                  database === 'oracle' ? 'plsql' : 'sql',
        tabWidth: 2,
        keywordCase: 'upper',
      })
      setSqlCode(formatted)
      toast.success('SQL formatado com sucesso!')
    } catch {
      toast.error('Erro ao formatar SQL')
    }
  }, [sqlCode, database])

  const handleSubmit = async () => {
    if (!title.trim()) {
      toast.error('Título é obrigatório')
      return
    }
    if (!sqlCode.trim()) {
      toast.error('Código SQL é obrigatório')
      return
    }

    try {
      if (isEditing && editQuery) {
        if (saveAsNewVersion && sqlCode !== editQuery.sql) {
          await addVersion(
            editQuery.id,
            sqlCode,
            versionDescription || 'Atualização'
          )
          toast.success('Nova versão salva!')
        } else {
          await updateQuery(editQuery.id, {
            title,
            description,
            sql: sqlCode,
            database,
            tagIds: selectedTags,
            isFavorite,
            status,
          })
          toast.success('Consulta atualizada!')
        }
      } else {
        await createQuery({
          title,
          description,
          sql: sqlCode,
          database,
          tagIds: selectedTags,
          isFavorite,
          status,
        })
        toast.success('Consulta criada!')
      }
      onOpenChange(false)
      
      // Remove query params
      const params = new URLSearchParams(searchParams.toString())
      params.delete('nova')
      params.delete('editar')
      router.push(`/consultas${params.toString() ? `?${params.toString()}` : ''}`)
    } catch {
      toast.error('Erro ao salvar consulta')
    }
  }

  const handleToggleTag = (tagId: string) => {
    setSelectedTags((prev) =>
      prev.includes(tagId)
        ? prev.filter((id) => id !== tagId)
        : [...prev, tagId]
    )
  }

  const handleClose = () => {
    onOpenChange(false)
    const params = new URLSearchParams(searchParams.toString())
    params.delete('nova')
    params.delete('editar')
    router.push(`/consultas${params.toString() ? `?${params.toString()}` : ''}`)
  }

  return (
    <Sheet open={open} onOpenChange={handleClose}>
      <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle>
            {isEditing ? 'Editar Consulta' : 'Nova Consulta'}
          </SheetTitle>
          <SheetDescription>
            {isEditing
              ? 'Atualize os dados da consulta SQL'
              : 'Crie uma nova consulta SQL para sua biblioteca'}
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          <div className="space-y-2">
            <Label htmlFor="title">Título</Label>
            <Input
              id="title"
              placeholder="Ex: Usuários ativos por mês"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Descrição</Label>
            <Textarea
              id="description"
              placeholder="Descreva o que esta consulta faz..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="database">Banco de Dados</Label>
            <Select value={database} onValueChange={(v) => setDatabase(v as DatabaseType)}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(DATABASE_LABELS).map(([key, label]) => (
                  <SelectItem key={key} value={key}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Código SQL</Label>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleFormatSQL}
                className="h-7 gap-1 text-xs"
              >
                <Wand2 className="h-3 w-3" />
                Formatar
              </Button>
            </div>
            <div className="overflow-hidden rounded-md border">
              <CodeMirror
                value={sqlCode}
                height="200px"
                extensions={[sql()]}
                onChange={(value) => setSqlCode(value)}
                theme="light"
                placeholder="SELECT * FROM users WHERE..."
                basicSetup={{
                  lineNumbers: true,
                  highlightActiveLineGutter: true,
                  highlightActiveLine: true,
                  foldGutter: true,
                }}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Tags</Label>
            <div className="flex flex-wrap gap-2">
              {tags.map((tag) => {
                const isSelected = selectedTags.includes(tag.id)
                return (
                  <button
                    key={tag.id}
                    type="button"
                    onClick={() => handleToggleTag(tag.id)}
                    className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                      isSelected
                        ? 'border-transparent'
                        : 'border-border bg-background hover:bg-muted'
                    }`}
                    style={
                      isSelected
                        ? {
                            backgroundColor: `${tag.color}20`,
                            color: tag.color,
                            borderColor: tag.color,
                          }
                        : undefined
                    }
                  >
                    {tag.name}
                  </button>
                )
              })}
              {tags.length === 0 && (
                <span className="text-sm text-muted-foreground">
                  Nenhuma tag disponível
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Checkbox
              id="favorite"
              checked={isFavorite}
              onCheckedChange={(checked) => setIsFavorite(checked === true)}
            />
            <Label htmlFor="favorite" className="cursor-pointer">
              Marcar como favorita
            </Label>
          </div>

          <div className="flex items-center justify-between rounded-lg border p-4">
            <div className="space-y-0.5">
              <Label htmlFor="status">Status da Consulta</Label>
              <p className="text-xs text-muted-foreground">
                {status === 'active' ? 'Ativa (visível na biblioteca)' : 'Rascunho (apenas para você)'}
              </p>
            </div>
            <Switch
              id="status"
              checked={status === 'active'}
              onCheckedChange={(checked) => setStatus(checked ? 'active' : 'draft')}
            />
          </div>

          {isEditing && sqlCode !== editQuery?.sql && (
            <div className="space-y-3 rounded-lg border bg-muted/50 p-4">
              <div className="flex items-center gap-2">
                <Checkbox
                  id="saveAsNewVersion"
                  checked={saveAsNewVersion}
                  onCheckedChange={(checked) => setSaveAsNewVersion(checked === true)}
                />
                <Label htmlFor="saveAsNewVersion" className="cursor-pointer">
                  Salvar como nova versão
                </Label>
              </div>
              {saveAsNewVersion && (
                <Input
                  placeholder="Descrição da versão (opcional)"
                  value={versionDescription}
                  onChange={(e) => setVersionDescription(e.target.value)}
                />
              )}
            </div>
          )}

          {selectedTags.length > 0 && (
            <div className="space-y-2">
              <Label>Tags selecionadas</Label>
              <div className="flex flex-wrap gap-2">
                {selectedTags.map((tagId) => {
                  const tag = tags.find((t) => t.id === tagId)
                  if (!tag) return null
                  return (
                    <TagChip
                      key={tag.id}
                      name={tag.name}
                      color={tag.color}
                      onRemove={() => handleToggleTag(tag.id)}
                    />
                  )
                })}
              </div>
            </div>
          )}
        </div>

        <SheetFooter className="mt-6 gap-2">
          <Button variant="outline" onClick={handleClose}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isEditing ? 'Salvar Alterações' : 'Criar Consulta'}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
