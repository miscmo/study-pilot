import { Minus, Square, X } from 'lucide-react'

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
