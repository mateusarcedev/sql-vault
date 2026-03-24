'use client'

import { useState, useRef, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import { useDateFnsLocale } from '@/hooks/use-date-fns-locale'
import { Download, Upload, FileJson, AlertCircle, CheckCircle2, Key, Plus, Trash2, Copy, Check, Info, BrainCircuit, Eye, EyeOff, Loader2, RefreshCcw } from 'lucide-react'
import { toast } from 'sonner'
import { format } from 'date-fns'
import { AppHeader } from '@/components/app-header'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useQueryStore } from '@/store/query-store'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { AIProvider, AIConfigResponse } from '@/types/ai'

type ApiKey = {
  id: string
  name: string
  lastUsedAt: string | null
  regeneratedAt: string | null
  createdAt: string
}

type NewApiKey = ApiKey & {
  token: string
}

export default function SettingsPage() {
  const tKeys = useTranslations('settings.apiKeys')
  const tAI = useTranslations('settings.ai')
  const tData = useTranslations('settings.data')
  const tSettings = useTranslations('settings')
  const tCommon = useTranslations('common')
  const locale = useDateFnsLocale()
  const queryClient = useQueryClient()
  const [isExporting, setIsExporting] = useState(false)
  const [isImporting, setIsImporting] = useState(false)
  const [importPayload, setImportPayload] = useState<{ queries: any[]; tags: any[] } | null>(null)
  const [importError, setImportError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [isTokenDialogOpen, setIsTokenDialogOpen] = useState(false)
  const [newKeyName, setNewKeyName] = useState('')
  const [generatedKey, setGeneratedKey] = useState<NewApiKey | null>(null)
  const [isCopied, setIsCopied] = useState(false)
  const [regeneratingKeyId, setRegeneratingKeyId] = useState<string | null>(null)
  const [modelsRefreshKey, setModelsRefreshKey] = useState(0)

  const [aiProvider, setAiProvider] = useState<AIProvider | ''>('')
  const [aiModel, setAiModel] = useState('')
  const [openaiKey, setOpenaiKey] = useState('')
  const [anthropicKey, setAnthropicKey] = useState('')
  const [geminiKey, setGeminiKey] = useState('')
  const [showOpenaiKey, setShowOpenaiKey] = useState(false)
  const [showAnthropicKey, setShowAnthropicKey] = useState(false)
  const [showGeminiKey, setShowGeminiKey] = useState(false)

  const { initialize } = useQueryStore()

  const { data: aiConfig, isLoading: isLoadingAIConfig } = useQuery<AIConfigResponse>({
    queryKey: ['ai-config'],
    queryFn: async () => {
      const res = await fetch('/api/ai/config')
      if (!res.ok) throw new Error(tAI('loadError'))
      return res.json()
    }
  })

  const { data: aiModels, isLoading: isLoadingModels } = useQuery<{ models: string[] }>({
    queryKey: ['ai-models', aiProvider, modelsRefreshKey],
    queryFn: async () => {
      const refreshParam = modelsRefreshKey > 0 ? `&refresh=${modelsRefreshKey}` : ''
      const res = await fetch(`/api/ai/models?provider=${aiProvider}${refreshParam}`)
      if (!res.ok) return { models: [] }
      return res.json()
    },
    enabled: !!aiProvider,
  })

  useEffect(() => {
    if (aiConfig) {
      setAiProvider((aiConfig.provider as AIProvider) ?? '')
      setAiModel(aiConfig.model ?? '')
    }
  }, [aiConfig])

  const handleProviderChange = (value: AIProvider) => {
    setAiProvider(value)
    setAiModel('')
    setModelsRefreshKey(0)
  }

  const handleRefreshModels = () => {
    setModelsRefreshKey(Date.now())
  }

  const saveAIConfigMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/ai/config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider: aiProvider,
          model: aiModel,
          openaiApiKey: openaiKey,
          anthropicApiKey: anthropicKey,
          geminiApiKey: geminiKey,
        }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.message || tAI('saveError'))
      }
      return res.json()
    },
    onSuccess: () => {
      toast.success(tAI('saveSuccess'))
      setOpenaiKey('')
      setAnthropicKey('')
      setGeminiKey('')
      queryClient.invalidateQueries({ queryKey: ['ai-config'] })
      queryClient.invalidateQueries({ queryKey: ['ai-models'] })
    },
    onError: (error: any) => {
      toast.error(error.message)
    }
  })

  const { data: apiKeys, isLoading: isLoadingKeys } = useQuery<ApiKey[]>({
    queryKey: ['api-keys'],
    queryFn: async () => {
      const res = await fetch('/api/keys')
      if (!res.ok) throw new Error(tKeys('loadError'))
      return res.json()
    }
  })

  const createMutation = useMutation({
    mutationFn: async (name: string) => {
      const res = await fetch('/api/keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name })
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.message || tKeys('createError'))
      }
      return res.json()
    },
    onSuccess: (data: NewApiKey) => {
      setGeneratedKey(data)
      setIsCreateDialogOpen(false)
      setIsTokenDialogOpen(true)
      setNewKeyName('')
      queryClient.invalidateQueries({ queryKey: ['api-keys'] })
    },
    onError: (error: any) => {
      toast.error(error.message)
    }
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/keys/${id}`, {
        method: 'DELETE'
      })
      if (!res.ok) throw new Error(tKeys('revokeError'))
    },
    onSuccess: () => {
      toast.success(tKeys('revokeSuccess'))
      queryClient.invalidateQueries({ queryKey: ['api-keys'] })
    },
    onError: (error: any) => {
      toast.error(error.message)
    }
  })

  const regenerateMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/keys/${id}/regenerate`, {
        method: 'POST'
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.message || tKeys('regenerateError'))
      }
      return res.json()
    },
    onSuccess: (data: NewApiKey) => {
      setGeneratedKey(data)
      setIsCopied(false)
      setIsTokenDialogOpen(true)
      setRegeneratingKeyId(null)
      toast.success(tKeys('regenerateSuccess'))
      queryClient.invalidateQueries({ queryKey: ['api-keys'] })
    },
    onError: (error: any) => {
      setRegeneratingKeyId(null)
      toast.error(error.message || tKeys('regenerateError'))
    }
  })

  const handleExport = async () => {
    setIsExporting(true)
    try {
      const res = await fetch('/api/export')
      if (!res.ok) throw new Error(tData('exportError'))

      const blob = await res.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      const date = new Date().toISOString().split('T')[0]
      a.download = `sqlvault-export-${date}.json`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)

      toast.success(tData('exportSuccess'))
    } catch (error) {
      toast.error(tData('exportError'))
      console.error(error)
    } finally {
      setIsExporting(false)
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setImportError(null)
    setImportPayload(null)

    const file = e.target.files?.[0]
    if (!file) return

    if (file.type !== 'application/json' && !file.name.endsWith('.json')) {
      setImportError(tData('importMustBeJson'))
      return
    }

    const reader = new FileReader()
    reader.onload = (event) => {
      try {
        const content = event.target?.result as string
        const parsed = JSON.parse(content)

        if (parsed.version !== 1) {
          setImportError(tData('importUnsupportedFormat'))
          return
        }

        if (!Array.isArray(parsed.queries) || !Array.isArray(parsed.tags)) {
          setImportError(tData('importMalformedPayload'))
          return
        }

        setImportPayload({ queries: parsed.queries, tags: parsed.tags })
      } catch (err) {
        setImportError(tData('importInvalidJson'))
      }
    }
    reader.readAsText(file)
  }

  const handleImport = async () => {
    if (!importPayload) return

    setIsImporting(true)
    try {
      const res = await fetch('/api/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ version: 1, ...importPayload })
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || tData('importError'))
      }

      toast.success(tData('importSuccess', { imported: data.imported, skipped: data.skipped }))
      setImportPayload(null)
      if (fileInputRef.current) fileInputRef.current.value = ''

      await initialize()

    } catch (error: any) {
      toast.error(error.message || tData('importError'))
    } finally {
      setIsImporting(false)
    }
  }

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setIsCopied(true)
      toast.success(tKeys('copySuccess'))
      setTimeout(() => setIsCopied(false), 2000)
    } catch (err) {
      toast.error(tKeys('copyError'))
    }
  }

  return (
    <>
      <AppHeader title={tSettings('title')} showSearch={false} />
      <main className="flex-1 overflow-auto p-6">
        <div className="mx-auto max-w-4xl space-y-8 pb-12">

          <div className="space-y-1">
            <h2 className="text-2xl font-bold tracking-tight">{tKeys('sectionTitle')}</h2>
            <p className="text-muted-foreground">
              {tKeys('sectionDescription')}
            </p>
          </div>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
              <div className="space-y-1">
                <CardTitle className="text-lg font-semibold">{tKeys('cardTitle')}</CardTitle>
                <CardDescription>
                  {tKeys('cardDescription')}
                </CardDescription>
              </div>
              <Button onClick={() => setIsCreateDialogOpen(true)} className="gap-2">
                <Plus className="h-4 w-4" />
                {tKeys('newKey')}
              </Button>
            </CardHeader>
            <CardContent>
              {isLoadingKeys ? (
                <div className="py-8 text-center text-muted-foreground">{tKeys('loading')}</div>
              ) : apiKeys && apiKeys.length > 0 ? (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{tKeys('name')}</TableHead>
                        <TableHead>{tKeys('createdAt')}</TableHead>
                        <TableHead>{tKeys('regeneratedAt')}</TableHead>
                        <TableHead>{tKeys('lastUsed')}</TableHead>
                        <TableHead className="w-35"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {apiKeys.map((key) => (
                        <TableRow key={key.id}>
                          <TableCell className="font-medium">{key.name}</TableCell>
                          <TableCell className="text-muted-foreground">
                            {format(new Date(key.createdAt), 'dd MMM yyyy', { locale })}
                          </TableCell>
                          <TableCell className="text-muted-foreground italic">
                            {key.regeneratedAt
                              ? format(new Date(key.regeneratedAt), 'dd/MM/yy HH:mm', { locale })
                              : tKeys('neverUsed')}
                          </TableCell>
                          <TableCell className="text-muted-foreground italic">
                            {key.lastUsedAt
                              ? format(new Date(key.lastUsedAt), 'dd/MM/yy HH:mm', { locale })
                              : tKeys('neverUsed')}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button variant="ghost" size="icon" className="h-8 w-8">
                                    <RefreshCcw className="h-4 w-4" />
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>{tKeys('regenerateTitle')}</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      {tKeys('regenerateDescription')}
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>{tCommon('cancel')}</AlertDialogCancel>
                                    <AlertDialogAction
                                      onClick={() => {
                                        setRegeneratingKeyId(key.id)
                                        regenerateMutation.mutate(key.id)
                                      }}
                                    >
                                      {regeneratingKeyId === key.id ? tKeys('regenerating') : tKeys('regenerate')}
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>

                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10">
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>{tKeys('revokeTitle')}</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      {tKeys('revokeDescription')}
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>{tCommon('cancel')}</AlertDialogCancel>
                                    <AlertDialogAction
                                      onClick={() => deleteMutation.mutate(key.id)}
                                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                    >
                                      {tKeys('revoke')}
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <div className="py-12 border-2 border-dashed rounded-lg flex flex-col items-center justify-center text-muted-foreground">
                  <Key className="h-8 w-8 mb-2 opacity-20" />
                  <p>{tKeys('noKeys')}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* AI Section */}
          <div className="pt-4 space-y-1">
            <h2 className="text-2xl font-bold tracking-tight">{tAI('sectionTitle')}</h2>
            <p className="text-muted-foreground">
              {tAI('sectionDescription')}
            </p>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BrainCircuit className="h-5 w-5" />
                {tAI('cardTitle')}
              </CardTitle>
              <CardDescription>
                {tAI('cardDescription')}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {isLoadingAIConfig ? (
                <div className="flex items-center gap-2 text-muted-foreground text-sm">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {tAI('loadingConfig')}
                </div>
              ) : (
                <>
                  <div className="grid gap-6 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label>{tAI('provider')}</Label>
                      <Select value={aiProvider} onValueChange={(v) => handleProviderChange(v as AIProvider)}>
                        <SelectTrigger>
                          <SelectValue placeholder={tAI('selectProvider')} />
                        </SelectTrigger>
                        <SelectContent>
                          {aiConfig?.ollamaAvailable && (
                            <SelectItem value="ollama">{tAI('ollamaCompany')}</SelectItem>
                          )}
                          <SelectItem value="openai">OpenAI</SelectItem>
                          <SelectItem value="anthropic">Claude (Anthropic)</SelectItem>
                          <SelectItem value="gemini">Gemini (Google)</SelectItem>
                        </SelectContent>
                      </Select>
                      {aiProvider === 'ollama' && (
                        <p className="text-xs text-muted-foreground">{tAI('ollamaNote')}</p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label>{tAI('model')}</Label>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-8 px-2 text-muted-foreground"
                          onClick={handleRefreshModels}
                          disabled={!aiProvider || isLoadingModels}
                        >
                          <RefreshCcw className={`h-3.5 w-3.5 ${isLoadingModels ? 'animate-spin' : ''}`} />
                          <span className="ml-1.5">{tAI('refreshModels')}</span>
                        </Button>
                      </div>
                      <Select value={aiModel} onValueChange={setAiModel} disabled={!aiProvider || isLoadingModels}>
                        <SelectTrigger>
                          {isLoadingModels
                            ? <span className="flex items-center gap-2 text-muted-foreground"><Loader2 className="h-3 w-3 animate-spin" />{tAI('loadingModels')}</span>
                            : <SelectValue placeholder={aiProvider ? tAI('selectModel') : tAI('selectProviderFirst')} />
                          }
                        </SelectTrigger>
                        <SelectContent>
                          {(aiModels?.models ?? []).map((m) => (
                            <SelectItem key={m} value={m}>{m}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {aiProvider && aiProvider !== 'ollama' && (
                    <div className="space-y-4 rounded-lg border p-4">
                      <p className="text-sm font-medium">{tAI('apiKeySection')}</p>
                      <p className="text-xs text-muted-foreground">
                        {tAI('keysStoredLocally')}
                      </p>

                      {aiProvider === 'openai' && (
                        <div className="space-y-2">
                          <Label htmlFor="openai-key">
                            OpenAI API Key
                            {aiConfig?.hasOpenaiKey && <Badge variant="secondary" className="ml-2 text-xs">{tAI('keyConfigured')}</Badge>}
                          </Label>
                          <div className="relative">
                            <Input
                              id="openai-key"
                              type={showOpenaiKey ? 'text' : 'password'}
                              placeholder={aiConfig?.hasOpenaiKey ? '••••••••••••••••' : 'sk-...'}
                              value={openaiKey}
                              onChange={(e) => setOpenaiKey(e.target.value)}
                              className="pr-10"
                            />
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="absolute right-1 top-1 h-8 w-8"
                              onClick={() => setShowOpenaiKey(!showOpenaiKey)}
                            >
                              {showOpenaiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            </Button>
                          </div>
                          <p className="text-xs text-muted-foreground">{tAI('leaveBlankToKeep')}</p>
                        </div>
                      )}

                      {aiProvider === 'anthropic' && (
                        <div className="space-y-2">
                          <Label htmlFor="anthropic-key">
                            Anthropic API Key
                            {aiConfig?.hasAnthropicKey && <Badge variant="secondary" className="ml-2 text-xs">{tAI('keyConfigured')}</Badge>}
                          </Label>
                          <div className="relative">
                            <Input
                              id="anthropic-key"
                              type={showAnthropicKey ? 'text' : 'password'}
                              placeholder={aiConfig?.hasAnthropicKey ? '••••••••••••••••' : 'sk-ant-...'}
                              value={anthropicKey}
                              onChange={(e) => setAnthropicKey(e.target.value)}
                              className="pr-10"
                            />
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="absolute right-1 top-1 h-8 w-8"
                              onClick={() => setShowAnthropicKey(!showAnthropicKey)}
                            >
                              {showAnthropicKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            </Button>
                          </div>
                          <p className="text-xs text-muted-foreground">{tAI('leaveBlankToKeep')}</p>
                        </div>
                      )}

                      {aiProvider === 'gemini' && (
                        <div className="space-y-2">
                          <Label htmlFor="gemini-key">
                            Gemini API Key
                            {aiConfig?.hasGeminiKey && <Badge variant="secondary" className="ml-2 text-xs">{tAI('keyConfigured')}</Badge>}
                          </Label>
                          <div className="relative">
                            <Input
                              id="gemini-key"
                              type={showGeminiKey ? 'text' : 'password'}
                              placeholder={aiConfig?.hasGeminiKey ? '••••••••••••••••' : 'AIza...'}
                              value={geminiKey}
                              onChange={(e) => setGeminiKey(e.target.value)}
                              className="pr-10"
                            />
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="absolute right-1 top-1 h-8 w-8"
                              onClick={() => setShowGeminiKey(!showGeminiKey)}
                            >
                              {showGeminiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            </Button>
                          </div>
                          <p className="text-xs text-muted-foreground">{tAI('leaveBlankToKeep')}</p>
                        </div>
                      )}
                    </div>
                  )}

                  {aiProvider === 'ollama' && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground rounded-lg border p-4 bg-muted/30">
                      <Info className="h-4 w-4 shrink-0" />
                      <span>{tAI('ollamaNoAuth')}</span>
                    </div>
                  )}

                  <Button
                    onClick={() => saveAIConfigMutation.mutate()}
                    disabled={!aiProvider || !aiModel || saveAIConfigMutation.isPending}
                    className="gap-2"
                  >
                    {saveAIConfigMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                    {saveAIConfigMutation.isPending ? tAI('saving') : tAI('saveConfig')}
                  </Button>
                </>
              )}
            </CardContent>
          </Card>

          <div className="pt-4">
            <h2 className="text-2xl font-bold tracking-tight">{tData('sectionTitle')}</h2>
            <p className="text-muted-foreground">
              {tData('sectionDescription')}
            </p>
          </div>

          <div className="grid gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Download className="h-5 w-5" />
                  {tData('exportTitle')}
                </CardTitle>
                <CardDescription>
                  {tData('exportDescription')}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button onClick={handleExport} disabled={isExporting} className="gap-2">
                  <Download className="h-4 w-4" />
                  {isExporting ? tData('exporting') : tData('exportButton')}
                </Button>
                <p className="text-sm text-muted-foreground mt-3">
                  {tData('exportNote')}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Upload className="h-5 w-5" />
                  {tData('importTitle')}
                </CardTitle>
                <CardDescription>
                  {tData('importDescription')}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div
                  className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-6 transition-colors hover:bg-muted/50 cursor-pointer"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <input
                    type="file"
                    accept=".json"
                    className="hidden"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                  />
                  <FileJson className="h-8 w-8 text-muted-foreground mb-4" />
                  <p className="font-medium text-sm">{tData('importClickToSelect')}</p>
                  <p className="text-xs text-muted-foreground mt-1">{tData('importOnlyExported')}</p>
                </div>

                {importError && (
                  <div className="flex items-center gap-2 text-sm text-destructive bg-destructive/10 p-3 rounded-md">
                    <AlertCircle className="h-4 w-4" />
                    <p>{importError}</p>
                  </div>
                )}

                {importPayload && !importError && (
                  <div className="flex items-center justify-between bg-muted/50 p-3 rounded-md border">
                    <div className="flex items-center gap-2 text-sm text-foreground">
                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                      <p>{tData('importReady', { queries: importPayload.queries.length, tags: importPayload.tags.length })}</p>
                    </div>
                    <Button onClick={handleImport} disabled={isImporting} size="sm">
                      {isImporting ? tData('importing') : tData('importConfirm')}
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

        </div>

        {/* Create API Key Dialog */}
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{tKeys('createTitle')}</DialogTitle>
              <DialogDescription>
                {tKeys('createDescription')}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="key-name">{tKeys('keyName')}</Label>
                <Input
                  id="key-name"
                  placeholder={tKeys('keyNamePlaceholder')}
                  value={newKeyName}
                  onChange={(e) => setNewKeyName(e.target.value)}
                  maxLength={50}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && newKeyName.trim()) {
                      createMutation.mutate(newKeyName)
                    }
                  }}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                {tCommon('cancel')}
              </Button>
              <Button
                onClick={() => createMutation.mutate(newKeyName)}
                disabled={!newKeyName.trim() || createMutation.isPending}
              >
                {createMutation.isPending ? tKeys('creating') : tKeys('create')}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Token Display Dialog */}
        <Dialog open={isTokenDialogOpen} onOpenChange={(open) => {
          if (!open) { }
        }}>
          <DialogContent className="sm:max-w-md [&>button]:hidden" onPointerDownOutside={(e) => e.preventDefault()} onEscapeKeyDown={(e) => e.preventDefault()}>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-green-600 dark:text-green-400">
                <CheckCircle2 className="h-5 w-5" />
                {tKeys('tokenTitle')}
              </DialogTitle>
              <DialogDescription className="text-foreground">
                {tKeys('tokenDescription')}
              </DialogDescription>
            </DialogHeader>

            <div className="rounded-md bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 p-3 flex gap-3 text-amber-800 dark:text-amber-400 text-sm">
              <Info className="h-5 w-5 shrink-0" />
              <p>{tKeys('tokenWarning')}</p>
            </div>

            <div className="space-y-3 py-4">
              <div className="relative">
                <Input
                  readOnly
                  value={generatedKey?.token || ''}
                  className="pr-24 font-mono text-xs h-10 bg-muted"
                />
                <Button
                  size="sm"
                  className="absolute right-1 top-1 h-8"
                  onClick={() => copyToClipboard(generatedKey?.token || '')}
                >
                  {isCopied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  <span className="ml-2">{isCopied ? tKeys('copied') : tKeys('copy')}</span>
                </Button>
              </div>
            </div>

            <DialogFooter>
              <Button variant="secondary" className="w-full" onClick={() => setIsTokenDialogOpen(false)}>
                {tKeys('understood')}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </main>
    </>
  )
}
