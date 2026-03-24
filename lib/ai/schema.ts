import { z } from 'zod'

export const performanceIssueSchema = z.object({
  severity: z.enum(['info', 'warning', 'error']),
  title: z.string(),
  description: z.string(),
  suggestion: z.string(),
})

export const aiAnalysisResultSchema = z.object({
  explanation: z.string(),
  suggestedName: z.string(),
  suggestedDescription: z.string().optional().default(''),
  suggestedTags: z.array(z.string()).default([]),
  performanceReview: z.array(performanceIssueSchema).default([]),
})

export type AIAnalysisResultParsed = z.infer<typeof aiAnalysisResultSchema>
