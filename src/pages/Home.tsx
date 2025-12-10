import { useStore } from '../store/useStore'
import { 
  BookOpen, 
  Clock, 
  Trophy, 
  TrendingUp,
  Plus,
  ChevronRight,
  Trash2
} from 'lucide-react'
import { format } from 'date-fns'
import { zhCN } from 'date-fns/locale'

export default function Home() {
  const { 
    plans, 
    dailyTasks, 
    setCurrentView, 
    setCurrentPlan, 
    deletePlan,
    currentPlanId 
  } = useStore()

  // 统计数据
  const totalPlans = plans.length
  const activePlans = plans.filter(p => p.status === 'active').length
  const completedTasks = dailyTasks.filter(t => t.status === 'reviewed').length
  const avgScore = dailyTasks.filter(t => t.review).length > 0
    ? Math.round(
        dailyTasks
          .filter(t => t.review)
          .reduce((sum, t) => sum + (t.review?.score || 0), 0) / 
        dailyTasks.filter(t => t.review).length
      )
    : 0

  const handleSelectPlan = (planId: string) => {
    setCurrentPlan(planId)
    setCurrentView('daily')
  }

  const handleDeletePlan = (e: React.MouseEvent, planId: string) => {
    e.stopPropagation()
    if (confirm('确定要删除这个学习计划吗？')) {
      deletePlan(planId)
    }
  }

  return (
    <div className="p-8 animate-fadeIn">
      {/* 欢迎区域 */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-800 mb-2">
          欢迎使用 StudyPilot
        </h1>
        <p className="text-gray-500">
          {format(new Date(), 'yyyy年MM月dd日 EEEE', { locale: zhCN })}
        </p>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-4 gap-6 mb-8">
        <StatCard
          icon={BookOpen}
          label="学习计划"
          value={totalPlans}
          color="blue"
        />
        <StatCard
          icon={Clock}
          label="进行中"
          value={activePlans}
          color="green"
        />
        <StatCard
          icon={Trophy}
          label="已完成任务"
          value={completedTasks}
          color="yellow"
        />
        <StatCard
          icon={TrendingUp}
          label="平均分数"
          value={avgScore || '-'}
          color="purple"
        />
      </div>

      {/* 学习计划列表 */}
      <div className="bg-white rounded-2xl shadow-sm p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-gray-800">我的学习计划</h2>
          <button
            onClick={() => setCurrentView('plan')}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-primary-500 to-purple-600 text-white rounded-xl hover:shadow-lg transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>创建新计划</span>
          </button>
        </div>

        {plans.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <BookOpen className="w-10 h-10 text-gray-400" />
            </div>
            <p className="text-gray-500 mb-4">还没有学习计划</p>
            <button
              onClick={() => setCurrentView('plan')}
              className="text-primary-600 hover:underline"
            >
              创建你的第一个学习计划
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {plans.map((plan) => {
              const completedDays = dailyTasks.filter(
                t => t.planId === plan.id && t.status === 'reviewed'
              ).length
              const progress = Math.round((completedDays / plan.totalDays) * 100)
              const isSelected = currentPlanId === plan.id

              return (
                <div
                  key={plan.id}
                  onClick={() => handleSelectPlan(plan.id)}
                  className={`p-4 rounded-xl border-2 cursor-pointer transition-all hover:shadow-md ${
                    isSelected 
                      ? 'border-primary-500 bg-primary-50' 
                      : 'border-gray-100 hover:border-gray-200'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="font-bold text-gray-800">{plan.topic}</h3>
                        <span className={`px-2 py-0.5 text-xs rounded-full ${
                          plan.status === 'active' 
                            ? 'bg-green-100 text-green-600' 
                            : plan.status === 'completed'
                            ? 'bg-blue-100 text-blue-600'
                            : 'bg-gray-100 text-gray-600'
                        }`}>
                          {plan.status === 'active' ? '进行中' : plan.status === 'completed' ? '已完成' : '已暂停'}
                        </span>
                      </div>
                      <p className="text-sm text-gray-500 mb-3 line-clamp-1">
                        {plan.description}
                      </p>
                      <div className="flex items-center gap-4 text-sm text-gray-500">
                        <span className="flex items-center gap-1">
                          <Clock className="w-4 h-4" />
                          每天 {plan.dailyStudyMinutes} 分钟
                        </span>
                        <span>共 {plan.totalDays} 天</span>
                        <span>已完成 {completedDays} 天</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <div className="text-2xl font-bold text-primary-600">{progress}%</div>
                        <div className="w-24 h-2 bg-gray-100 rounded-full overflow-hidden mt-1">
                          <div 
                            className="h-full bg-gradient-to-r from-primary-500 to-purple-500 rounded-full"
                            style={{ width: `${progress}%` }}
                          />
                        </div>
                      </div>
                      <button
                        onClick={(e) => handleDeletePlan(e, plan.id)}
                        className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                      <ChevronRight className="w-5 h-5 text-gray-400" />
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

function StatCard({ 
  icon: Icon, 
  label, 
  value, 
  color 
}: { 
  icon: React.ElementType
  label: string
  value: number | string
  color: 'blue' | 'green' | 'yellow' | 'purple'
}) {
  const colorClasses = {
    blue: 'from-blue-500 to-blue-600',
    green: 'from-green-500 to-green-600',
    yellow: 'from-yellow-500 to-orange-500',
    purple: 'from-purple-500 to-pink-500',
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm p-6">
      <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${colorClasses[color]} flex items-center justify-center mb-4`}>
        <Icon className="w-6 h-6 text-white" />
      </div>
      <div className="text-3xl font-bold text-gray-800 mb-1">{value}</div>
      <div className="text-sm text-gray-500">{label}</div>
    </div>
  )
}
