export type AIProvider = 'ollama' | 'openai' | 'anthropic' | 'gemini'

export type PerformanceSeverity = 'info' | 'warning' | 'error'

export type PerformanceIssue = {
  severity: PerformanceSeverity
  title: string
  description: string
  suggestion: string
}

export type AIAnalysisResult = {
  explanation: string
  suggestedName: string
  suggestedDescription: string
  suggestedTags: string[]
  performanceReview: PerformanceIssue[]
}

export type AIConfigResponse = {
  provider: AIProvider | null
  model: string | null
  hasOpenaiKey: boolean
  hasAnthropicKey: boolean
  hasGeminiKey: boolean
  ollamaAvailable: boolean
}
