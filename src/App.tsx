import { useEffect, useState } from 'react'
import { useStore } from './store/useStore'
import { aiService } from './services/aiService'
import TitleBar from './components/TitleBar'
import Sidebar from './components/Sidebar'
import ErrorBoundary from './components/ErrorBoundary'
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
  }, [settings.apiKey, settings.apiEndpoint, settings.model])

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
    <ErrorBoundary>
      <div className="flex flex-col h-screen bg-gray-100">
        <TitleBar />
        <div className="flex flex-1 overflow-hidden">
          <Sidebar 
            collapsed={sidebarCollapsed} 
            onToggle={() => setSidebarCollapsed(!sidebarCollapsed)} 
          />
          <main className="flex-1 overflow-auto">
            <ErrorBoundary>
              {renderContent()}
            </ErrorBoundary>
          </main>
        </div>
      </div>
    </ErrorBoundary>
  )
}

export default App
