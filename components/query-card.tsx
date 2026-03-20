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
import { useQueryStore } from '@/store/query-store'
import type { Query } from '@/types/query'
import { cn } from '@/lib/utils'

interface QueryCardProps {
  query: Query
  onEdit?: () => void
  onDelete?: () => void
}

export function QueryCard({ query, onEdit, onDelete }: QueryCardProps) {
  const { toggleFavorite, incrementCopyCount, getTag } = useQueryStore()
  const [isCopying, setIsCopying] = useState(false)

  const handleCopy = async () => {
    setIsCopying(true)
    try {
      await navigator.clipboard.writeText(query.sql)
      await incrementCopyCount(query.id)
      toast.success('SQL copiado para a área de transferência!')
    } catch {
      toast.error('Erro ao copiar SQL')
    } finally {
      setIsCopying(false)
    }
  }

  const handleToggleFavorite = async () => {
    await toggleFavorite(query.id)
    toast.success(
      query.isFavorite
        ? 'Removido dos favoritos'
        : 'Adicionado aos favoritos'
    )
  }

  const queryTags = query.tags

  return (
    <Card className="group relative transition-shadow hover:shadow-md">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <CardTitle className="truncate text-base">
              <Link
                href={`/consultas/${query.id}`}
                className="hover:text-primary"
              >
                {query.title}
              </Link>
            </CardTitle>
            {query.description && (
              <CardDescription className="mt-1 line-clamp-1">
                {query.description}
              </CardDescription>
            )}
          </div>
          <DatabaseBadge database={query.database} />
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        <div className="overflow-hidden rounded-md bg-muted/50 p-3">
          <pre className="overflow-hidden text-ellipsis whitespace-pre-wrap font-mono text-xs text-muted-foreground line-clamp-3">
            {query.sql}
          </pre>
        </div>

        {queryTags.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {queryTags.map((tag) => (
              <TagChip key={tag!.id} name={tag!.name} color={tag!.color} />
            ))}
          </div>
        )}

        <div className="flex items-center justify-between pt-1">
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {format(new Date(query.updatedAt), "d 'de' MMM", { locale: ptBR })}
            </span>
            <span className="flex items-center gap-1">
              <Copy className="h-3 w-3" />
              {query.copyCount}
            </span>
          </div>

          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={handleToggleFavorite}
              className={cn(
                'text-muted-foreground hover:text-yellow-500',
                query.isFavorite && 'text-yellow-500'
              )}
            >
              <Star
                className={cn('h-4 w-4', query.isFavorite && 'fill-current')}
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
                  <Link href={`/consultas/${query.id}`}>
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
