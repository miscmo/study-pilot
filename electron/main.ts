import { app, BrowserWindow, ipcMain } from 'electron'
import * as path from 'path'
import * as fs from 'fs'

let mainWindow: BrowserWindow | null = null

const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1000,
    minHeight: 700,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
    },
    titleBarStyle: 'hiddenInset',
    show: false,
  })

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

// 数据存储路径
const getDataPath = () => {
  const userDataPath = app.getPath('userData')
  const dataPath = path.join(userDataPath, 'study-data')
  if (!fs.existsSync(dataPath)) {
    fs.mkdirSync(dataPath, { recursive: true })
  }
  return dataPath
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
    const data = fs.readFileSync(filePath, 'utf-8')
    return JSON.parse(data)
  }
  return null
})

app.whenReady().then(createWindow)

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
