import type { TaskItem } from '../types'
import { 
  CheckCircle, 
  Circle, 
  ChevronDown, 
  ChevronUp, 
  BookOpen, 
  ExternalLink, 
  RefreshCw, 
  Edit2, 
  Loader2,
  PenLine
} from 'lucide-react'

// 难度标签配置
export const difficultyConfig = {
  basic: { label: '基础', color: 'bg-green-100 text-green-600' },
  intermediate: { label: '进阶', color: 'bg-yellow-100 text-yellow-600' },
  advanced: { label: '挑战', color: 'bg-red-100 text-red-600' }
}

interface TaskCardProps {
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
}

export default function TaskCard({
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
}: TaskCardProps) {
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
