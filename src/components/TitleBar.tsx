import { Minus, Square, X, RefreshCw, CheckCircle, AlertCircle } from 'lucide-react'
import { useState, useEffect } from 'react'
import { syncService, SyncStatus } from '../services/syncService'

// 检测是否在 Electron 环境
const isElectron = typeof window !== 'undefined' && window.process?.type === 'renderer'

// 获取 ipcRenderer
const getIpcRenderer = () => {
  if (isElectron) {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require('electron').ipcRenderer
  }
  return null
}

interface TitleBarProps {
  title?: string
}

export default function TitleBar({ title = 'StudyPilot' }: TitleBarProps) {
  const ipcRenderer = getIpcRenderer()
  const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('idle')
  const [syncError, setSyncError] = useState<string | null>(null)

  useEffect(() => {
    // 监听同步状态变化
    const handleStatusChange = (status: SyncStatus, error: string | null) => {
      setSyncStatus(status)
      setSyncError(error)
    }

    // 添加状态监听
    syncService.addStatusListener(handleStatusChange)

    return () => {
      // 移除状态监听
      syncService.removeStatusListener(handleStatusChange)
    }
  }, [])

  const handleMinimize = () => {
    ipcRenderer?.send('window-minimize')
  }

  const handleMaximize = () => {
    ipcRenderer?.send('window-maximize')
  }

  const handleClose = () => {
    ipcRenderer?.send('window-close')
  }

  return (
    <div 
      className="h-8 bg-white border-b border-gray-200 flex items-center justify-between select-none flex-shrink-0"
      style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}
    >
      {/* macOS 左侧留空给系统按钮 */}
      <div className={`flex items-center ${isMac ? 'pl-20' : 'pl-3'}`}>
        <span className="text-sm font-medium text-gray-600">{title}</span>
        {/* 同步状态指示 */}
        {syncStatus !== 'idle' && (
          <div className="ml-3 flex items-center gap-1 text-xs">
            {syncStatus === 'syncing' && (
              <>
                <RefreshCw className="w-3.5 h-3.5 text-blue-500 animate-spin" />
                <span className="text-blue-500">同步中...</span>
              </>
            )}
            {syncStatus === 'success' && (
              <>
                <CheckCircle className="w-3.5 h-3.5 text-green-500" />
                <span className="text-green-500">同步成功</span>
              </>
            )}
            {syncStatus === 'error' && (
              <>
                <AlertCircle className="w-3.5 h-3.5 text-red-500" />
                <span className="text-red-500">同步失败</span>
              </>
            )}
          </div>
        )}
      </div>

      {/* Windows/Linux 窗口控制按钮 */}
      {!isMac && (
        <div 
          className="flex items-center h-full"
          style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
        >
          <button
            onClick={handleMinimize}
            className="h-full px-4 hover:bg-gray-100 transition-colors flex items-center justify-center"
          >
            <Minus className="w-4 h-4 text-gray-600" />
          </button>
          <button
            onClick={handleMaximize}
            className="h-full px-4 hover:bg-gray-100 transition-colors flex items-center justify-center"
          >
            <Square className="w-3.5 h-3.5 text-gray-600" />
          </button>
          <button
            onClick={handleClose}
            className="h-full px-4 hover:bg-red-500 hover:text-white transition-colors flex items-center justify-center group"
          >
            <X className="w-4 h-4 text-gray-600 group-hover:text-white" />
          </button>
        </div>
      )}
    </div>
  )
}
