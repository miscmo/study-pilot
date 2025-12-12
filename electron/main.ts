import { app, BrowserWindow, ipcMain, nativeImage, safeStorage, shell, Menu } from 'electron'
import * as path from 'path'
import * as fs from 'fs'

let mainWindow: BrowserWindow | null = null
let authWindow: BrowserWindow | null = null

const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged

// 数据存储路径
const getDataPath = () => {
  const userDataPath = app.getPath('userData')
  const dataPath = path.join(userDataPath, 'study-data')
  if (!fs.existsSync(dataPath)) {
    fs.mkdirSync(dataPath, { recursive: true })
  }
  return dataPath
}

// 旧应用数据路径（用于迁移）
const getOldDataPath = () => {
  const userDataPath = app.getPath('userData')
  const oldAppPath = path.join(path.dirname(userDataPath), 'ai-study-supervisor', 'study-data')
  return oldAppPath
}

// 在应用启动时执行数据迁移
function migrateDataIfNeeded() {
  const newFilePath = path.join(getDataPath(), 'studypilot-storage.json')
  const oldFilePath = path.join(getOldDataPath(), 'ai-study-supervisor-storage.json')
  
  // 检查是否需要迁移
  let needsMigration = false
  
  if (!fs.existsSync(newFilePath)) {
    needsMigration = true
  } else {
    // 检查新文件是否为空数据
    try {
      const data = JSON.parse(fs.readFileSync(newFilePath, 'utf-8'))
      if (data?.state?.plans?.length === 0 && data?.state?.settings?.apiKeys?.length === 0) {
        needsMigration = true
      }
    } catch {
      needsMigration = true
    }
  }
  
  if (needsMigration && fs.existsSync(oldFilePath)) {
    try {
      const oldData = fs.readFileSync(oldFilePath, 'utf-8')
      fs.writeFileSync(newFilePath, oldData)
      console.log('✅ Data migrated from old app directory')
    } catch (err) {
      console.error('Failed to migrate data:', err)
    }
  }
}

// 获取应用图标路径
function getIconPath() {
  // 开发模式: __dirname 是 dist/main/, 图标在 build/
  // 生产模式: 图标打包在 resources 目录
  const iconPath = isDev 
    ? path.join(__dirname, '..', '..', 'build', 'icon.png')
    : path.join(process.resourcesPath, 'icon.png')
  
  console.log('Icon path:', iconPath, 'exists:', fs.existsSync(iconPath))
  return iconPath
}

function createWindow() {
  const iconPath = getIconPath()
  let icon: Electron.NativeImage | undefined
  
  if (fs.existsSync(iconPath)) {
    icon = nativeImage.createFromPath(iconPath)
    console.log('Icon loaded, isEmpty:', icon.isEmpty())
  } else {
    console.log('Icon file not found!')
  }
  
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1000,
    minHeight: 700,
    icon: icon,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
    },
    titleBarStyle: 'hiddenInset',
    frame: false, // 隐藏Windows系统默认标题栏
    show: false,
  })

  // 设置 Dock 图标 (macOS)
  if (process.platform === 'darwin' && app.dock && icon && !icon.isEmpty()) {
    app.dock.setIcon(icon)
    console.log('Dock icon set successfully')
  }

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173')
    // 不自动打开开发者工具，需要时可按 Cmd+Option+I (Mac) 或 F12 (Windows) 手动打开
  } else {
    mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'))
  }

  mainWindow.once('ready-to-show', () => {
    mainWindow?.show()
  })

  mainWindow.on('closed', () => {
    mainWindow = null
  })
}

// IPC 处理器 - 保存数据
ipcMain.handle('save-data', async (_event, { key, data }) => {
  const filePath = path.join(getDataPath(), `${key}.json`)
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2))
  return { success: true }
})

// IPC 处理器 - 读取数据
ipcMain.handle('load-data', async (_event, { key }) => {
  const filePath = path.join(getDataPath(), `${key}.json`)
  if (fs.existsSync(filePath)) {
    try {
      const data = fs.readFileSync(filePath, 'utf-8')
      return JSON.parse(data)
    } catch (err) {
      console.error('Failed to parse data:', err)
    }
  }
  return null
})

// IPC 处理器 - 安全存储 API Key（使用系统钥匙串加密）
ipcMain.handle('encrypt-api-key', async (_event, { apiKey }) => {
  try {
    if (!safeStorage.isEncryptionAvailable()) {
      // 加密不可用时返回原始值（开发环境可能不支持）
      return { success: true, encrypted: apiKey, isEncrypted: false }
    }
    const encrypted = safeStorage.encryptString(apiKey)
    return { success: true, encrypted: encrypted.toString('base64'), isEncrypted: true }
  } catch (error) {
    console.error('Encryption failed:', error)
    return { success: false, error: String(error) }
  }
})

// IPC 处理器 - 解密 API Key
ipcMain.handle('decrypt-api-key', async (_event, { encrypted, isEncrypted }) => {
  try {
    if (!isEncrypted || !safeStorage.isEncryptionAvailable()) {
      // 未加密或加密不可用时直接返回
      return { success: true, apiKey: encrypted }
    }
    const buffer = Buffer.from(encrypted, 'base64')
    const decrypted = safeStorage.decryptString(buffer)
    return { success: true, apiKey: decrypted }
  } catch (error) {
    console.error('Decryption failed:', error)
    return { success: false, error: String(error) }
  }
})

// IPC 处理器 - 检查加密是否可用
ipcMain.handle('is-encryption-available', async () => {
  return safeStorage.isEncryptionAvailable()
})

// IPC 处理器 - 窗口控制
ipcMain.on('window-minimize', () => {
  mainWindow?.minimize()
})

ipcMain.on('window-maximize', () => {
  if (mainWindow?.isMaximized()) {
    mainWindow.unmaximize()
  } else {
    mainWindow?.maximize()
  }
})

ipcMain.on('window-close', () => {
  mainWindow?.close()
})

// GitHub OAuth 相关处理
// IPC 处理器 - 打开 GitHub OAuth 授权窗口
ipcMain.handle('github-oauth-start', async (_event, { clientId }) => {
  return new Promise((resolve) => {
    const authUrl = `https://github.com/login/oauth/authorize?client_id=${clientId}&scope=repo%20user:email`
    
    authWindow = new BrowserWindow({
      width: 800,
      height: 700,
      parent: mainWindow || undefined,
      modal: true,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
      },
    })

    authWindow.loadURL(authUrl)

    // 监听 URL 变化，捕获授权回调
    authWindow.webContents.on('will-redirect', (_event, url) => {
      handleOAuthCallback(url, resolve)
    })

    authWindow.webContents.on('will-navigate', (_event, url) => {
      handleOAuthCallback(url, resolve)
    })

    authWindow.on('closed', () => {
      authWindow = null
      resolve({ success: false, error: 'Window closed' })
    })
  })
})

// 处理 OAuth 回调
function handleOAuthCallback(url: string, resolve: (value: unknown) => void) {
  // GitHub 会重定向到我们设置的回调 URL，带上 code 参数
  // 由于我们没有后端服务器，使用 GitHub 的设备流或手动输入 token
  // 这里我们检查是否包含 code 参数
  try {
    const urlObj = new URL(url)
    const code = urlObj.searchParams.get('code')
    
    if (code) {
      authWindow?.close()
      resolve({ success: true, code })
    }
  } catch {
    // URL 解析失败，忽略
  }
}

// IPC 处理器 - 用 code 换取 access token
// 注意：这需要 client_secret，通常应该在后端完成
// 对于桌面应用，我们使用 GitHub 的 Device Flow 或让用户手动输入 Personal Access Token
ipcMain.handle('github-exchange-token', async (_event, { code, clientId, clientSecret }) => {
  try {
    const response = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({
        client_id: clientId,
        client_secret: clientSecret,
        code,
      }),
    })

    const data = await response.json() as { access_token?: string; error_description?: string }
    
    if (data.access_token) {
      return { success: true, accessToken: data.access_token }
    } else {
      return { success: false, error: data.error_description || 'Failed to get token' }
    }
  } catch (error) {
    return { success: false, error: String(error) }
  }
})

// IPC 处理器 - 打开外部链接
ipcMain.handle('open-external', async (_event, { url }) => {
  await shell.openExternal(url)
  return { success: true }
})

app.whenReady().then(() => {
  // 隐藏默认的应用菜单
  Menu.setApplicationMenu(null)
  
  // 先执行数据迁移
  migrateDataIfNeeded()
  // 再创建窗口
  createWindow()
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('activate', () => {
  if (mainWindow === null) {
    createWindow()
  }
})
