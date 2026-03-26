'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from '@/i18n/navigation'
import { useSearchParams } from 'next/navigation'
import CodeMirror from '@uiw/react-codemirror'
import { sql } from '@codemirror/lang-sql'
import { toast } from 'sonner'
import { Wand2, X, Loader2, FunctionSquare, GitBranch, Zap, Eye, Plus, Copy } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { AIAnalysisPanel } from '@/components/ai-analysis-panel'

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
import { useRoutineStore } from '@/store/routine-store'
import { useQueryStore } from '@/store/query-store'
import { useDatabaseContextStore } from '@/store/database-context-store'
import { DATABASE_LABELS, type DatabaseType } from '@/types/query'
import type { Routine, RoutineType, RoutineParameter } from '@/types/routine'

const NO_DATABASE_CONTEXT = '__none__'

interface RoutineDrawerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  editRoutine?: Routine | null
}

const TEMPLATES: Record<RoutineType, string> = {
  function: `CREATE OR REPLACE FUNCTION nome_da_funcao()
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  -- lógica aqui
END;
$$;`,
  procedure: `CREATE OR REPLACE PROCEDURE nome_da_procedure()
LANGUAGE plpgsql
AS $$
BEGIN
  -- lógica aqui
END;
$$;`,
  trigger: `CREATE OR REPLACE TRIGGER nome_do_trigger
BEFORE INSERT ON nome_da_tabela
FOR EACH ROW
EXECUTE FUNCTION nome_da_funcao();`,
  view: `CREATE OR REPLACE VIEW nome_da_view AS
SELECT
  -- colunas
FROM nome_da_tabela
WHERE -- condição;`
}

const ROUTINE_TYPES: { value: RoutineType; label: string; icon: any }[] = [
  { value: 'function', label: 'Function', icon: FunctionSquare },
  { value: 'procedure', label: 'Procedure', icon: GitBranch },
  { value: 'trigger', label: 'Trigger', icon: Zap },
  { value: 'view', label: 'View', icon: Eye },
]

export function RoutineDrawer({ open, onOpenChange, editRoutine }: RoutineDrawerProps) {
  const t = useTranslations('routineDrawer')
  const tCommon = useTranslations('common')
  const tDatabaseContexts = useTranslations('databaseContexts')
  const tDatabaseHints = useTranslations('database.context')
  const router = useRouter()
  const searchParams = useSearchParams()
  const { create, update, isSubmitting } = useRoutineStore()
  const { tags } = useQueryStore()
  const {
    initialize: initializeDatabaseContexts,
    listContexts,
    isLoading: isLoadingDatabaseContexts,
  } = useDatabaseContextStore()

  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [type, setType] = useState<RoutineType>('function')
  const [database, setDatabase] = useState<DatabaseType>('postgresql')
  const [databaseId, setDatabaseId] = useState<string | null>(null)
  const [isPublic, setIsPublic] = useState(false)
  const [sqlCode, setSqlCode] = useState(TEMPLATES.function)
  const [parameters, setParameters] = useState<RoutineParameter[]>([])
  const [returnType, setReturnType] = useState('')
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [isFavorite, setIsFavorite] = useState(false)
  const [status, setStatus] = useState<'active' | 'draft'>('active')
  const [hasAIConfigured, setHasAIConfigured] = useState(false)

  const isEditing = !!editRoutine
  const databaseContexts = listContexts()
  const selectedDatabaseContext = databaseId
    ? databaseContexts.find((context) => context.id === databaseId) ?? null
    : null
  const canEnablePublic = Boolean(databaseId && selectedDatabaseContext?.isPublic)

  useEffect(() => {
    fetch('/api/ai/config')
      .then((res) => res.ok ? res.json() : null)
      .then((data) => setHasAIConfigured(!!data?.provider))
      .catch(() => {})
  }, [])

  useEffect(() => {
    if (!open) return
    void initializeDatabaseContexts('mine')
  }, [open, initializeDatabaseContexts])

  useEffect(() => {
    if (editRoutine) {
      setName(editRoutine.name)
      setDescription(editRoutine.description || '')
      setType(editRoutine.type)
      setDatabase(editRoutine.database)
      setDatabaseId(editRoutine.databaseId ?? null)
      setIsPublic(Boolean(editRoutine.databaseId) && Boolean(editRoutine.isPublic))
      setSqlCode(editRoutine.sql)
      setParameters([...editRoutine.parameters])
      setReturnType(editRoutine.returnType || '')
      setSelectedTags(editRoutine.tags.map(t => t.id))
      setIsFavorite(editRoutine.isFavorite)
      setStatus(editRoutine.status)
    } else {
      setName('')
      setDescription('')
      setType('function')
      setDatabase('postgresql')
      setDatabaseId(null)
      setIsPublic(false)
      setSqlCode(TEMPLATES.function)
      setParameters([])
      setReturnType('')
      setSelectedTags([])
      setIsFavorite(false)
      setStatus('active')
    }
  }, [editRoutine, open])

  useEffect(() => {
    if (canEnablePublic) return
    setIsPublic(false)
  }, [canEnablePublic])

  const handleTypeChange = (newType: RoutineType) => {
    if (sqlCode.trim() === TEMPLATES[type].trim() || sqlCode.trim() === '') {
      setSqlCode(TEMPLATES[newType])
    }
    setType(newType)
  }

  const handleAddParameter = () => {
    if (parameters.length >= 20) {
      toast.error(t('maxParametersError'))
      return
    }
    setParameters([...parameters, { name: '', type: 'INTEGER', direction: 'IN' }])
  }

  const handleUpdateParameter = (index: number, field: keyof RoutineParameter, value: string) => {
    const updated = [...parameters]
    updated[index] = { ...updated[index], [field]: value }
    setParameters(updated)
  }

  const handleRemoveParameter = (index: number) => {
    const updated = [...parameters]
    updated.splice(index, 1)
    setParameters(updated)
  }

  const handleSubmit = async () => {
    if (!name.trim()) {
      toast.error(t('nameRequired'))
      return
    }
    if (!sqlCode.trim()) {
      toast.error(t('sqlRequired'))
      return
    }

    try {
      const payload = {
        name,
        description,
        type,
        database,
        databaseId,
        isPublic,
        sql: sqlCode,
        parameters: (type === 'function' || type === 'procedure') ? parameters : [],
        returnType: type === 'function' ? returnType : null,
        tagIds: selectedTags,
        isFavorite,
        status,
        deletedAt: null,
      }

      if (isEditing && editRoutine) {
        await update(editRoutine.id, payload)
        toast.success(t('updateSuccess'))
      } else {
        await create(payload)
        toast.success(t('createSuccess'))
      }

      onOpenChange(false)
      const params = new URLSearchParams(searchParams.toString())
      params.delete('drawer')
      params.delete('id')
      router.push(`/routines${params.toString() ? '?' + params.toString() : ''}`)
    } catch {
      toast.error(t('saveError'))
    }
  }

  const handleApplySuggestions = (
    suggestedName: string,
    suggestedDescription: string,
    suggestedTagNames: string[]
  ) => {
    if (suggestedName) setName(suggestedName)
    if (suggestedDescription) setDescription(suggestedDescription)
    const matchedIds = tags
      .filter((t) => suggestedTagNames.some((n) => n.toLowerCase() === t.name.toLowerCase()))
      .map((t) => t.id)
    if (matchedIds.length > 0) setSelectedTags(matchedIds)
    toast.success(t('suggestionsApplied'))
  }

  const handleToggleTag = (tagId: string) => {
    setSelectedTags((prev) =>
      prev.includes(tagId) ? prev.filter((id) => id !== tagId) : [...prev, tagId]
    )
  }

  const handleClose = () => {
    onOpenChange(false)
    const params = new URLSearchParams(searchParams.toString())
    params.delete('drawer')
    params.delete('id')
    router.push(`/routines${params.toString() ? '?' + params.toString() : ''}`)
  }

  return (
    <Sheet open={open} onOpenChange={handleClose}>
      <SheetContent className="w-full sm:max-w-2xl lg:max-w-3xl overflow-y-auto p-0 flex flex-col gap-0">
        <SheetHeader className="px-6 py-4 border-b">
          <SheetTitle>
            {isEditing ? t('editTitle') : t('newTitle')}
          </SheetTitle>
          <SheetDescription>
            {isEditing ? t('editDescription') : t('newDescription')}
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6 min-w-0">
          <div className="space-y-2">
            <Label htmlFor="name">{t('nameLabel')}</Label>
            <Input
              id="name"
              placeholder={t('namePlaceholder')}
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="type">{t('typeLabel')}</Label>
              <Select value={type} onValueChange={(v) => handleTypeChange(v as RoutineType)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ROUTINE_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      <div className="flex items-center gap-2">
                        <t.icon className="h-4 w-4 text-muted-foreground" />
                        {t.label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="database">{t('databaseLabel')}</Label>
              <Select value={database} onValueChange={(v) => setDatabase(v as DatabaseType)}>
                <SelectTrigger>
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
          </div>

          <div className="space-y-2">
            <Label htmlFor="database-context">{tDatabaseContexts('sectionTitle')}</Label>
            <Select
              value={databaseId ?? NO_DATABASE_CONTEXT}
              onValueChange={(value) => setDatabaseId(value === NO_DATABASE_CONTEXT ? null : value)}
              disabled={isLoadingDatabaseContexts}
            >
              <SelectTrigger id="database-context">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NO_DATABASE_CONTEXT}>{tDatabaseContexts('empty')}</SelectItem>
                {databaseContexts.map((context) => (
                  <SelectItem key={context.id} value={context.id}>
                    {context.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="rounded-lg border p-4 space-y-2">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label htmlFor="routine-public" className="text-sm font-medium">
                  {tDatabaseContexts('visibility.public')}
                </Label>
                <p className="text-xs text-muted-foreground">
                  {tDatabaseHints('required_for_public')}
                </p>
              </div>
              <Switch
                id="routine-public"
                checked={isPublic}
                onCheckedChange={setIsPublic}
                disabled={!canEnablePublic}
              />
            </div>
            {databaseId && !selectedDatabaseContext?.isPublic && (
              <p className="text-xs text-amber-600 dark:text-amber-400">
                {tDatabaseHints('must_be_public')}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">{t('descriptionLabel')}</Label>
            <Textarea
              id="description"
              placeholder={t('descriptionPlaceholder')}
              value={description}
              onChange={(e) => setDescription(e.target.value.substring(0, 500))}
              rows={2}
            />
            <div className="text-right text-xs text-muted-foreground">
              {description.length} / 500
            </div>
          </div>

          {(type === 'function' || type === 'procedure') && (
            <div className="space-y-3 rounded-lg border p-4 bg-muted/30">
              <div className="flex items-center justify-between">
                <Label>{t('parametersLabel')} ({parameters.length}/20)</Label>
                <Button variant="outline" size="sm" onClick={handleAddParameter} className="h-7 text-xs">
                  <Plus className="mr-1 h-3 w-3" />
                  {t('addParameter')}
                </Button>
              </div>

              {parameters.length > 0 ? (
                <div className="space-y-2 max-h-[250px] overflow-y-auto pr-2">
                  {parameters.map((param, idx) => (
                    <div key={idx} className="flex flex-col sm:flex-row items-start gap-2 pt-2 pb-4 sm:pb-0 border-b sm:border-0">
                      <div className="w-full sm:flex-1 space-y-1">
                        <Input
                          placeholder={t('paramNamePlaceholder')}
                          value={param.name}
                          onChange={(e) => handleUpdateParameter(idx, 'name', e.target.value)}
                          className="h-8 text-sm"
                        />
                      </div>
                      <div className="flex-1 space-y-1">
                        <Input
                          placeholder={t('paramTypePlaceholder')}
                          value={param.type}
                          onChange={(e) => handleUpdateParameter(idx, 'type', e.target.value)}
                          className="h-8 text-sm"
                        />
                      </div>
                      {type === 'procedure' && (
                        <div className="w-[100px] space-y-1">
                          <Select
                            value={param.direction}
                            onValueChange={(val) => handleUpdateParameter(idx, 'direction', val as any)}
                          >
                            <SelectTrigger className="h-8 text-sm">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="IN">IN</SelectItem>
                              <SelectItem value="OUT">OUT</SelectItem>
                              <SelectItem value="INOUT">INOUT</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      )}
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive self-end sm:self-auto" onClick={() => handleRemoveParameter(idx)}>
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-sm text-muted-foreground text-center py-4 bg-background border rounded-md border-dashed">
                  {t('noParameters')}
                </div>
              )}

              {type === 'function' && (
                <div className="pt-4 border-t mt-4 space-y-2">
                  <Label>{t('returnTypeLabel')}</Label>
                  <Input
                    placeholder={t('returnTypePlaceholder')}
                    value={returnType}
                    onChange={(e) => setReturnType(e.target.value)}
                  />
                </div>
              )}
            </div>
          )}

          <div className="space-y-2">
            <Label>{t('tagsLabel')}</Label>
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
                  {t('noTagsAvailable')}
                </span>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>{t('sqlLabel')} ({type.toUpperCase()})</Label>
            </div>
            <div className="overflow-hidden rounded-md border">
              <CodeMirror
                value={sqlCode}
                height="auto"
                minHeight="300px"
                className="min-h-[300px] h-full"
                onChange={(value) => setSqlCode(value)}
                theme="dark"
                placeholder="/* Write your DDL routine here */"
                basicSetup={{
                  lineNumbers: true,
                  highlightActiveLineGutter: true,
                  highlightActiveLine: true,
                  foldGutter: true,
                }}
              />
            </div>
          </div>

          <AIAnalysisPanel
            sql={sqlCode}
            dialect={database}
            databaseId={databaseId}
            availableTags={tags}
            onApplySuggestions={handleApplySuggestions}
            hasAIConfigured={hasAIConfigured}
          />

          <div className="flex items-center gap-2">
            <Checkbox
              id="favorite"
              checked={isFavorite}
              onCheckedChange={(checked) => setIsFavorite(checked === true)}
            />
            <Label htmlFor="favorite" className="cursor-pointer">
              {t('markFavorite')}
            </Label>
          </div>

          <div className="flex items-center justify-between rounded-lg border p-4">
            <div className="space-y-0.5">
              <Label htmlFor="status">{t('routineStatus')}</Label>
              <p className="text-xs text-muted-foreground">
                {status === 'active' ? t('statusActive') : t('statusDraft')}
              </p>
            </div>
            <Switch
              id="status"
              checked={status === 'active'}
              onCheckedChange={(checked) => setStatus(checked ? 'active' : 'draft')}
            />
          </div>

        </div>

        <SheetFooter className="px-6 py-4 border-t mt-0 flex-row justify-end gap-3 bg-background/80 backdrop-blur-sm sticky bottom-0">
          <Button variant="outline" onClick={handleClose}>
            {tCommon('cancel')}
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isEditing ? t('saveChanges') : t('create')}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
