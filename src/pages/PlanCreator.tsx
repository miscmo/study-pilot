import { useState } from 'react'
import { useStore } from '../store/useStore'
import { aiService } from '../services/aiService'
import { githubService } from '../services/githubService'
import type { StudyPlan, StudyOutlineItem } from '../types'
import ManualModeModal from '../components/ManualModeModal'
import { 
  Sparkles, 
  Loader2, 
  CheckCircle, 
  Clock,
  Target,
  ChevronDown,
  ChevronUp,
  RotateCcw,
  Wand2,
  Edit2,
  X,
  Save,
  Plus,
  Trash2,
  Github,
  HardDrive
} from 'lucide-react'
import { format } from 'date-fns'

// 每日学习时间选项
const dailyMinutesOptions = [
  { label: '30 分钟', value: 30 },
  { label: '45 分钟', value: 45 },
  { label: '60 分钟（1小时）', value: 60 },
  { label: '90 分钟（1.5小时）', value: 90 },
  { label: '120 分钟（2小时）', value: 120 },
  { label: '150 分钟（2.5小时）', value: 150 },
  { label: '180 分钟（3小时）', value: 180 },
  { label: '240 分钟（4小时）', value: 240 },
  { label: '300 分钟（5小时）', value: 300 },
  { label: '360 分钟（6小时）', value: 360 },
  { label: '480 分钟（8小时）', value: 480 },
  { label: '自定义', value: -1 },
]

// 大纲项编辑弹窗
function OutlineEditModal({
  item,
  onSave,
  onClose
}: {
  item: StudyOutlineItem
  onSave: (updated: StudyOutlineItem) => void
  onClose: () => void
}) {
  const [title, setTitle] = useState(item.title)
  const [description, setDescription] = useState(item.description)
  const [objectives, setObjectives] = useState(item.objectives.join('\n'))
  const [estimatedMinutes, setEstimatedMinutes] = useState(item.estimatedMinutes)

  const handleSave = () => {
    onSave({
      ...item,
      title,
      description,
      objectives: objectives.split('\n').filter(o => o.trim()),
      estimatedMinutes
    })
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 animate-fadeIn">
      <div className="bg-white rounded-2xl p-6 w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-gray-800">
            编辑第 {item.day} 天
          </h3>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-lg">
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">标题</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">描述</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              学习目标（每行一个）
            </label>
            <textarea
              value={objectives}
              onChange={(e) => setObjectives(e.target.value)}
              rows={4}
              placeholder="每行输入一个学习目标"
              className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">预计时间（分钟）</label>
            <input
              type="number"
              min="1"
              value={estimatedMinutes}
              onChange={(e) => setEstimatedMinutes(parseInt(e.target.value) || 60)}
              className="w-32 px-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
        </div>

        <div className="flex gap-3 mt-6">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 border border-gray-200 text-gray-600 rounded-xl hover:bg-gray-50"
          >
            取消
          </button>
          <button
            onClick={handleSave}
            className="flex-1 py-2.5 bg-gradient-to-r from-primary-500 to-purple-600 text-white rounded-xl hover:shadow-lg flex items-center justify-center gap-2"
          >
            <Save className="w-4 h-4" />
            保存
          </button>
        </div>
      </div>
    </div>
  )
}

export default function PlanCreator() {
  const { 
    addPlan, 
    setCurrentPlan, 
    setCurrentView, 
    settings,
    pageDrafts,
    updatePlanCreatorDraft,
    resetPlanCreatorDraft
  } = useStore()
  
  // 编辑状态
  const [editingOutlineItem, setEditingOutlineItem] = useState<StudyOutlineItem | null>(null)
  const [editingDescription, setEditingDescription] = useState(false)
  const [tempDescription, setTempDescription] = useState('')
  
  // 手动模式状态
  const [showManualModal, setShowManualModal] = useState(false)
  const [manualPrompt, setManualPrompt] = useState('')
  
  // 错误状态
  const [error, setError] = useState('')
  
  // 存储方式选择
  const [storageType, setStorageType] = useState<'local' | 'github'>('local')
  const [githubRepoName, setGithubRepoName] = useState('')
  const [isCreatingRepo, setIsCreatingRepo] = useState(false)
  const [repoPrivate, setRepoPrivate] = useState(false)
  
  // 从 store 获取草稿状态
  const { 
    topic, 
    learningGoals, 
    dailyMinutes, 
    totalDays, 
    step, 
    generatedOutline,
    expandedDays,
    autoCalculateDays,
    customDailyMinutes
  } = pageDrafts.planCreator

  // 更新草稿的辅助函数
  const setTopic = (value: string) => updatePlanCreatorDraft({ topic: value })
  const setLearningGoals = (value: string) => updatePlanCreatorDraft({ learningGoals: value })
  const setDailyMinutes = (value: number) => updatePlanCreatorDraft({ dailyMinutes: value })
  const setTotalDays = (value: number) => updatePlanCreatorDraft({ totalDays: value })
  const setStep = (value: typeof step) => updatePlanCreatorDraft({ step: value })
  const setGeneratedOutline = (value: typeof generatedOutline) => updatePlanCreatorDraft({ generatedOutline: value })
  const setExpandedDays = (value: number[]) => updatePlanCreatorDraft({ expandedDays: value })
  const setAutoCalculateDays = (value: boolean) => updatePlanCreatorDraft({ autoCalculateDays: value })
  const setCustomDailyMinutes = (value: string) => updatePlanCreatorDraft({ customDailyMinutes: value })

  // 获取实际的每日学习时间
  const getActualDailyMinutes = () => {
    if (dailyMinutes === -1) {
      const custom = parseInt(customDailyMinutes || '60', 10)
      return isNaN(custom) || custom < 1 ? 60 : custom
    }
    return dailyMinutes
  }

  const handleGenerate = async () => {
    if (!topic.trim()) {
      setError('请输入学习主题')
      return
    }

    setError('')
    const actualMinutes = getActualDailyMinutes()
    
    // 检查是否使用手动模式
    if (settings.aiMode === 'manual') {
      const prompt = aiService.getStudyOutlinePrompt(
        topic,
        actualMinutes,
        autoCalculateDays ? 0 : totalDays,
        learningGoals,
        autoCalculateDays
      )
      setManualPrompt(prompt)
      setShowManualModal(true)
      return
    }

    // API 模式
    if (!settings.apiKey) {
      setError('请先在设置中配置 API Key')
      return
    }

    // 配置 AI 服务
    aiService.setConfig({
      apiKey: settings.apiKey,
      apiEndpoint: settings.apiEndpoint,
      model: settings.model
    })

    setStep('generating')

    try {
      const result = await aiService.generateStudyOutline(
        topic, 
        actualMinutes, 
        autoCalculateDays ? 0 : totalDays,
        learningGoals,
        autoCalculateDays
      )
      setGeneratedOutline(result)
      if (autoCalculateDays && result.outline.length > 0) {
        setTotalDays(result.outline.length)
      }
      setStep('preview')
    } catch (err) {
      console.error('生成失败:', err)
      setError(err instanceof Error ? err.message : '生成失败，请重试')
      setStep('input')
    }
  }

  // 手动模式结果处理
  const handleManualResult = (resultText: string) => {
    const parseResult = aiService.parseStudyOutlineResult(resultText)
    if (parseResult.success && parseResult.data) {
      setGeneratedOutline(parseResult.data)
      if (autoCalculateDays && parseResult.data.outline.length > 0) {
        setTotalDays(parseResult.data.outline.length)
      }
      setStep('preview')
    }
  }

  const parseManualResult = (resultText: string) => {
    return aiService.parseStudyOutlineResult(resultText)
  }

  const handleSave = async () => {
    if (!generatedOutline) return

    const actualMinutes = getActualDailyMinutes()
    const actualDays = generatedOutline.outline.length

    // 基础计划对象
    const newPlan: StudyPlan = {
      id: `plan-${Date.now()}`,
      topic,
      description: generatedOutline.description,
      dailyStudyMinutes: actualMinutes,
      totalDays: actualDays,
      startDate: format(new Date(), 'yyyy-MM-dd'),
      outline: generatedOutline.outline,
      createdAt: new Date().toISOString(),
      status: 'active',
      storageType
    }

    // 如果选择 GitHub 存储
    if (storageType === 'github' && settings.github?.accessToken && settings.github?.user) {
      setIsCreatingRepo(true)
      setError('')
      
      try {
        // 生成仓库名称
        const repoName = githubRepoName.trim() || 
          `study-${topic.replace(/[^a-zA-Z0-9\u4e00-\u9fa5]/g, '-').toLowerCase()}-${Date.now()}`
        
        // 创建仓库
        const repo = await githubService.createRepository(
          repoName,
          `📚 ${topic} - 由 StudyPilot 创建的学习项目`,
          repoPrivate
        )

        if (repo) {
          // 初始化仓库结构
          await githubService.initializeStudyRepo(
            settings.github.user.login,
            repo.name,
            { ...newPlan, github: { owner: settings.github.user.login, repo: repo.name, repoUrl: repo.html_url } }
          )

          // 更新计划的 GitHub 信息
          newPlan.github = {
            owner: settings.github.user.login,
            repo: repo.name,
            repoUrl: repo.html_url
          }
        }
      } catch (err) {
        console.error('GitHub 仓库创建失败:', err)
        setError('GitHub 仓库创建失败: ' + (err instanceof Error ? err.message : String(err)))
        setIsCreatingRepo(false)
        return
      }
      
      setIsCreatingRepo(false)
    }

    addPlan(newPlan)
    setCurrentPlan(newPlan.id)
    setStep('saved')
  }

  const toggleDay = (day: number) => {
    setExpandedDays(
      expandedDays.includes(day) 
        ? expandedDays.filter(d => d !== day)
        : [...expandedDays, day]
    )
  }

  const handleStartNewPlan = () => {
    resetPlanCreatorDraft()
    setCurrentView('daily')
  }

  const handleReset = () => {
    if (confirm('确定要清空当前输入的内容吗？')) {
      resetPlanCreatorDraft()
    }
  }

  // 更新大纲项
  const handleUpdateOutlineItem = (updated: StudyOutlineItem) => {
    if (!generatedOutline) return
    const newOutline = generatedOutline.outline.map(item =>
      item.id === updated.id ? updated : item
    )
    setGeneratedOutline({ ...generatedOutline, outline: newOutline })
    setEditingOutlineItem(null)
  }

  // 删除大纲项
  const handleDeleteOutlineItem = (day: number) => {
    if (!generatedOutline) return
    if (!confirm(`确定要删除第 ${day} 天吗？`)) return
    
    const newOutline = generatedOutline.outline
      .filter(item => item.day !== day)
      .map((item, index) => ({ ...item, day: index + 1, id: `outline-${index + 1}` }))
    setGeneratedOutline({ ...generatedOutline, outline: newOutline })
    setTotalDays(newOutline.length)
  }

  // 添加新的大纲项
  const handleAddOutlineItem = () => {
    if (!generatedOutline) return
    const newDay = generatedOutline.outline.length + 1
    const newItem: StudyOutlineItem = {
      id: `outline-${newDay}`,
      day: newDay,
      title: `第 ${newDay} 天`,
      description: '请编辑此天的学习内容',
      objectives: ['学习目标 1'],
      estimatedMinutes: getActualDailyMinutes()
    }
    setGeneratedOutline({
      ...generatedOutline,
      outline: [...generatedOutline.outline, newItem]
    })
    setTotalDays(newDay)
    setEditingOutlineItem(newItem)
  }

  // 更新计划描述
  const handleSaveDescription = () => {
    if (!generatedOutline) return
    setGeneratedOutline({ ...generatedOutline, description: tempDescription })
    setEditingDescription(false)
  }

  if (step === 'saved') {
    return (
      <div className="p-8 flex items-center justify-center min-h-full animate-fadeIn">
        <div className="text-center">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-10 h-10 text-green-500" />
          </div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">学习计划创建成功！</h2>
          <p className="text-gray-500 mb-6">现在可以开始你的学习之旅了</p>
          <button
            onClick={handleStartNewPlan}
            className="px-6 py-3 bg-gradient-to-r from-primary-500 to-purple-600 text-white rounded-xl hover:shadow-lg transition-all"
          >
            开始今日学习
          </button>
        </div>
      </div>
    )
  }

  if (step === 'generating') {
    return (
      <div className="p-8 flex items-center justify-center min-h-full animate-fadeIn">
        <div className="text-center">
          <div className="w-20 h-20 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <Loader2 className="w-10 h-10 text-primary-500 animate-spin" />
          </div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">AI 正在生成学习计划...</h2>
          <p className="text-gray-500">请稍候，这可能需要几秒钟</p>
        </div>
      </div>
    )
  }

  if (step === 'preview' && generatedOutline) {
    return (
      <div className="p-8 animate-fadeIn">
        <div className="max-w-4xl mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-800 mb-2">学习计划预览</h1>
            <p className="text-gray-500">请确认以下学习计划，可点击编辑按钮修改内容</p>
          </div>

          {/* 计划概览 */}
          <div className="bg-white rounded-2xl shadow-sm p-6 mb-6">
            <div className="flex items-start justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-800">{topic}</h2>
            </div>
            
            {editingDescription ? (
              <div className="mb-4">
                <textarea
                  value={tempDescription}
                  onChange={(e) => setTempDescription(e.target.value)}
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
                />
                <div className="flex gap-2 mt-2">
                  <button
                    onClick={() => setEditingDescription(false)}
                    className="px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 rounded-lg"
                  >
                    取消
                  </button>
                  <button
                    onClick={handleSaveDescription}
                    className="px-3 py-1.5 text-sm bg-primary-500 text-white rounded-lg hover:bg-primary-600"
                  >
                    保存
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex items-start gap-2 mb-4 group">
                <p className="text-gray-600 flex-1">{generatedOutline.description}</p>
                <button
                  onClick={() => {
                    setTempDescription(generatedOutline.description)
                    setEditingDescription(true)
                  }}
                  className="p-1.5 text-gray-400 hover:text-primary-500 hover:bg-gray-100 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
                  title="编辑描述"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
              </div>
            )}
            
            <div className="flex items-center gap-6 text-sm text-gray-500">
              <span className="flex items-center gap-2">
                <Clock className="w-4 h-4" />
                每天 {getActualDailyMinutes()} 分钟
              </span>
              <span className="flex items-center gap-2">
                <Target className="w-4 h-4" />
                共 {generatedOutline.outline.length} 天
              </span>
            </div>
          </div>

          {/* 大纲列表 */}
          <div className="bg-white rounded-2xl shadow-sm p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-800">学习大纲</h3>
              <button
                onClick={handleAddOutlineItem}
                className="flex items-center gap-1 px-3 py-1.5 text-sm text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
              >
                <Plus className="w-4 h-4" />
                添加一天
              </button>
            </div>
            <div className="space-y-3">
              {generatedOutline.outline.map((item) => (
                <div 
                  key={item.id}
                  className="border border-gray-100 rounded-xl overflow-hidden group"
                >
                  <div className="w-full p-4 flex items-center justify-between hover:bg-gray-50 transition-colors">
                    <button
                      onClick={() => toggleDay(item.day)}
                      className="flex items-center gap-4 flex-1 text-left"
                    >
                      <div className="w-10 h-10 bg-gradient-to-br from-primary-500 to-purple-600 rounded-lg flex items-center justify-center text-white font-bold">
                        {item.day}
                      </div>
                      <div>
                        <h4 className="font-medium text-gray-800">{item.title}</h4>
                        <p className="text-sm text-gray-500">{item.estimatedMinutes} 分钟</p>
                      </div>
                    </button>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => setEditingOutlineItem(item)}
                        className="p-2 text-gray-400 hover:text-primary-500 hover:bg-primary-50 rounded-lg opacity-0 group-hover:opacity-100 transition-all"
                        title="编辑"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      {generatedOutline.outline.length > 1 && (
                        <button
                          onClick={() => handleDeleteOutlineItem(item.day)}
                          className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg opacity-0 group-hover:opacity-100 transition-all"
                          title="删除"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                      <button onClick={() => toggleDay(item.day)} className="p-2">
                        {expandedDays.includes(item.day) ? (
                          <ChevronUp className="w-5 h-5 text-gray-400" />
                        ) : (
                          <ChevronDown className="w-5 h-5 text-gray-400" />
                        )}
                      </button>
                    </div>
                  </div>
                  {expandedDays.includes(item.day) && (
                    <div className="px-4 pb-4 border-t border-gray-100 pt-4 bg-gray-50">
                      <p className="text-gray-600 mb-3">{item.description}</p>
                      <div>
                        <p className="text-sm font-medium text-gray-700 mb-2">学习目标：</p>
                        <ul className="space-y-1">
                          {item.objectives.map((obj, i) => (
                            <li key={i} className="text-sm text-gray-600 flex items-start gap-2">
                              <span className="text-primary-500 mt-1">•</span>
                              {obj}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* 存储方式选择 */}
          <div className="bg-white rounded-2xl shadow-sm p-6 mb-6">
            <h3 className="text-lg font-bold text-gray-800 mb-4">存储方式</h3>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <button
                onClick={() => setStorageType('local')}
                className={`p-4 rounded-xl border-2 text-left transition-all ${
                  storageType === 'local'
                    ? 'border-primary-500 bg-primary-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center gap-3 mb-2">
                  <div className={`p-2 rounded-lg ${
                    storageType === 'local' ? 'bg-primary-100' : 'bg-gray-100'
                  }`}>
                    <HardDrive className={`w-5 h-5 ${
                      storageType === 'local' ? 'text-primary-600' : 'text-gray-500'
                    }`} />
                  </div>
                  <span className="font-bold text-gray-800">本地存储</span>
                </div>
                <p className="text-sm text-gray-500">
                  数据保存在本地，不需要网络
                </p>
              </button>
              
              <button
                onClick={() => {
                  if (settings.github?.accessToken) {
                    setStorageType('github')
                  } else {
                    setError('请先在设置中连接 GitHub 账号')
                  }
                }}
                disabled={!settings.github?.accessToken}
                className={`p-4 rounded-xl border-2 text-left transition-all ${
                  storageType === 'github'
                    ? 'border-gray-900 bg-gray-50'
                    : settings.github?.accessToken
                      ? 'border-gray-200 hover:border-gray-300'
                      : 'border-gray-100 bg-gray-50 opacity-60 cursor-not-allowed'
                }`}
              >
                <div className="flex items-center gap-3 mb-2">
                  <div className={`p-2 rounded-lg ${
                    storageType === 'github' ? 'bg-gray-900' : 'bg-gray-100'
                  }`}>
                    <Github className={`w-5 h-5 ${
                      storageType === 'github' ? 'text-white' : 'text-gray-500'
                    }`} />
                  </div>
                  <span className="font-bold text-gray-800">GitHub 同步</span>
                </div>
                <p className="text-sm text-gray-500">
                  {settings.github?.accessToken 
                    ? '自动同步到 GitHub 仓库'
                    : '需要先在设置中连接 GitHub'}
                </p>
              </button>
            </div>

            {storageType === 'github' && settings.github?.user && (
              <div className="space-y-4 p-4 bg-gray-50 rounded-xl">
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <img
                    src={settings.github.user.avatar_url}
                    alt={settings.github.user.login}
                    className="w-5 h-5 rounded-full"
                  />
                  将创建到 @{settings.github.user.login} 的仓库
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    仓库名称（可选）
                  </label>
                  <input
                    type="text"
                    value={githubRepoName}
                    onChange={(e) => setGithubRepoName(e.target.value)}
                    placeholder={`study-${topic.replace(/[^a-zA-Z0-9\u4e00-\u9fa5]/g, '-').toLowerCase().slice(0, 20)}`}
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-500"
                  />
                  <p className="text-xs text-gray-400 mt-1">留空将自动生成</p>
                </div>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={repoPrivate}
                    onChange={(e) => setRepoPrivate(e.target.checked)}
                    className="w-4 h-4 rounded border-gray-300 text-gray-900 focus:ring-gray-500"
                  />
                  <span className="text-sm text-gray-700">创建为私有仓库</span>
                </label>
              </div>
            )}

            {error && (
              <div className="mt-4 p-3 bg-red-50 text-red-700 rounded-lg text-sm">
                {error}
              </div>
            )}
          </div>

          {/* 操作按钮 */}
          <div className="flex items-center justify-between">
            <button
              onClick={() => setStep('input')}
              className="px-6 py-3 text-gray-600 hover:bg-gray-100 rounded-xl transition-colors"
              disabled={isCreatingRepo}
            >
              返回修改
            </button>
            <button
              onClick={handleSave}
              disabled={isCreatingRepo}
              className="px-6 py-3 bg-gradient-to-r from-primary-500 to-purple-600 text-white rounded-xl hover:shadow-lg transition-all flex items-center gap-2 disabled:opacity-50"
            >
              {isCreatingRepo ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  正在创建 GitHub 仓库...
                </>
              ) : (
                <>
                  {storageType === 'github' && <Github className="w-4 h-4" />}
                  确认并保存计划
                </>
              )}
            </button>
          </div>
        </div>

        {/* 编辑弹窗 */}
        {editingOutlineItem && (
          <OutlineEditModal
            item={editingOutlineItem}
            onSave={handleUpdateOutlineItem}
            onClose={() => setEditingOutlineItem(null)}
          />
        )}

        {/* 手动模式弹窗 */}
        <ManualModeModal
          isOpen={showManualModal}
          onClose={() => setShowManualModal(false)}
          prompt={manualPrompt}
          title="生成学习计划大纲"
          description="复制提示词到 AI 工具，获取学习计划"
          onResult={handleManualResult}
          parseResult={parseManualResult}
        />
      </div>
    )
  }

  return (
    <div className="p-8 animate-fadeIn">
      <div className="max-w-2xl mx-auto">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-800 mb-2">创建学习计划</h1>
            <p className="text-gray-500">输入你想学习的主题，AI 将为你生成个性化的学习计划</p>
          </div>
          {(topic || learningGoals) && (
            <button
              onClick={handleReset}
              className="flex items-center gap-2 px-3 py-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              title="清空内容"
            >
              <RotateCcw className="w-4 h-4" />
              重置
            </button>
          )}
        </div>

        <div className="bg-white rounded-2xl shadow-sm p-8">
          {/* 学习主题 */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              学习主题 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="例如：人工智能基础、React 开发、Python 数据分析..."
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
            />
          </div>

          {/* 学习目标描述 */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              学习目标描述
              <span className="text-gray-400 font-normal ml-2">（可选，但强烈建议填写）</span>
            </label>
            <textarea
              value={learningGoals}
              onChange={(e) => setLearningGoals(e.target.value)}
              placeholder="详细描述你的学习目标，例如：&#10;• 我是零基础，想从入门开始学习&#10;• 我想重点学习 XXX 方面的内容&#10;• 学完后希望能够独立完成 XXX&#10;• 我的最终目标是 XXX"
              rows={4}
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all resize-none"
            />
            <p className="text-xs text-gray-400 mt-1">
              详细的目标描述能帮助 AI 更准确地理解你的需求，生成更符合你期望的学习计划
            </p>
          </div>

          {/* 每日学习时间 */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              每日学习时间
            </label>
            <div className="flex items-center gap-3">
              <select
                value={dailyMinutes}
                onChange={(e) => setDailyMinutes(Number(e.target.value))}
                className="flex-1 px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all bg-white"
              >
                {dailyMinutesOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
              {dailyMinutes === -1 && (
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="1"
                    value={customDailyMinutes}
                    onChange={(e) => setCustomDailyMinutes(e.target.value)}
                    placeholder="输入分钟数"
                    className="w-32 px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
                  />
                  <span className="text-gray-500">分钟</span>
                </div>
              )}
            </div>
            <p className="text-xs text-gray-400 mt-1">
              选择你每天能投入学习的时间，没有上限限制
            </p>
          </div>

          {/* 学习天数设置 */}
          <div className="mb-8">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              学习天数
            </label>
            
            {/* AI 自动规划开关 */}
            <div 
              className={`mb-4 p-4 rounded-xl border-2 cursor-pointer transition-all ${
                autoCalculateDays 
                  ? 'border-primary-500 bg-primary-50' 
                  : 'border-gray-200 hover:border-gray-300'
              }`}
              onClick={() => setAutoCalculateDays(!autoCalculateDays)}
            >
              <div className="flex items-center gap-3">
                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
                  autoCalculateDays 
                    ? 'border-primary-500 bg-primary-500' 
                    : 'border-gray-300'
                }`}>
                  {autoCalculateDays && (
                    <div className="w-2 h-2 bg-white rounded-full" />
                  )}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <Wand2 className="w-4 h-4 text-primary-500" />
                    <span className="font-medium text-gray-800">AI 自动规划天数</span>
                    <span className="text-xs px-2 py-0.5 bg-primary-100 text-primary-600 rounded-full">推荐</span>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    根据学习主题和目标，AI 自动计算需要多少天才能完整学会，确保学全学精
                  </p>
                </div>
              </div>
            </div>

            {/* 手动指定天数 */}
            {!autoCalculateDays && (
              <div className="flex items-center gap-3">
                <input
                  type="number"
                  min="1"
                  value={totalDays}
                  onChange={(e) => {
                    const val = parseInt(e.target.value, 10)
                    if (!isNaN(val) && val >= 1) {
                      setTotalDays(val)
                    }
                  }}
                  className="w-32 px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
                />
                <span className="text-gray-500">天</span>
                <div className="flex gap-2 ml-4">
                  {[7, 14, 21, 30, 60, 90].map((d) => (
                    <button
                      key={d}
                      onClick={() => setTotalDays(d)}
                      className={`px-3 py-1.5 text-sm rounded-lg transition-all ${
                        totalDays === d
                          ? 'bg-primary-500 text-white'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      {d}天
                    </button>
                  ))}
                </div>
              </div>
            )}
            
            {!autoCalculateDays && (
              <p className="text-xs text-gray-400 mt-2">
                手动指定学习天数，可以直接输入任意天数或点击快捷按钮
              </p>
            )}
          </div>

          {/* 错误提示 */}
          {settings.aiMode === 'api' && !settings.apiKey && (
            <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-xl text-yellow-700 text-sm">
              请先在设置中配置 API Key
            </div>
          )}
          
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
              {error}
            </div>
          )}

          {/* 生成按钮 */}
          <button
            onClick={handleGenerate}
            disabled={!topic.trim() || (settings.aiMode === 'api' && !settings.apiKey)}
            className="w-full py-4 bg-gradient-to-r from-primary-500 to-purple-600 text-white rounded-xl hover:shadow-lg transition-all flex items-center justify-center gap-2 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Sparkles className="w-5 h-5" />
            AI 生成学习计划
          </button>
        </div>
      </div>

      {/* 手动模式弹窗 */}
      <ManualModeModal
        isOpen={showManualModal}
        onClose={() => setShowManualModal(false)}
        prompt={manualPrompt}
        title="生成学习计划大纲"
        description="复制提示词到 AI 工具，获取学习计划"
        onResult={handleManualResult}
        parseResult={parseManualResult}
      />
    </div>
  )
}
