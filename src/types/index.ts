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
  lastUpdated?: string
  status: 'active' | 'completed' | 'paused'
  // GitHub 集成
  storageType: 'local' | 'github'
  github?: {
    owner: string
    repo: string
    repoUrl: string
  }
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
  lastUpdated?: string
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

// GitHub 配置
export interface GitHubSettings {
  accessToken: string | null
  clientId: string
  user: {
    login: string
    name: string | null
    avatar_url: string
  } | null
  // 同步配置
  sync: {
    enabled: boolean
    repo: string // 同步专用仓库名称
    autoSync: boolean // 是否自动同步
    lastSync: string | null // 上次同步时间
    syncDirection: 'push' | 'pull' | 'both' // 同步方向
  }
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
  aiMode: 'api' | 'manual'  // AI模式：API自动模式 / 手动复制粘贴模式
  // GitHub 集成
  github: GitHubSettings
}

// 同步数据结构
export interface SyncData {
  version: string
  lastUpdated: string
  settings: AppSettings
  plans: StudyPlan[]
  dailyTasks: DailyTask[]
  syncInfo: {
    deviceName: string
    userId: string
    syncTimestamp: string
  }
}
