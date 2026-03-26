import { AIAnalysisResult } from '@/types/ai'
import { buildPrompt } from '../prompt'
import type { DatabaseContext } from '@prisma/client'

export async function analyzeWithGemini(
  sql: string,
  dialect: string,
  model: string,
  apiKey: string,
  databaseContext?: DatabaseContext | null
): Promise<AIAnalysisResult> {
  const { system, user } = buildPrompt(sql, dialect, databaseContext)
  const fullPrompt = `${system}\n\n${user}`

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: fullPrompt }] }],
        generationConfig: { responseMimeType: 'application/json' },
      }),
    }
  )

  if (!response.ok) {
    const data = await response.json().catch(() => ({}))
    throw new Error(data?.error?.message || `Gemini retornou erro ${response.status}`)
  }

  const data = await response.json()
  const content = data?.candidates?.[0]?.content?.parts?.[0]?.text
  if (!content) throw new Error('Resposta inesperada do Gemini')

  try {
    return JSON.parse(content)
  } catch {
    const match = content.match(/\{[\s\S]*\}/)
    if (match) return JSON.parse(match[0])
    throw new Error('O modelo não retornou um JSON válido')
  }
}
