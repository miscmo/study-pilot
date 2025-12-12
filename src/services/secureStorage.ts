/**
 * 安全存储服务
 * 使用 Electron 的 safeStorage API 加密敏感数据
 */

// 检查是否在 Electron 环境中
const isElectron = typeof window !== 'undefined' && 
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  typeof (window as any).require === 'function'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const ipcRenderer = isElectron ? (window as any).require('electron').ipcRenderer : null

interface EncryptResult {
  success: boolean
  encrypted?: string
  isEncrypted?: boolean
  error?: string
}

interface DecryptResult {
  success: boolean
  apiKey?: string
  error?: string
}

/**
 * 加密 API Key
 */
export async function encryptApiKey(apiKey: string): Promise<EncryptResult> {
  if (!ipcRenderer) {
    // 非 Electron 环境，直接返回原值
    return { success: true, encrypted: apiKey, isEncrypted: false }
  }

  try {
    const result = await ipcRenderer.invoke('encrypt-api-key', { apiKey })
    return result
  } catch (error) {
    console.error('Failed to encrypt API key:', error)
    return { success: false, error: String(error) }
  }
}

/**
 * 解密 API Key
 */
export async function decryptApiKey(
  encrypted: string, 
  isEncrypted: boolean = true
): Promise<DecryptResult> {
  if (!ipcRenderer) {
    // 非 Electron 环境，直接返回原值
    return { success: true, apiKey: encrypted }
  }

  try {
    const result = await ipcRenderer.invoke('decrypt-api-key', { encrypted, isEncrypted })
    return result
  } catch (error) {
    console.error('Failed to decrypt API key:', error)
    return { success: false, error: String(error) }
  }
}

/**
 * 检查加密是否可用
 */
export async function isEncryptionAvailable(): Promise<boolean> {
  if (!ipcRenderer) {
    return false
  }

  try {
    return await ipcRenderer.invoke('is-encryption-available')
  } catch {
    return false
  }
}

/**
 * 安全存储管理器
 * 提供更高级的 API Key 管理功能
 */
export class SecureStorageManager {
  private cache: Map<string, string> = new Map()

  /**
   * 存储 API Key（加密后存储）
   */
  async store(id: string, apiKey: string): Promise<{ encrypted: string; isEncrypted: boolean }> {
    const result = await encryptApiKey(apiKey)
    
    if (result.success && result.encrypted) {
      // 缓存解密后的值以避免频繁解密
      this.cache.set(id, apiKey)
      return { 
        encrypted: result.encrypted, 
        isEncrypted: result.isEncrypted ?? false 
      }
    }
    
    // 加密失败，返回原值
    return { encrypted: apiKey, isEncrypted: false }
  }

  /**
   * 获取 API Key（自动解密）
   */
  async retrieve(id: string, encrypted: string, isEncrypted: boolean): Promise<string> {
    // 先检查缓存
    const cached = this.cache.get(id)
    if (cached) {
      return cached
    }

    const result = await decryptApiKey(encrypted, isEncrypted)
    
    if (result.success && result.apiKey) {
      // 缓存解密结果
      this.cache.set(id, result.apiKey)
      return result.apiKey
    }
    
    // 解密失败，返回加密值（可能是未加密的原值）
    return encrypted
  }

  /**
   * 清除缓存
   */
  clearCache(id?: string) {
    if (id) {
      this.cache.delete(id)
    } else {
      this.cache.clear()
    }
  }
}

// 导出单例
export const secureStorage = new SecureStorageManager()
