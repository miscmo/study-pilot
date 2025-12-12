/**
 * GitHub 服务模块
 * 处理 OAuth 授权、仓库操作、文件提交等
 */

import type { StudyPlan, DailyTask, TaskItem } from '../types'

// GitHub OAuth 配置
// 注意：实际使用时需要创建自己的 GitHub OAuth App
// https://github.com/settings/developers
const GITHUB_CLIENT_ID = 'YOUR_GITHUB_CLIENT_ID' // 需要用户配置
const GITHUB_OAUTH_URL = 'https://github.com/login/oauth/authorize'
const GITHUB_API_BASE = 'https://api.github.com'

export interface GitHubConfig {
  clientId: string
  clientSecret: string // 仅在后端使用，Electron 中通过 main 进程处理
  accessToken: string | null
}

export interface GitHubUser {
  login: string
  id: number
  avatar_url: string
  name: string | null
  email: string | null
}

export interface GitHubRepo {
  id: number
  name: string
  full_name: string
  html_url: string
  description: string | null
  private: boolean
  default_branch: string
}

class GitHubService {
  private accessToken: string | null = null
  private clientId: string = GITHUB_CLIENT_ID

  /**
   * 设置配置
   */
  setConfig(config: Partial<GitHubConfig>) {
    if (config.accessToken !== undefined) {
      this.accessToken = config.accessToken
    }
    if (config.clientId) {
      this.clientId = config.clientId
    }
  }

  /**
   * 获取 OAuth 授权 URL
   */
  getOAuthUrl(): string {
    const params = new URLSearchParams({
      client_id: this.clientId,
      scope: 'repo user:email',
      redirect_uri: 'studypilot://oauth/callback',
    })
    return `${GITHUB_OAUTH_URL}?${params.toString()}`
  }

  /**
   * 检查是否已授权
   */
  isAuthenticated(): boolean {
    return !!this.accessToken
  }

  /**
   * 获取当前用户信息
   */
  async getCurrentUser(): Promise<GitHubUser | null> {
    if (!this.accessToken) return null

    try {
      const response = await fetch(`${GITHUB_API_BASE}/user`, {
        headers: this.getHeaders(),
      })

      if (!response.ok) {
        throw new Error('Failed to get user info')
      }

      return await response.json()
    } catch (error) {
      console.error('Failed to get GitHub user:', error)
      return null
    }
  }

  /**
   * 创建新仓库
   */
  async createRepository(
    name: string,
    description: string,
    isPrivate: boolean = false
  ): Promise<GitHubRepo | null> {
    if (!this.accessToken) {
      throw new Error('Not authenticated')
    }

    try {
      const response = await fetch(`${GITHUB_API_BASE}/user/repos`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({
          name,
          description,
          private: isPrivate,
          auto_init: true, // 自动创建 README
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'Failed to create repository')
      }

      return await response.json()
    } catch (error) {
      console.error('Failed to create repository:', error)
      throw error
    }
  }

  /**
   * 获取用户的仓库列表
   */
  async listRepositories(): Promise<GitHubRepo[]> {
    if (!this.accessToken) {
      throw new Error('Not authenticated')
    }

    try {
      const response = await fetch(
        `${GITHUB_API_BASE}/user/repos?sort=updated&per_page=100`,
        {
          headers: this.getHeaders(),
        }
      )

      if (!response.ok) {
        throw new Error('Failed to list repositories')
      }

      return await response.json()
    } catch (error) {
      console.error('Failed to list repositories:', error)
      return []
    }
  }

  /**
   * 创建或更新文件
   */
  async createOrUpdateFile(
    owner: string,
    repo: string,
    path: string,
    content: string,
    message: string,
    sha?: string // 如果更新现有文件，需要提供 sha
  ): Promise<boolean> {
    if (!this.accessToken) {
      throw new Error('Not authenticated')
    }

    try {
      // 如果没有提供 sha，尝试获取现有文件的 sha
      let fileSha = sha
      if (!fileSha) {
        const existingFile = await this.getFile(owner, repo, path)
        if (existingFile) {
          fileSha = existingFile.sha
        }
      }

      const body: Record<string, string> = {
        message,
        content: btoa(unescape(encodeURIComponent(content))), // Base64 编码，支持中文
      }

      if (fileSha) {
        body.sha = fileSha
      }

      const response = await fetch(
        `${GITHUB_API_BASE}/repos/${owner}/${repo}/contents/${path}`,
        {
          method: 'PUT',
          headers: this.getHeaders(),
          body: JSON.stringify(body),
        }
      )

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'Failed to create/update file')
      }

      return true
    } catch (error) {
      console.error('Failed to create/update file:', error)
      throw error
    }
  }

  /**
   * 获取文件内容
   */
  async getFile(
    owner: string,
    repo: string,
    path: string
  ): Promise<{ content: string; sha: string } | null> {
    if (!this.accessToken) {
      throw new Error('Not authenticated')
    }

    try {
      const response = await fetch(
        `${GITHUB_API_BASE}/repos/${owner}/${repo}/contents/${path}`,
        {
          headers: this.getHeaders(),
        }
      )

      if (response.status === 404) {
        return null
      }

      if (!response.ok) {
        throw new Error('Failed to get file')
      }

      const data = await response.json()
      const content = decodeURIComponent(escape(atob(data.content)))
      return { content, sha: data.sha }
    } catch (error) {
      console.error('Failed to get file:', error)
      return null
    }
  }

  /**
   * 读取公开仓库的文件（无需授权）
   */
  async readPublicFile(url: string): Promise<string | null> {
    try {
      // 将 github.com URL 转换为 raw.githubusercontent.com
      let rawUrl = url
      if (url.includes('github.com') && url.includes('/blob/')) {
        rawUrl = url
          .replace('github.com', 'raw.githubusercontent.com')
          .replace('/blob/', '/')
      }

      const response = await fetch(rawUrl)
      if (!response.ok) {
        throw new Error('Failed to fetch file')
      }

      return await response.text()
    } catch (error) {
      console.error('Failed to read public file:', error)
      return null
    }
  }

  /**
   * 为学习计划初始化仓库结构
   */
  async initializeStudyRepo(
    owner: string,
    repo: string,
    plan: StudyPlan
  ): Promise<boolean> {
    try {
      // 创建 README.md
      const readmeContent = this.generateReadme(plan)
      await this.createOrUpdateFile(
        owner,
        repo,
        'README.md',
        readmeContent,
        '📚 初始化学习计划'
      )

      // 为每一天创建目录结构
      for (const item of plan.outline) {
        const dayFolder = `Day${String(item.day).padStart(2, '0')}-${item.title.replace(/[/\\?%*:|"<>]/g, '-')}`
        const dayReadme = this.generateDayReadme(item)
        await this.createOrUpdateFile(
          owner,
          repo,
          `${dayFolder}/README.md`,
          dayReadme,
          `📁 创建第 ${item.day} 天目录`
        )
      }

      return true
    } catch (error) {
      console.error('Failed to initialize study repo:', error)
      throw error
    }
  }

  /**
   * 提交每日学习成果
   */
  async commitDailyProgress(
    owner: string,
    repo: string,
    plan: StudyPlan,
    task: DailyTask,
    taskItem?: TaskItem
  ): Promise<boolean> {
    try {
      const outlineItem = plan.outline.find(o => o.day === task.day)
      if (!outlineItem) return false

      const dayFolder = `Day${String(task.day).padStart(2, '0')}-${outlineItem.title.replace(/[/\\?%*:|"<>]/g, '-')}`

      // 如果有具体任务项的笔记
      if (taskItem && taskItem.note) {
        const notePath = `${dayFolder}/notes/${taskItem.title.replace(/[/\\?%*:|"<>]/g, '-')}.md`
        await this.createOrUpdateFile(
          owner,
          repo,
          notePath,
          taskItem.note.content,
          `📝 更新笔记: ${taskItem.title}`
        )
      }

      // 如果有提交内容
      if (task.submission) {
        const submissionPath = `${dayFolder}/submission.md`
        const submissionContent = this.generateSubmissionContent(task)
        await this.createOrUpdateFile(
          owner,
          repo,
          submissionPath,
          submissionContent,
          `✅ 提交第 ${task.day} 天学习成果`
        )
      }

      // 如果有评审结果
      if (task.review) {
        const reviewPath = `${dayFolder}/review.md`
        const reviewContent = this.generateReviewContent(task)
        await this.createOrUpdateFile(
          owner,
          repo,
          reviewPath,
          reviewContent,
          `⭐ 第 ${task.day} 天评审结果: ${task.review.score}分`
        )
      }

      // 更新主 README 的进度
      await this.updateProgressInReadme(owner, repo, plan, task.day)

      return true
    } catch (error) {
      console.error('Failed to commit daily progress:', error)
      throw error
    }
  }

  /**
   * 生成主 README
   */
  private generateReadme(plan: StudyPlan): string {
    const startDate = new Date(plan.startDate).toLocaleDateString('zh-CN')
    
    let content = `# 📚 ${plan.topic}\n\n`
    content += `> ${plan.description}\n\n`
    content += `## 📋 学习计划概览\n\n`
    content += `- **开始日期**: ${startDate}\n`
    content += `- **学习周期**: ${plan.totalDays} 天\n`
    content += `- **每日时长**: ${plan.dailyStudyMinutes} 分钟\n\n`
    content += `## 📅 学习大纲\n\n`
    content += `| 天数 | 主题 | 状态 |\n`
    content += `|------|------|------|\n`

    for (const item of plan.outline) {
      content += `| Day ${item.day} | [${item.title}](./Day${String(item.day).padStart(2, '0')}-${item.title.replace(/[/\\?%*:|"<>]/g, '-')}) | ⏳ 待开始 |\n`
    }

    content += `\n## 📈 学习进度\n\n`
    content += `![Progress](https://progress-bar.dev/0/?title=完成进度&width=400)\n\n`
    content += `---\n\n`
    content += `*由 StudyPilot 自动生成*\n`

    return content
  }

  /**
   * 生成每日 README
   */
  private generateDayReadme(item: StudyPlan['outline'][0]): string {
    let content = `# Day ${item.day}: ${item.title}\n\n`
    content += `> ${item.description}\n\n`
    content += `## 🎯 学习目标\n\n`
    
    for (const obj of item.objectives) {
      content += `- [ ] ${obj}\n`
    }

    content += `\n## ⏱️ 预计时长\n\n`
    content += `${item.estimatedMinutes} 分钟\n\n`
    content += `## 📝 学习笔记\n\n`
    content += `*笔记将在学习过程中自动更新...*\n\n`
    content += `## ✅ 学习成果\n\n`
    content += `*成果将在提交后自动更新...*\n`

    return content
  }

  /**
   * 生成提交内容
   */
  private generateSubmissionContent(task: DailyTask): string {
    let content = `# 第 ${task.day} 天学习成果\n\n`
    content += `**提交时间**: ${new Date(task.submission!.submittedAt).toLocaleString('zh-CN')}\n\n`
    content += `## 学习内容\n\n`
    content += task.submission!.content + '\n\n'

    if (task.tasks && task.tasks.length > 0) {
      content += `## 任务完成情况\n\n`
      for (const t of task.tasks) {
        const status = t.completed ? '✅' : '⬜'
        content += `- ${status} ${t.title}\n`
      }
    }

    return content
  }

  /**
   * 生成评审内容
   */
  private generateReviewContent(task: DailyTask): string {
    const review = task.review!
    let content = `# 第 ${task.day} 天评审结果\n\n`
    content += `## 📊 评分: ${review.score}/100\n\n`
    content += `${review.feedback}\n\n`

    if (review.strengths.length > 0) {
      content += `## 💪 优点\n\n`
      for (const s of review.strengths) {
        content += `- ${s}\n`
      }
      content += '\n'
    }

    if (review.improvements.length > 0) {
      content += `## 📈 改进建议\n\n`
      for (const i of review.improvements) {
        content += `- ${i}\n`
      }
      content += '\n'
    }

    content += `---\n\n`
    content += `*评审时间: ${new Date(review.reviewedAt).toLocaleString('zh-CN')}*\n`

    return content
  }

  /**
   * 更新 README 中的进度
   */
  private async updateProgressInReadme(
    owner: string,
    repo: string,
    plan: StudyPlan,
    completedDay: number
  ): Promise<void> {
    const file = await this.getFile(owner, repo, 'README.md')
    if (!file) return

    let content = file.content
    const progress = Math.round((completedDay / plan.totalDays) * 100)

    // 更新进度条
    content = content.replace(
      /!\[Progress\]\(https:\/\/progress-bar\.dev\/\d+\/.*?\)/,
      `![Progress](https://progress-bar.dev/${progress}/?title=完成进度&width=400)`
    )

    // 更新当天状态
    const dayPattern = new RegExp(
      `\\| Day ${completedDay} \\| \\[.*?\\]\\(.*?\\) \\| .*? \\|`
    )
    content = content.replace(dayPattern, (match) => {
      return match.replace(/⏳ 待开始|🔄 进行中/, '✅ 已完成')
    })

    await this.createOrUpdateFile(
      owner,
      repo,
      'README.md',
      content,
      `📈 更新进度: Day ${completedDay} 完成`,
      file.sha
    )
  }

  /**
   * 获取请求头
   */
  private getHeaders(): Record<string, string> {
    return {
      Accept: 'application/vnd.github.v3+json',
      Authorization: `Bearer ${this.accessToken}`,
      'Content-Type': 'application/json',
    }
  }

  /**
   * 退出登录
   */
  logout() {
    this.accessToken = null
  }
}

export const githubService = new GitHubService()
