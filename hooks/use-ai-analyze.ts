import { useState } from 'react'
import { toast } from 'sonner'
import { AIAnalysisResult } from '@/types/ai'

export function useAIAnalyze() {
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [result, setResult] = useState<AIAnalysisResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  const analyze = async (sql: string, dialect: string) => {
    if (!sql.trim()) {
      toast.error('Escreva o SQL antes de analisar')
      return
    }
    setIsAnalyzing(true)
    setResult(null)
    setError(null)
    try {
      const res = await fetch('/api/ai/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sql, dialect }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.message || 'Falha na análise')
      }
      setResult(await res.json())
    } catch (e: any) {
      setError(e.message)
      toast.error(e.message)
    } finally {
      setIsAnalyzing(false)
    }
  }

  const reset = () => {
    setResult(null)
    setError(null)
  }

  return { analyze, isAnalyzing, result, error, reset }
}
