'use client'

import { useState } from 'react'
import { AlertTriangle, Loader2 } from 'lucide-react'

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

interface DeleteConfirmModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description: string
  confirmText?: string
  requireConfirmation?: boolean
  isLoading?: boolean
  onConfirm: () => void | Promise<void>
}

export function DeleteConfirmModal({
  open,
  onOpenChange,
  title,
  description,
  confirmText = 'DELETAR',
  requireConfirmation = true,
  isLoading = false,
  onConfirm,
}: DeleteConfirmModalProps) {
  const [inputValue, setInputValue] = useState('')

  const canConfirm = requireConfirmation
    ? inputValue === confirmText
    : true

  const handleConfirm = async () => {
    if (!canConfirm) return
    await onConfirm()
    setInputValue('')
  }

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      setInputValue('')
    }
    onOpenChange(newOpen)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-destructive/10">
              <AlertTriangle className="h-5 w-5 text-destructive" />
            </div>
            <DialogTitle>{title}</DialogTitle>
          </div>
          <DialogDescription className="pt-2">
            {description}
          </DialogDescription>
        </DialogHeader>

        {requireConfirmation && (
          <div className="space-y-2">
            <Label htmlFor="confirm-delete">
              Digite <strong>{confirmText}</strong> para confirmar
            </Label>
            <Input
              id="confirm-delete"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder={confirmText}
              autoComplete="off"
            />
          </div>
        )}

        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={() => handleOpenChange(false)}
            disabled={isLoading}
          >
            Cancelar
          </Button>
          <Button
            variant="destructive"
            onClick={handleConfirm}
            disabled={!canConfirm || isLoading}
          >
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Deletar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
