import { useState, useEffect, useMemo } from 'react'
import { useStore } from '../store/useStore'
import { aiService } from '../services/aiService'
import type { DailyTask, TaskItem } from '../types'
import ManualModeModal from '../components/ManualModeModal'
import TaskEditModal from '../components/TaskEditModal'
import RegenerateModal from '../components/RegenerateModal'
import TaskCard from '../components/TaskCard'
import NotePanel from '../components/NotePanel'
import { 
  Loader2, 
  Clock,
  BookOpen,
  FileText,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Zap,
  Edit2
} from 'lucide-react'
import { format } from 'date-fns'

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
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [editingTask, setEditingTask] = useState<TaskItem | null>(null)
  const [editingTitle, setEditingTitle] = useState(false)
  const [tempTitle, setTempTitle] = useState('')
  
  // 手动模式状态
  const [showManualModal, setShowManualModal] = useState(false)
  const [manualPrompt, setManualPrompt] = useState('')
  const [manualModalTitle, setManualModalTitle] = useState('')
  const [manualModalDesc, setManualModalDesc] = useState('')
  const [manualResultHandler, setManualResultHandler] = useState<((result: string) => void) | null>(null)
  const [manualParseHandler, setManualParseHandler] = useState<((result: string) => { success: boolean; error?: string }) | null>(null)

  const currentPlan = plans.find(p => p.id === currentPlanId)
  const rawCurrentTask = dailyTasks.find(
    t => t.planId === currentPlanId && t.day === selectedDay
  )
  
  // 使用 useMemo 稳定 currentTask 的引用
  const currentTask = useMemo(() => {
    if (!rawCurrentTask) return undefined
    return {
      ...rawCurrentTask,
      tasks: rawCurrentTask.tasks.map((t, i) => normalizeTask(t, i))
    }
  }, [rawCurrentTask])

  const previousDayTask = dailyTasks.find(
    t => t.planId === currentPlanId && t.day === selectedDay - 1
  )

  // 获取当前选中的任务
  const selectedTask = currentTask?.tasks.find(t => t.id === selectedTaskId) || null

  // 默认选中第一个任务
  useEffect(() => {
    if (currentTask && currentTask.tasks.length > 0) {
      if (!selectedTaskId || !currentTask.tasks.find(t => t.id === selectedTaskId)) {
        const firstIncomplete = currentTask.tasks.find(t => !t.completed)
        setSelectedTaskId(firstIncomplete?.id || currentTask.tasks[0].id)
        setExpandedTasks([firstIncomplete?.id || currentTask.tasks[0].id])
      }
    }
  }, [currentTask?.id])

  const handleGenerateTask = async () => {
    if (!currentPlan) {
      setError('请先选择学习计划')
      return
    }

    // 检查是否使用手动模式
    if (settings.aiMode === 'manual') {
      const prompt = aiService.getDailyTaskPrompt(
        currentPlan,
        selectedDay,
        previousDayTask?.review
      )
      setManualPrompt(prompt)
      setManualModalTitle('生成今日学习任务')
      setManualModalDesc('复制提示词到 AI 工具，获取今日任务')
      setManualResultHandler(() => (resultText: string) => {
        const parseResult = aiService.parseDailyTaskResult(resultText, selectedDay)
        if (parseResult.success && parseResult.data) {
          const newTask: DailyTask = {
            ...parseResult.data,
            id: `task-${currentPlanId}-${selectedDay}`,
            planId: currentPlanId!,
            date: format(new Date(), 'yyyy-MM-dd'),
            status: 'pending'
          }
          addDailyTask(newTask)
          if (parseResult.data.tasks.length > 0) {
            setSelectedTaskId(parseResult.data.tasks[0].id)
            setExpandedTasks([parseResult.data.tasks[0].id])
          }
        }
      })
      setManualParseHandler(() => (resultText: string) => {
        return aiService.parseDailyTaskResult(resultText, selectedDay)
      })
      setShowManualModal(true)
      return
    }

    // API 模式
    if (!settings.apiKey) {
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
      
      if (taskData.tasks.length > 0) {
        setSelectedTaskId(taskData.tasks[0].id)
        setExpandedTasks([taskData.tasks[0].id])
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '生成任务失败')
    } finally {
      setIsGenerating(false)
    }
  }

  const handleOpenRegenerateModal = (taskId: string | null) => {
    setPendingRegenerateTaskId(taskId)
    setShowRegenerateModal(true)
  }

  const handleConfirmRegenerate = async (note: string) => {
    setShowRegenerateModal(false)
    
    if (!currentPlan || !settings.apiKey || !currentTask) {
      setError('请先配置 API Key')
      return
    }

    setError('')

    if (pendingRegenerateTaskId === null) {
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
          setSelectedTaskId(taskData.tasks[0].id)
          setExpandedTasks([taskData.tasks[0].id])
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : '重新生成失败')
      } finally {
        setRegeneratingTaskId(null)
      }
    } else {
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
  }

  // 打开笔记模板手动生成弹窗
  const handleOpenNoteTemplateManualModal = (taskItem: TaskItem) => {
    const prompt = aiService.getNoteTemplatePrompt(
      taskItem.title,
      taskItem.description,
      taskItem.deliverable.title,
      taskItem.deliverable.description,
      taskItem.deliverable.type
    )
    setManualPrompt(prompt)
    setManualModalTitle('生成笔记模板')
    setManualModalDesc('复制提示词到 AI 工具，获取智能笔记模板')
    setManualResultHandler(() => (resultText: string) => {
      const parseResult = aiService.parseNoteTemplateResult(resultText)
      if (parseResult.success && parseResult.data) {
        const applyFn = (window as unknown as Record<string, (template: string) => void>)[`applyNoteTemplate_${taskItem.id}`]
        if (applyFn) {
          applyFn(parseResult.data)
        }
      }
    })
    setManualParseHandler(() => (resultText: string) => {
      return aiService.parseNoteTemplateResult(resultText)
    })
    setShowManualModal(true)
  }

  // 更新任务
  const handleUpdateTask = (updated: TaskItem) => {
    if (!currentTask) return
    const updatedTasks = currentTask.tasks.map(t =>
      t.id === updated.id ? updated : t
    )
    updateDailyTask(currentTask.id, { tasks: updatedTasks })
    setEditingTask(null)
  }

  // 更新今日标题
  const handleSaveTitle = () => {
    if (!currentTask) return
    updateDailyTask(currentTask.id, { title: tempTitle })
    setEditingTitle(false)
  }

  if (!currentPlan) {
    return (
      <div className="h-full flex items-center justify-center animate-fadeIn">
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
  const completedCount = currentTask?.tasks.filter(t => t.completed && t.deliverable.completed).length || 0
  const totalCount = currentTask?.tasks.length || 0

  return (
    <div className="h-full flex flex-col animate-fadeIn">
      {/* 顶部区域 */}
      <div className="p-4 border-b border-gray-200 bg-white">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h1 className="text-xl font-bold text-gray-800">{currentPlan.topic}</h1>
            <p className="text-sm text-gray-500">{outlineItem?.title || `第 ${selectedDay} 天`}</p>
          </div>
          <div className="flex items-center gap-2">
            {currentTask && (
              <span className="px-3 py-1 bg-primary-100 text-primary-600 rounded-full text-sm flex items-center gap-1">
                <Zap className="w-4 h-4" />
                {completedCount}/{totalCount} 已完成
              </span>
            )}
          </div>
        </div>

        {/* 日期选择器 */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setSelectedDay(Math.max(1, selectedDay - 1))}
            disabled={selectedDay === 1}
            className="p-1.5 hover:bg-gray-100 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          
          <div className="flex items-center gap-1 overflow-x-auto flex-1">
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
                  className={`flex-shrink-0 w-10 h-10 rounded-lg flex flex-col items-center justify-center transition-all text-xs ${
                    isActive
                      ? 'bg-gradient-to-br from-primary-500 to-purple-600 text-white'
                      : isCompleted
                      ? 'bg-green-100 text-green-600'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  <span className="text-[10px]">Day</span>
                  <span className="font-bold">{item.day}</span>
                </button>
              )
            })}
          </div>

          <button
            onClick={() => setSelectedDay(Math.min(currentPlan.totalDays, selectedDay + 1))}
            disabled={selectedDay === currentPlan.totalDays}
            className="p-1.5 hover:bg-gray-100 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 主内容区域 - 左右分栏 */}
      <div className="flex-1 flex overflow-hidden">
        {/* 左侧：任务列表 */}
        <div className="w-1/2 border-r border-gray-200 flex flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto p-4">
            {!currentTask ? (
              <div className="h-full flex items-center justify-center">
                <div className="text-center">
                  {!canGenerateTask ? (
                    <>
                      <div className="w-14 h-14 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-3">
                        <Clock className="w-7 h-7 text-yellow-500" />
                      </div>
                      <h3 className="text-lg font-bold text-gray-800 mb-2">请先完成前一天的学习</h3>
                      <p className="text-sm text-gray-500 mb-4">
                        需要完成第 {selectedDay - 1} 天的学习并提交评审后，才能开始今天的学习
                      </p>
                      <button
                        onClick={() => setSelectedDay(selectedDay - 1)}
                        className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm"
                      >
                        返回第 {selectedDay - 1} 天
                      </button>
                    </>
                  ) : isGenerating ? (
                    <>
                      <div className="w-14 h-14 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-3">
                        <Loader2 className="w-7 h-7 text-primary-500 animate-spin" />
                      </div>
                      <h3 className="text-lg font-bold text-gray-800 mb-2">AI 正在生成任务...</h3>
                      <p className="text-sm text-gray-500">正在为你规划学习路径</p>
                    </>
                  ) : (
                    <>
                      <div className="w-14 h-14 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-3">
                        <Sparkles className="w-7 h-7 text-primary-500" />
                      </div>
                      <h3 className="text-lg font-bold text-gray-800 mb-2">准备开始第 {selectedDay} 天</h3>
                      <p className="text-sm text-gray-500 mb-4">AI 将为你生成学习任务</p>
                      {error && (
                        <div className="mb-3 p-2 bg-red-50 text-red-600 rounded-lg text-sm">
                          {error}
                        </div>
                      )}
                      <button
                        onClick={handleGenerateTask}
                        className="px-5 py-2.5 bg-gradient-to-r from-primary-500 to-purple-600 text-white rounded-lg hover:shadow-lg transition-all"
                      >
                        生成今日任务
                      </button>
                    </>
                  )}
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                {error && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
                    {error}
                  </div>
                )}

                {/* 任务头部 */}
                <div className="flex items-center justify-between mb-2 group">
                  {editingTitle ? (
                    <div className="flex items-center gap-2 flex-1">
                      <input
                        type="text"
                        value={tempTitle}
                        onChange={(e) => setTempTitle(e.target.value)}
                        className="flex-1 px-3 py-1 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                        autoFocus
                      />
                      <button
                        onClick={() => setEditingTitle(false)}
                        className="px-2 py-1 text-xs text-gray-500 hover:bg-gray-100 rounded"
                      >
                        取消
                      </button>
                      <button
                        onClick={handleSaveTitle}
                        className="px-2 py-1 text-xs bg-primary-500 text-white rounded hover:bg-primary-600"
                      >
                        保存
                      </button>
                    </div>
                  ) : (
                    <>
                      <h3 className="font-medium text-gray-800">{currentTask.title}</h3>
                      {!isReviewed && (
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => {
                              setTempTitle(currentTask.title)
                              setEditingTitle(true)
                            }}
                            className="text-xs text-gray-400 hover:text-primary-500 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <Edit2 className="w-3 h-3" />
                            编辑
                          </button>
                          <button
                            onClick={() => handleOpenRegenerateModal(null)}
                            disabled={regeneratingTaskId !== null}
                            className="text-xs text-gray-400 hover:text-primary-500 flex items-center gap-1"
                          >
                            {regeneratingTaskId === 'all' ? (
                              <Loader2 className="w-3 h-3 animate-spin" />
                            ) : (
                              <RefreshCw className="w-3 h-3" />
                            )}
                            重新生成
                          </button>
                        </div>
                      )}
                    </>
                  )}
                </div>

                {/* 任务列表 */}
                {currentTask.tasks.map((task) => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    isSelected={selectedTaskId === task.id}
                    isExpanded={expandedTasks.includes(task.id)}
                    onSelect={() => setSelectedTaskId(task.id)}
                    onToggleExpand={() => toggleExpandTask(task.id)}
                    onToggleComplete={() => handleToggleTask(task.id)}
                    onToggleDeliverable={() => handleToggleDeliverable(task.id)}
                    onRegenerate={() => handleOpenRegenerateModal(task.id)}
                    onEdit={() => setEditingTask(task)}
                    isRegenerating={regeneratingTaskId === task.id}
                    disabled={isReviewed}
                  />
                ))}

                {/* 提交按钮 */}
                {!isReviewed && (
                  <div className="pt-3">
                    <button
                      onClick={() => setCurrentView('review')}
                      disabled={!currentTask.tasks.every(t => t.completed && t.deliverable.completed) || regeneratingTaskId !== null}
                      className="w-full px-4 py-3 bg-gradient-to-r from-primary-500 to-purple-600 text-white rounded-xl hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                      <FileText className="w-5 h-5" />
                      提交学习成果
                    </button>
                  </div>
                )}

                {/* 已评审状态 */}
                {isReviewed && currentTask.review && (
                  <div className="bg-gradient-to-r from-green-500 to-emerald-600 rounded-xl p-4 text-white">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-bold">评审结果</h3>
                      <div className="text-2xl font-bold">{currentTask.review.score}分</div>
                    </div>
                    <p className="text-sm text-white/90">{currentTask.review.feedback}</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* 右侧：笔记编辑器 */}
        <div className="w-1/2 overflow-hidden">
          <NotePanel
            task={selectedTask}
            onSave={handleSaveNote}
            onOpenManualModal={handleOpenNoteTemplateManualModal}
          />
        </div>
      </div>

      {/* 重新生成弹窗 */}
      <RegenerateModal
        isOpen={showRegenerateModal}
        onClose={() => setShowRegenerateModal(false)}
        onConfirm={handleConfirmRegenerate}
        taskTitle={pendingRegenerateTaskId 
          ? currentTask?.tasks.find(t => t.id === pendingRegenerateTaskId)?.title 
          : undefined}
      />

      {/* 任务编辑弹窗 */}
      {editingTask && (
        <TaskEditModal
          task={editingTask}
          onSave={handleUpdateTask}
          onClose={() => setEditingTask(null)}
        />
      )}

      {/* 手动模式弹窗 */}
      <ManualModeModal
        isOpen={showManualModal}
        onClose={() => setShowManualModal(false)}
        prompt={manualPrompt}
        title={manualModalTitle}
        description={manualModalDesc}
        onResult={(result) => manualResultHandler?.(result)}
        parseResult={(result) => manualParseHandler?.(result) || { success: false, error: '解析器未初始化' }}
      />
    </div>
  )
}
