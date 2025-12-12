import { useState, useEffect } from 'react'
import { Copy, Check, ArrowRight, Sparkles, X, AlertCircle } from 'lucide-react'

interface ManualModeModalProps {
  isOpen: boolean
  onClose: () => void
  prompt: string
  title: string
  description: string
  onResult: (result: string) => void
  parseResult: (result: string) => { success: boolean; error?: string }
}

export default function ManualModeModal({
  isOpen,
  onClose,
  prompt,
  title,
  description,
  onResult,
  parseResult
}: ManualModeModalProps) {
  const [step, setStep] = useState<1 | 2>(1)
  const [copied, setCopied] = useState(false)
  const [resultText, setResultText] = useState('')
  const [parseError, setParseError] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)

  // 重置状态
  useEffect(() => {
    if (isOpen) {
      setStep(1)
      setCopied(false)
      setResultText('')
      setParseError('')
      setIsProcessing(false)
    }
  }, [isOpen])

  // 自动复制提示词
  useEffect(() => {
    if (isOpen && step === 1 && prompt) {
      navigator.clipboard.writeText(prompt).then(() => {
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
      })
    }
  }, [isOpen, step, prompt])

  const handleCopyPrompt = async () => {
    await navigator.clipboard.writeText(prompt)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleNextStep = () => {
    setStep(2)
  }

  const handleApplyResult = async () => {
    if (!resultText.trim()) {
      setParseError('请粘贴 AI 的回复内容')
      return
    }

    setIsProcessing(true)
    setParseError('')

    try {
      const validation = parseResult(resultText)
      if (!validation.success) {
        setParseError(validation.error || '解析失败，请检查内容格式')
        setIsProcessing(false)
        return
      }

      onResult(resultText)
      onClose()
    } catch (err) {
      setParseError(err instanceof Error ? err.message : '解析失败')
    } finally {
      setIsProcessing(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 animate-fadeIn">
      <div className="bg-white rounded-2xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-hidden flex flex-col">
        {/* 头部 */}
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <div>
            <h3 className="text-lg font-bold text-gray-800">{title}</h3>
            <p className="text-sm text-gray-500 mt-1">{description}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 步骤指示器 */}
        <div className="flex items-center justify-center gap-4 py-4 bg-gray-50">
          <div className={`flex items-center gap-2 ${step === 1 ? 'text-primary-600' : 'text-gray-400'}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
              step === 1 ? 'bg-primary-500 text-white' : 'bg-gray-200 text-gray-500'
            }`}>
              1
            </div>
            <span className="text-sm font-medium">复制提示词</span>
          </div>
          <ArrowRight className="w-4 h-4 text-gray-300" />
          <div className={`flex items-center gap-2 ${step === 2 ? 'text-primary-600' : 'text-gray-400'}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
              step === 2 ? 'bg-primary-500 text-white' : 'bg-gray-200 text-gray-500'
            }`}>
              2
            </div>
            <span className="text-sm font-medium">粘贴结果</span>
          </div>
        </div>

        {/* 内容区域 */}
        <div className="flex-1 overflow-y-auto p-6">
          {step === 1 ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-sm text-gray-600">
                  请将以下提示词复制到 <strong>豆包</strong>、<strong>元宝</strong> 或其他 AI 工具：
                </p>
                <button
                  onClick={handleCopyPrompt}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-all ${
                    copied
                      ? 'bg-green-100 text-green-600'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {copied ? (
                    <>
                      <Check className="w-4 h-4" />
                      已复制
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4" />
                      复制
                    </>
                  )}
                </button>
              </div>
              
              <div className="bg-gray-50 rounded-xl p-4 max-h-[300px] overflow-y-auto">
                <pre className="text-sm text-gray-700 whitespace-pre-wrap font-mono">
                  {prompt}
                </pre>
              </div>

              <div className="bg-blue-50 rounded-xl p-4">
                <h4 className="font-medium text-blue-800 mb-2 flex items-center gap-2">
                  <Sparkles className="w-4 h-4" />
                  推荐的 AI 工具
                </h4>
                <div className="flex flex-wrap gap-2">
                  <span className="px-3 py-1 bg-white text-blue-700 rounded-full text-sm">豆包</span>
                  <span className="px-3 py-1 bg-white text-blue-700 rounded-full text-sm">腾讯元宝</span>
                  <span className="px-3 py-1 bg-white text-blue-700 rounded-full text-sm">Kimi</span>
                  <span className="px-3 py-1 bg-white text-blue-700 rounded-full text-sm">通义千问</span>
                  <span className="px-3 py-1 bg-white text-blue-700 rounded-full text-sm">文心一言</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-sm text-gray-600">
                请将 AI 的回复内容粘贴到下方：
              </p>
              
              <textarea
                value={resultText}
                onChange={(e) => {
                  setResultText(e.target.value)
                  setParseError('')
                }}
                placeholder="粘贴 AI 的回复内容..."
                className="w-full h-[300px] px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none font-mono text-sm"
              />

              {parseError && (
                <div className="flex items-start gap-2 p-3 bg-red-50 text-red-600 rounded-xl">
                  <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium">解析失败</p>
                    <p className="text-sm mt-1">{parseError}</p>
                  </div>
                </div>
              )}

              <div className="bg-yellow-50 rounded-xl p-4">
                <h4 className="font-medium text-yellow-800 mb-2">注意事项</h4>
                <ul className="text-sm text-yellow-700 space-y-1">
                  <li>• 请确保复制完整的 AI 回复内容</li>
                  <li>• 回复内容应包含 JSON 格式的数据</li>
                  <li>• 如果解析失败，请检查是否遗漏了部分内容</li>
                </ul>
              </div>
            </div>
          )}
        </div>

        {/* 底部按钮 */}
        <div className="flex gap-3 p-6 border-t border-gray-100">
          {step === 1 ? (
            <>
              <button
                onClick={onClose}
                className="flex-1 py-3 border border-gray-200 text-gray-600 rounded-xl hover:bg-gray-50 transition-colors"
              >
                取消
              </button>
              <button
                onClick={handleNextStep}
                className="flex-1 py-3 bg-gradient-to-r from-primary-500 to-purple-600 text-white rounded-xl hover:shadow-lg transition-all flex items-center justify-center gap-2"
              >
                已复制，下一步
                <ArrowRight className="w-4 h-4" />
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => setStep(1)}
                className="flex-1 py-3 border border-gray-200 text-gray-600 rounded-xl hover:bg-gray-50 transition-colors"
              >
                返回上一步
              </button>
              <button
                onClick={handleApplyResult}
                disabled={isProcessing || !resultText.trim()}
                className="flex-1 py-3 bg-gradient-to-r from-primary-500 to-purple-600 text-white rounded-xl hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isProcessing ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    解析中...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    解析并应用
                  </>
                )}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
