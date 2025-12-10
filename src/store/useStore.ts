import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import type { StudyPlan, DailyTask, AppSettings, ApiKeyConfig, StudyOutlineItem } from '../types'
import { electronStorage } from './electronStorage'

const STORAGE_KEY = 'studypilot-storage'

// 页面草稿状态类型
interface PlanCreatorDraft {
  topic: string
  learningGoals: string
  dailyMinutes: number
  totalDays: number
  step: 'input' | 'generating' | 'preview' | 'saved'
  generatedOutline: {
    description: string
    outline: StudyOutlineItem[]
  } | null
  expandedDays: number[]
  autoCalculateDays: boolean
  customDailyMinutes: string
}

interface ReviewPageDraft {
  submissionContent: string
}

interface PageDrafts {
  planCreator: PlanCreatorDraft
  reviewPage: ReviewPageDraft
}

interface AppState {
  // 学习计划
  plans: StudyPlan[]
  currentPlanId: string | null
  addPlan: (plan: StudyPlan) => void
  updatePlan: (id: string, plan: Partial<StudyPlan>) => void
  deletePlan: (id: string) => void
  setCurrentPlan: (id: string | null) => void
  
  // 每日任务
  dailyTasks: DailyTask[]
  addDailyTask: (task: DailyTask) => void
  updateDailyTask: (id: string, task: Partial<DailyTask>) => void
  getDailyTaskByPlanAndDay: (planId: string, day: number) => DailyTask | undefined
  
  // 设置
  settings: AppSettings
  updateSettings: (settings: Partial<AppSettings>) => void
  
  // API 密钥管理
  addApiKey: (config: ApiKeyConfig) => void
  updateApiKey: (id: string, config: Partial<ApiKeyConfig>) => void
  deleteApiKey: (id: string) => void
  setActiveApiKey: (id: string | null) => void
  getActiveApiKey: () => ApiKeyConfig | null
  
  // 当前视图
  currentView: 'home' | 'plan' | 'daily' | 'review' | 'settings'
  setCurrentView: (view: AppState['currentView']) => void
  
  // 选中的日期
  selectedDay: number
  setSelectedDay: (day: number) => void
  
  // 页面草稿状态
  pageDrafts: PageDrafts
  updatePlanCreatorDraft: (draft: Partial<PlanCreatorDraft>) => void
  resetPlanCreatorDraft: () => void
  updateReviewPageDraft: (draft: Partial<ReviewPageDraft>) => void
  resetReviewPageDraft: () => void
}

const defaultPlanCreatorDraft: PlanCreatorDraft = {
  topic: '',
  learningGoals: '',
  dailyMinutes: 60,
  totalDays: 7,
  step: 'input',
  generatedOutline: null,
  expandedDays: [1],
  autoCalculateDays: true,
  customDailyMinutes: ''
}

const defaultReviewPageDraft: ReviewPageDraft = {
  submissionContent: ''
}

export const useStore = create<AppState>()(
  persist(
    (set, get) => ({
      // 学习计划
      plans: [],
      currentPlanId: null,
      addPlan: (plan) => set((state) => ({ plans: [...state.plans, plan] })),
      updatePlan: (id, planUpdate) => set((state) => ({
        plans: state.plans.map((p) => p.id === id ? { ...p, ...planUpdate } : p)
      })),
      deletePlan: (id) => set((state) => ({
        plans: state.plans.filter((p) => p.id !== id),
        currentPlanId: state.currentPlanId === id ? null : state.currentPlanId
      })),
      setCurrentPlan: (id) => set({ currentPlanId: id }),
      
      // 每日任务
      dailyTasks: [],
      addDailyTask: (task) => set((state) => ({ dailyTasks: [...state.dailyTasks, task] })),
      updateDailyTask: (id, taskUpdate) => set((state) => ({
        dailyTasks: state.dailyTasks.map((t) => t.id === id ? { ...t, ...taskUpdate } : t)
      })),
      getDailyTaskByPlanAndDay: (planId, day) => {
        return get().dailyTasks.find((t) => t.planId === planId && t.day === day)
      },
      
      // 设置
      settings: {
        apiKey: '',
        apiEndpoint: 'https://api.openai.com/v1',
        model: 'gpt-4',
        language: 'zh',
        apiKeys: [],
        activeKeyId: null
      },
      updateSettings: (settingsUpdate) => set((state) => ({
        settings: { ...state.settings, ...settingsUpdate }
      })),
      
      // API 密钥管理
      addApiKey: (config) => set((state) => ({
        settings: {
          ...state.settings,
          apiKeys: [...state.settings.apiKeys, config]
        }
      })),
      updateApiKey: (id, configUpdate) => set((state) => ({
        settings: {
          ...state.settings,
          apiKeys: state.settings.apiKeys.map((k) => 
            k.id === id ? { ...k, ...configUpdate } : k
          )
        }
      })),
      deleteApiKey: (id) => set((state) => ({
        settings: {
          ...state.settings,
          apiKeys: state.settings.apiKeys.filter((k) => k.id !== id),
          activeKeyId: state.settings.activeKeyId === id ? null : state.settings.activeKeyId
        }
      })),
      setActiveApiKey: (id) => set((state) => {
        const activeKey = state.settings.apiKeys.find((k) => k.id === id)
        return {
          settings: {
            ...state.settings,
            activeKeyId: id,
            // 同步更新当前使用的配置
            apiKey: activeKey?.apiKey || '',
            apiEndpoint: activeKey?.apiEndpoint || state.settings.apiEndpoint,
            model: activeKey?.model || state.settings.model
          }
        }
      }),
      getActiveApiKey: () => {
        const state = get()
        if (!state.settings.activeKeyId) return null
        return state.settings.apiKeys.find((k) => k.id === state.settings.activeKeyId) || null
      },
      
      // 当前视图
      currentView: 'home',
      setCurrentView: (view) => set({ currentView: view }),
      
      // 选中的日期
      selectedDay: 1,
      setSelectedDay: (day) => set({ selectedDay: day }),
      
      // 页面草稿状态
      pageDrafts: {
        planCreator: defaultPlanCreatorDraft,
        reviewPage: defaultReviewPageDraft
      },
      updatePlanCreatorDraft: (draft) => set((state) => ({
        pageDrafts: {
          ...state.pageDrafts,
          planCreator: { ...state.pageDrafts.planCreator, ...draft }
        }
      })),
      resetPlanCreatorDraft: () => set((state) => ({
        pageDrafts: {
          ...state.pageDrafts,
          planCreator: defaultPlanCreatorDraft
        }
      })),
      updateReviewPageDraft: (draft) => set((state) => ({
        pageDrafts: {
          ...state.pageDrafts,
          reviewPage: { ...state.pageDrafts.reviewPage, ...draft }
        }
      })),
      resetReviewPageDraft: () => set((state) => ({
        pageDrafts: {
          ...state.pageDrafts,
          reviewPage: defaultReviewPageDraft
        }
      })),
    }),
    {
      name: STORAGE_KEY,
      storage: createJSONStorage(() => electronStorage),
    }
  )
)
