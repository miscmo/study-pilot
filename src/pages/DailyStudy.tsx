import { useState, useEffect } from 'react'
import { useStore } from '../store/useStore'
import { aiService } from '../services/aiService'
import type { DailyTask, TaskItem } from '../types'
import NoteEditor from '../components/NoteEditor'
import { 
  Loader2, 
  CheckCircle, 
  Circle,
  Clock,
  BookOpen,
  FileText,
  ExternalLink,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  X,
  MessageSquare,
  Target,
  Zap,
  PenLine
} from 'lucide-react'
import { format } from 'date-fns'

// 难度标签颜色
const difficultyConfig = {
  basic: { label: '基础', color: 'bg-green-100 text-green-600' },
  intermediate: { label: '进阶', color: 'bg-yellow-100 text-yellow-600' },
  advanced: { label: '挑战', color: 'bg-red-100 text-red-600' }
}

// 重新生成弹窗组件
function RegenerateModal({ 
  isOpen, 
  onClose, 
  onConfirm, 
  taskTitle
}: { 
  isOpen: boolean
  onClose: () => void
  onConfirm: (note: string) => void
  taskTitle?: string
}) {
  const [note, setNote] = useState('')

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 animate-fadeIn">
      <div className="bg-white rounded-2xl p-6 w-full max-w-md mx-4 shadow-xl">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-gray-800">
            重新生成{taskTitle ? `「${taskTitle}」` : '全部任务'}
          </h3>
          <button 
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>
        
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            <MessageSquare className="w-4 h-4 inline mr-1" />
            备注说明（可选）
          </label>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="告诉 AI 你希望怎样调整，例如：&#10;• 希望任务更简单/更有挑战性&#10;• 希望资源更偏向实践/理论&#10;• 希望成果更容易完成..."
            rows={4}
            className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all resize-none"
          />
          <p className="text-xs text-gray-400 mt-1">
            填写备注可以让 AI 更好地理解你的需求
          </p>
        </div>

        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2.5 border border-gray-200 text-gray-600 rounded-xl hover:bg-gray-50 transition-colors"
          >
            取消
          </button>
          <button
            onClick={() => {
              onConfirm(note)
              setNote('')
            }}
            className="flex-1 px-4 py-2.5 bg-gradient-to-r from-primary-500 to-purple-600 text-white rounded-xl hover:shadow-lg transition-all"
          >
            确认重新生成
          </button>
        </div>
      </div>
    </div>
  )
}

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

// 单个任务卡片组件
function TaskCard({
  task,
  isExpanded,
  onToggleExpand,
  onToggleComplete,
  onToggleDeliverable,
  onRegenerate,
  onOpenNote,
  isRegenerating,
  disabled
}: {
  task: TaskItem
  isExpanded: boolean
  onToggleExpand: () => void
  onToggleComplete: () => void
  onToggleDeliverable: () => void
  onRegenerate: () => void
  onOpenNote: () => void
  isRegenerating: boolean
  disabled: boolean
}) {
  const difficulty = difficultyConfig[task.difficulty] || difficultyConfig.basic
  const hasNote = task.note && task.note.content.trim().length > 0

  return (
    <div className={`rounded-2xl border-2 overflow-hidden transition-all ${
      task.completed 
        ? 'border-green-200 bg-green-50/50' 
        : 'border-gray-100 bg-white'
    }`}>
      {/* 任务头部 */}
      <div 
        className="p-4 cursor-pointer hover:bg-gray-50/50 transition-colors"
        onClick={onToggleExpand}
      >
        <div className="flex items-start gap-3">
          {/* 完成状态 */}
          <button
            onClick={(e) => {
              e.stopPropagation()
              onToggleComplete()
            }}
            disabled={disabled}
            className="mt-0.5 flex-shrink-0"
          >
            {task.completed ? (
              <CheckCircle className="w-6 h-6 text-green-500" />
            ) : (
              <Circle className="w-6 h-6 text-gray-300 hover:text-gray-400" />
            )}
          </button>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              {/* 序号 */}
              <span className="w-6 h-6 bg-gradient-to-br from-primary-500 to-purple-600 rounded-full flex items-center justify-center text-white text-xs font-bold">
                {task.order}
              </span>
              {/* 难度标签 */}
              <span className={`px-2 py-0.5 text-xs rounded-full ${difficulty.color}`}>
                {difficulty.label}
              </span>
              {/* 时间 */}
              <span className="text-xs text-gray-400 flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {task.estimatedMinutes}分钟
              </span>
              {/* 笔记标识 */}
              {hasNote && (
                <span className="px-2 py-0.5 text-xs rounded-full bg-blue-100 text-blue-600 flex items-center gap-1">
                  <PenLine className="w-3 h-3" />
                  已记录
                </span>
              )}
            </div>
            
            <h4 className={`font-medium ${task.completed ? 'text-green-700 line-through' : 'text-gray-800'}`}>
              {task.title}
            </h4>
            <p className={`text-sm mt-1 line-clamp-2 ${task.completed ? 'text-green-600' : 'text-gray-500'}`}>
              {task.description}
            </p>
          </div>

          {/* 展开/收起 */}
          <div className="flex-shrink-0">
            {isExpanded ? (
              <ChevronUp className="w-5 h-5 text-gray-400" />
            ) : (
              <ChevronDown className="w-5 h-5 text-gray-400" />
            )}
          </div>
        </div>
      </div>

      {/* 展开内容 */}
      {isExpanded && (
        <div className="border-t border-gray-100 bg-gray-50/50">
          {/* 参考资料 */}
          <div className="p-4 border-b border-gray-100">
            <div className="flex items-center justify-between mb-3">
              <h5 className="text-sm font-medium text-gray-700 flex items-center gap-1">
                <BookOpen className="w-4 h-4 text-primary-500" />
                参考资料
              </h5>
              <div className="flex items-center gap-2">
                {/* 笔记按钮 */}
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    onOpenNote()
                  }}
                  className={`text-xs flex items-center gap-1 px-2 py-1 rounded-lg transition-colors ${
                    hasNote 
                      ? 'text-blue-600 bg-blue-50 hover:bg-blue-100' 
                      : 'text-gray-400 hover:text-primary-500 hover:bg-primary-50'
                  }`}
                >
                  <PenLine className="w-3 h-3" />
                  {hasNote ? '编辑笔记' : '记录笔记'}
                </button>
                {!disabled && (
                  <button
                    onClick={onRegenerate}
                    disabled={isRegenerating}
                    className="text-xs text-gray-400 hover:text-primary-500 flex items-center gap-1"
                  >
                    {isRegenerating ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : (
                      <RefreshCw className="w-3 h-3" />
                    )}
                    重新生成此任务
                  </button>
                )}
              </div>
            </div>
            
            {task.resources.length === 0 ? (
              <p className="text-sm text-gray-400 italic">暂无推荐资源</p>
            ) : (
              <div className="space-y-2">
                {task.resources.map((resource) => (
                  <div 
                    key={resource.id}
                    className="p-3 bg-white rounded-lg border border-gray-100"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`px-1.5 py-0.5 text-xs rounded ${
                            resource.type === 'video' ? 'bg-red-100 text-red-600' :
                            resource.type === 'article' ? 'bg-blue-100 text-blue-600' :
                            resource.type === 'documentation' ? 'bg-purple-100 text-purple-600' :
                            resource.type === 'practice' ? 'bg-green-100 text-green-600' :
                            'bg-orange-100 text-orange-600'
                          }`}>
                            {resource.type === 'video' ? '视频' :
                             resource.type === 'article' ? '文章' :
                             resource.type === 'documentation' ? '文档' :
                             resource.type === 'practice' ? '练习' : '书籍'}
                          </span>
                          <span className="font-medium text-sm text-gray-800 truncate">
                            {resource.title}
                          </span>
                          {resource.author && (
                            <span className="text-xs text-gray-400">— {resource.author}</span>
                          )}
                        </div>
                        <p className="text-xs text-gray-500 mt-1">{resource.description}</p>
                      </div>
                      {resource.url && (
                        <a
                          href={resource.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="p-1.5 text-gray-400 hover:text-primary-500 transition-colors flex-shrink-0"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </a>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 验收成果 */}
          <div className="p-4">
            <h5 className="text-sm font-medium text-gray-700 flex items-center gap-1 mb-3">
              <Target className="w-4 h-4 text-primary-500" />
              验收成果
            </h5>
            <div 
              onClick={(e) => {
                e.stopPropagation()
                if (!disabled) onToggleDeliverable()
              }}
              className={`p-3 rounded-lg border-2 cursor-pointer transition-all ${
                task.deliverable.completed
                  ? 'border-green-200 bg-green-50'
                  : 'border-gray-200 bg-white hover:border-gray-300'
              } ${disabled ? 'cursor-default' : ''}`}
            >
              <div className="flex items-start gap-2">
                {task.deliverable.completed ? (
                  <CheckCircle className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                ) : (
                  <Circle className="w-5 h-5 text-gray-300 mt-0.5 flex-shrink-0" />
                )}
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`px-1.5 py-0.5 text-xs rounded ${
                      task.deliverable.type === 'code' ? 'bg-blue-100 text-blue-600' :
                      task.deliverable.type === 'project' ? 'bg-purple-100 text-purple-600' :
                      task.deliverable.type === 'quiz' ? 'bg-yellow-100 text-yellow-600' :
                      task.deliverable.type === 'summary' ? 'bg-green-100 text-green-600' :
                      'bg-gray-100 text-gray-600'
                    }`}>
                      {task.deliverable.type === 'code' ? '代码' :
                       task.deliverable.type === 'project' ? '项目' :
                       task.deliverable.type === 'quiz' ? '测验' :
                       task.deliverable.type === 'summary' ? '总结' : '笔记'}
                    </span>
                    <span className={`font-medium text-sm ${
                      task.deliverable.completed ? 'text-green-700' : 'text-gray-800'
                    }`}>
                      {task.deliverable.title}
                    </span>
                  </div>
                  <p className={`text-xs ${
                    task.deliverable.completed ? 'text-green-600' : 'text-gray-500'
                  }`}>
                    {task.deliverable.description}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default function DailyStudy() {
  const { 
    plans, 
    currentPlanId, 
    dailyTasks, 
    addDailyTask, 
    updateDailyTask,
    selectedDay,
    setSelectedDay,
    setCurrentView,
    settings
  } = useStore()

  const [isGenerating, setIsGenerating] = useState(false)
  const [regeneratingTaskId, setRegeneratingTaskId] = useState<string | null>(null)
  const [showRegenerateModal, setShowRegenerateModal] = useState(false)
  const [pendingRegenerateTaskId, setPendingRegenerateTaskId] = useState<string | null>(null)
  const [expandedTasks, setExpandedTasks] = useState<string[]>([])
  const [error, setError] = useState('')
  const [editingNoteTaskId, setEditingNoteTaskId] = useState<string | null>(null)

  const currentPlan = plans.find(p => p.id === currentPlanId)
  const rawCurrentTask = dailyTasks.find(
    t => t.planId === currentPlanId && t.day === selectedDay
  )
  
  // 规范化任务数据以兼容旧数据结构
  const currentTask = rawCurrentTask ? {
    ...rawCurrentTask,
    tasks: rawCurrentTask.tasks.map((t, i) => normalizeTask(t, i))
  } : undefined

  // 获取前一天的评审结果
  const previousDayTask = dailyTasks.find(
    t => t.planId === currentPlanId && t.day === selectedDay - 1
  )

  // 默认展开第一个未完成的任务
  useEffect(() => {
    if (currentTask && expandedTasks.length === 0) {
      const firstIncomplete = currentTask.tasks.find(t => !t.completed)
      if (firstIncomplete) {
        setExpandedTasks([firstIncomplete.id])
      } else if (currentTask.tasks.length > 0) {
        setExpandedTasks([currentTask.tasks[0].id])
      }
    }
  }, [currentTask?.id])

  const handleGenerateTask = async () => {
    if (!currentPlan || !settings.apiKey) {
      setError('请先配置 API Key')
      return
    }

    setIsGenerating(true)
    setError('')

    try {
      const taskData = await aiService.generateDailyTask(
        currentPlan,
        selectedDay,
        previousDayTask?.review
      )

      const newTask: DailyTask = {
        ...taskData,
        id: `task-${currentPlanId}-${selectedDay}`,
        planId: currentPlanId!,
        date: format(new Date(), 'yyyy-MM-dd'),
        status: 'pending'
      }

      addDailyTask(newTask)
      
      // 展开第一个任务
      if (taskData.tasks.length > 0) {
        setExpandedTasks([taskData.tasks[0].id])
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '生成任务失败')
    } finally {
      setIsGenerating(false)
    }
  }

  // 打开重新生成弹窗
  const handleOpenRegenerateModal = (taskId: string | null) => {
    setPendingRegenerateTaskId(taskId)
    setShowRegenerateModal(true)
  }

  // 确认重新生成
  const handleConfirmRegenerate = async (note: string) => {
    setShowRegenerateModal(false)
    
    if (!currentPlan || !settings.apiKey || !currentTask) {
      setError('请先配置 API Key')
      return
    }

    setError('')

    if (pendingRegenerateTaskId === null) {
      // 重新生成全部
      setRegeneratingTaskId('all')
      try {
        const taskData = await aiService.generateDailyTask(
          currentPlan,
          selectedDay,
          previousDayTask?.review,
          note || undefined
        )
        updateDailyTask(currentTask.id, {
          title: taskData.title,
          tasks: taskData.tasks
        })
        if (taskData.tasks.length > 0) {
          setExpandedTasks([taskData.tasks[0].id])
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : '重新生成失败')
      } finally {
        setRegeneratingTaskId(null)
      }
    } else {
      // 重新生成单个任务
      const taskToRegenerate = currentTask.tasks.find(t => t.id === pendingRegenerateTaskId)
      if (!taskToRegenerate) return

      setRegeneratingTaskId(pendingRegenerateTaskId)
      try {
        const newTaskItem = await aiService.regenerateSingleTask(
          currentPlan,
          selectedDay,
          taskToRegenerate.order,
          note || undefined
        )
        
        const updatedTasks = currentTask.tasks.map(t => 
          t.id === pendingRegenerateTaskId ? { ...newTaskItem, id: t.id, completed: t.completed } : t
        )
        updateDailyTask(currentTask.id, { tasks: updatedTasks })
      } catch (err) {
        setError(err instanceof Error ? err.message : '重新生成失败')
      } finally {
        setRegeneratingTaskId(null)
      }
    }
  }

  const handleToggleTask = (taskId: string) => {
    if (!currentTask || currentTask.status === 'reviewed') return

    const updatedTasks = currentTask.tasks.map(t =>
      t.id === taskId ? { ...t, completed: !t.completed } : t
    )

    // 检查是否所有任务都完成了
    const allTasksCompleted = updatedTasks.every(t => t.completed)
    const allDeliverablesCompleted = updatedTasks.every(t => t.deliverable.completed)

    updateDailyTask(currentTask.id, { 
      tasks: updatedTasks,
      status: allTasksCompleted && allDeliverablesCompleted ? 'in_progress' : 'pending'
    })
  }

  const handleToggleDeliverable = (taskId: string) => {
    if (!currentTask || currentTask.status === 'reviewed') return

    const updatedTasks = currentTask.tasks.map(t =>
      t.id === taskId 
        ? { ...t, deliverable: { ...t.deliverable, completed: !t.deliverable.completed } }
        : t
    )

    const allTasksCompleted = updatedTasks.every(t => t.completed)
    const allDeliverablesCompleted = updatedTasks.every(t => t.deliverable.completed)

    updateDailyTask(currentTask.id, { 
      tasks: updatedTasks,
      status: allTasksCompleted && allDeliverablesCompleted ? 'in_progress' : 'pending'
    })
  }

  const toggleExpandTask = (taskId: string) => {
    setExpandedTasks(prev => 
      prev.includes(taskId) 
        ? prev.filter(id => id !== taskId)
        : [...prev, taskId]
    )
  }

  // 保存笔记
  const handleSaveNote = (taskId: string, content: string) => {
    if (!currentTask) return
    
    const now = new Date().toISOString()
    const updatedTasks = currentTask.tasks.map(t =>
      t.id === taskId
        ? {
            ...t,
            note: {
              content,
              createdAt: t.note?.createdAt || now,
              updatedAt: now
            }
          }
        : t
    )
    
    updateDailyTask(currentTask.id, { tasks: updatedTasks })
    setEditingNoteTaskId(null)
  }

  // 获取正在编辑的任务
  const editingTask = editingNoteTaskId 
    ? currentTask?.tasks.find(t => t.id === editingNoteTaskId) 
    : null

  if (!currentPlan) {
    return (
      <div className="p-8 flex items-center justify-center min-h-full animate-fadeIn">
        <div className="text-center">
          <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <BookOpen className="w-10 h-10 text-gray-400" />
          </div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">请先选择学习计划</h2>
          <p className="text-gray-500 mb-6">在首页选择一个学习计划开始学习</p>
          <button
            onClick={() => setCurrentView('home')}
            className="px-6 py-3 bg-gradient-to-r from-primary-500 to-purple-600 text-white rounded-xl hover:shadow-lg transition-all"
          >
            返回首页
          </button>
        </div>
      </div>
    )
  }

  const canGenerateTask = selectedDay === 1 || previousDayTask?.status === 'reviewed'
  const outlineItem = currentPlan.outline.find(o => o.day === selectedDay)
  const isReviewed = currentTask?.status === 'reviewed'
  
  // 计算完成进度
  const completedCount = currentTask?.tasks.filter(t => t.completed && t.deliverable.completed).length || 0
  const totalCount = currentTask?.tasks.length || 0

  return (
    <div className="p-8 animate-fadeIn">
      <div className="max-w-4xl mx-auto">
        {/* 头部 */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">{currentPlan.topic}</h1>
          <p className="text-gray-500">{currentPlan.description}</p>
        </div>

        {/* 日期选择器 */}
        <div className="bg-white rounded-2xl shadow-sm p-4 mb-6">
          <div className="flex items-center justify-between">
            <button
              onClick={() => setSelectedDay(Math.max(1, selectedDay - 1))}
              disabled={selectedDay === 1}
              className="p-2 hover:bg-gray-100 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            
            <div className="flex items-center gap-2 overflow-x-auto px-4">
              {currentPlan.outline.map((item) => {
                const task = dailyTasks.find(
                  t => t.planId === currentPlanId && t.day === item.day
                )
                const isCompleted = task?.status === 'reviewed'
                const isActive = selectedDay === item.day

                return (
                  <button
                    key={item.day}
                    onClick={() => setSelectedDay(item.day)}
                    className={`flex-shrink-0 w-12 h-12 rounded-xl flex flex-col items-center justify-center transition-all ${
                      isActive
                        ? 'bg-gradient-to-br from-primary-500 to-purple-600 text-white'
                        : isCompleted
                        ? 'bg-green-100 text-green-600'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    <span className="text-xs">Day</span>
                    <span className="font-bold">{item.day}</span>
                  </button>
                )
              })}
            </div>

            <button
              onClick={() => setSelectedDay(Math.min(currentPlan.totalDays, selectedDay + 1))}
              disabled={selectedDay === currentPlan.totalDays}
              className="p-2 hover:bg-gray-100 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* 当天大纲 */}
        {outlineItem && (
          <div className="bg-gradient-to-r from-primary-500 to-purple-600 rounded-2xl p-6 mb-6 text-white">
            <div className="flex items-center gap-2 mb-2">
              <span className="px-2 py-0.5 bg-white/20 rounded text-sm">第 {selectedDay} 天</span>
              {currentTask && (
                <span className="px-2 py-0.5 bg-white/20 rounded text-sm flex items-center gap-1">
                  <Zap className="w-3 h-3" />
                  {completedCount}/{totalCount} 已完成
                </span>
              )}
            </div>
            <h2 className="text-2xl font-bold mb-2">{outlineItem.title}</h2>
            <p className="text-white/80 mb-4">{outlineItem.description}</p>
            <div className="flex items-center gap-4 text-sm text-white/70">
              <span className="flex items-center gap-1">
                <Clock className="w-4 h-4" />
                {outlineItem.estimatedMinutes} 分钟
              </span>
              <span className="flex items-center gap-1">
                <FileText className="w-4 h-4" />
                {outlineItem.objectives.length} 个目标
              </span>
            </div>
          </div>
        )}

        {/* 任务内容 */}
        {!currentTask ? (
          <div className="bg-white rounded-2xl shadow-sm p-8 text-center">
            {!canGenerateTask ? (
              <>
                <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Clock className="w-8 h-8 text-yellow-500" />
                </div>
                <h3 className="text-xl font-bold text-gray-800 mb-2">请先完成前一天的学习</h3>
                <p className="text-gray-500 mb-4">
                  需要完成第 {selectedDay - 1} 天的学习并提交评审后，才能开始今天的学习
                </p>
                <button
                  onClick={() => setSelectedDay(selectedDay - 1)}
                  className="px-6 py-3 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition-colors"
                >
                  返回第 {selectedDay - 1} 天
                </button>
              </>
            ) : isGenerating ? (
              <>
                <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Loader2 className="w-8 h-8 text-primary-500 animate-spin" />
                </div>
                <h3 className="text-xl font-bold text-gray-800 mb-2">AI 正在生成今日任务...</h3>
                <p className="text-gray-500">正在为你规划循序渐进的学习路径</p>
              </>
            ) : (
              <>
                <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Sparkles className="w-8 h-8 text-primary-500" />
                </div>
                <h3 className="text-xl font-bold text-gray-800 mb-2">准备开始第 {selectedDay} 天的学习</h3>
                <p className="text-gray-500 mb-4">AI 将为你生成由浅入深、循序渐进的学习任务</p>
                {error && (
                  <div className="mb-4 p-3 bg-red-50 text-red-600 rounded-lg text-sm">
                    {error}
                  </div>
                )}
                <button
                  onClick={handleGenerateTask}
                  className="px-6 py-3 bg-gradient-to-r from-primary-500 to-purple-600 text-white rounded-xl hover:shadow-lg transition-all"
                >
                  生成今日任务
                </button>
              </>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {/* 错误提示 */}
            {error && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm">
                {error}
              </div>
            )}

            {/* 任务说明 */}
            <div className="bg-white rounded-2xl shadow-sm p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-primary-500 to-purple-600 rounded-xl flex items-center justify-center">
                    <CheckCircle className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-800">{currentTask.title}</h3>
                    <p className="text-sm text-gray-500">按顺序完成以下 {totalCount} 个任务，从基础到进阶</p>
                  </div>
                </div>
                {!isReviewed && (
                  <button
                    onClick={() => handleOpenRegenerateModal(null)}
                    disabled={regeneratingTaskId !== null}
                    className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors disabled:opacity-50"
                  >
                    {regeneratingTaskId === 'all' ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <RefreshCw className="w-4 h-4" />
                    )}
                    整体重新生成
                  </button>
                )}
              </div>
            </div>

            {/* 任务列表 */}
            <div className="space-y-3">
              {currentTask.tasks.map((task) => (
                <TaskCard
                  key={task.id}
                  task={task}
                  isExpanded={expandedTasks.includes(task.id)}
                  onToggleExpand={() => toggleExpandTask(task.id)}
                  onToggleComplete={() => handleToggleTask(task.id)}
                  onToggleDeliverable={() => handleToggleDeliverable(task.id)}
                  onRegenerate={() => handleOpenRegenerateModal(task.id)}
                  onOpenNote={() => setEditingNoteTaskId(task.id)}
                  isRegenerating={regeneratingTaskId === task.id}
                  disabled={isReviewed}
                />
              ))}
            </div>

            {/* 提交按钮 */}
            {!isReviewed && (
              <div className="flex justify-end pt-4">
                <button
                  onClick={() => setCurrentView('review')}
                  disabled={!currentTask.tasks.every(t => t.completed && t.deliverable.completed) || regeneratingTaskId !== null}
                  className="px-6 py-3 bg-gradient-to-r from-primary-500 to-purple-600 text-white rounded-xl hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  <FileText className="w-5 h-5" />
                  提交学习成果
                </button>
              </div>
            )}

            {/* 已评审状态 */}
            {isReviewed && currentTask.review && (
              <div className="bg-gradient-to-r from-green-500 to-emerald-600 rounded-2xl p-6 text-white">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-bold">评审结果</h3>
                  <div className="text-3xl font-bold">{currentTask.review.score}分</div>
                </div>
                <p className="text-white/90 mb-4">{currentTask.review.feedback}</p>
                {currentTask.nextDayPlan && (
                  <div className="p-4 bg-white/10 rounded-xl">
                    <h4 className="font-medium mb-2">明日计划预览</h4>
                    <p className="text-sm text-white/80">{currentTask.nextDayPlan}</p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* 重新生成弹窗 */}
        <RegenerateModal
          isOpen={showRegenerateModal}
          onClose={() => setShowRegenerateModal(false)}
          onConfirm={handleConfirmRegenerate}
          taskTitle={pendingRegenerateTaskId 
            ? currentTask?.tasks.find(t => t.id === pendingRegenerateTaskId)?.title 
            : undefined}
        />

        {/* 笔记编辑器 */}
        {editingTask && (
          <NoteEditor
            note={editingTask.note}
            taskTitle={editingTask.title}
            onSave={(content) => handleSaveNote(editingTask.id, content)}
            onClose={() => setEditingNoteTaskId(null)}
          />
        )}
      </div>
    </div>
  )
}
