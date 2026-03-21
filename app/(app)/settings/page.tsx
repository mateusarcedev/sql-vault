'use client'

import { useState, useRef } from 'react'
import { Download, Upload, FileJson, AlertCircle, CheckCircle2, Key, Plus, Trash2, Copy, Check, Info } from 'lucide-react'
import { toast } from 'sonner'
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
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

type ApiKey = {
  id: string
  name: string
  lastUsedAt: string | null
  createdAt: string
}

type NewApiKey = ApiKey & {
  token: string
}

export default function SettingsPage() {
  const queryClient = useQueryClient()
  const [isExporting, setIsExporting] = useState(false)
  const [isImporting, setIsImporting] = useState(false)
  const [importPayload, setImportPayload] = useState<{ queries: any[]; tags: any[] } | null>(null)
  const [importError, setImportError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  
  // API Keys state
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [isTokenDialogOpen, setIsTokenDialogOpen] = useState(false)
  const [newKeyName, setNewKeyName] = useState('')
  const [generatedKey, setGeneratedKey] = useState<NewApiKey | null>(null)
  const [isCopied, setIsCopied] = useState(false)

  const { initialize } = useQueryStore()

  // Queries & Mutations
  const { data: apiKeys, isLoading: isLoadingKeys } = useQuery<ApiKey[]>({
    queryKey: ['api-keys'],
    queryFn: async () => {
      const res = await fetch('/api/keys')
      if (!res.ok) throw new Error('Falha ao carregar API Keys')
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
        throw new Error(data.message || 'Falha ao criar API Key')
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
      if (!res.ok) throw new Error('Falha ao revogar API Key')
    },
    onSuccess: () => {
      toast.success('API Key revogada com sucesso')
      queryClient.invalidateQueries({ queryKey: ['api-keys'] })
    },
    onError: (error: any) => {
      toast.error(error.message)
    }
  })

  const handleExport = async () => {
    setIsExporting(true)
    try {
      const res = await fetch('/api/export')
      if (!res.ok) throw new Error('Falha ao exportar')

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
      
      toast.success('Exportação concluída com sucesso')
    } catch (error) {
      toast.error('Erro ao exportar dados')
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
      setImportError('O arquivo deve ser do tipo .json')
      return
    }

    const reader = new FileReader()
    reader.onload = (event) => {
      try {
        const content = event.target?.result as string
        const parsed = JSON.parse(content)

        if (parsed.version !== 1) {
          setImportError('Formato de exportação não suportado.')
          return
        }

        if (!Array.isArray(parsed.queries) || !Array.isArray(parsed.tags)) {
          setImportError('Payload malformado.')
          return
        }

        setImportPayload({ queries: parsed.queries, tags: parsed.tags })
      } catch (err) {
        setImportError('Arquivo JSON inválido')
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
        throw new Error(data.error || 'Erro na importação')
      }

      toast.success(`${data.imported} consultas importadas/atualizadas, ${data.skipped} ignoradas (já existiam ou apagadas).`)
      setImportPayload(null)
      if (fileInputRef.current) fileInputRef.current.value = ''
      
      // Refresh the store's data
      await initialize()

    } catch (error: any) {
      toast.error(error.message || 'Erro ao importar dados')
    } finally {
      setIsImporting(false)
    }
  }

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setIsCopied(true)
      toast.success('Token copiado!')
      setTimeout(() => setIsCopied(false), 2000)
    } catch (err) {
      toast.error('Erro ao copiar token')
    }
  }

  return (
    <>
      <AppHeader title="Configurações" showSearch={false} />
      <main className="flex-1 overflow-auto p-6">
        <div className="mx-auto max-w-4xl space-y-8 pb-12">
          
          <div className="space-y-1">
            <h2 className="text-2xl font-bold tracking-tight">API Keys Pessoais</h2>
            <p className="text-muted-foreground">
              Crie tokens para acessar suas consultas via VS Code, scripts ou outras ferramentas.
            </p>
          </div>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
              <div className="space-y-1">
                <CardTitle className="text-lg font-semibold">Suas Chaves</CardTitle>
                <CardDescription>
                  Chaves de acesso para integrações externas.
                </CardDescription>
              </div>
              <Button onClick={() => setIsCreateDialogOpen(true)} className="gap-2">
                <Plus className="h-4 w-4" />
                Nova API Key
              </Button>
            </CardHeader>
            <CardContent>
              {isLoadingKeys ? (
                <div className="py-8 text-center text-muted-foreground">Carregando chaves...</div>
              ) : apiKeys && apiKeys.length > 0 ? (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Nome</TableHead>
                        <TableHead>Criada em</TableHead>
                        <TableHead>Último uso</TableHead>
                        <TableHead className="w-[100px]"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {apiKeys.map((key) => (
                        <TableRow key={key.id}>
                          <TableCell className="font-medium">{key.name}</TableCell>
                          <TableCell className="text-muted-foreground">
                            {format(new Date(key.createdAt), 'dd MMM yyyy', { locale: ptBR })}
                          </TableCell>
                          <TableCell className="text-muted-foreground italic">
                            {key.lastUsedAt 
                              ? format(new Date(key.lastUsedAt), 'dd/MM/yy HH:mm', { locale: ptBR })
                              : 'Nunca used'}
                          </TableCell>
                          <TableCell>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10">
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Revogar API Key?</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Esta ação não pode ser desfeita. Qualquer integração usando esta chave perderá o acesso imediatamente.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                  <AlertDialogAction 
                                    onClick={() => deleteMutation.mutate(key.id)}
                                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                  >
                                    Revogar
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <div className="py-12 border-2 border-dashed rounded-lg flex flex-col items-center justify-center text-muted-foreground">
                  <Key className="h-8 w-8 mb-2 opacity-20" />
                  <p>Nenhuma API Key criada ainda.</p>
                </div>
              )}
            </CardContent>
          </Card>

          <div className="pt-4">
            <h2 className="text-2xl font-bold tracking-tight">Dados</h2>
            <p className="text-muted-foreground">
              Gerencie seus dados exportando um backup local ou restaurando a partir de um arquivo JSON.
            </p>
          </div>

          <div className="grid gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Download className="h-5 w-5" />
                  Exportar Dados
                </CardTitle>
                <CardDescription>
                  Baixe todas as suas consultas, tags e histórico de versões em um arquivo JSON.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button onClick={handleExport} disabled={isExporting} className="gap-2">
                  <Download className="h-4 w-4" />
                  {isExporting ? 'Exportando...' : 'Exportar tudo como JSON'}
                </Button>
                <p className="text-sm text-muted-foreground mt-3">
                  Inclui todas as consultas, tags e histórico de versões. As consultas na lixeira não são restauráveis via import, mas constam no export se necessário manualmente.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Upload className="h-5 w-5" />
                  Importar Dados
                </CardTitle>
                <CardDescription>
                  Restaure suas consultas a partir de um backup JSON.
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
                  <p className="font-medium text-sm">Clique para selecionar o arquivo JSON</p>
                  <p className="text-xs text-muted-foreground mt-1">Apenas arquivos .json exportados do SQL Vault</p>
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
                      <p>{importPayload.queries.length} consultas e {importPayload.tags.length} tags prontas para importação.</p>
                    </div>
                    <Button onClick={handleImport} disabled={isImporting} size="sm">
                      {isImporting ? 'Importando...' : 'Confirmar importação'}
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
              <DialogTitle>Nova API Key</DialogTitle>
              <DialogDescription>
                Dê um nome amigável para identificar onde esta chave será usada.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="key-name">Nome da Chave</Label>
                <Input 
                  id="key-name" 
                  placeholder="ex: VS Code Extension" 
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
                Cancelar
              </Button>
              <Button 
                onClick={() => createMutation.mutate(newKeyName)} 
                disabled={!newKeyName.trim() || createMutation.isPending}
              >
                {createMutation.isPending ? 'Criando...' : 'Criar Chave'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Token Display Dialog - NO CLOSE BUTTON */}
        <Dialog open={isTokenDialogOpen} onOpenChange={(open) => {
          if (!open) {
             // Block closing via ESC or clicking outside if necessary, 
             // although we want the user to click the button.
          }
        }}>
          <DialogContent className="sm:max-w-md [&>button]:hidden" onPointerDownOutside={(e) => e.preventDefault()} onEscapeKeyDown={(e) => e.preventDefault()}>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-green-600 dark:text-green-400">
                <CheckCircle2 className="h-5 w-5" />
                API Key Criada!
              </DialogTitle>
              <DialogDescription className="text-foreground">
                Copie agora. Este token **não será exibido novamente** por motivos de segurança.
              </DialogDescription>
            </DialogHeader>
            
            <div className="rounded-md bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 p-3 flex gap-3 text-amber-800 dark:text-amber-400 text-sm">
              <Info className="h-5 w-5 shrink-0" />
              <p>Trate esta chave como uma senha. Não a compartilhe nem publique em repositórios públicos.</p>
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
                  <span className="ml-2">{isCopied ? 'Copiado' : 'Copiar'}</span>
                </Button>
              </div>
            </div>
            
            <DialogFooter>
              <Button variant="secondary" className="w-full" onClick={() => setIsTokenDialogOpen(false)}>
                Entendi, já copiei a chave
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </main>
    </>
  )
}
