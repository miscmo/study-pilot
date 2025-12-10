import { useState } from 'react'
import { useStore } from '../store/useStore'
import { aiService } from '../services/aiService'
import type { TaskItem } from '../types'
import { 
  Loader2, 
  Send, 
  Star,
  CheckCircle,
  AlertCircle,
  ArrowRight
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

      // 生成明日计划预览
      let nextDayPlan: string | undefined
      if (selectedDay < currentPlan.totalDays) {
        nextDayPlan = await aiService.generateNextDayPreview(
          currentPlan,
          selectedDay,
          review
        )
      }

      // 更新任务状态
      updateDailyTask(currentTask.id, {
        review,
        nextDayPlan,
        status: 'reviewed'
      })

      // 提交成功后清空草稿
      resetReviewPageDraft()
    } catch (err) {
      setError(err instanceof Error ? err.message : '提交失败，请重试')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleGoToNextDay = () => {
    if (currentPlan && selectedDay < currentPlan.totalDays) {
      setSelectedDay(selectedDay + 1)
      setCurrentView('daily')
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

  // 已评审状态
  if (currentTask.status === 'reviewed' && currentTask.review) {
    const review = currentTask.review
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
                  stroke="url(#gradient)"
                  strokeWidth="12"
                  strokeLinecap="round"
                  strokeDasharray={`${review.score * 3.52} 352`}
                />
                <defs>
                  <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#0ea5e9" />
                    <stop offset="100%" stopColor="#8b5cf6" />
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

          {/* 明日计划 */}
          {currentTask.nextDayPlan && (
            <div className="bg-gradient-to-r from-primary-500 to-purple-600 rounded-2xl p-6 mb-6 text-white">
              <h3 className="text-lg font-bold mb-3">明日学习计划预览</h3>
              <p className="text-white/90 whitespace-pre-line">{currentTask.nextDayPlan}</p>
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
            {selectedDay < currentPlan.totalDays && (
              <button
                onClick={handleGoToNextDay}
                className="px-6 py-3 bg-gradient-to-r from-primary-500 to-purple-600 text-white rounded-xl hover:shadow-lg transition-all flex items-center gap-2"
              >
                开始明天的学习
                <ArrowRight className="w-4 h-4" />
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
    </div>
  )
}
