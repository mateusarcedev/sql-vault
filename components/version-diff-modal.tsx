'use client'

import { DiffEditor } from '@monaco-editor/react'
import { X, Calendar, Clock } from 'lucide-react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import type { QueryVersion } from '@/types/query'

interface VersionDiffModalProps {
  open: boolean
  onClose: () => void
  versionA: QueryVersion | null
  versionB: QueryVersion | null
}

export function VersionDiffModal({ open, onClose, versionA, versionB }: VersionDiffModalProps) {
  if (!versionA || !versionB) return null

  const formatVersionDate = (date: string) => {
    return format(new Date(date), "dd 'de' MMMM 'de' yyyy 'às' HH:mm", { locale: ptBR })
  }

  return (
    <Dialog open={open} onOpenChange={(val) => !val && onClose()}>
      <DialogContent className="max-w-[95vw] w-full h-[95vh] flex flex-col p-0 gap-0 overflow-hidden">
        <DialogHeader className="p-4 border-b shrink-0 flex flex-row items-center justify-between space-y-0">
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Clock className="h-5 w-5 text-primary" />
            Comparação de Versões
          </DialogTitle>
          <Button variant="ghost" size="icon" onClick={onClose} className="rounded-full">
            <X className="h-4 w-4" />
          </Button>
        </DialogHeader>

        <div className="grid grid-cols-2 bg-muted/30 border-b shrink-0">
          <div className="p-3 border-r flex items-center justify-between">
            <div className="flex flex-col gap-0.5">
              <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Versão A (Original)</span>
              <span className="text-sm font-medium flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5" />
                {formatVersionDate(versionA.createdAt)}
              </span>
            </div>
          </div>
          <div className="p-4 flex items-center justify-between bg-primary/5">
          <div className="flex flex-col gap-0.5">
              <span className="text-[10px] uppercase font-bold text-primary/70 tracking-wider">Versão B (Modificada)</span>
              <span className="text-sm font-medium flex items-center gap-1.5 text-primary">
                <Calendar className="h-3.5 w-3.5" />
                {formatVersionDate(versionB.createdAt)}
              </span>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-hidden min-h-0">
          <DiffEditor
            original={versionA.sql}
            modified={versionB.sql}
            language="sql"
            theme="vs-dark"
            loading={<div className="flex h-full items-center justify-center bg-zinc-950 text-white">Carregando comparador...</div>}
            options={{
              readOnly: true,
              renderSideBySide: true,
              fontSize: 13,
              minimap: { enabled: false },
              scrollBeyondLastLine: false,
              automaticLayout: true,
            }}
            height="100%"
          />
        </div>
      </DialogContent>
    </Dialog>
  )
}
