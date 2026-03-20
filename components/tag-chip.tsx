import { X } from 'lucide-react'
import { cn } from '@/lib/utils'

interface TagChipProps {
  name: string
  color: string
  className?: string
  onRemove?: () => void
  onClick?: () => void
}

export function TagChip({
  name,
  color,
  className,
  onRemove,
  onClick,
}: TagChipProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors',
        onClick && 'cursor-pointer hover:opacity-80',
        className
      )}
      style={{
        backgroundColor: `${color}20`,
        color: color,
      }}
      onClick={onClick}
    >
      <span
        className="h-1.5 w-1.5 rounded-full"
        style={{ backgroundColor: color }}
      />
      {name}
      {onRemove && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            onRemove()
          }}
          className="ml-0.5 rounded-full p-0.5 hover:bg-black/10"
        >
          <X className="h-3 w-3" />
        </button>
      )}
    </span>
  )
}
