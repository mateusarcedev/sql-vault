'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from '@/i18n/navigation'
import { useSearchParams } from 'next/navigation'
import { format as formatSQL } from 'sql-formatter'
import CodeMirror from '@uiw/react-codemirror'
import { sql } from '@codemirror/lang-sql'
import { toast } from 'sonner'
import { Wand2, X, Loader2 } from 'lucide-react'
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
import { useQueryStore } from '@/store/query-store'
import { useDatabaseContextStore } from '@/store/database-context-store'
import { DATABASE_LABELS, type DatabaseType, type Query } from '@/types/query'

const NO_DATABASE_CONTEXT = '__none__'

interface QueryDrawerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  editQuery?: Query | null
}

export function QueryDrawer({ open, onOpenChange, editQuery }: QueryDrawerProps) {
  const t = useTranslations('queryDrawer')
  const tCommon = useTranslations('common')
  const tDatabaseContexts = useTranslations('databaseContexts')
  const tDatabaseHints = useTranslations('database.context')
  const router = useRouter()
  const searchParams = useSearchParams()
  const { createQuery, updateQuery, addVersion, tags, isSubmitting } = useQueryStore()
  const {
    initialize: initializeDatabaseContexts,
    listContexts,
    isLoading: isLoadingDatabaseContexts,
  } = useDatabaseContextStore()

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [sqlCode, setSqlCode] = useState('')
  const [database, setDatabase] = useState<DatabaseType>('postgresql')
  const [databaseId, setDatabaseId] = useState<string | null>(null)
  const [isPublic, setIsPublic] = useState(false)
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [isFavorite, setIsFavorite] = useState(false)
  const [status, setStatus] = useState<'active' | 'draft'>('active')
  const [saveAsNewVersion, setSaveAsNewVersion] = useState(false)
  const [versionDescription, setVersionDescription] = useState('')
  const [hasAIConfigured, setHasAIConfigured] = useState(false)

  const isEditing = !!editQuery
  const databaseContexts = listContexts()
  const selectedDatabaseContext = databaseId
    ? databaseContexts.find((context) => context.id === databaseId) ?? null
    : null
  const canEnablePublic = !databaseId || Boolean(selectedDatabaseContext?.isPublic)

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
    if (editQuery) {
      setTitle(editQuery.title)
      setDescription(editQuery.description)
      setSqlCode(editQuery.sql)
      setDatabase(editQuery.database)
      setDatabaseId(editQuery.databaseId ?? null)
      setIsPublic(Boolean(editQuery.isPublic))
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
      setDatabaseId(null)
      setIsPublic(false)
      setSelectedTags([])
      setIsFavorite(false)
      setStatus('active')
      setSaveAsNewVersion(false)
      setVersionDescription('')
    }
  }, [editQuery, open])

  useEffect(() => {
    if (canEnablePublic) return
    setIsPublic(false)
  }, [canEnablePublic])

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
      toast.success(t('formatSuccess'))
    } catch {
      toast.error(t('formatError'))
    }
  }, [sqlCode, database, t])

  const handleSubmit = async () => {
    if (!title.trim()) {
      toast.error(t('titleRequired'))
      return
    }
    if (!sqlCode.trim()) {
      toast.error(t('sqlRequired'))
      return
    }

    try {
      if (isEditing && editQuery) {
        if (saveAsNewVersion && sqlCode !== editQuery.sql) {
          await addVersion(
            editQuery.id,
            sqlCode,
            versionDescription || t('updateFallback')
          )
          toast.success(t('versionSaved'))
        } else {
          await updateQuery(editQuery.id, {
            title,
            description,
            sql: sqlCode,
            database,
            databaseId,
            isPublic,
            tagIds: selectedTags,
            isFavorite,
            status,
          })
          toast.success(t('updateSuccess'))
        }
      } else {
        await createQuery({
          title,
          description,
          sql: sqlCode,
          database,
          databaseId,
          isPublic,
          tagIds: selectedTags,
          isFavorite,
          status,
        })
        toast.success(t('createSuccess'))
      }
      onOpenChange(false)

      const params = new URLSearchParams(searchParams.toString())
      params.delete('nova')
      params.delete('editar')
      router.push(`/consultas${params.toString() ? `?${params.toString()}` : ''}`)
    } catch {
      toast.error(t('saveError'))
    }
  }

  const handleApplySuggestions = (
    suggestedName: string,
    suggestedDescription: string,
    suggestedTagNames: string[]
  ) => {
    if (suggestedName) setTitle(suggestedName)
    if (suggestedDescription) setDescription(suggestedDescription)
    const matchedIds = tags
      .filter((t) => suggestedTagNames.some((name) => name.toLowerCase() === t.name.toLowerCase()))
      .map((t) => t.id)
    if (matchedIds.length > 0) setSelectedTags(matchedIds)
    toast.success(t('suggestionsApplied'))
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
            <Label htmlFor="title">{t('titleLabel')}</Label>
            <Input
              id="title"
              placeholder={t('titlePlaceholder')}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">{t('descriptionLabel')}</Label>
            <Textarea
              id="description"
              placeholder={t('descriptionPlaceholder')}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="database">{t('databaseLabel')}</Label>
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
            <Label htmlFor="database-context">{tDatabaseContexts('sectionTitle')}</Label>
            <Select
              value={databaseId ?? NO_DATABASE_CONTEXT}
              onValueChange={(value) => setDatabaseId(value === NO_DATABASE_CONTEXT ? null : value)}
              disabled={isLoadingDatabaseContexts}
            >
              <SelectTrigger id="database-context" className="w-full">
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
                <Label htmlFor="query-public" className="text-sm font-medium">
                  {tDatabaseContexts('visibility.public')}
                </Label>
                <p className="text-xs text-muted-foreground">
                  {tDatabaseHints('required_for_public')}
                </p>
              </div>
              <Switch
                id="query-public"
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
            <div className="flex items-center justify-between">
              <Label>{t('sqlLabel')}</Label>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleFormatSQL}
                className="h-7 gap-1 text-xs"
              >
                <Wand2 className="h-3 w-3" />
                {t('format')}
              </Button>
            </div>
            <div className="overflow-hidden rounded-md border">
              <CodeMirror
                value={sqlCode}
                height="auto"
                minHeight="200px"
                className="min-h-[200px] h-full"
                onChange={(value) => setSqlCode(value)}
                theme="dark"
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

          <AIAnalysisPanel
            sql={sqlCode}
            dialect={database}
            databaseId={databaseId}
            availableTags={tags}
            onApplySuggestions={handleApplySuggestions}
            hasAIConfigured={hasAIConfigured}
          />

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
              <Label htmlFor="status">{t('queryStatus')}</Label>
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

          {isEditing && sqlCode !== editQuery?.sql && (
            <div className="space-y-3 rounded-lg border bg-muted/50 p-4">
              <div className="flex items-center gap-2">
                <Checkbox
                  id="saveAsNewVersion"
                  checked={saveAsNewVersion}
                  onCheckedChange={(checked) => setSaveAsNewVersion(checked === true)}
                />
                <Label htmlFor="saveAsNewVersion" className="cursor-pointer">
                  {t('saveAsVersion')}
                </Label>
              </div>
              {saveAsNewVersion && (
                <Input
                  placeholder={t('versionDescPlaceholder')}
                  value={versionDescription}
                  onChange={(e) => setVersionDescription(e.target.value)}
                />
              )}
            </div>
          )}

          {selectedTags.length > 0 && (
            <div className="space-y-2">
              <Label>{t('selectedTags')}</Label>
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
