import { useState } from 'react'
import { useStore } from '../store/useStore'
import type { ApiKeyConfig } from '../types'
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
  X
} from 'lucide-react'

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
