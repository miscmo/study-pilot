// 学习计划
export interface StudyPlan {
  id: string
  topic: string
  description: string
  dailyStudyMinutes: number
  totalDays: number
  startDate: string
  outline: StudyOutlineItem[]
  createdAt: string
  status: 'active' | 'completed' | 'paused'
}

// 大纲项目
export interface StudyOutlineItem {
  id: string
  day: number
  title: string
  description: string
  objectives: string[]
  estimatedMinutes: number
}

// 每日任务
export interface DailyTask {
  id: string
  planId: string
  day: number
  date: string
  title: string
  tasks: TaskItem[]
  status: 'pending' | 'in_progress' | 'submitted' | 'reviewed'
  submission?: TaskSubmission
  review?: TaskReview
  nextDayPlan?: string
}

// 具体任务项（包含该任务的资源和验收成果）
export interface TaskItem {
  id: string
  order: number  // 任务顺序，用于逻辑递进
  title: string
  description: string
  difficulty: 'basic' | 'intermediate' | 'advanced'  // 难度级别
  completed: boolean
  estimatedMinutes: number
  resources: Resource[]  // 该任务的参考资料
  deliverable: Deliverable  // 该任务的验收成果
  note?: TaskNote  // 学习笔记
}

// 任务笔记
export interface TaskNote {
  content: string  // Markdown 内容
  createdAt: string
  updatedAt: string
}

// 参考资料
export interface Resource {
  id: string
  title: string
  type: 'article' | 'video' | 'book' | 'documentation' | 'practice'
  url?: string
  description: string
  author?: string
}

// 验收成果
export interface Deliverable {
  id: string
  title: string
  description: string
  type: 'note' | 'code' | 'project' | 'quiz' | 'summary'
  completed: boolean
}

// 任务提交
export interface TaskSubmission {
  content: string
  submittedAt: string
  attachments?: string[]
}

// AI评审
export interface TaskReview {
  score: number
  feedback: string
  strengths: string[]
  improvements: string[]
  reviewedAt: string
}

// API 密钥配置
export interface ApiKeyConfig {
  id: string
  name: string
  apiKey: string
  apiEndpoint: string
  model: string
  isActive: boolean
  createdAt: string
  lastUsedAt?: string
}

// 应用设置
export interface AppSettings {
  apiKey: string
  apiEndpoint: string
  model: string
  language: 'zh' | 'en'
  apiKeys: ApiKeyConfig[]
  activeKeyId: string | null
  editorPreviewMode: 'edit' | 'live' | 'preview'  // 编辑器预览模式
}
