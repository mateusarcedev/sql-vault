'use client'

import { useState, useRef } from 'react'
import { Download, Upload, FileJson, AlertCircle, CheckCircle2 } from 'lucide-react'
import { toast } from 'sonner'
import { AppHeader } from '@/components/app-header'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useQueryStore } from '@/store/query-store'

export default function SettingsPage() {
  const [isExporting, setIsExporting] = useState(false)
  const [isImporting, setIsImporting] = useState(false)
  const [importPayload, setImportPayload] = useState<{ queries: any[]; tags: any[] } | null>(null)
  const [importError, setImportError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  
  const { initialize } = useQueryStore() // Refresh store after import

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

  return (
    <>
      <AppHeader title="Configurações" showSearch={false} />
      <main className="flex-1 overflow-auto p-6">
        <div className="mx-auto max-w-3xl space-y-8">
          
          <div>
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
      </main>
    </>
  )
}
