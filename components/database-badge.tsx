import { Database } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { DATABASE_COLORS, DATABASE_LABELS, type DatabaseType } from '@/types/query'

interface DatabaseBadgeProps {
  database: DatabaseType
  className?: string
  showLabel?: boolean
}

export function DatabaseBadge({
  database,
  className,
  showLabel = true,
}: DatabaseBadgeProps) {
  const color = DATABASE_COLORS[database]
  const label = DATABASE_LABELS[database]

  return (
    <Badge
      variant="outline"
      className={cn('gap-1.5 font-medium', className)}
      style={{
        borderColor: color,
        color: color,
        backgroundColor: `${color}10`,
      }}
    >
      <Database className="h-3 w-3" />
      {showLabel && <span>{label}</span>}
    </Badge>
  )
}
