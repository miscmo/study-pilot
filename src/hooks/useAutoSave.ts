import { useEffect, useRef, useState, useCallback } from 'react'

interface UseAutoSaveOptions {
  delay?: number
  onSave: (content: string) => void
  enabled?: boolean
}

interface UseAutoSaveReturn {
  content: string
  setContent: (content: string) => void
  hasChanges: boolean
  isSaving: boolean
  lastSavedAt: Date | null
  saveNow: () => void
}

export function useAutoSave(
  initialContent: string,
  options: UseAutoSaveOptions
): UseAutoSaveReturn {
  const { delay = 2000, onSave, enabled = true } = options
  
  const [content, setContentState] = useState(initialContent)
  const [hasChanges, setHasChanges] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null)
  
  const timerRef = useRef<NodeJS.Timeout | null>(null)
  const originalContentRef = useRef(initialContent)

  // 更新原始内容引用
  useEffect(() => {
    originalContentRef.current = initialContent
    setContentState(initialContent)
    setHasChanges(false)
  }, [initialContent])

  // 执行保存
  const doSave = useCallback((contentToSave: string) => {
    if (!contentToSave.trim()) return
    
    setIsSaving(true)
    onSave(contentToSave)
    setHasChanges(false)
    setLastSavedAt(new Date())
    originalContentRef.current = contentToSave
    
    setTimeout(() => setIsSaving(false), 500)
  }, [onSave])

  // 设置内容并触发自动保存
  const setContent = useCallback((newContent: string) => {
    setContentState(newContent)
    
    if (!enabled) return
    
    const changed = newContent !== originalContentRef.current && newContent.trim() !== ''
    setHasChanges(changed)
    
    // 清除之前的定时器
    if (timerRef.current) {
      clearTimeout(timerRef.current)
    }
    
    // 有变化时启动自动保存
    if (changed) {
      timerRef.current = setTimeout(() => {
        doSave(newContent)
      }, delay)
    }
  }, [enabled, delay, doSave])

  // 立即保存
  const saveNow = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }
    if (hasChanges) {
      doSave(content)
    }
  }, [content, hasChanges, doSave])

  // 清理定时器
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current)
      }
    }
  }, [])

  return {
    content,
    setContent,
    hasChanges,
    isSaving,
    lastSavedAt,
    saveNow
  }
}
