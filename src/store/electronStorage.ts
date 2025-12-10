// Electron 存储适配器
// 在 Electron 环境下使用 IPC 进行文件存储，否则回退到 localStorage

const isElectron = typeof window !== 'undefined' && 
  window.process?.type === 'renderer'

// 同步缓存，用于 getItem 的同步返回
let memoryCache: Record<string, string> = {}

// 旧的存储 key，用于数据迁移
const OLD_STORAGE_KEY = 'ai-study-supervisor-storage'

// 初始化时从 Electron 加载数据
async function initFromElectron(key: string): Promise<void> {
  if (!isElectron) return
  
  try {
    // @ts-expect-error - electron ipcRenderer
    const { ipcRenderer } = window.require('electron')
    const data = await ipcRenderer.invoke('load-data', { key })
    if (data) {
      memoryCache[key] = JSON.stringify(data)
    }
  } catch (err) {
    console.error('Failed to load data from Electron:', err)
  }
}

// 保存到 Electron
async function saveToElectron(key: string, value: string): Promise<void> {
  if (!isElectron) return
  
  try {
    // @ts-expect-error - electron ipcRenderer
    const { ipcRenderer } = window.require('electron')
    await ipcRenderer.invoke('save-data', { key, data: JSON.parse(value) })
  } catch (err) {
    console.error('Failed to save data to Electron:', err)
  }
}

export const electronStorage = {
  getItem: (name: string): string | null => {
    // 优先从内存缓存读取
    if (memoryCache[name]) {
      return memoryCache[name]
    }
    
    // 回退到 localStorage
    try {
      return localStorage.getItem(name)
    } catch {
      return null
    }
  },
  
  setItem: (name: string, value: string): void => {
    // 更新内存缓存
    memoryCache[name] = value
    
    // 同时保存到 localStorage（作为备份）
    try {
      localStorage.setItem(name, value)
    } catch {
      // localStorage 可能不可用
    }
    
    // 异步保存到 Electron 文件系统
    saveToElectron(name, value)
  },
  
  removeItem: (name: string): void => {
    delete memoryCache[name]
    try {
      localStorage.removeItem(name)
    } catch {
      // ignore
    }
  }
}

// 初始化函数，在应用启动时调用
export async function initElectronStorage(key: string): Promise<void> {
  // 先尝试从新 key 的 localStorage 加载
  try {
    const localData = localStorage.getItem(key)
    if (localData) {
      memoryCache[key] = localData
    }
  } catch {
    // ignore
  }
  
  // 如果新 key 没有数据，尝试从旧 key 迁移
  if (!memoryCache[key]) {
    try {
      const oldData = localStorage.getItem(OLD_STORAGE_KEY)
      if (oldData) {
        memoryCache[key] = oldData
        // 保存到新 key
        localStorage.setItem(key, oldData)
        // 清除旧 key
        localStorage.removeItem(OLD_STORAGE_KEY)
        console.log('Migrated data from old storage key')
      }
    } catch {
      // ignore
    }
  }
  
  // 然后从 Electron 文件系统加载（优先级更高）
  await initFromElectron(key)
  
  // 如果 Electron 有数据，同步到 localStorage
  if (memoryCache[key]) {
    try {
      localStorage.setItem(key, memoryCache[key])
    } catch {
      // ignore
    }
  }
}
