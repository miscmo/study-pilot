import { useRef, useCallback } from 'react'

interface CacheEntry {
  status: 'pending' | 'generating' | 'done' | 'error'
  content?: string
  promise?: Promise<string>
}

/**
 * 模板缓存 Hook
 * 用于管理 AI 生成模板的缓存，避免重复请求
 */
export function useTemplateCache() {
  const cacheRef = useRef<Map<string, CacheEntry>>(new Map())

  const get = useCallback((key: string): CacheEntry | undefined => {
    return cacheRef.current.get(key)
  }, [])

  const set = useCallback((key: string, entry: CacheEntry): void => {
    cacheRef.current.set(key, entry)
  }, [])

  const remove = useCallback((key: string): void => {
    cacheRef.current.delete(key)
  }, [])

  const has = useCallback((key: string): boolean => {
    return cacheRef.current.has(key)
  }, [])

  const clear = useCallback((): void => {
    cacheRef.current.clear()
  }, [])

  const getOrGenerate = useCallback(async (
    key: string,
    generator: () => Promise<string>
  ): Promise<string> => {
    const cached = cacheRef.current.get(key)
    
    // 已有完成的缓存
    if (cached?.status === 'done' && cached.content) {
      return cached.content
    }
    
    // 正在生成中，等待完成
    if (cached?.status === 'generating' && cached.promise) {
      return cached.promise
    }
    
    // 创建新的生成任务
    const generatePromise = (async () => {
      try {
        const content = await generator()
        cacheRef.current.set(key, { status: 'done', content })
        return content
      } catch (error) {
        cacheRef.current.set(key, { status: 'error' })
        throw error
      }
    })()
    
    cacheRef.current.set(key, { status: 'generating', promise: generatePromise })
    
    return generatePromise
  }, [])

  return {
    get,
    set,
    remove,
    has,
    clear,
    getOrGenerate
  }
}
