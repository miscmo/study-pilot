import { useStore } from '../store/useStore'
import { aiService } from '../services/aiService'
import type { StudyPlan } from '../types'
import { 
  Sparkles, 
  Loader2, 
  CheckCircle, 
  Clock,
  Target,
  ChevronDown,
  ChevronUp,
  RotateCcw,
  Wand2
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
      return
    }
    if (!settings.apiKey) {
      return
    }

    setStep('generating')

    try {
      const actualMinutes = getActualDailyMinutes()
      const result = await aiService.generateStudyOutline(
        topic, 
        actualMinutes, 
        autoCalculateDays ? 0 : totalDays,  // 0 表示让 AI 自动规划
        learningGoals,
        autoCalculateDays
      )
      setGeneratedOutline(result)
      // 如果是自动规划，更新实际的天数
      if (autoCalculateDays && result.outline.length > 0) {
        setTotalDays(result.outline.length)
      }
      setStep('preview')
    } catch (err) {
      console.error('生成失败:', err)
      setStep('input')
    }
  }

  const handleSave = () => {
    if (!generatedOutline) return

    const actualMinutes = getActualDailyMinutes()
    const actualDays = generatedOutline.outline.length

    const newPlan: StudyPlan = {
      id: `plan-${Date.now()}`,
      topic,
      description: generatedOutline.description,
      dailyStudyMinutes: actualMinutes,
      totalDays: actualDays,
      startDate: format(new Date(), 'yyyy-MM-dd'),
      outline: generatedOutline.outline,
      createdAt: new Date().toISOString(),
      status: 'active'
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
            <p className="text-gray-500">请确认以下学习计划是否符合你的需求</p>
          </div>

          {/* 计划概览 */}
          <div className="bg-white rounded-2xl shadow-sm p-6 mb-6">
            <h2 className="text-xl font-bold text-gray-800 mb-4">{topic}</h2>
            <p className="text-gray-600 mb-4">{generatedOutline.description}</p>
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
            <h3 className="text-lg font-bold text-gray-800 mb-4">学习大纲</h3>
            <div className="space-y-3">
              {generatedOutline.outline.map((item) => (
                <div 
                  key={item.id}
                  className="border border-gray-100 rounded-xl overflow-hidden"
                >
                  <button
                    onClick={() => toggleDay(item.day)}
                    className="w-full p-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-gradient-to-br from-primary-500 to-purple-600 rounded-lg flex items-center justify-center text-white font-bold">
                        {item.day}
                      </div>
                      <div className="text-left">
                        <h4 className="font-medium text-gray-800">{item.title}</h4>
                        <p className="text-sm text-gray-500">{item.estimatedMinutes} 分钟</p>
                      </div>
                    </div>
                    {expandedDays.includes(item.day) ? (
                      <ChevronUp className="w-5 h-5 text-gray-400" />
                    ) : (
                      <ChevronDown className="w-5 h-5 text-gray-400" />
                    )}
                  </button>
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

          {/* 操作按钮 */}
          <div className="flex items-center justify-between">
            <button
              onClick={() => setStep('input')}
              className="px-6 py-3 text-gray-600 hover:bg-gray-100 rounded-xl transition-colors"
            >
              返回修改
            </button>
            <button
              onClick={handleSave}
              className="px-6 py-3 bg-gradient-to-r from-primary-500 to-purple-600 text-white rounded-xl hover:shadow-lg transition-all"
            >
              确认并保存计划
            </button>
          </div>
        </div>
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
          {!settings.apiKey && (
            <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-xl text-yellow-700 text-sm">
              请先在设置中配置 API Key
            </div>
          )}

          {/* 生成按钮 */}
          <button
            onClick={handleGenerate}
            disabled={!topic.trim() || !settings.apiKey}
            className="w-full py-4 bg-gradient-to-r from-primary-500 to-purple-600 text-white rounded-xl hover:shadow-lg transition-all flex items-center justify-center gap-2 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Sparkles className="w-5 h-5" />
            AI 生成学习计划
          </button>
        </div>
      </div>
    </div>
  )
}
