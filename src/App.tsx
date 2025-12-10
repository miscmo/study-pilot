import { useEffect, useState } from 'react'
import { useStore } from './store/useStore'
import { aiService } from './services/aiService'
import Sidebar from './components/Sidebar'
import Home from './pages/Home'
import PlanCreator from './pages/PlanCreator'
import DailyStudy from './pages/DailyStudy'
import ReviewPage from './pages/ReviewPage'
import Settings from './pages/Settings'

function App() {
  const { currentView, settings } = useStore()
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)

  useEffect(() => {
    // 同步 AI 服务配置
    aiService.setConfig({
      apiKey: settings.apiKey,
      apiEndpoint: settings.apiEndpoint,
      model: settings.model
    })
  }, [settings])

  const renderContent = () => {
    switch (currentView) {
      case 'home':
        return <Home />
      case 'plan':
        return <PlanCreator />
      case 'daily':
        return <DailyStudy />
      case 'review':
        return <ReviewPage />
      case 'settings':
        return <Settings />
      default:
        return <Home />
    }
  }

  return (
    <div className="flex h-screen bg-gray-100">
      <Sidebar 
        collapsed={sidebarCollapsed} 
        onToggle={() => setSidebarCollapsed(!sidebarCollapsed)} 
      />
      <main className="flex-1 overflow-auto">
        {renderContent()}
      </main>
    </div>
  )
}

export default App
