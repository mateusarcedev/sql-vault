import { useState } from 'react'
import { toast } from 'sonner'
import { AIAnalysisResult } from '@/types/ai'
import { aiAnalysisResultSchema } from '@/lib/ai/schema'

function normalizeAIResult(data: any): AIAnalysisResult {
  const parsed = aiAnalysisResultSchema.safeParse(data)

  if (!parsed.success) {
    throw new Error('Resposta da IA em formato inválido')
  }

  return parsed.data
}

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
      const payload = await res.json()
      setResult(normalizeAIResult(payload))
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
