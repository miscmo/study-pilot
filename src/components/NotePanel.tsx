import { useState, useEffect, useRef, useCallback } from 'react'
import { useStore } from '../store/useStore'
import { aiService } from '../services/aiService'
import { useAutoSave } from '../hooks/useAutoSave'
import { useTemplateCache } from '../hooks/useTemplateCache'
import { useKeyboardShortcuts, SHORTCUTS } from '../hooks/useKeyboardShortcuts'
import type { TaskItem } from '../types'
import MDEditor from '@uiw/react-md-editor'
import { 
  Loader2, 
  Sparkles, 
  Save, 
  PenLine 
} from 'lucide-react'

interface NotePanelProps {
  task: TaskItem | null
  onSave: (taskId: string, content: string) => void
  onOpenManualModal?: (taskItem: TaskItem) => void
}

// 默认笔记模板
function getDefaultTemplate(taskTitle: string): string {
  return `# ${taskTitle}

## 学习要点

> 正在生成智能模板...

`
}

// 基础模板（无 API 时使用）
function getBasicTemplate(task: TaskItem): string {
  return `# ${task.title}

## 学习目标

> ${task.description}

## 核心内容

### 

## 实践记录

\`\`\`
// 在这里记录代码或操作步骤
\`\`\`

## 验收自检

- [ ] ${task.deliverable.title}: ${task.deliverable.description}

## 个人总结

> 
`
}

export default function NotePanel({ task, onSave, onOpenManualModal }: NotePanelProps) {
  const { settings, updateSettings } = useStore()
  const templateCache = useTemplateCache()
  
  const [isGeneratingTemplate, setIsGeneratingTemplate] = useState(false)
  const [needsManualGeneration, setNeedsManualGeneration] = useState(false)
  
  const editorContainerRef = useRef<HTMLDivElement | null>(null)
  const prevTaskIdRef = useRef<string | null>(null)
  const generatingForTaskIdRef = useRef<string | null>(null)
  
  const previewMode = settings.editorPreviewMode || 'live'

  // 获取初始内容
  const getInitialContent = useCallback(() => {
    if (!task) return ''
    if (task.note?.content && task.note.content.trim().length > 0) {
      return task.note.content
    }
    return getDefaultTemplate(task.title)
  }, [task])

  // 使用自动保存 Hook
  const {
    content,
    setContent,
    hasChanges,
    isSaving,
    lastSavedAt,
    saveNow
  } = useAutoSave(getInitialContent(), {
    delay: 2000,
    onSave: (noteContent) => {
      if (task) {
        onSave(task.id, noteContent)
      }
    },
    enabled: !isGeneratingTemplate && !!task
  })

  // 快捷键支持
  useKeyboardShortcuts([
    {
      ...SHORTCUTS.SAVE,
      handler: saveNow,
      description: '保存笔记'
    }
  ])

  // 生成智能模板
  const generateSmartTemplate = useCallback(async (taskItem: TaskItem): Promise<string> => {
    if (!settings.apiKey) {
      const template = getBasicTemplate(taskItem)
      onSave(taskItem.id, template)
      return template
    }

    try {
      const template = await templateCache.getOrGenerate(
        taskItem.id,
        async () => {
          const result = await aiService.generateNoteTemplate(
            taskItem.title,
            taskItem.description,
            taskItem.deliverable.title,
            taskItem.deliverable.description,
            taskItem.deliverable.type
          )
          return result
        }
      )
      onSave(taskItem.id, template)
      return template
    } catch (err) {
      console.error('生成模板失败:', err)
      const fallbackTemplate = getBasicTemplate(taskItem)
      onSave(taskItem.id, fallbackTemplate)
      return fallbackTemplate
    }
  }, [settings.apiKey, templateCache, onSave])

  // 加载任务内容
  const loadTaskContent = useCallback(async (taskItem: TaskItem) => {
    generatingForTaskIdRef.current = taskItem.id
    setNeedsManualGeneration(false)

    // 已有笔记内容
    if (taskItem.note?.content && taskItem.note.content.trim().length > 0) {
      setContent(taskItem.note.content)
      setIsGeneratingTemplate(false)
      return
    }

    // 检查缓存
    const cached = templateCache.get(taskItem.id)
    if (cached?.status === 'done' && cached.content) {
      setContent(cached.content)
      setIsGeneratingTemplate(false)
      return
    }

    // 手动模式
    if (settings.aiMode === 'manual') {
      setContent(getDefaultTemplate(taskItem.title))
      setIsGeneratingTemplate(false)
      setNeedsManualGeneration(true)
      return
    }

    // API 模式：生成模板
    setContent(getDefaultTemplate(taskItem.title))
    setIsGeneratingTemplate(true)
    
    const template = await generateSmartTemplate(taskItem)
    
    if (generatingForTaskIdRef.current === taskItem.id) {
      setContent(template)
      setIsGeneratingTemplate(false)
    }
  }, [settings.aiMode, templateCache, generateSmartTemplate, setContent])

  // 切换任务时加载内容
  useEffect(() => {
    if (!task) {
      prevTaskIdRef.current = null
      return
    }
    
    if (prevTaskIdRef.current === task.id) {
      return
    }
    
    prevTaskIdRef.current = task.id
    loadTaskContent(task)
  }, [task?.id, loadTaskContent])

  // 监听编辑器预览模式变化
  useEffect(() => {
    const container = editorContainerRef.current
    if (!container) return

    const observer = new MutationObserver(() => {
      const editorEl = container.querySelector('.w-md-editor')
      if (!editorEl) return
      
      let detectedMode: 'edit' | 'live' | 'preview' = 'live'
      if (editorEl.classList.contains('w-md-editor-show-edit')) {
        detectedMode = 'edit'
      } else if (editorEl.classList.contains('w-md-editor-show-preview')) {
        detectedMode = 'preview'
      } else if (editorEl.classList.contains('w-md-editor-show-live')) {
        detectedMode = 'live'
      }
      
      if (detectedMode !== previewMode) {
        updateSettings({ editorPreviewMode: detectedMode })
      }
    })

    observer.observe(container, { 
      subtree: true, 
      attributes: true, 
      attributeFilter: ['class'] 
    })

    return () => observer.disconnect()
  }, [previewMode, updateSettings])

  // 重新生成模板
  const handleRegenerateTemplate = async () => {
    if (!task || isGeneratingTemplate) return
    
    if (settings.aiMode === 'manual' && onOpenManualModal) {
      onOpenManualModal(task)
      return
    }
    
    templateCache.remove(task.id)
    generatingForTaskIdRef.current = task.id
    setIsGeneratingTemplate(true)
    
    const template = await generateSmartTemplate(task)
    
    if (generatingForTaskIdRef.current === task.id) {
      setContent(template)
      setIsGeneratingTemplate(false)
    }
  }

  // 手动模式生成
  const handleManualGenerate = () => {
    if (task && onOpenManualModal) {
      onOpenManualModal(task)
    }
  }

  // 暴露应用模板方法供外部调用
  useEffect(() => {
    if (task) {
      const applyTemplate = (template: string) => {
        setContent(template)
        setNeedsManualGeneration(false)
        templateCache.set(task.id, { status: 'done', content: template })
        onSave(task.id, template)
      }
      
      ;(window as unknown as Record<string, unknown>)[`applyNoteTemplate_${task.id}`] = applyTemplate
      
      return () => {
        delete (window as unknown as Record<string, unknown>)[`applyNoteTemplate_${task.id}`]
      }
    }
  }, [task?.id, setContent, templateCache, onSave])

  // 计算行号
  const lineCount = content.split('\n').length

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
          {isSaving && !isGeneratingTemplate && (
            <span className="px-2 py-0.5 bg-blue-100 text-blue-600 text-xs rounded-full flex-shrink-0 flex items-center gap-1">
              <Loader2 className="w-3 h-3 animate-spin" />
              保存中
            </span>
          )}
          {hasChanges && !isGeneratingTemplate && !isSaving && (
            <span className="px-2 py-0.5 bg-yellow-100 text-yellow-600 text-xs rounded-full flex-shrink-0">
              自动保存中...
            </span>
          )}
          {!hasChanges && !isGeneratingTemplate && !isSaving && lastSavedAt && (
            <span className="text-xs text-gray-400 flex-shrink-0">
              已保存
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleRegenerateTemplate}
            disabled={isGeneratingTemplate}
            title="重新生成模板 (Ctrl+R)"
            className="flex items-center gap-1 px-2 py-1.5 text-gray-500 hover:text-primary-500 hover:bg-gray-100 text-sm rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isGeneratingTemplate ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Sparkles className="w-4 h-4" />
            )}
          </button>
          <button
            onClick={saveNow}
            disabled={!hasChanges || isGeneratingTemplate || isSaving}
            title="保存 (Ctrl+S)"
            className="flex items-center gap-1 px-3 py-1.5 bg-gradient-to-r from-primary-500 to-purple-600 text-white text-sm rounded-lg hover:shadow-md transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Save className="w-4 h-4" />
            保存
          </button>
        </div>
      </div>

      {/* 手动模式提示 */}
      {needsManualGeneration && settings.aiMode === 'manual' && (
        <div className="p-3 bg-amber-50 border-b border-amber-100 flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm text-amber-700">
            <Sparkles className="w-4 h-4" />
            <span>手动模式：点击右侧按钮生成智能模板</span>
          </div>
          <button
            onClick={handleManualGenerate}
            className="px-3 py-1.5 bg-amber-500 text-white text-sm rounded-lg hover:bg-amber-600 transition-colors flex items-center gap-1"
          >
            <Sparkles className="w-4 h-4" />
            生成模板
          </button>
        </div>
      )}

      {/* 编辑器 */}
      <div ref={editorContainerRef} className="flex-1 overflow-hidden editor-container relative" data-color-mode="light">
        <MDEditor
          value={content}
          onChange={(val) => setContent(val || '')}
          height="100%"
          preview={previewMode}
          hideToolbar={false}
          enableScroll={true}
          visibleDragbar={false}
          textareaProps={{
            placeholder: '开始记录你的学习笔记...\n\n支持 Markdown 语法：\n# 标题\n**粗体** *斜体*\n- 列表项\n> 引用\n`代码`',
            spellCheck: false,
          }}
          style={{ height: '100%' }}
        />
        
        {/* 底部状态栏 */}
        <div className="absolute bottom-0 left-0 right-0 h-6 bg-gray-100 border-t border-gray-200 flex items-center px-3 text-xs text-gray-500">
          <span>共 {lineCount} 行</span>
          <span className="mx-2">·</span>
          <span>{content.length} 字符</span>
          <span className="mx-2">·</span>
          <span className="text-gray-400">Ctrl+S 保存</span>
        </div>
      </div>
    </div>
  )
}
