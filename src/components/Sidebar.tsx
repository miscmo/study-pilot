import { useStore } from '../store/useStore'
import { 
  Home, 
  BookOpen, 
  Calendar, 
  CheckSquare, 
  Settings,
  GraduationCap
} from 'lucide-react'

const menuItems = [
  { id: 'home', label: '首页', icon: Home },
  { id: 'plan', label: '创建计划', icon: BookOpen },
  { id: 'daily', label: '今日学习', icon: Calendar },
  { id: 'review', label: '提交评审', icon: CheckSquare },
  { id: 'settings', label: '设置', icon: Settings },
] as const

export default function Sidebar() {
  const { currentView, setCurrentView, plans, currentPlanId } = useStore()
  const currentPlan = plans.find(p => p.id === currentPlanId)

  return (
    <aside className="w-64 bg-white shadow-lg flex flex-col">
      {/* Logo */}
      <div className="p-6 border-b border-gray-100">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-primary-500 to-purple-600 rounded-xl flex items-center justify-center">
            <GraduationCap className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="font-bold text-gray-800">StudyPilot</h1>
            <p className="text-xs text-gray-500">AI学习领航员</p>
          </div>
        </div>
      </div>

      {/* 当前计划 */}
      {currentPlan && (
        <div className="p-4 mx-4 mt-4 bg-gradient-to-r from-primary-50 to-purple-50 rounded-xl">
          <p className="text-xs text-gray-500 mb-1">当前学习计划</p>
          <p className="font-medium text-gray-800 truncate">{currentPlan.topic}</p>
          <div className="flex items-center gap-2 mt-2">
            <div className="flex-1 h-1.5 bg-white rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-primary-500 to-purple-500 rounded-full transition-all"
                style={{ 
                  width: `${Math.min(100, (currentPlan.outline.filter((_, i) => {
                    const task = useStore.getState().dailyTasks.find(
                      t => t.planId === currentPlan.id && t.day === i + 1 && t.status === 'reviewed'
                    )
                    return task !== undefined
                  }).length / currentPlan.totalDays) * 100)}%` 
                }}
              />
            </div>
            <span className="text-xs text-gray-500">
              {currentPlan.outline.filter((_, i) => {
                const task = useStore.getState().dailyTasks.find(
                  t => t.planId === currentPlan.id && t.day === i + 1 && t.status === 'reviewed'
                )
                return task !== undefined
              }).length}/{currentPlan.totalDays}天
            </span>
          </div>
        </div>
      )}

      {/* 导航菜单 */}
      <nav className="flex-1 p-4">
        <ul className="space-y-1">
          {menuItems.map((item) => {
            const Icon = item.icon
            const isActive = currentView === item.id
            return (
              <li key={item.id}>
                <button
                  onClick={() => setCurrentView(item.id)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                    isActive 
                      ? 'bg-gradient-to-r from-primary-500 to-purple-600 text-white shadow-md' 
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  <span className="font-medium">{item.label}</span>
                </button>
              </li>
            )
          })}
        </ul>
      </nav>

      {/* 底部信息 */}
      <div className="p-4 border-t border-gray-100">
        <p className="text-xs text-gray-400 text-center">
          Powered by AI
        </p>
      </div>
    </aside>
  )
}
