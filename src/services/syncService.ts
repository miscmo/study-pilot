/**
 * 同步服务
 * 管理 GitHub 同步逻辑
 */

import { githubService } from './githubService'
import { useStore } from '../store/useStore'
import type { SyncData, AppSettings, StudyPlan, DailyTask } from '../types'

// 同步状态类型
export type SyncStatus = 'idle' | 'syncing' | 'success' | 'error'

// 单例模式实现同步服务
export class SyncService {
  private static instance: SyncService
  private isSyncing = false
  private status: SyncStatus = 'idle'
  private error: string | null = null
  private listeners: Set<(status: SyncStatus, error: string | null) => void> = new Set()

  private constructor() {}

  static getInstance(): SyncService {
    if (!SyncService.instance) {
      SyncService.instance = new SyncService()
    }
    return SyncService.instance
  }

  // 状态管理
  private setStatus(status: SyncStatus, error: string | null = null): void {
    this.status = status
    this.error = error
    this.notifyListeners()
  }

  getStatus(): { status: SyncStatus; error: string | null } {
    return { status: this.status, error: this.error }
  }

  addStatusListener(listener: (status: SyncStatus, error: string | null) => void): void {
    this.listeners.add(listener)
  }

  removeStatusListener(listener: (status: SyncStatus, error: string | null) => void): void {
    this.listeners.delete(listener)
  }

  private notifyListeners(): void {
    this.listeners.forEach(listener => listener(this.status, this.error))
  }

  /**
   * 执行同步操作
   */
  async sync(forceSync: boolean = false): Promise<{ success: boolean; error?: string }> {
    if (this.isSyncing) {
      console.log('Sync already in progress')
      return { success: false, error: '同步操作已在进行中' }
    }

    try {
      this.isSyncing = true
      this.setStatus('syncing')
      const state = useStore.getState()
      const settings = state.settings

      if (!settings.github?.accessToken || !settings.github?.user) {
        const errorMsg = 'GitHub未认证，请检查登录状态'
        console.error(errorMsg)
        this.setStatus('error', errorMsg)
        return { success: false, error: errorMsg }
      }

      if (!settings.github.sync.enabled) {
        const errorMsg = '同步功能已在设置中禁用'
        console.log(errorMsg)
        return { success: false, error: errorMsg }
      }

      const owner = settings.github.user.login
      const repoName = settings.github.sync.repo

      if (settings.github.sync.syncDirection === 'pull' || settings.github.sync.syncDirection === 'both') {
        // 先拉取最新数据
        const pullResult = await githubService.syncFromGitHub(owner, repoName)
        if (pullResult.success) {
          if (pullResult.data) {
            await this.applyRemoteData(pullResult.data, settings.github.sync.syncDirection)
          }
        } else {
          console.error('Failed to pull data from GitHub:', pullResult.error)
          this.setStatus('error', pullResult.error || '拉取数据失败')
          return { success: false, error: `拉取数据失败: ${pullResult.error || '未知错误'}` }
        }
      }

      if (settings.github.sync.syncDirection === 'push' || settings.github.sync.syncDirection === 'both') {
        // 再推送本地数据
        try {
          const syncData = this.prepareSyncData()
          const pushResult = await githubService.syncToGitHub(syncData)
          if (!pushResult.success) {
            console.error('Failed to push data to GitHub:', pushResult.error)
            this.setStatus('error', pushResult.error || '推送数据失败')
            return { success: false, error: `推送数据失败: ${pushResult.error || '未知错误'}` }
          }
        } catch (pushError) {
          const errorMsg = pushError instanceof Error ? pushError.message : '推送数据失败'
          console.error('Failed to push data to GitHub:', pushError)
          this.setStatus('error', errorMsg)
          return { success: false, error: `推送数据失败: ${errorMsg}` }
        }
      }

      // 更新同步时间
      state.updateSettings({
        github: {
          ...settings.github,
          sync: {
            ...settings.github.sync,
            lastSync: new Date().toISOString()
          }
        }
      })

      this.setStatus('success')
      
      // 5秒后恢复空闲状态
      setTimeout(() => {
        this.setStatus('idle')
      }, 5000)

      return { success: true }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '未知同步错误'
      console.error('Sync failed:', error)
      this.setStatus('error', errorMessage)
      return { success: false, error: errorMessage }
    } finally {
      this.isSyncing = false
    }
  }

  /**
   * 准备同步数据
   */
  private prepareSyncData(): SyncData {
    const state = useStore.getState()
    const settings = state.settings

    // 创建不包含敏感信息的设置副本
    const safeSettings = {
      ...settings,
      apiKey: '', // 移除敏感的 API Key
      apiKeys: settings.apiKeys.map(key => ({
        ...key,
        apiKey: '' // 移除所有 API Key
      }))
    }

    return {
      version: '1.0.0',
      lastUpdated: new Date().toISOString(),
      settings: safeSettings,
      plans: state.plans,
      dailyTasks: state.dailyTasks,
      syncInfo: {
        deviceName: `Device-${Date.now()}`,
        userId: settings.github?.user?.login || '',
        syncTimestamp: new Date().toISOString()
      }
    }
  }

  /**
   * 应用远程数据
   */
  private async applyRemoteData(remoteSyncData: SyncData, syncDirection: 'pull' | 'both'): Promise<void> {
    const state = useStore.getState()

    // 合并设置（只覆盖非敏感部分）
    if (remoteSyncData.settings) {
      const settingsToUpdate = {
        ...remoteSyncData.settings,
        apiKey: state.settings.apiKey, // 保留本地 API Key
        apiKeys: state.settings.apiKeys.map(localKey => {
          const remoteKey = remoteSyncData.settings.apiKeys.find(k => k.id === localKey.id)
          return remoteKey ? { ...remoteKey, apiKey: localKey.apiKey } : localKey
        })
      }
      state.updateSettings(settingsToUpdate)
    }

    // 合并学习计划
    if (remoteSyncData.plans) {
      remoteSyncData.plans.forEach(remotePlan => {
        const existingPlan = state.plans.find(p => p.id === remotePlan.id)
        if (!existingPlan) {
          // 添加新计划
          state.addPlan(remotePlan)
        } else {
          // 更新现有计划（只更新存储在 GitHub 上的部分）
          const shouldUpdate = !existingPlan.lastUpdated || 
            new Date(remotePlan.lastUpdated || '').getTime() > 
            new Date(existingPlan.lastUpdated || '').getTime()
          
          if (shouldUpdate) {
            state.updatePlan(existingPlan.id, {
              ...remotePlan,
              lastUpdated: remotePlan.lastUpdated || new Date().toISOString()
            })
          }
        }
      })
    }

    // 合并每日任务
    if (remoteSyncData.dailyTasks) {
      remoteSyncData.dailyTasks.forEach(remoteTask => {
        const existingTask = state.dailyTasks.find(t => t.id === remoteTask.id)
        if (!existingTask) {
          // 添加新任务
          state.addDailyTask(remoteTask)
        } else {
          // 更新现有任务
          const shouldUpdate = !existingTask.lastUpdated || 
            new Date(remoteTask.lastUpdated || '').getTime() > 
            new Date(existingTask.lastUpdated || '').getTime()
          
          if (shouldUpdate) {
            state.updateDailyTask(existingTask.id, {
              ...remoteTask,
              lastUpdated: remoteTask.lastUpdated || new Date().toISOString()
            })
          }
        }
      })
    }
  }

  /**
   * 初始化同步功能
   */
  async initializeSync(): Promise<{ success: boolean; error?: string }> {
    try {
      const state = useStore.getState()
      const settings = state.settings

      if (!settings.github?.accessToken || !settings.github?.user) {
        const errorMsg = 'GitHub accessToken或用户信息不存在'
        console.error(errorMsg)
        return { success: false, error: errorMsg }
      }

      const owner = settings.github.user.login
      const repoName = settings.github.sync.repo

      if (!owner || !repoName) {
        const errorMsg = 'GitHub仓库所有者或名称无效'
        console.error(errorMsg)
        return { success: false, error: errorMsg }
      }

      // 确保同步仓库存在
      try {
        const repoResult = await githubService.initializeSyncRepo(owner, repoName)
        if (repoResult.success) {
          return { success: true }
        } else {
          return { success: false, error: repoResult.error || '初始化同步仓库失败' }
        }
      } catch (repoError) {
        const errorMsg = repoError instanceof Error ? repoError.message : '初始化同步仓库失败'
        console.error('Failed to initialize sync repo:', repoError)
        return { success: false, error: `初始化仓库失败: ${errorMsg}` }
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : '初始化同步失败'
      console.error('Failed to initialize sync:', error)
      return { success: false, error: errorMsg }
    }
  }

  /**
   * 启用同步功能
   */
  async enableSync(): Promise<{ success: boolean; error?: string }> {
    try {
      const state = useStore.getState()
      const settings = state.settings

      if (!settings.github?.accessToken || !settings.github?.user) {
        const errorMsg = 'GitHub accessToken or user not found'
        console.error(errorMsg)
        return { success: false, error: errorMsg }
      }

      // 更新设置为启用
      state.updateSettings({
        github: {
          ...settings.github,
          sync: {
            ...settings.github.sync,
            enabled: true
          }
        }
      })

      // 初始化同步
      const initResult = await this.initializeSync()
      if (!initResult.success) {
        return initResult // 返回初始化失败的错误信息
      }
      
      // 启用后立即执行一次同步操作，确保仓库被创建
      return await this.sync(true)
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : '启用同步失败'
      console.error('Failed to enable sync:', error)
      return { success: false, error: errorMsg }
    }
  }

  /**
   * 禁用同步功能
   */
  disableSync(): void {
    const state = useStore.getState()
    const settings = state.settings

    state.updateSettings({
      github: {
        ...settings.github,
        sync: {
          ...settings.github.sync,
          enabled: false
        }
      }
    })
  }
}

export const syncService = SyncService.getInstance()
