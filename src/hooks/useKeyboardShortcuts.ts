import { useEffect, useCallback } from 'react'

type ShortcutHandler = () => void

interface ShortcutConfig {
  key: string
  ctrl?: boolean
  meta?: boolean
  shift?: boolean
  alt?: boolean
  handler: ShortcutHandler
  description?: string
}

interface UseKeyboardShortcutsOptions {
  enabled?: boolean
}

export function useKeyboardShortcuts(
  shortcuts: ShortcutConfig[],
  options: UseKeyboardShortcutsOptions = {}
) {
  const { enabled = true } = options

  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (!enabled) return

    // 忽略在输入框中的快捷键（除了特定的保存快捷键）
    const target = event.target as HTMLElement
    const isInputElement = target.tagName === 'INPUT' || 
                           target.tagName === 'TEXTAREA' || 
                           target.isContentEditable

    for (const shortcut of shortcuts) {
      const ctrlOrMeta = shortcut.ctrl || shortcut.meta
      const isCtrlOrMetaPressed = event.ctrlKey || event.metaKey
      
      const keyMatch = event.key.toLowerCase() === shortcut.key.toLowerCase()
      const ctrlMatch = ctrlOrMeta ? isCtrlOrMetaPressed : !isCtrlOrMetaPressed
      const shiftMatch = shortcut.shift ? event.shiftKey : !event.shiftKey
      const altMatch = shortcut.alt ? event.altKey : !event.altKey

      if (keyMatch && ctrlMatch && shiftMatch && altMatch) {
        // 对于保存快捷键，即使在输入框中也要响应
        if (shortcut.key.toLowerCase() === 's' && isCtrlOrMetaPressed) {
          event.preventDefault()
          shortcut.handler()
          return
        }

        // 其他快捷键在输入框中不响应
        if (isInputElement) {
          continue
        }

        event.preventDefault()
        shortcut.handler()
        return
      }
    }
  }, [shortcuts, enabled])

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])
}

// 预定义的常用快捷键
export const SHORTCUTS = {
  SAVE: { key: 's', ctrl: true },
  NEW: { key: 'n', ctrl: true },
  SEARCH: { key: 'k', ctrl: true },
  ESCAPE: { key: 'Escape' },
  ENTER: { key: 'Enter' },
} as const
