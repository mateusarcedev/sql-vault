'use client'

import { useEffect, useMemo, useState } from 'react'
import { useTranslations } from 'next-intl'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useDatabaseContextStore } from '@/store/database-context-store'
import type { DatabaseContextType, SchemaFormat } from '@/types/database-context'

const TYPE_OPTIONS: { value: DatabaseContextType; label: string }[] = [
  { value: 'postgresql', label: 'PostgreSQL' },
  { value: 'mysql', label: 'MySQL' },
  { value: 'sqlite', label: 'SQLite' },
  { value: 'sqlserver', label: 'SQL Server' },
  { value: 'oracle', label: 'Oracle' },
  { value: 'other', label: 'Other' },
]

const SCHEMA_FORMAT_OPTIONS: { value: SchemaFormat; label: string }[] = [
  { value: 'prisma', label: 'Prisma' },
  { value: 'sql', label: 'SQL' },
  { value: 'other', label: 'Other' },
]

interface DatabaseContextDrawerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  contextId?: string | null
  onSaved?: () => void | Promise<void>
}

export function DatabaseContextDrawer({
  open,
  onOpenChange,
  contextId,
  onSaved,
}: DatabaseContextDrawerProps) {
  const t = useTranslations('databaseContexts.drawer')
  const tCommon = useTranslations('common')
  const tHints = useTranslations('database.context')
  const {
    getContext,
    fetchContext,
    createContext,
    updateContext,
    isSubmitting,
  } = useDatabaseContextStore()

  const isEditing = Boolean(contextId)

  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [type, setType] = useState<DatabaseContextType>('postgresql')
  const [schemaFormat, setSchemaFormat] = useState<SchemaFormat>('prisma')
  const [schemaDefinition, setSchemaDefinition] = useState('')
  const [isPublic, setIsPublic] = useState(false)
  const [isLoadingContext, setIsLoadingContext] = useState(false)

  const canSave = useMemo(() => {
    return Boolean(name.trim() && schemaDefinition.trim())
  }, [name, schemaDefinition])

  useEffect(() => {
    if (!open) return

    if (!contextId) {
      setName('')
      setDescription('')
      setType('postgresql')
      setSchemaFormat('prisma')
      setSchemaDefinition('')
      setIsPublic(false)
      setIsLoadingContext(false)
      return
    }

    const existing = getContext(contextId)

    if (existing?.schemaDefinition) {
      setName(existing.name)
      setDescription(existing.description ?? '')
      setType(existing.type)
      setSchemaFormat(existing.schemaFormat)
      setSchemaDefinition(existing.schemaDefinition)
      setIsPublic(existing.isPublic)
      setIsLoadingContext(false)
      return
    }

    setIsLoadingContext(true)
    fetchContext(contextId)
      .then((fullContext) => {
        setName(fullContext.name)
        setDescription(fullContext.description ?? '')
        setType(fullContext.type)
        setSchemaFormat(fullContext.schemaFormat)
        setSchemaDefinition(fullContext.schemaDefinition)
        setIsPublic(fullContext.isPublic)
      })
      .catch(() => {
        toast.error(t('loadError'))
      })
      .finally(() => {
        setIsLoadingContext(false)
      })
  }, [open, contextId, getContext, fetchContext, t])

  const handleClose = () => {
    onOpenChange(false)
  }

  const handleSave = async () => {
    if (!canSave) {
      toast.error(t('requiredFields'))
      return
    }

    try {
      const payload = {
        name: name.trim(),
        description: description.trim() || null,
        type,
        schemaFormat,
        schemaDefinition: schemaDefinition.trim(),
        isPublic,
      }

      if (contextId) {
        await updateContext(contextId, payload)
        toast.success(t('updateSuccess'))
      } else {
        await createContext(payload)
        toast.success(t('createSuccess'))
      }

      await onSaved?.()
      handleClose()
    } catch {
      toast.error(t('saveError'))
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-2xl overflow-y-auto p-0 flex flex-col gap-0">
        <SheetHeader className="px-6 py-4 border-b">
          <SheetTitle>{isEditing ? t('editTitle') : t('newTitle')}</SheetTitle>
          <SheetDescription>
            {isEditing ? t('editDescription') : t('newDescription')}
          </SheetDescription>
        </SheetHeader>

        {isLoadingContext ? (
          <div className="p-6 text-sm text-muted-foreground flex items-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            {t('loading')}
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">
            <div className="space-y-2">
              <Label htmlFor="db-context-name">{t('nameLabel')}</Label>
              <Input
                id="db-context-name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder={t('namePlaceholder')}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="db-context-description">{t('descriptionLabel')}</Label>
              <Textarea
                id="db-context-description"
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                placeholder={t('descriptionPlaceholder')}
                rows={2}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t('typeLabel')}</Label>
                <Select value={type} onValueChange={(value) => setType(value as DatabaseContextType)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TYPE_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>{t('schemaFormatLabel')}</Label>
                <Select value={schemaFormat} onValueChange={(value) => setSchemaFormat(value as SchemaFormat)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SCHEMA_FORMAT_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="db-context-schema">{t('schemaDefinitionLabel')}</Label>
              <Textarea
                id="db-context-schema"
                value={schemaDefinition}
                onChange={(event) => setSchemaDefinition(event.target.value.slice(0, 10000))}
                placeholder={t('schemaDefinitionPlaceholder')}
                rows={14}
                className="font-mono text-xs"
              />
              <p className="text-xs text-muted-foreground text-right">
                {schemaDefinition.length} / 10000
              </p>
            </div>

            <div className="rounded-lg border p-4 space-y-2">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label htmlFor="db-context-public" className="text-sm font-medium">
                    {t('publicLabel')}
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    {t('publicDescription')}
                  </p>
                </div>
                <Switch
                  id="db-context-public"
                  checked={isPublic}
                  onCheckedChange={setIsPublic}
                />
              </div>
              <p className="text-xs text-muted-foreground">
                {tHints('required_for_public')}
              </p>
              {!isPublic && (
                <p className="text-xs text-amber-600 dark:text-amber-400">
                  {tHints('must_be_public')}
                </p>
              )}
            </div>
          </div>
        )}

        <SheetFooter className="border-t px-6 py-4 sm:justify-end">
          <Button variant="outline" onClick={handleClose} disabled={isSubmitting || isLoadingContext}>
            {tCommon('cancel')}
          </Button>
          <Button onClick={handleSave} disabled={!canSave || isSubmitting || isLoadingContext}>
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isSubmitting ? tCommon('saving') : tCommon('save')}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
