'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import CodeMirror from '@uiw/react-codemirror'
import { sql } from '@codemirror/lang-sql'
import { toast } from 'sonner'
import { Wand2, X, Loader2, FunctionSquare, GitBranch, Zap, Eye, Plus, Copy } from 'lucide-react'

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
import { DATABASE_LABELS, type DatabaseType } from '@/types/query'
import type { Routine, RoutineType, RoutineParameter } from '@/types/routine'

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
  const router = useRouter()
  const searchParams = useSearchParams()
  const { create, update, isSubmitting } = useRoutineStore()
  const { tags } = useQueryStore() // Shared tags

  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [type, setType] = useState<RoutineType>('function')
  const [database, setDatabase] = useState<DatabaseType>('postgresql')
  const [sqlCode, setSqlCode] = useState(TEMPLATES.function)
  const [parameters, setParameters] = useState<RoutineParameter[]>([])
  const [returnType, setReturnType] = useState('')
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [isFavorite, setIsFavorite] = useState(false)
  const [status, setStatus] = useState<'active' | 'draft'>('active')

  const isEditing = !!editRoutine

  useEffect(() => {
    if (editRoutine) {
      setName(editRoutine.name)
      setDescription(editRoutine.description || '')
      setType(editRoutine.type)
      setDatabase(editRoutine.database)
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
      setSqlCode(TEMPLATES.function)
      setParameters([])
      setReturnType('')
      setSelectedTags([])
      setIsFavorite(false)
      setStatus('active')
    }
  }, [editRoutine, open])

  const handleTypeChange = (newType: RoutineType) => {
    // Se o usuário não editou o template anterior (é exatamente igual), podemos trocar
    if (sqlCode.trim() === TEMPLATES[type].trim() || sqlCode.trim() === '') {
      setSqlCode(TEMPLATES[newType])
    }
    setType(newType)
  }

  const handleAddParameter = () => {
    if (parameters.length >= 20) {
      toast.error('Você atingiu o limite de 20 parâmetros.')
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
      toast.error('O nome da rotina é obrigatório')
      return
    }
    if (!sqlCode.trim()) {
      toast.error('Código SQL é obrigatório')
      return
    }

    try {
      const payload = {
        name,
        description,
        type,
        database,
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
        toast.success('Rotina atualizada!')
      } else {
        await create(payload)
        toast.success('Rotina criada!')
      }
      
      onOpenChange(false)
      const params = new URLSearchParams(searchParams.toString())
      params.delete('drawer')
      params.delete('id')
      router.push(`/routines${params.toString() ? '?' + params.toString() : ''}`)
    } catch {
      toast.error('Erro ao salvar rotina')
    }
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
      <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle>
            {isEditing ? 'Editar Rotina' : 'Nova Rotina'}
          </SheetTitle>
          <SheetDescription>
            {isEditing
              ? 'Atualize os metadados ou o código SQL desta rotina'
              : 'Configure os parâmetros e o código SQL para a nova rotina de banco de dados'}
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          <div className="space-y-2">
            <Label htmlFor="name">Nome da Rotina</Label>
            <Input
              id="name"
              placeholder="Ex: get_active_users"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="type">Tipo</Label>
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
              <Label htmlFor="database">Banco de Dados</Label>
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
            <Label htmlFor="description">Descrição</Label>
            <Textarea
              id="description"
              placeholder="Descreva o propósito da rotina..."
              value={description}
              onChange={(e) => setDescription(e.target.value.substring(0, 500))}
              rows={2}
            />
            <div className="text-right text-xs text-muted-foreground">
              {description.length} / 500
            </div>
          </div>

          {/* Parâmetros (apenas function / procedure) */}
          {(type === 'function' || type === 'procedure') && (
            <div className="space-y-3 rounded-lg border p-4 bg-muted/30">
              <div className="flex items-center justify-between">
                <Label>Parâmetros ({parameters.length}/20)</Label>
                <Button variant="outline" size="sm" onClick={handleAddParameter} className="h-7 text-xs">
                  <Plus className="mr-1 h-3 w-3" />
                  Adicionar
                </Button>
              </div>

              {parameters.length > 0 ? (
                <div className="space-y-2 max-h-[250px] overflow-y-auto pr-2">
                  {parameters.map((param, idx) => (
                    <div key={idx} className="flex items-start gap-2 pt-2">
                      <div className="flex-1 space-y-1">
                        <Input 
                          placeholder="Nome (ex: id_user)" 
                          value={param.name} 
                          onChange={(e) => handleUpdateParameter(idx, 'name', e.target.value)}
                          className="h-8 text-sm"
                        />
                      </div>
                      <div className="flex-1 space-y-1">
                        <Input 
                          placeholder="Tipo SQL (ex: INTEGER)" 
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
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleRemoveParameter(idx)}>
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-sm text-muted-foreground text-center py-4 bg-background border rounded-md border-dashed">
                  Nenhum parâmetro definido.
                </div>
              )}

              {type === 'function' && (
                <div className="pt-4 border-t mt-4 space-y-2">
                  <Label>Tipo de retorno</Label>
                  <Input 
                    placeholder="ex: INTEGER, TABLE, VOID"
                    value={returnType}
                    onChange={(e) => setReturnType(e.target.value)}
                  />
                </div>
              )}
            </div>
          )}

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

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Código SQL ({type.toUpperCase()})</Label>
            </div>
            <div className="overflow-hidden rounded-md border">
              <CodeMirror
                value={sqlCode}
                height="300px"
                extensions={[sql()]}
                onChange={(value) => setSqlCode(value)}
                theme="dark" // Requisição explícita para o editor estar no tema escuro se possível (Monaco requested, CodeMirror here follows uiw defaults, let's stick to dark theme explicitly)
                placeholder="/* Escreva sua rotina DDL aqui */"
                basicSetup={{
                  lineNumbers: true,
                  highlightActiveLineGutter: true,
                  highlightActiveLine: true,
                  foldGutter: true,
                }}
              />
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
              <Label htmlFor="status">Status da Rotina</Label>
              <p className="text-xs text-muted-foreground">
                {status === 'active' ? 'Ativa (visível na listagem)' : 'Rascunho (incompleta)'}
              </p>
            </div>
            <Switch
              id="status"
              checked={status === 'active'}
              onCheckedChange={(checked) => setStatus(checked ? 'active' : 'draft')}
            />
          </div>

        </div>

        <SheetFooter className="mt-6 gap-2">
          <Button variant="outline" onClick={handleClose}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isEditing ? 'Salvar Alterações' : 'Criar Rotina'}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
