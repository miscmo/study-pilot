import { useState, useEffect } from 'react'
import { useStore } from '../store/useStore'
import { aiService } from '../services/aiService'
import type { DailyTask, TaskItem, TaskNote, Resource, Deliverable } from '../types'
import MDEditor from '@uiw/react-md-editor'
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
  PenLine,
  Save,
  Edit2,
  Plus,
  Trash2
} from 'lucide-react'
import { format } from 'date-fns'

// 难度标签颜色
const difficultyConfig = {
  basic: { label: '基础', color: 'bg-green-100 text-green-600' },
  intermediate: { label: '进阶', color: 'bg-yellow-100 text-yellow-600' },
  advanced: { label: '挑战', color: 'bg-red-100 text-red-600' }
}

// 任务编辑弹窗组件
function TaskEditModal({
  task,
  onSave,
  onClose
}: {
  task: TaskItem
  onSave: (updated: TaskItem) => void
  onClose: () => void
}) {
  const [title, setTitle] = useState(task.title)
  const [description, setDescription] = useState(task.description)
  const [difficulty, setDifficulty] = useState(task.difficulty)
  const [estimatedMinutes, setEstimatedMinutes] = useState(task.estimatedMinutes)
  const [resources, setResources] = useState<Resource[]>(task.resources)
  const [deliverableTitle, setDeliverableTitle] = useState(task.deliverable.title)
  const [deliverableDesc, setDeliverableDesc] = useState(task.deliverable.description)
  const [deliverableType, setDeliverableType] = useState(task.deliverable.type)

  const handleSave = () => {
    onSave({
      ...task,
      title,
      description,
      difficulty,
      estimatedMinutes,
      resources,
      deliverable: {
        ...task.deliverable,
        title: deliverableTitle,
        description: deliverableDesc,
        type: deliverableType
      }
    })
  }

  const addResource = () => {
    setResources([...resources, {
      id: `resource-${Date.now()}`,
      title: '',
      type: 'article',
      description: '',
      url: ''
    }])
  }

  const updateResource = (index: number, field: keyof Resource, value: string) => {
    const updated = [...resources]
    updated[index] = { ...updated[index], [field]: value }
    setResources(updated)
  }

  const removeResource = (index: number) => {
    setResources(resources.filter((_, i) => i !== index))
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 animate-fadeIn">
      <div className="bg-white rounded-2xl p-6 w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-gray-800">编辑任务</h3>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-lg">
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        <div className="space-y-4">
          {/* 任务标题 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">任务标题</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>

          {/* 任务描述 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">任务描述</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
            />
          </div>

          {/* 难度和时间 */}
          <div className="flex gap-4">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">难度</label>
              <select
                value={difficulty}
                onChange={(e) => setDifficulty(e.target.value as TaskItem['difficulty'])}
                className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white"
              >
                <option value="basic">基础</option>
                <option value="intermediate">进阶</option>
                <option value="advanced">挑战</option>
              </select>
            </div>
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">预计时间（分钟）</label>
              <input
                type="number"
                min="1"
                value={estimatedMinutes}
                onChange={(e) => setEstimatedMinutes(parseInt(e.target.value) || 20)}
                className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
          </div>

          {/* 参考资料 */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-gray-700">参考资料</label>
              <button
                onClick={addResource}
                className="text-xs text-primary-600 hover:text-primary-700 flex items-center gap-1"
              >
                <Plus className="w-3 h-3" />
                添加资料
              </button>
            </div>
            <div className="space-y-2">
              {resources.map((resource, index) => (
                <div key={resource.id} className="p-3 bg-gray-50 rounded-lg space-y-2">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={resource.title}
                      onChange={(e) => updateResource(index, 'title', e.target.value)}
                      placeholder="资料标题"
                      className="flex-1 px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                    <select
                      value={resource.type}
                      onChange={(e) => updateResource(index, 'type', e.target.value)}
                      className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white"
                    >
                      <option value="article">文章</option>
                      <option value="video">视频</option>
                      <option value="book">书籍</option>
                      <option value="documentation">文档</option>
                      <option value="practice">练习</option>
                    </select>
                    <button
                      onClick={() => removeResource(index)}
                      className="p-1.5 text-red-400 hover:text-red-500 hover:bg-red-50 rounded-lg"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                  <input
                    type="text"
                    value={resource.url || ''}
                    onChange={(e) => updateResource(index, 'url', e.target.value)}
                    placeholder="链接（可选）"
                    className="w-full px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>
              ))}
              {resources.length === 0 && (
                <p className="text-xs text-gray-400 text-center py-2">暂无参考资料</p>
              )}
            </div>
          </div>

          {/* 验收成果 */}
          <div className="p-4 bg-blue-50 rounded-xl space-y-3">
            <h4 className="text-sm font-medium text-blue-800">验收成果</h4>
            <div>
              <label className="block text-xs text-blue-600 mb-1">成果标题</label>
              <input
                type="text"
                value={deliverableTitle}
                onChange={(e) => setDeliverableTitle(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-blue-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              />
            </div>
            <div>
              <label className="block text-xs text-blue-600 mb-1">成果描述</label>
              <textarea
                value={deliverableDesc}
                onChange={(e) => setDeliverableDesc(e.target.value)}
                rows={2}
                className="w-full px-3 py-2 text-sm border border-blue-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white resize-none"
              />
            </div>
            <div>
              <label className="block text-xs text-blue-600 mb-1">成果类型</label>
              <select
                value={deliverableType}
                onChange={(e) => setDeliverableType(e.target.value as Deliverable['type'])}
                className="w-full px-3 py-2 text-sm border border-blue-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              >
                <option value="note">笔记</option>
                <option value="code">代码</option>
                <option value="project">项目</option>
                <option value="quiz">测验</option>
                <option value="summary">总结</option>
              </select>
            </div>
          </div>
        </div>

        <div className="flex gap-3 mt-6">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 border border-gray-200 text-gray-600 rounded-xl hover:bg-gray-50"
          >
            取消
          </button>
          <button
            onClick={handleSave}
            className="flex-1 py-2.5 bg-gradient-to-r from-primary-500 to-purple-600 text-white rounded-xl hover:shadow-lg flex items-center justify-center gap-2"
          >
            <Save className="w-4 h-4" />
            保存
          </button>
        </div>
      </div>
    </div>
  )
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
            placeholder="告诉 AI 你希望怎样调整..."
            rows={4}
            className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all resize-none"
          />
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

// 默认笔记模板（仅作为后备）
function getDefaultTemplate(taskTitle: string): string {
  return `# ${taskTitle}

## 学习要点

> 正在生成智能模板...

`
}

// 右侧笔记面板组件
function NotePanel({
  task,
  onSave
}: {
  task: TaskItem | null
  onSave: (taskId: string, content: string) => void
}) {
  const [content, setContent] = useState('')
  const [hasChanges, setHasChanges] = useState(false)
  const [isGeneratingTemplate, setIsGeneratingTemplate] = useState(false)
  const { settings } = useStore()

  // 生成智能模板
  const generateSmartTemplate = async (taskItem: TaskItem) => {
    if (!settings.apiKey) {
      // 如果没有 API Key，使用简单模板
      return `# ${taskItem.title}

## 学习目标

> ${taskItem.description}

## 核心内容

### 

## 实践记录

\`\`\`
// 在这里记录代码或操作步骤
\`\`\`

## 验收自检

- [ ] ${taskItem.deliverable.title}: ${taskItem.deliverable.description}

## 个人总结

> 
`
    }

    setIsGeneratingTemplate(true)
    try {
      const template = await aiService.generateNoteTemplate(
        taskItem.title,
        taskItem.description,
        taskItem.deliverable.title,
        taskItem.deliverable.description,
        taskItem.deliverable.type
      )
      return template
    } catch (err) {
      console.error('生成模板失败:', err)
      // 失败时返回基础模板
      return `# ${taskItem.title}

## 学习目标

> ${taskItem.description}

## 核心内容

### 

## 验收自检

- [ ] ${taskItem.deliverable.title}: ${taskItem.deliverable.description}

## 个人总结

> 
`
    } finally {
      setIsGeneratingTemplate(false)
    }
  }

  useEffect(() => {
    if (task) {
      if (task.note?.content) {
        // 已有笔记，直接使用
        setContent(task.note.content)
        setHasChanges(false)
      } else {
        // 没有笔记，生成智能模板
        setContent(getDefaultTemplate(task.title))
        generateSmartTemplate(task).then(template => {
          setContent(template)
        })
        setHasChanges(false)
      }
    }
  }, [task?.id])

  useEffect(() => {
    if (task && !isGeneratingTemplate) {
      const originalContent = task.note?.content || ''
      setHasChanges(content !== originalContent && content.trim() !== '')
    }
  }, [content, task, isGeneratingTemplate])

  const handleSave = () => {
    if (task) {
      onSave(task.id, content)
      setHasChanges(false)
    }
  }

  const handleRegenerateTemplate = async () => {
    if (task && !isGeneratingTemplate) {
      const template = await generateSmartTemplate(task)
      setContent(template)
    }
  }

  if (!task) {
    return (
      <div className="h-full flex items-center justify-center bg-gray-50">
        <div className="text-center text-gray-400">
          <PenLine className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p>选择一个任务开始记录笔记</p>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col bg-white">
      {/* 笔记头部 */}
      <div className="flex items-center justify-between p-3 border-b border-gray-100">
        <div className="flex items-center gap-2 min-w-0">
          <PenLine className="w-4 h-4 text-primary-500 flex-shrink-0" />
          <span className="font-medium text-gray-800 truncate">{task.title}</span>
          {isGeneratingTemplate && (
            <span className="px-2 py-0.5 bg-blue-100 text-blue-600 text-xs rounded-full flex-shrink-0 flex items-center gap-1">
              <Loader2 className="w-3 h-3 animate-spin" />
              生成模板中
            </span>
          )}
          {hasChanges && !isGeneratingTemplate && (
            <span className="px-2 py-0.5 bg-yellow-100 text-yellow-600 text-xs rounded-full flex-shrink-0">
              未保存
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleRegenerateTemplate}
            disabled={isGeneratingTemplate}
            title="重新生成模板"
            className="flex items-center gap-1 px-2 py-1.5 text-gray-500 hover:text-primary-500 hover:bg-gray-100 text-sm rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isGeneratingTemplate ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Sparkles className="w-4 h-4" />
            )}
          </button>
          <button
            onClick={handleSave}
            disabled={!hasChanges || isGeneratingTemplate}
            className="flex items-center gap-1 px-3 py-1.5 bg-gradient-to-r from-primary-500 to-purple-600 text-white text-sm rounded-lg hover:shadow-md transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Save className="w-4 h-4" />
            保存
          </button>
        </div>
      </div>

      {/* 编辑器 */}
      <div className="flex-1 overflow-hidden" data-color-mode="light">
        <MDEditor
          value={content}
          onChange={(val) => setContent(val || '')}
          height="100%"
          preview="live"
          hideToolbar={false}
          enableScroll={true}
          visibleDragbar={false}
          style={{ height: '100%' }}
        />
      </div>
    </div>
  )
}

// 简化的任务卡片组件（用于左侧面板）
function TaskCard({
  task,
  isSelected,
  isExpanded,
  onSelect,
  onToggleExpand,
  onToggleComplete,
  onToggleDeliverable,
  onRegenerate,
  onEdit,
  isRegenerating,
  disabled
}: {
  task: TaskItem
  isSelected: boolean
  isExpanded: boolean
  onSelect: () => void
  onToggleExpand: () => void
  onToggleComplete: () => void
  onToggleDeliverable: () => void
  onRegenerate: () => void
  onEdit: () => void
  isRegenerating: boolean
  disabled: boolean
}) {
  const difficulty = difficultyConfig[task.difficulty] || difficultyConfig.basic
  const hasNote = task.note && task.note.content.trim().length > 0

  return (
    <div className={`rounded-xl border-2 overflow-hidden transition-all ${
      isSelected
        ? 'border-primary-500 bg-primary-50/50'
        : task.completed 
          ? 'border-green-200 bg-green-50/50' 
          : 'border-gray-100 bg-white'
    }`}>
      {/* 任务头部 */}
      <div 
        className="p-3 cursor-pointer hover:bg-gray-50/50 transition-colors"
        onClick={onSelect}
      >
        <div className="flex items-start gap-2">
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
              <CheckCircle className="w-5 h-5 text-green-500" />
            ) : (
              <Circle className="w-5 h-5 text-gray-300 hover:text-gray-400" />
            )}
          </button>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap mb-1">
              <span className="w-5 h-5 bg-gradient-to-br from-primary-500 to-purple-600 rounded-full flex items-center justify-center text-white text-xs font-bold">
                {task.order}
              </span>
              <span className={`px-1.5 py-0.5 text-xs rounded-full ${difficulty.color}`}>
                {difficulty.label}
              </span>
              {hasNote && (
                <span className="px-1.5 py-0.5 text-xs rounded-full bg-blue-100 text-blue-600">
                  <PenLine className="w-3 h-3" />
                </span>
              )}
            </div>
            
            <h4 className={`text-sm font-medium ${task.completed ? 'text-green-700 line-through' : 'text-gray-800'}`}>
              {task.title}
            </h4>
          </div>

          {/* 展开/收起 */}
          <button
            onClick={(e) => {
              e.stopPropagation()
              onToggleExpand()
            }}
            className="flex-shrink-0 p-1 hover:bg-gray-100 rounded"
          >
            {isExpanded ? (
              <ChevronUp className="w-4 h-4 text-gray-400" />
            ) : (
              <ChevronDown className="w-4 h-4 text-gray-400" />
            )}
          </button>
        </div>
      </div>

      {/* 展开内容 */}
      {isExpanded && (
        <div className="border-t border-gray-100 bg-gray-50/50 p-3 space-y-3">
          <p className="text-xs text-gray-500">{task.description}</p>
          
          {/* 参考资料 */}
          {task.resources.length > 0 && (
            <div>
              <h5 className="text-xs font-medium text-gray-600 mb-1 flex items-center gap-1">
                <BookOpen className="w-3 h-3" />
                参考资料
              </h5>
              <div className="space-y-1">
                {task.resources.map((resource) => (
                  <div key={resource.id} className="flex items-center gap-2 text-xs">
                    <span className={`px-1 py-0.5 rounded ${
                      resource.type === 'video' ? 'bg-red-100 text-red-600' :
                      resource.type === 'article' ? 'bg-blue-100 text-blue-600' :
                      'bg-gray-100 text-gray-600'
                    }`}>
                      {resource.type === 'video' ? '视频' :
                       resource.type === 'article' ? '文章' :
                       resource.type === 'documentation' ? '文档' : '资料'}
                    </span>
                    <span className="text-gray-700 truncate">{resource.title}</span>
                    {resource.url && (
                      <a
                        href={resource.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="text-gray-400 hover:text-primary-500"
                      >
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 验收成果 */}
          <div 
            onClick={(e) => {
              e.stopPropagation()
              if (!disabled) onToggleDeliverable()
            }}
            className={`p-2 rounded-lg border cursor-pointer transition-all text-xs ${
              task.deliverable.completed
                ? 'border-green-200 bg-green-50'
                : 'border-gray-200 bg-white hover:border-gray-300'
            } ${disabled ? 'cursor-default' : ''}`}
          >
            <div className="flex items-center gap-2">
              {task.deliverable.completed ? (
                <CheckCircle className="w-4 h-4 text-green-500" />
              ) : (
                <Circle className="w-4 h-4 text-gray-300" />
              )}
              <span className={task.deliverable.completed ? 'text-green-700' : 'text-gray-700'}>
                {task.deliverable.title}
              </span>
            </div>
          </div>

          {/* 操作按钮 */}
          {!disabled && (
            <div className="flex items-center gap-3">
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  onEdit()
                }}
                className="text-xs text-gray-400 hover:text-primary-500 flex items-center gap-1"
              >
                <Edit2 className="w-3 h-3" />
                编辑
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  onRegenerate()
                }}
                disabled={isRegenerating}
                className="text-xs text-gray-400 hover:text-primary-500 flex items-center gap-1"
              >
                {isRegenerating ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : (
                  <RefreshCw className="w-3 h-3" />
                )}
                重新生成
              </button>
            </div>
          )}
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
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [editingTask, setEditingTask] = useState<TaskItem | null>(null)
  const [editingTitle, setEditingTitle] = useState(false)
  const [tempTitle, setTempTitle] = useState('')

  const currentPlan = plans.find(p => p.id === currentPlanId)
  const rawCurrentTask = dailyTasks.find(
    t => t.planId === currentPlanId && t.day === selectedDay
  )
  
  const currentTask = rawCurrentTask ? {
    ...rawCurrentTask,
    tasks: rawCurrentTask.tasks.map((t, i) => normalizeTask(t, i))
  } : undefined

  const previousDayTask = dailyTasks.find(
    t => t.planId === currentPlanId && t.day === selectedDay - 1
  )

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

  const selectedTask = currentTask?.tasks.find(t => t.id === selectedTaskId) || null

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
    </div>
  )
}
