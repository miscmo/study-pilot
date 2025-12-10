import { useState, useEffect } from 'react'
import MDEditor from '@uiw/react-md-editor'
import { Save, X, FileText, Clock } from 'lucide-react'
import { format } from 'date-fns'
import type { TaskNote } from '../types'

interface NoteEditorProps {
  note?: TaskNote
  taskTitle: string
  onSave: (content: string) => void
  onClose: () => void
}

export default function NoteEditor({ note, taskTitle, onSave, onClose }: NoteEditorProps) {
  const [content, setContent] = useState(note?.content || getDefaultTemplate(taskTitle))
  const [hasChanges, setHasChanges] = useState(false)

  useEffect(() => {
    setHasChanges(content !== (note?.content || getDefaultTemplate(taskTitle)))
  }, [content, note?.content, taskTitle])

  const handleSave = () => {
    onSave(content)
    setHasChanges(false)
  }

  const handleClose = () => {
    if (hasChanges) {
      if (confirm('有未保存的更改，确定要关闭吗？')) {
        onClose()
      }
    } else {
      onClose()
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 animate-fadeIn">
      <div className="bg-white rounded-2xl w-full max-w-4xl mx-4 h-[85vh] flex flex-col shadow-2xl">
        {/* 头部 */}
        <div className="flex items-center justify-between p-4 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-primary-500 to-purple-600 rounded-xl flex items-center justify-center">
              <FileText className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-bold text-gray-800">学习笔记</h3>
              <p className="text-sm text-gray-500">{taskTitle}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {note?.updatedAt && (
              <span className="text-xs text-gray-400 flex items-center gap-1">
                <Clock className="w-3 h-3" />
                上次保存: {format(new Date(note.updatedAt), 'MM-dd HH:mm')}
              </span>
            )}
            {hasChanges && (
              <span className="px-2 py-0.5 bg-yellow-100 text-yellow-600 text-xs rounded-full">
                未保存
              </span>
            )}
            <button
              onClick={handleSave}
              disabled={!hasChanges}
              className="flex items-center gap-1 px-4 py-2 bg-gradient-to-r from-primary-500 to-purple-600 text-white rounded-lg hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Save className="w-4 h-4" />
              保存
            </button>
            <button
              onClick={handleClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-gray-400" />
            </button>
          </div>
        </div>

        {/* 编辑器 */}
        <div className="flex-1 overflow-hidden p-4" data-color-mode="light">
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
    </div>
  )
}

// 默认笔记模板
function getDefaultTemplate(taskTitle: string): string {
  return `# ${taskTitle}

## 学习要点

- 

## 核心概念

### 

## 代码示例

\`\`\`javascript

\`\`\`

## 个人理解

> 

## 遗留问题

- [ ] 

## 参考链接

- 
`
}
