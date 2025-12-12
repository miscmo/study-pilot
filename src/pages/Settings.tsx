import { useState, useEffect } from 'react'
import { useStore } from '../store/useStore'
import type { ApiKeyConfig } from '../types'
import { githubService } from '../services/githubService'
import { syncService } from '../services/syncService'
import { 
  Key, 
  Globe, 
  Cpu, 
  Save,
  CheckCircle,
  Eye,
  EyeOff,
  Plus,
  Trash2,
  Edit2,
  Power,
  PowerOff,
  X,
  Zap,
  Hand,
  Github,
  LogOut,
  ExternalLink,
  AlertCircle,
  RefreshCw
} from 'lucide-react'

// Electron IPC
const ipcRenderer = window.require ? window.require('electron').ipcRenderer : null

export default function Settings() {
  const { 
    settings, 
    updateSettings, 
    addApiKey, 
    updateApiKey, 
    deleteApiKey, 
    setActiveApiKey 
  } = useStore()
  
  const [apiKey, setApiKey] = useState(settings.apiKey)
  const [apiEndpoint, setApiEndpoint] = useState(settings.apiEndpoint)
  const [model, setModel] = useState(settings.model)
  const [showApiKey, setShowApiKey] = useState(false)
  const [saved, setSaved] = useState(false)
  
  // 多密钥管理状态
  const [showKeyModal, setShowKeyModal] = useState(false)
  const [editingKey, setEditingKey] = useState<ApiKeyConfig | null>(null)
  const [keyForm, setKeyForm] = useState({
    name: '',
    apiKey: '',
    apiEndpoint: 'https://api.openai.com/v1',
    model: 'gpt-4'
  })
  const [showKeyFormApiKey, setShowKeyFormApiKey] = useState(false)
  const [visibleKeyIds, setVisibleKeyIds] = useState<Set<string>>(new Set())
  
  // GitHub 相关状态
  const githubClientId = settings.github?.clientId || ''
  const [githubToken, setGithubToken] = useState('')
  const [showGithubToken, setShowGithubToken] = useState(false)
  const [githubLoading, setGithubLoading] = useState(false)
  const [githubError, setGithubError] = useState('')

  // 初始化 GitHub 服务配置
  useEffect(() => {
    if (settings.github?.accessToken) {
      githubService.setConfig({ accessToken: settings.github.accessToken })
    }
  }, [settings.github?.accessToken])

  const handleSave = () => {
    updateSettings({
      apiKey,
      apiEndpoint,
      model
    })
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  // 打开添加密钥弹窗
  const openAddKeyModal = () => {
    setEditingKey(null)
    setKeyForm({
      name: '',
      apiKey: '',
      apiEndpoint: 'https://api.openai.com/v1',
      model: 'gpt-4'
    })
    setShowKeyFormApiKey(false)
    setShowKeyModal(true)
  }

  // 打开编辑密钥弹窗
  const openEditKeyModal = (key: ApiKeyConfig) => {
    setEditingKey(key)
    setKeyForm({
      name: key.name,
      apiKey: key.apiKey,
      apiEndpoint: key.apiEndpoint,
      model: key.model
    })
    setShowKeyFormApiKey(false)
    setShowKeyModal(true)
  }

  // 保存密钥
  const handleSaveKey = () => {
    if (!keyForm.name || !keyForm.apiKey) {
      alert('请填写名称和 API Key')
      return
    }

    if (editingKey) {
      updateApiKey(editingKey.id, {
        name: keyForm.name,
        apiKey: keyForm.apiKey,
        apiEndpoint: keyForm.apiEndpoint,
        model: keyForm.model
      })
    } else {
      const newKey: ApiKeyConfig = {
        id: Date.now().toString(),
        name: keyForm.name,
        apiKey: keyForm.apiKey,
        apiEndpoint: keyForm.apiEndpoint,
        model: keyForm.model,
        isActive: false,
        createdAt: new Date().toISOString()
      }
      addApiKey(newKey)
    }
    setShowKeyModal(false)
  }

  // 切换密钥显示
  const toggleKeyVisibility = (id: string) => {
    const newSet = new Set(visibleKeyIds)
    if (newSet.has(id)) {
      newSet.delete(id)
    } else {
      newSet.add(id)
    }
    setVisibleKeyIds(newSet)
  }

  // 激活密钥
  const handleActivateKey = (key: ApiKeyConfig) => {
    setActiveApiKey(key.id)
    // 同步更新表单
    setApiKey(key.apiKey)
    setApiEndpoint(key.apiEndpoint)
    setModel(key.model)
  }

  // 停用密钥
  const handleDeactivateKey = () => {
    setActiveApiKey(null)
  }

  // 遮蔽 API Key
  const maskApiKey = (key: string) => {
    if (key.length <= 8) return '••••••••'
    return key.slice(0, 4) + '••••••••' + key.slice(-4)
  }

  // GitHub 登录（使用 Personal Access Token）
  const handleGithubLogin = async () => {
    if (!githubToken.trim()) {
      setGithubError('请输入 GitHub Personal Access Token')
      return
    }

    setGithubLoading(true)
    setGithubError('')

    try {
      // 设置 token 并验证
      githubService.setConfig({ accessToken: githubToken })
      const user = await githubService.getCurrentUser()

      if (user) {
        // 保存到设置，首次登录时自动启用同步功能
        updateSettings({
          github: {
            accessToken: githubToken,
            clientId: githubClientId,
            user: {
              login: user.login,
              name: user.name,
              avatar_url: user.avatar_url
            },
            sync: {
              enabled: true,
              repo: 'studypilot-sync',
              autoSync: true,
              syncDirection: 'both',
              lastSync: null
            }
          }
        })
        
        // 立即初始化并执行同步
        const initializeResult = await syncService.initializeSync()
        if (initializeResult.success) {
          const syncResult = await syncService.sync(true)
          if (!syncResult.success) {
            setGithubError(`同步执行失败: ${syncResult.error || '未知错误'}`)
          }
        } else {
          setGithubError(`同步初始化失败: ${initializeResult.error || '未知错误'}`)
        }
        
        setGithubToken('')
      } else {
        setGithubError('Token 验证失败，请检查是否正确，需要 repo 权限')
        githubService.setConfig({ accessToken: null })
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error)
      // 特殊处理权限错误
      if (errorMsg.includes('403') || errorMsg.includes('permission')) {
        setGithubError('GitHub Token 权限不足，请确保拥有 repo 权限')
      } else if (errorMsg.includes('401')) {
        setGithubError('GitHub Token 无效，请检查后重新输入')
      } else {
        setGithubError('连接失败: ' + errorMsg)
      }
      githubService.setConfig({ accessToken: null })
    } finally {
      setGithubLoading(false)
    }
  }

  // GitHub 登出
  const handleGithubLogout = () => {
    githubService.logout()
    updateSettings({
      github: {
        accessToken: null,
        clientId: githubClientId,
        user: null
      }
    })
  }

  // 打开 GitHub Token 创建页面
  const openGithubTokenPage = async () => {
    const url = 'https://github.com/settings/tokens/new?scopes=repo,user:email&description=StudyPilot'
    if (ipcRenderer) {
      await ipcRenderer.invoke('open-external', { url })
    } else {
      window.open(url, '_blank')
    }
  }

  const presetEndpoints = [
    { label: 'OpenAI', value: 'https://api.openai.com/v1' },
    { label: '智谱AI', value: 'https://open.bigmodel.cn/api/paas/v4' },
    { label: '通义千问', value: 'https://dashscope.aliyuncs.com/compatible-mode/v1' },
    { label: '百度文心', value: 'https://aip.baidubce.com/rpc/2.0/ai_custom/v1/wenxinworkshop/chat' },
    { label: '讯飞星火', value: 'https://spark-api-open.xf-yun.com/v1' },
    { label: 'DeepSeek', value: 'https://api.deepseek.com/v1' },
    { label: '月之暗面', value: 'https://api.moonshot.cn/v1' },
    { label: '零一万物', value: 'https://api.lingyiwanwu.com/v1' },
    { label: 'MiniMax', value: 'https://api.minimax.chat/v1' },
    { label: '腾讯混元', value: 'https://hunyuan.tencentcloudapi.com' },
    { label: 'SiliconFlow', value: 'https://api.siliconflow.cn/v1' },
    { label: '自定义', value: '' }
  ]

  const presetModels = [
    { label: 'GPT-4o', value: 'gpt-4o' },
    { label: 'GPT-4 Turbo', value: 'gpt-4-turbo-preview' },
    { label: 'GPT-3.5 Turbo', value: 'gpt-3.5-turbo' },
    { label: 'GLM-4', value: 'glm-4' },
    { label: 'GLM-4-Flash', value: 'glm-4-flash' },
    { label: 'Qwen-Max', value: 'qwen-max' },
    { label: 'Qwen-Plus', value: 'qwen-plus' },
    { label: 'Qwen-Turbo', value: 'qwen-turbo' },
    { label: 'DeepSeek-Chat', value: 'deepseek-chat' },
    { label: 'DeepSeek-Coder', value: 'deepseek-coder' },
    { label: 'Moonshot-v1-8k', value: 'moonshot-v1-8k' },
    { label: 'Moonshot-v1-32k', value: 'moonshot-v1-32k' },
    { label: 'Yi-Large', value: 'yi-large' },
    { label: 'Yi-Medium', value: 'yi-medium' },
    { label: 'Spark 4.0 Ultra', value: 'spark-4.0-ultra' },
    { label: 'Spark 3.5 Max', value: 'spark-3.5-max' },
    { label: 'Claude 3.5 Sonnet', value: 'claude-3-5-sonnet-20241022' },
    { label: 'Claude 3 Opus', value: 'claude-3-opus-20240229' }
  ]

  // 初始化 apiKeys（兼容旧数据）
  const apiKeys = settings.apiKeys || []

  return (
    <div className="p-8 animate-fadeIn">
      <div className="max-w-2xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">设置</h1>
          <p className="text-gray-500">配置 AI 服务和应用偏好</p>
        </div>

        {/* AI 模式选择 */}
        <div className="bg-white rounded-2xl shadow-sm p-6 mb-6">
          <h2 className="text-lg font-bold text-gray-800 mb-4">AI 模式</h2>
          <div className="grid grid-cols-2 gap-4">
            <button
              onClick={() => updateSettings({ aiMode: 'api' })}
              className={`p-4 rounded-xl border-2 text-left transition-all ${
                settings.aiMode !== 'manual'
                  ? 'border-primary-500 bg-primary-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center gap-3 mb-2">
                <div className={`p-2 rounded-lg ${
                  settings.aiMode !== 'manual' ? 'bg-primary-100' : 'bg-gray-100'
                }`}>
                  <Zap className={`w-5 h-5 ${
                    settings.aiMode !== 'manual' ? 'text-primary-600' : 'text-gray-500'
                  }`} />
                </div>
                <span className="font-bold text-gray-800">API 模式</span>
              </div>
              <p className="text-sm text-gray-500">
                配置 API 密钥，全自动生成内容
              </p>
            </button>
            
            <button
              onClick={() => updateSettings({ aiMode: 'manual' })}
              className={`p-4 rounded-xl border-2 text-left transition-all ${
                settings.aiMode === 'manual'
                  ? 'border-primary-500 bg-primary-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center gap-3 mb-2">
                <div className={`p-2 rounded-lg ${
                  settings.aiMode === 'manual' ? 'bg-primary-100' : 'bg-gray-100'
                }`}>
                  <Hand className={`w-5 h-5 ${
                    settings.aiMode === 'manual' ? 'text-primary-600' : 'text-gray-500'
                  }`} />
                </div>
                <span className="font-bold text-gray-800">手动模式</span>
              </div>
              <p className="text-sm text-gray-500">
                无需密钥，复制提示词到豆包/元宝
              </p>
            </button>
          </div>
          
          {settings.aiMode === 'manual' && (
            <div className="mt-4 p-4 bg-blue-50 rounded-xl">
              <h4 className="font-medium text-blue-800 mb-2">手动模式使用说明</h4>
              <ol className="text-sm text-blue-700 space-y-1 list-decimal list-inside">
                <li>点击生成按钮后，系统会弹出提示词并自动复制</li>
                <li>将提示词粘贴到豆包、元宝或其他 AI 工具</li>
                <li>复制 AI 的回复内容</li>
                <li>粘贴回应用，系统会自动解析并应用</li>
              </ol>
            </div>
          )}
        </div>

        {/* GitHub 集成 */}
        <div className="bg-white rounded-2xl shadow-sm p-6 mb-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-gray-900 rounded-lg">
              <Github className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-800">GitHub 集成</h2>
              <p className="text-sm text-gray-500">将学习历程自动同步到 GitHub 仓库</p>
            </div>
          </div>

          {settings.github?.user ? (
            // 已登录状态
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-green-50 rounded-xl border border-green-200">
                <div className="flex items-center gap-3">
                  <img
                    src={settings.github.user.avatar_url}
                    alt={settings.github.user.login}
                    className="w-10 h-10 rounded-full"
                  />
                  <div>
                    <div className="font-medium text-gray-800">
                      {settings.github.user.name || settings.github.user.login}
                    </div>
                    <div className="text-sm text-gray-500">@{settings.github.user.login}</div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="px-2 py-1 text-xs bg-green-100 text-green-600 rounded-full">
                    已连接
                  </span>
                  <button
                    onClick={handleGithubLogout}
                    className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                    title="断开连接"
                  >
                    <LogOut className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="p-4 bg-blue-50 rounded-xl">
                <h4 className="font-medium text-blue-800 mb-2">已启用功能</h4>
                <ul className="text-sm text-blue-700 space-y-1">
                  <li>✓ 创建学习计划时自动创建 GitHub 仓库</li>
                  <li>✓ 每日学习成果自动提交到仓库</li>
                  <li>✓ 评审结果自动记录</li>
                  <li>✓ 学习进度可视化展示</li>
                </ul>
              </div>

              {/* 同步配置 */}
              <div className="p-4 bg-blue-50 rounded-xl">
                <h4 className="font-medium text-blue-800 mb-3 flex items-center gap-2">
                  <div className="p-1 bg-blue-100 rounded-full">
                    <RefreshCw className="w-4 h-4 text-blue-600" />
                  </div>
                  数据同步设置
                </h4>
                
                <div className="space-y-4">
                  {/* 启用同步 */}
                  <div className="flex items-center justify-between">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={settings.github.sync?.enabled || false}
                        onChange={(e) => {
                          updateSettings({
                            github: {
                              ...settings.github,
                              sync: {
                                ...settings.github.sync,
                                enabled: e.target.checked
                              }
                            }
                          })
                        }}
                        className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="text-sm text-gray-700">启用数据同步</span>
                    </label>
                  </div>
                  
                  {/* 同步仓库名称 */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      同步仓库名称
                    </label>
                    <input
                      type="text"
                      value={settings.github.sync?.repo || 'studypilot-sync'}
                      onChange={(e) => {
                        updateSettings({
                          github: {
                            ...settings.github,
                            sync: {
                              ...settings.github.sync,
                              repo: e.target.value
                            }
                          }
                        })
                      }}
                      placeholder="studypilot-sync"
                      className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      disabled={!(settings.github.sync?.enabled || false)}
                    />
                    <p className="text-xs text-gray-400 mt-1">
                      用于存储同步数据的私有仓库名称
                    </p>
                  </div>
                  
                  {/* 自动同步 */}
                  <div className="flex items-center justify-between">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={settings.github.sync?.autoSync || false}
                        onChange={(e) => {
                          updateSettings({
                            github: {
                              ...settings.github,
                              sync: {
                                ...settings.github.sync,
                                autoSync: e.target.checked
                              }
                            }
                          })
                        }}
                        className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        disabled={!(settings.github.sync?.enabled || false)}
                      />
                      <span className="text-sm text-gray-700">自动同步</span>
                    </label>
                  </div>
                  
                  {/* 同步方向 */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      同步方向
                    </label>
                    <select
                      value={settings.github.sync?.syncDirection || 'both'}
                      onChange={(e) => {
                        updateSettings({
                          github: {
                            ...settings.github,
                            sync: {
                              ...settings.github.sync,
                              syncDirection: e.target.value
                            }
                          }
                        })
                      }}
                      className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      disabled={!(settings.github.sync?.enabled || false)}
                    >
                      <option value="both">双向同步</option>
                      <option value="push">仅推送到云端</option>
                      <option value="pull">仅从云端拉取</option>
                    </select>
                  </div>
                  
                  {/* 上次同步时间 */}
                  {settings.github.sync?.lastSync && (
                    <div className="text-sm text-gray-500">
                      上次同步: {new Date(settings.github.sync.lastSync).toLocaleString('zh-CN')}
                    </div>
                  )}
                  
                  {/* 手动同步按钮 */}
                  <button
                    onClick={async () => {
                      setGithubLoading(true)
                      setGithubError('')
                      const syncResult = await syncService.sync(true)
                      if (!syncResult.success) {
                        setGithubError(`同步失败: ${syncResult.error || '未知错误'}`)
                      }
                      setGithubLoading(false)
                    }}
                    disabled={!(settings.github.sync?.enabled || false) || githubLoading}
                    className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {githubLoading ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        同步中...
                      </>
                    ) : (
                      <>
                        <RefreshCw className="w-4 h-4" />
                        立即同步
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          ) : (
            // 未登录状态
            <div className="space-y-4">
              <div className="p-4 bg-gray-50 rounded-xl">
                <h4 className="font-medium text-gray-800 mb-2">连接 GitHub 后可以：</h4>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>• 自动创建学习项目仓库</li>
                  <li>• 每日学习成果自动 commit</li>
                  <li>• 形成完整的学习作品集</li>
                  <li>• GitHub 贡献图记录学习历程</li>
                </ul>
              </div>

              {githubError && (
                <div className="flex items-center gap-2 p-3 bg-red-50 text-red-700 rounded-lg text-sm">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  {githubError}
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Personal Access Token
                </label>
                <div className="relative">
                  <input
                    type={showGithubToken ? 'text' : 'password'}
                    value={githubToken}
                    onChange={(e) => setGithubToken(e.target.value)}
                    placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
                    className="w-full px-4 py-3 pr-12 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-gray-500"
                  />
                  <button
                    onClick={() => setShowGithubToken(!showGithubToken)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600"
                  >
                    {showGithubToken ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
                <div className="flex items-center justify-between mt-2">
                  <p className="text-xs text-gray-400">
                    需要 repo 和 user:email 权限
                  </p>
                  <button
                    onClick={openGithubTokenPage}
                    className="text-xs text-primary-600 hover:text-primary-700 flex items-center gap-1"
                  >
                    创建 Token
                    <ExternalLink className="w-3 h-3" />
                  </button>
                </div>
              </div>

              <button
                onClick={handleGithubLogin}
                disabled={githubLoading || !githubToken.trim()}
                className="w-full py-3 bg-gray-900 text-white rounded-xl hover:bg-gray-800 transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {githubLoading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    连接中...
                  </>
                ) : (
                  <>
                    <Github className="w-5 h-5" />
                    连接 GitHub
                  </>
                )}
              </button>
            </div>
          )}
        </div>

        {/* API 密钥管理 */}
        <div className="bg-white rounded-2xl shadow-sm p-6 mb-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-bold text-gray-800">API 密钥管理</h2>
            <button
              onClick={openAddKeyModal}
              className="flex items-center gap-2 px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors"
            >
              <Plus className="w-4 h-4" />
              添加密钥
            </button>
          </div>

          {apiKeys.length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              <Key className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>暂无保存的 API 密钥</p>
              <p className="text-sm mt-1">点击上方按钮添加你的第一个密钥</p>
            </div>
          ) : (
            <div className="space-y-3">
              {apiKeys.map((key) => (
                <div
                  key={key.id}
                  className={`p-4 rounded-xl border-2 transition-all ${
                    settings.activeKeyId === key.id
                      ? 'border-primary-500 bg-primary-50'
                      : 'border-gray-100 bg-gray-50 hover:border-gray-200'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-gray-800">{key.name}</span>
                        {settings.activeKeyId === key.id && (
                          <span className="px-2 py-0.5 text-xs bg-green-100 text-green-600 rounded-full">
                            当前使用
                          </span>
                        )}
                      </div>
                      <div className="text-sm text-gray-500 space-y-1">
                        <div className="flex items-center gap-2">
                          <Key className="w-3 h-3" />
                          <span className="font-mono">
                            {visibleKeyIds.has(key.id) ? key.apiKey : maskApiKey(key.apiKey)}
                          </span>
                          <button
                            onClick={() => toggleKeyVisibility(key.id)}
                            className="p-1 text-gray-400 hover:text-gray-600"
                          >
                            {visibleKeyIds.has(key.id) ? (
                              <EyeOff className="w-3 h-3" />
                            ) : (
                              <Eye className="w-3 h-3" />
                            )}
                          </button>
                        </div>
                        <div className="flex items-center gap-2">
                          <Globe className="w-3 h-3" />
                          <span className="truncate max-w-[300px]">{key.apiEndpoint}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Cpu className="w-3 h-3" />
                          <span>{key.model}</span>
                        </div>
                        <div className="text-xs text-gray-400">
                          添加于 {new Date(key.createdAt).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      {settings.activeKeyId === key.id ? (
                        <button
                          onClick={handleDeactivateKey}
                          className="p-2 text-orange-500 hover:bg-orange-50 rounded-lg transition-colors"
                          title="停用"
                        >
                          <PowerOff className="w-4 h-4" />
                        </button>
                      ) : (
                        <button
                          onClick={() => handleActivateKey(key)}
                          className="p-2 text-green-500 hover:bg-green-50 rounded-lg transition-colors"
                          title="启用"
                        >
                          <Power className="w-4 h-4" />
                        </button>
                      )}
                      <button
                        onClick={() => openEditKeyModal(key)}
                        className="p-2 text-blue-500 hover:bg-blue-50 rounded-lg transition-colors"
                        title="编辑"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => {
                          if (confirm('确定要删除这个密钥吗？')) {
                            deleteApiKey(key.id)
                          }
                        }}
                        className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                        title="删除"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 快速配置（当没有激活的密钥时显示） */}
        <div className="bg-white rounded-2xl shadow-sm p-6">
          <h2 className="text-lg font-bold text-gray-800 mb-6">
            {settings.activeKeyId ? '当前配置' : '快速配置'}
          </h2>

          {/* API Key */}
          <div className="mb-6">
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
              <Key className="w-4 h-4" />
              API Key
            </label>
            <div className="relative">
              <input
                type={showApiKey ? 'text' : 'password'}
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="输入你的 API Key"
                className="w-full px-4 py-3 pr-12 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
              <button
                onClick={() => setShowApiKey(!showApiKey)}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600"
              >
                {showApiKey ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
            <p className="text-xs text-gray-400 mt-1">
              你的 API Key 将安全地存储在本地
            </p>
          </div>

          {/* API Endpoint */}
          <div className="mb-6">
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
              <Globe className="w-4 h-4" />
              API 端点
            </label>
            <div className="flex flex-wrap gap-2 mb-2">
              {presetEndpoints.map((preset) => (
                <button
                  key={preset.label}
                  onClick={() => preset.value && setApiEndpoint(preset.value)}
                  className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
                    apiEndpoint === preset.value
                      ? 'bg-primary-100 text-primary-600'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {preset.label}
                </button>
              ))}
            </div>
            <input
              type="text"
              value={apiEndpoint}
              onChange={(e) => setApiEndpoint(e.target.value)}
              placeholder="https://api.openai.com/v1"
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>

          {/* Model */}
          <div className="mb-8">
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
              <Cpu className="w-4 h-4" />
              模型
            </label>
            <div className="flex flex-wrap gap-2 mb-2">
              {presetModels.map((preset) => (
                <button
                  key={preset.value}
                  onClick={() => setModel(preset.value)}
                  className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
                    model === preset.value
                      ? 'bg-primary-100 text-primary-600'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {preset.label}
                </button>
              ))}
            </div>
            <input
              type="text"
              value={model}
              onChange={(e) => setModel(e.target.value)}
              placeholder="gpt-4"
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>

          {/* 保存按钮 */}
          <button
            onClick={handleSave}
            className="w-full py-3 bg-gradient-to-r from-primary-500 to-purple-600 text-white rounded-xl hover:shadow-lg transition-all flex items-center justify-center gap-2"
          >
            {saved ? (
              <>
                <CheckCircle className="w-5 h-5" />
                已保存
              </>
            ) : (
              <>
                <Save className="w-5 h-5" />
                保存设置
              </>
            )}
          </button>
        </div>

        {/* 使用说明 */}
        <div className="mt-6 bg-blue-50 rounded-2xl p-6">
          <h3 className="font-bold text-blue-800 mb-3">使用说明</h3>
          <ul className="space-y-2 text-sm text-blue-700">
            <li>• 本应用支持多种国内外 AI 服务，选择对应端点后填入 API Key 即可</li>
            <li>• <strong>国内推荐</strong>：智谱AI、通义千问、DeepSeek、月之暗面等</li>
            <li>• <strong>免费额度</strong>：智谱AI、DeepSeek 等平台提供免费试用额度</li>
            <li>• 选择端点后，请在模型列表中选择对应平台的模型</li>
            <li>• 所有数据都存储在本地，不会上传到任何服务器</li>
          </ul>
        </div>

        {/* 获取 API Key 指引 */}
        <div className="mt-4 bg-green-50 rounded-2xl p-6">
          <h3 className="font-bold text-green-800 mb-3">如何获取 API Key</h3>
          <ul className="space-y-2 text-sm text-green-700">
            <li>• <strong>智谱AI</strong>：访问 open.bigmodel.cn 注册获取</li>
            <li>• <strong>通义千问</strong>：访问 dashscope.console.aliyun.com 开通</li>
            <li>• <strong>DeepSeek</strong>：访问 platform.deepseek.com 注册</li>
            <li>• <strong>月之暗面</strong>：访问 platform.moonshot.cn 注册</li>
            <li>• <strong>讯飞星火</strong>：访问 xinghuo.xfyun.cn 开通</li>
            <li>• <strong>SiliconFlow</strong>：访问 siliconflow.cn 注册（聚合多模型）</li>
          </ul>
        </div>
      </div>

      {/* 添加/编辑密钥弹窗 */}
      {showKeyModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold text-gray-800">
                {editingKey ? '编辑密钥' : '添加密钥'}
              </h3>
              <button
                onClick={() => setShowKeyModal(false)}
                className="p-2 text-gray-400 hover:text-gray-600 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              {/* 名称 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  名称 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={keyForm.name}
                  onChange={(e) => setKeyForm({ ...keyForm, name: e.target.value })}
                  placeholder="例如：我的 DeepSeek 密钥"
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>

              {/* API Key */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  API Key <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type={showKeyFormApiKey ? 'text' : 'password'}
                    value={keyForm.apiKey}
                    onChange={(e) => setKeyForm({ ...keyForm, apiKey: e.target.value })}
                    placeholder="输入 API Key"
                    className="w-full px-4 py-3 pr-12 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                  <button
                    onClick={() => setShowKeyFormApiKey(!showKeyFormApiKey)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600"
                  >
                    {showKeyFormApiKey ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              {/* API 端点 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  API 端点
                </label>
                <select
                  value={keyForm.apiEndpoint}
                  onChange={(e) => setKeyForm({ ...keyForm, apiEndpoint: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white"
                >
                  {presetEndpoints.filter(p => p.value).map((preset) => (
                    <option key={preset.label} value={preset.value}>
                      {preset.label}
                    </option>
                  ))}
                </select>
                <input
                  type="text"
                  value={keyForm.apiEndpoint}
                  onChange={(e) => setKeyForm({ ...keyForm, apiEndpoint: e.target.value })}
                  placeholder="或输入自定义端点"
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 mt-2"
                />
              </div>

              {/* 模型 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  模型
                </label>
                <select
                  value={keyForm.model}
                  onChange={(e) => setKeyForm({ ...keyForm, model: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white"
                >
                  {presetModels.map((preset) => (
                    <option key={preset.value} value={preset.value}>
                      {preset.label}
                    </option>
                  ))}
                </select>
                <input
                  type="text"
                  value={keyForm.model}
                  onChange={(e) => setKeyForm({ ...keyForm, model: e.target.value })}
                  placeholder="或输入自定义模型名称"
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 mt-2"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowKeyModal(false)}
                className="flex-1 py-3 border border-gray-200 text-gray-600 rounded-xl hover:bg-gray-50 transition-colors"
              >
                取消
              </button>
              <button
                onClick={handleSaveKey}
                className="flex-1 py-3 bg-gradient-to-r from-primary-500 to-purple-600 text-white rounded-xl hover:shadow-lg transition-all"
              >
                {editingKey ? '保存修改' : '添加密钥'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
