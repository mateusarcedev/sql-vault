'use client'

import { Sparkles, Loader2, AlertTriangle, XCircle, Info, Check } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { useAIAnalyze } from '@/hooks/use-ai-analyze'
import { Tag } from '@/types/query'
import { PerformanceSeverity } from '@/types/ai'

interface AIAnalysisPanelProps {
  sql: string
  dialect: string
  availableTags: Tag[]
  onApplySuggestions: (name: string, description: string, tagNames: string[]) => void
  hasAIConfigured: boolean
}

const severityConfig: Record<PerformanceSeverity, { icon: typeof Info; color: string }> = {
  info: { icon: Info, color: 'text-blue-500' },
  warning: { icon: AlertTriangle, color: 'text-yellow-500' },
  error: { icon: XCircle, color: 'text-red-500' },
}

export function AIAnalysisPanel({
  sql,
  dialect,
  availableTags,
  onApplySuggestions,
  hasAIConfigured,
}: AIAnalysisPanelProps) {
  const t = useTranslations('aiPanel')
  const { analyze, isAnalyzing, result } = useAIAnalyze()

  const suggestedDescriptionLabel = (() => {
    try {
      return t('suggestedDescription')
    } catch {
      return 'Descrição:'
    }
  })()

  if (!hasAIConfigured) return null

  const handleApply = () => {
    if (!result) return
    onApplySuggestions(result.suggestedName, result.suggestedDescription, result.suggestedTags)
  }

  return (
    <div className="space-y-3">
      <Separator />
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">{t('title')}</span>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="gap-2"
          disabled={isAnalyzing || !sql.trim()}
          onClick={() => analyze(sql, dialect)}
        >
          {isAnalyzing ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Sparkles className="h-4 w-4" />
          )}
          {isAnalyzing ? t('analyzing') : t('analyze')}
        </Button>
      </div>

      {result && (
        <div className="rounded-lg border bg-muted/30 p-4 space-y-4 text-sm">
          {/* Explanation */}
          <div className="space-y-1">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{t('explanation')}</p>
            <p className="text-sm leading-relaxed">{result.explanation}</p>
          </div>

          <Separator />

          {/* Suggestions */}
          <div className="space-y-2">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{t('suggestions')}</p>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs text-muted-foreground shrink-0">{t('suggestedName')}</span>
              <Badge variant="secondary" className="font-mono text-xs">{result.suggestedName}</Badge>
            </div>
            {result.suggestedDescription && (
              <div className="space-y-1">
                <span className="text-xs text-muted-foreground">{suggestedDescriptionLabel}</span>
                <p className="text-xs rounded-md border bg-background p-2">{result.suggestedDescription}</p>
              </div>
            )}
            {result.suggestedTags.length > 0 && (
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs text-muted-foreground shrink-0">{t('suggestedTags')}</span>
                {result.suggestedTags.map((tag) => (
                  <Badge key={tag} variant="outline" className="text-xs">{tag}</Badge>
                ))}
              </div>
            )}
            <Button
              type="button"
              variant="secondary"
              size="sm"
              className="gap-2 mt-1"
              onClick={handleApply}
            >
              <Check className="h-3 w-3" />
              {t('applySuggestions')}
            </Button>
          </div>

          <Separator />

          {/* Performance Review */}
          <div className="space-y-2">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{t('performanceReview')}</p>
            {result.performanceReview.length === 0 ? (
              <p className="text-xs text-muted-foreground">{t('noIssues')}</p>
            ) : (
              <div className="space-y-2">
                {result.performanceReview.map((issue, i) => {
                  const { icon: Icon, color } = severityConfig[issue.severity] ?? severityConfig.info
                  return (
                    <div key={i} className="flex gap-3 items-start rounded-md border bg-background p-3">
                      <Icon className={`h-4 w-4 mt-0.5 shrink-0 ${color}`} />
                      <div className="space-y-0.5">
                        <p className="text-xs font-medium">{issue.title}</p>
                        <p className="text-xs text-muted-foreground">{issue.description}</p>
                        <p className="text-xs text-blue-600 dark:text-blue-400">{issue.suggestion}</p>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
