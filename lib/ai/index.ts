import { AIAnalysisResult, AIProvider } from '@/types/ai'
import { analyzeWithOllama } from './providers/ollama'
import { analyzeWithOpenAI } from './providers/openai'
import { analyzeWithAnthropic } from './providers/anthropic'
import { analyzeWithGemini } from './providers/gemini'
import type { DatabaseContext } from '@prisma/client'

type AnalyzeConfig = {
  provider: AIProvider
  model: string
  openaiApiKey: string | null
  anthropicApiKey: string | null
  geminiApiKey: string | null
  modelsUrl: string | null
  connectionUrl: string | null
}

export async function analyzeSQL(
  sql: string,
  dialect: string,
  config: AnalyzeConfig,
  databaseContext?: DatabaseContext | null
): Promise<AIAnalysisResult> {
  try {
    switch (config.provider) {
      case 'ollama':
        return await analyzeWithOllama(sql, dialect, config.model, databaseContext)

      case 'openai':
        if (!config.openaiApiKey) throw new Error('Chave da OpenAI não configurada')
        return await analyzeWithOpenAI(sql, dialect, config.model, config.openaiApiKey, databaseContext)

      case 'openai-compatible':
        if (!config.connectionUrl) throw new Error('URL de conexão do provedor OpenAI-compatible não configurada')
        return await analyzeWithOpenAI(
          sql,
          dialect,
          config.model,
          config.openaiApiKey,
          databaseContext,
          config.connectionUrl
        )

      case 'open-webui':
        if (!config.connectionUrl) throw new Error('URL de conexão do Open WebUI não configurada')
        return await analyzeWithOpenAI(
          sql,
          dialect,
          config.model,
          config.openaiApiKey,
          databaseContext,
          config.connectionUrl
        )

      case 'anthropic':
        if (!config.anthropicApiKey) throw new Error('Chave da Anthropic não configurada')
        return await analyzeWithAnthropic(sql, dialect, config.model, config.anthropicApiKey, databaseContext)

      case 'gemini':
        if (!config.geminiApiKey) throw new Error('Chave do Gemini não configurada')
        return await analyzeWithGemini(sql, dialect, config.model, config.geminiApiKey, databaseContext)

      case 'ollama-compatible':
        if (!config.connectionUrl) throw new Error('URL de conexão do provedor Ollama-compatible não configurada')
        return await analyzeWithOllama(sql, dialect, config.model, databaseContext, config.connectionUrl)

      default:
        throw new Error('Provedor de IA desconhecido')
    }
  } catch (error) {
    if (error instanceof Error) throw error
    throw new Error('Erro desconhecido ao chamar o provedor de IA')
  }
}
