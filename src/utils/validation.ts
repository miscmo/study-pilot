import { z } from 'zod'

// 学习大纲项 Schema
export const StudyOutlineItemSchema = z.object({
  day: z.number().int().positive(),
  title: z.string().min(1),
  description: z.string(),
  objectives: z.array(z.string()),
  estimatedMinutes: z.number().int().positive()
})

// 学习大纲响应 Schema
export const StudyOutlineResponseSchema = z.object({
  description: z.string().min(1),
  outline: z.array(StudyOutlineItemSchema).min(1)
})

// 资源 Schema
export const ResourceSchema = z.object({
  title: z.string().min(1),
  type: z.enum(['article', 'video', 'book', 'documentation', 'practice']),
  url: z.string().optional(),
  description: z.string(),
  author: z.string().optional()
})

// 验收成果 Schema
export const DeliverableSchema = z.object({
  title: z.string().min(1),
  description: z.string(),
  type: z.enum(['note', 'code', 'project', 'quiz', 'summary'])
})

// 任务项 Schema
export const TaskItemSchema = z.object({
  order: z.number().int().positive(),
  title: z.string().min(1),
  description: z.string(),
  difficulty: z.enum(['basic', 'intermediate', 'advanced']),
  estimatedMinutes: z.number().int().positive(),
  resources: z.array(ResourceSchema).optional().default([]),
  deliverable: DeliverableSchema
})

// 每日任务响应 Schema
export const DailyTaskResponseSchema = z.object({
  title: z.string().min(1),
  tasks: z.array(TaskItemSchema).min(1)
})

// 评审结果 Schema
export const TaskReviewSchema = z.object({
  score: z.number().int().min(0).max(100),
  feedback: z.string().min(1),
  strengths: z.array(z.string()),
  improvements: z.array(z.string())
})

// 类型导出
export type StudyOutlineItemInput = z.infer<typeof StudyOutlineItemSchema>
export type StudyOutlineResponseInput = z.infer<typeof StudyOutlineResponseSchema>
export type ResourceInput = z.infer<typeof ResourceSchema>
export type DeliverableInput = z.infer<typeof DeliverableSchema>
export type TaskItemInput = z.infer<typeof TaskItemSchema>
export type DailyTaskResponseInput = z.infer<typeof DailyTaskResponseSchema>
export type TaskReviewInput = z.infer<typeof TaskReviewSchema>

// 验证结果类型
export interface ValidationResult<T> {
  success: boolean
  data?: T
  error?: string
}

// 通用验证函数
export function validate<T>(
  schema: z.ZodSchema<T>,
  data: unknown
): ValidationResult<T> {
  try {
    const result = schema.parse(data)
    return { success: true, data: result }
  } catch (err) {
    if (err instanceof z.ZodError) {
      const messages = err.errors.map(e => `${e.path.join('.')}: ${e.message}`)
      return { success: false, error: messages.join('; ') }
    }
    return { success: false, error: '验证失败' }
  }
}

// 安全验证函数（不抛出异常）
export function safeParse<T>(
  schema: z.ZodSchema<T>,
  data: unknown
): T | null {
  const result = schema.safeParse(data)
  return result.success ? result.data : null
}

// 带默认值的验证
export function parseWithDefaults<T>(
  schema: z.ZodSchema<T>,
  data: unknown,
  defaults: Partial<T>
): T {
  try {
    return schema.parse(data)
  } catch {
    return { ...defaults, ...data } as T
  }
}
