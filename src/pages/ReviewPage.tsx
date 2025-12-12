import { useState } from 'react'
import { useStore } from '../store/useStore'
import { aiService } from '../services/aiService'
import { githubService } from '../services/githubService'
import type { TaskItem } from '../types'
import ManualModeModal from '../components/ManualModeModal'
import { 
  Loader2, 
  Send, 
  Star,
  CheckCircle,
  AlertCircle,
  ArrowRight,
  Github
} from 'lucide-react'

// 兼容旧数据结构的任务规范化函数
function normalizeTask(task: TaskItem, index: number): TaskItem {
  return {
    ...task,
    order: task.order ?? index + 1,
    difficulty: task.difficulty ?? 'basic',
    resources: task.resources ?? [],
    deliverable: task.deliverable ?? {
      id: `deliverable-${task.id}`,
      title: '完成任务',
      description: '完成上述任务要求',
      type: 'note' as const,
      completed: false
    }
  }
}

export default function ReviewPage() {
  const { 
    plans, 
    currentPlanId, 
    dailyTasks, 
    updateDailyTask,
    selectedDay,
    setSelectedDay,
    setCurrentView,
    settings,
    pageDrafts,
    updateReviewPageDraft,
    resetReviewPageDraft
  } = useStore()

  // 从 store 获取草稿状态
  const { submissionContent } = pageDrafts.reviewPage
  const setSubmissionContent = (value: string) => updateReviewPageDraft({ submissionContent: value })

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [githubSyncing, setGithubSyncing] = useState(false)
  
  // 手动模式状态
  const [showManualModal, setShowManualModal] = useState(false)
  const [manualPrompt, setManualPrompt] = useState('')

  const currentPlan = plans.find(p => p.id === currentPlanId)
  const rawCurrentTask = dailyTasks.find(
    t => t.planId === currentPlanId && t.day === selectedDay
  )
  
  // 规范化任务数据以兼容旧数据结构
  const currentTask = rawCurrentTask ? {
    ...rawCurrentTask,
    tasks: rawCurrentTask.tasks.map((t, i) => normalizeTask(t, i))
  } : undefined

  const handleSubmit = async () => {
    if (!currentPlan || !currentTask || !submissionContent.trim()) {
      setError('请填写学习成果')
      return
    }

    // 检查是否使用手动模式
    if (settings.aiMode === 'manual') {
      const prompt = aiService.getReviewPrompt(
        currentPlan,
        currentTask,
        submissionContent
      )
      setManualPrompt(prompt)
      setShowManualModal(true)
      return
    }

    // API 模式
    if (!settings.apiKey) {
      setError('请先在设置中配置 API Key')
      return
    }

    setIsSubmitting(true)
    setError('')

    try {
      // 保存提交内容
      updateDailyTask(currentTask.id, {
        submission: {
          content: submissionContent,
          submittedAt: new Date().toISOString()
        },
        status: 'submitted'
      })

      // AI 评审
      const review = await aiService.reviewSubmission(
        currentPlan,
        currentTask,
        submissionContent
      )

      // 检查评分是否达到80分
      if (review.score < 80) {
        // 评分不足，保存评审结果但不标记为完成
        updateDailyTask(currentTask.id, {
          review,
          status: 'in_progress'  // 保持进行中状态，需要重新提交
        })
        setError(`评审得分 ${review.score} 分，未达到80分通过标准。请根据改进建议完善后重新提交。`)
        return
      }

      // 生成明日计划预览（仅在评分达标时）
      let nextDayPlan: string | undefined
      if (selectedDay < currentPlan.totalDays) {
        nextDayPlan = await aiService.generateNextDayPreview(
          currentPlan,
          selectedDay,
          review
        )
      }

      // 更新任务状态（评分达标才标记为reviewed）
      updateDailyTask(currentTask.id, {
        review,
        nextDayPlan,
        status: 'reviewed'
      })

      // 提交成功后清空草稿
      resetReviewPageDraft()

      // 如果是 GitHub 存储，自动同步
      if (currentPlan.storageType === 'github' && currentPlan.github) {
        // 异步同步，不阻断流程
        syncToGitHub()
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '提交失败，请重试')
    } finally {
      setIsSubmitting(false)
    }
  }

  // 手动模式结果处理
  const handleManualResult = (resultText: string) => {
    if (!currentPlan || !currentTask) return
    
    const parseResult = aiService.parseReviewResult(resultText)
    if (parseResult.success && parseResult.data) {
      const review = parseResult.data
      
      // 检查评分是否达到80分
      if (review.score < 80) {
        // 评分不足，保存评审结果但不标记为完成
        updateDailyTask(currentTask.id, {
          submission: {
            content: submissionContent,
            submittedAt: new Date().toISOString()
          },
          review,
          status: 'in_progress'  // 保持进行中状态，需要重新提交
        })
        setError(`评审得分 ${review.score} 分，未达到80分通过标准。请根据改进建议完善后重新提交。`)
        setShowManualModal(false)
        return
      }

      // 保存提交内容
      updateDailyTask(currentTask.id, {
        submission: {
          content: submissionContent,
          submittedAt: new Date().toISOString()
        },
        status: 'submitted'
      })

      // 更新任务状态（评分达标才标记为reviewed）
      updateDailyTask(currentTask.id, {
        review,
        status: 'reviewed'
      })

      // 提交成功后清空草稿
      resetReviewPageDraft()

      // 如果是 GitHub 存储，自动同步
      if (currentPlan.storageType === 'github' && currentPlan.github) {
        syncToGitHub()
      }
    }
  }

  const parseManualResult = (resultText: string) => {
    return aiService.parseReviewResult(resultText)
  }

  const handleGoToNextDay = () => {
    if (currentPlan && selectedDay < currentPlan.totalDays) {
      setSelectedDay(selectedDay + 1)
      setCurrentView('daily')
    }
  }

  // 重新提交（评分不足时）
  const handleResubmit = () => {
    if (currentTask) {
      // 清除评审结果，重置状态为进行中
      updateDailyTask(currentTask.id, {
        review: undefined,
        status: 'in_progress'
      })
      setError('')
    }
  }

  // 同步到 GitHub
  const syncToGitHub = async () => {
    if (!currentPlan || !currentTask) return
    if (currentPlan.storageType !== 'github' || !currentPlan.github) return
    if (!settings.github?.accessToken) return

    setGithubSyncing(true)
    try {
      githubService.setConfig({ accessToken: settings.github.accessToken })
      await githubService.commitDailyProgress(
        currentPlan.github.owner,
        currentPlan.github.repo,
        currentPlan,
        currentTask
      )
    } catch (err) {
      console.error('GitHub 同步失败:', err)
      // 不阻断流程，只是记录错误
    } finally {
      setGithubSyncing(false)
    }
  }

  if (!currentPlan || !currentTask) {
    return (
      <div className="p-8 flex items-center justify-center min-h-full animate-fadeIn">
        <div className="text-center">
          <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <AlertCircle className="w-10 h-10 text-gray-400" />
          </div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">没有待提交的任务</h2>
          <p className="text-gray-500 mb-6">请先完成今日的学习任务</p>
          <button
            onClick={() => setCurrentView('daily')}
            className="px-6 py-3 bg-gradient-to-r from-primary-500 to-purple-600 text-white rounded-xl hover:shadow-lg transition-all"
          >
            返回今日学习
          </button>
        </div>
      </div>
    )
  }

  // 已评审状态（包括评分不足需要重新提交的情况）
  const hasReview = currentTask.review !== undefined
  const isPassed = hasReview && currentTask.review!.score >= 80
  
  if (hasReview) {
    const review = currentTask.review!
    const scoreColor = review.score >= 90 ? 'text-green-500' :
                       review.score >= 80 ? 'text-blue-500' :
                       review.score >= 70 ? 'text-yellow-500' :
                       review.score >= 60 ? 'text-orange-500' : 'text-red-500'

    return (
      <div className="p-8 animate-fadeIn">
        <div className="max-w-3xl mx-auto">
          <div className="mb-8 text-center">
            <h1 className="text-3xl font-bold text-gray-800 mb-2">评审结果</h1>
            <p className="text-gray-500">第 {selectedDay} 天 - {currentTask.title}</p>
            {!isPassed && (
              <div className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-orange-100 text-orange-700 rounded-lg">
                <AlertCircle className="w-5 h-5" />
                评分未达到80分通过标准，请根据改进建议完善后重新提交
              </div>
            )}
          </div>

          {/* 分数展示 */}
          <div className="bg-white rounded-2xl shadow-sm p-8 mb-6 text-center">
            <div className="w-32 h-32 mx-auto mb-4 relative">
              <svg className="w-full h-full transform -rotate-90">
                <circle
                  cx="64"
                  cy="64"
                  r="56"
                  fill="none"
                  stroke="#e5e7eb"
                  strokeWidth="12"
                />
                <circle
                  cx="64"
                  cy="64"
                  r="56"
                  fill="none"
                  stroke={isPassed ? "url(#gradient)" : "url(#gradient-fail)"}
                  strokeWidth="12"
                  strokeLinecap="round"
                  strokeDasharray={`${review.score * 3.52} 352`}
                />
                <defs>
                  <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#0ea5e9" />
                    <stop offset="100%" stopColor="#8b5cf6" />
                  </linearGradient>
                  <linearGradient id="gradient-fail" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#f97316" />
                    <stop offset="100%" stopColor="#ef4444" />
                  </linearGradient>
                </defs>
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className={`text-4xl font-bold ${scoreColor}`}>{review.score}</span>
              </div>
            </div>
            <div className="flex items-center justify-center gap-1 mb-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <Star
                  key={star}
                  className={`w-6 h-6 ${
                    star <= Math.round(review.score / 20)
                      ? 'text-yellow-400 fill-yellow-400'
                      : 'text-gray-200'
                  }`}
                />
              ))}
            </div>
            <p className="text-gray-600">{review.feedback}</p>
            {!isPassed && (
              <p className="mt-2 text-sm text-orange-600 font-medium">
                需要达到 80 分才能完成此任务
              </p>
            )}
          </div>

          {/* 优点与改进 */}
          <div className="grid grid-cols-2 gap-6 mb-6">
            <div className="bg-white rounded-2xl shadow-sm p-6">
              <h3 className="text-lg font-bold text-green-600 mb-4 flex items-center gap-2">
                <CheckCircle className="w-5 h-5" />
                做得好的地方
              </h3>
              <ul className="space-y-2">
                {review.strengths.map((strength, i) => (
                  <li key={i} className="flex items-start gap-2 text-gray-600">
                    <span className="text-green-500 mt-1">•</span>
                    {strength}
                  </li>
                ))}
              </ul>
            </div>
            <div className="bg-white rounded-2xl shadow-sm p-6">
              <h3 className="text-lg font-bold text-orange-600 mb-4 flex items-center gap-2">
                <AlertCircle className="w-5 h-5" />
                待改进的地方
              </h3>
              <ul className="space-y-2">
                {review.improvements.map((improvement, i) => (
                  <li key={i} className="flex items-start gap-2 text-gray-600">
                    <span className="text-orange-500 mt-1">•</span>
                    {improvement}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* 明日计划 - 仅在评分达标时显示 */}
          {isPassed && currentTask.nextDayPlan && (
            <div className="bg-gradient-to-r from-primary-500 to-purple-600 rounded-2xl p-6 mb-6 text-white">
              <h3 className="text-lg font-bold mb-3">明日学习计划预览</h3>
              <p className="text-white/90 whitespace-pre-line">{currentTask.nextDayPlan}</p>
            </div>
          )}

          {/* GitHub 同步状态 */}
          {isPassed && currentPlan.storageType === 'github' && currentPlan.github && (
            <div className={`rounded-xl p-4 mb-6 flex items-center gap-3 ${
              githubSyncing ? 'bg-gray-100' : 'bg-green-50'
            }`}>
              {githubSyncing ? (
                <>
                  <Loader2 className="w-5 h-5 text-gray-500 animate-spin" />
                  <span className="text-gray-600">正在同步到 GitHub...</span>
                </>
              ) : (
                <>
                  <Github className="w-5 h-5 text-green-600" />
                  <span className="text-green-700">已同步到 GitHub</span>
                  <a
                    href={currentPlan.github.repoUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="ml-auto text-sm text-green-600 hover:text-green-700 underline"
                  >
                    查看仓库
                  </a>
                </>
              )}
            </div>
          )}

          {/* 操作按钮 */}
          <div className="flex justify-center gap-4">
            <button
              onClick={() => setCurrentView('daily')}
              className="px-6 py-3 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition-colors"
            >
              返回今日学习
            </button>
            {isPassed ? (
              // 评分达标：显示开始明天学习按钮
              selectedDay < currentPlan.totalDays && (
                <button
                  onClick={handleGoToNextDay}
                  className="px-6 py-3 bg-gradient-to-r from-primary-500 to-purple-600 text-white rounded-xl hover:shadow-lg transition-all flex items-center gap-2"
                >
                  开始明天的学习
                  <ArrowRight className="w-4 h-4" />
                </button>
              )
            ) : (
              // 评分不足：显示重新提交按钮
              <button
                onClick={handleResubmit}
                className="px-6 py-3 bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-xl hover:shadow-lg transition-all flex items-center gap-2"
              >
                <Send className="w-4 h-4" />
                重新提交
              </button>
            )}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-8 animate-fadeIn">
      <div className="max-w-3xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">提交学习成果</h1>
          <p className="text-gray-500">第 {selectedDay} 天 - {currentTask.title}</p>
        </div>

        {/* 任务回顾 */}
        <div className="bg-white rounded-2xl shadow-sm p-6 mb-6">
          <h3 className="text-lg font-bold text-gray-800 mb-4">今日任务回顾</h3>
          <div className="space-y-3">
            {currentTask.tasks.map((task) => (
              <div key={task.id} className="p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-2 mb-1">
                  <CheckCircle className={`w-4 h-4 ${task.completed ? 'text-green-500' : 'text-gray-300'}`} />
                  <span className={`font-medium ${task.completed ? 'text-gray-700' : 'text-gray-400'}`}>
                    {task.order}. {task.title}
                  </span>
                </div>
                <div className="ml-6 text-sm text-gray-500">
                  验收成果：{task.deliverable.title}
                  {task.deliverable.completed && (
                    <CheckCircle className="w-3 h-3 text-green-500 inline ml-1" />
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 需要提交的成果 */}
        <div className="bg-white rounded-2xl shadow-sm p-6 mb-6">
          <h3 className="text-lg font-bold text-gray-800 mb-4">需要提交的成果</h3>
          <div className="space-y-2">
            {currentTask.tasks.map((task) => (
              <div key={task.deliverable.id} className="p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs px-1.5 py-0.5 bg-primary-100 text-primary-600 rounded">
                    任务{task.order}
                  </span>
                  <span className="font-medium text-gray-700">{task.deliverable.title}</span>
                </div>
                <div className="text-sm text-gray-500">{task.deliverable.description}</div>
              </div>
            ))}
          </div>
        </div>

        {/* 提交表单 */}
        <div className="bg-white rounded-2xl shadow-sm p-6">
          <h3 className="text-lg font-bold text-gray-800 mb-4">填写学习成果</h3>
          <p className="text-sm text-gray-500 mb-4">
            请详细描述你今天的学习收获、完成的任务、遇到的问题以及解决方案。
            AI 将根据你的提交内容进行评分和反馈。
          </p>
          
          <textarea
            value={submissionContent}
            onChange={(e) => setSubmissionContent(e.target.value)}
            placeholder="请在这里详细描述你的学习成果...

例如：
1. 今天学习了什么内容？
2. 完成了哪些任务？
3. 有什么收获和心得？
4. 遇到了什么问题？如何解决的？
5. 还有什么疑问？"
            className="w-full h-64 px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none"
          />

          {/* 字数统计 */}
          <div className="mt-2 text-right text-xs text-gray-400">
            已输入 {submissionContent.length} 字
          </div>

          {error && (
            <div className="mt-4 p-3 bg-red-50 text-red-600 rounded-lg text-sm">
              {error}
            </div>
          )}

          <div className="mt-6 flex justify-end">
            <button
              onClick={handleSubmit}
              disabled={isSubmitting || !submissionContent.trim()}
              className="px-6 py-3 bg-gradient-to-r from-primary-500 to-purple-600 text-white rounded-xl hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  AI 评审中...
                </>
              ) : (
                <>
                  <Send className="w-5 h-5" />
                  提交并获取评审
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* 手动模式弹窗 */}
      <ManualModeModal
        isOpen={showManualModal}
        onClose={() => setShowManualModal(false)}
        prompt={manualPrompt}
        title="AI 评审学习成果"
        description="复制提示词到 AI 工具，获取评审结果"
        onResult={handleManualResult}
        parseResult={parseManualResult}
      />
    </div>
  )
}
