import { useState, useEffect, useRef } from 'react'
import { useStore } from '../store/useStore'
import { 
  Home, 
  BookOpen, 
  Calendar, 
  CheckSquare, 
  Settings,
  ChevronLeft,
  ChevronDown,
  Zap,
  Hand
} from 'lucide-react'

const menuItems = [
  { id: 'home', label: '首页', icon: Home },
  { id: 'plan', label: '创建计划', icon: BookOpen },
  { id: 'daily', label: '今日学习', icon: Calendar },
  { id: 'review', label: '提交评审', icon: CheckSquare },
  { id: 'settings', label: '设置', icon: Settings },
] as const

interface SidebarProps {
  collapsed: boolean
  onToggle: () => void
}

export default function Sidebar({ collapsed, onToggle }: SidebarProps) {
  const { currentView, setCurrentView, settings, updateSettings, setActiveApiKey } = useStore()
  const [modeMenuOpen, setModeMenuOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  const isApiMode = settings.aiMode === 'api'
  const activeApiKey = settings.apiKeys.find(k => k.id === settings.activeKeyId)

  // 点击外部关闭下拉菜单
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setModeMenuOpen(false)
      }
    }
    if (modeMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [modeMenuOpen])

  const handleApiKeySelect = (keyId: string) => {
    setActiveApiKey(keyId)
    setModeMenuOpen(false)
  }

  return (
    <aside className={`bg-white shadow-lg flex flex-col transition-all duration-300 ${
      collapsed ? 'w-16 overflow-hidden' : 'w-64'
    }`}>
      {/* Logo */}
      <div className={`p-4 border-b border-gray-100 transition-all duration-300 flex-shrink-0 ${collapsed ? 'px-3' : 'p-6 pb-4'}`}>
        <div className="flex items-center gap-3">
          <img 
            src="/icon.png" 
            alt="StudyPilot" 
            className="w-10 h-10 rounded-xl flex-shrink-0"
          />
          <div className={`overflow-hidden transition-all duration-300 ${collapsed ? 'w-0 opacity-0' : 'w-auto opacity-100'}`}>
            <h1 className="font-bold text-gray-800 whitespace-nowrap">StudyPilot</h1>
            <p className="text-xs text-gray-500 whitespace-nowrap">AI学习领航员</p>
          </div>
        </div>

        {/* 模式切换区域 - 开关 + 密钥选择同一行 */}
        <div className={`mt-3 transition-all duration-300 ${collapsed ? 'h-0 opacity-0 overflow-hidden' : 'h-auto opacity-100'}`}>
          <div className="flex items-center gap-2">
            {/* 开关按钮 */}
            <button
              onClick={() => {
                const newMode = isApiMode ? 'manual' : 'api'
                updateSettings({ aiMode: newMode })
                // 切换到手动模式时关闭下拉菜单
                if (newMode === 'manual') {
                  setModeMenuOpen(false)
                }
              }}
              className={`relative flex items-center h-7 rounded-full p-0.5 transition-colors flex-shrink-0 ${
                isApiMode ? 'bg-amber-100' : 'bg-blue-100'
              }`}
              style={{ width: '58px' }}
            >
              {/* 滑块 */}
              <div
                className={`absolute w-6 h-6 rounded-full shadow-sm transition-all duration-300 flex items-center justify-center ${
                  isApiMode 
                    ? 'translate-x-[30px] bg-amber-500' 
                    : 'translate-x-0 bg-blue-500'
                }`}
              >
                {isApiMode ? (
                  <Zap className="w-3.5 h-3.5 text-white" />
                ) : (
                  <Hand className="w-3.5 h-3.5 text-white" />
                )}
              </div>
              {/* 文字显示当前模式 */}
              <span className={`text-[10px] font-medium whitespace-nowrap transition-all duration-300 ${
                isApiMode 
                  ? 'ml-1 text-amber-600' 
                  : 'ml-auto mr-1 text-blue-600'
              }`}>
                {isApiMode ? 'API' : '手动'}
              </span>
            </button>

            {/* 密钥选择下拉框 - 手动模式下禁用 */}
            <div className="flex-1 relative min-w-0" ref={dropdownRef}>
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  if (isApiMode) {
                    setModeMenuOpen(!modeMenuOpen)
                  }
                }}
                className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg border transition-all duration-200 ${
                  isApiMode 
                    ? 'bg-white border-gray-200 hover:border-primary-300 hover:shadow-sm cursor-pointer' 
                    : 'bg-gray-50 border-gray-100 cursor-not-allowed opacity-50'
                }`}
              >
                <span className={`text-xs font-medium truncate ${isApiMode ? 'text-gray-700' : 'text-gray-400'}`}>
                  {activeApiKey ? activeApiKey.name : '选择密钥'}
                </span>
                <ChevronDown className={`w-3.5 h-3.5 flex-shrink-0 ml-1 transition-transform duration-200 ${
                  isApiMode ? 'text-gray-400' : 'text-gray-300'
                } ${modeMenuOpen ? 'rotate-180' : ''}`} />
              </button>

              {/* API密钥下拉菜单 */}
              {modeMenuOpen && (
                <div className="absolute top-full left-0 right-0 mt-1.5 bg-white/95 backdrop-blur-sm border border-gray-100 rounded-xl shadow-xl z-50 overflow-hidden">
                  <div className="p-1.5 max-h-40 overflow-y-auto">
                    {settings.apiKeys.length > 0 ? (
                      settings.apiKeys.map((key) => (
                        <button
                          key={key.id}
                          onClick={(e) => {
                            e.stopPropagation()
                            handleApiKeySelect(key.id)
                          }}
                          className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg transition-all duration-200 ${
                            key.id === settings.activeKeyId 
                              ? 'bg-gradient-to-r from-primary-50 to-purple-50 text-primary-700' 
                              : 'hover:bg-gray-50 text-gray-600'
                          }`}
                        >
                          <span className="text-xs font-medium truncate">{key.name}</span>
                          {key.id === settings.activeKeyId && (
                            <span className="text-xs text-primary-500 ml-1">✓</span>
                          )}
                        </button>
                      ))
                    ) : (
                      <div className="px-2.5 py-2 text-xs text-gray-400 text-center">
                        暂无密钥
                      </div>
                    )}
                  </div>
                  {/* 底部添加按钮 */}
                  <div className="border-t border-gray-100 p-1.5">
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        setModeMenuOpen(false)
                        setCurrentView('settings')
                      }}
                      className="w-full px-2.5 py-1.5 text-xs font-medium text-primary-600 hover:bg-gradient-to-r hover:from-primary-50 hover:to-purple-50 rounded-lg transition-all duration-200 text-center"
                    >
                      + 管理密钥
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* 收起状态下的模式图标 */}
        {collapsed && (
          <button
            onClick={() => updateSettings({ aiMode: isApiMode ? 'manual' : 'api' })}
            title={isApiMode ? 'API模式 - 点击切换' : '手动模式 - 点击切换'}
            className="mt-3 w-10 h-10 flex items-center justify-center bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors"
          >
            {isApiMode ? (
              <Zap className="w-5 h-5 text-amber-500" />
            ) : (
              <Hand className="w-5 h-5 text-blue-500" />
            )}
          </button>
        )}
      </div>

      {/* 导航菜单 */}
      <nav className="flex-1 p-2 overflow-hidden">
        <ul className="space-y-1">
          {menuItems.map((item) => {
            const Icon = item.icon
            const isActive = currentView === item.id
            return (
              <li key={item.id}>
                <button
                  onClick={() => setCurrentView(item.id)}
                  title={collapsed ? item.label : undefined}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-[background-color,box-shadow] duration-300 ${
                    collapsed ? 'justify-center px-2' : ''
                  } ${
                    isActive 
                      ? 'bg-gradient-to-r from-primary-500 to-purple-600 text-white shadow-md' 
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  <Icon className={`w-5 h-5 flex-shrink-0 transition-colors duration-75 ${isActive ? 'text-white' : 'text-gray-600'}`} />
                  <span className={`font-medium whitespace-nowrap transition-[width,opacity] duration-300 ${
                    collapsed ? 'w-0 opacity-0' : 'w-auto opacity-100'
                  }`}>{item.label}</span>
                </button>
              </li>
            )
          })}
        </ul>
      </nav>

      {/* 收缩按钮 */}
      <div className="p-2 border-t border-gray-100">
        <button
          onClick={onToggle}
          className="w-full flex items-center justify-center gap-2 px-4 py-2 text-gray-500 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <div className={`transition-transform duration-300 ${collapsed ? 'rotate-180' : 'rotate-0'}`}>
            <ChevronLeft className="w-5 h-5" />
          </div>
          <span className={`text-sm whitespace-nowrap transition-all duration-300 ${
            collapsed ? 'w-0 opacity-0' : 'w-auto opacity-100'
          }`}>收起</span>
        </button>
      </div>
    </aside>
  )
}
