'use client'

import { useState } from 'react'
import Link from 'next/link'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { toast } from 'sonner'
import {
  Star,
  Copy,
  Edit,
  Trash2,
  MoreHorizontal,
  Clock,
  Eye,
  FunctionSquare,
  GitBranch,
  Zap
} from 'lucide-react'

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { DatabaseBadge } from '@/components/database-badge'
import { TagChip } from '@/components/tag-chip'
import { useRoutineStore } from '@/store/routine-store'
import type { Routine, RoutineType } from '@/types/routine'
import { cn } from '@/lib/utils'

interface RoutineCardProps {
  routine: Routine
  onEdit?: () => void
  onDelete?: () => void
}

const TYPE_CONFIG: Record<RoutineType, { icon: any; color: string; label: string }> = {
  function: { icon: FunctionSquare, color: '#8B5CF6', label: 'Function' },
  procedure: { icon: GitBranch, color: '#3B82F6', label: 'Procedure' },
  trigger: { icon: Zap, color: '#F59E0B', label: 'Trigger' },
  view: { icon: Eye, color: '#10B981', label: 'View' },
}

export function RoutineCard({ routine, onEdit, onDelete }: RoutineCardProps) {
  const { toggleFavorite, incrementCopyCount } = useRoutineStore()
  const [isCopying, setIsCopying] = useState(false)

  const handleCopy = async () => {
    setIsCopying(true)
    try {
      await navigator.clipboard.writeText(routine.sql)
      await incrementCopyCount(routine.id)
      toast.success('SQL copiado para a área de transferência!')
    } catch {
      toast.error('Erro ao copiar SQL')
    } finally {
      setIsCopying(false)
    }
  }

  const handleToggleFavorite = async () => {
    await toggleFavorite(routine.id)
    toast.success(
      routine.isFavorite
        ? 'Removido dos favoritos'
        : 'Adicionado aos favoritos'
    )
  }

  const routineTags = routine.tags
  const config = TYPE_CONFIG[routine.type]
  const TypeIcon = config.icon

  return (
    <Card className="group relative transition-shadow hover:shadow-md">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 mb-1">
              <span
                className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium"
                style={{ backgroundColor: `${config.color}20`, color: config.color }}
              >
                <TypeIcon className="h-3 w-3" />
                {config.label}
              </span>
            </div>
            <CardTitle className="truncate text-base">
              <Link
                href={`/routines/${routine.id}`}
                className="hover:text-primary"
              >
                {routine.name}
              </Link>
            </CardTitle>
            {routine.parameters && routine.parameters.length > 0 && (
              <p className="mt-1 text-xs font-semibold text-muted-foreground">
                {routine.parameters.length} parâmetro{routine.parameters.length > 1 && 's'}
              </p>
            )}
            {routine.description && (
              <CardDescription className="mt-1 line-clamp-1">
                {routine.description}
              </CardDescription>
            )}
          </div>
          <DatabaseBadge database={routine.database} />
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        <div className="overflow-hidden rounded-md bg-muted/50 p-3">
          <pre className="overflow-hidden text-ellipsis whitespace-pre-wrap font-mono text-xs text-muted-foreground line-clamp-3">
            {routine.sql}
          </pre>
        </div>

        {routineTags.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {routineTags.map((tag) => (
              <TagChip key={tag!.id} name={tag!.name} color={tag!.color} />
            ))}
          </div>
        )}

        <div className="flex items-center justify-between pt-1">
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {format(new Date(routine.updatedAt), "d 'de' MMM", { locale: ptBR })}
            </span>
            <span className="flex items-center gap-1">
              <Copy className="h-3 w-3" />
              {routine.copyCount}
            </span>
          </div>

          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={handleToggleFavorite}
              className={cn(
                'text-muted-foreground hover:text-yellow-500',
                routine.isFavorite && 'text-yellow-500'
              )}
            >
              <Star
                className={cn('h-4 w-4', routine.isFavorite && 'fill-current')}
              />
            </Button>

            <Button
              variant="ghost"
              size="icon-sm"
              onClick={handleCopy}
              disabled={isCopying}
              className="text-muted-foreground hover:text-primary"
            >
              <Copy className="h-4 w-4" />
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  className="text-muted-foreground"
                >
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem asChild>
                  <Link href={`/routines/${routine.id}`}>
                    <Eye className="mr-2 h-4 w-4" />
                    Ver Detalhes
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={onEdit}>
                  <Edit className="mr-2 h-4 w-4" />
                  Editar
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={onDelete}
                  className="text-destructive focus:text-destructive"
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Excluir
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
