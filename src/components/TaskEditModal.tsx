import { useState } from 'react'
import type { TaskItem, Resource, Deliverable } from '../types'
import Modal, { ModalFooter } from './Modal'
import { Plus, Trash2, Save } from 'lucide-react'

interface TaskEditModalProps {
  task: TaskItem
  onSave: (updated: TaskItem) => void
  onClose: () => void
}

export default function TaskEditModal({ task, onSave, onClose }: TaskEditModalProps) {
  const [title, setTitle] = useState(task.title)
  const [description, setDescription] = useState(task.description)
  const [difficulty, setDifficulty] = useState(task.difficulty)
  const [estimatedMinutes, setEstimatedMinutes] = useState(task.estimatedMinutes)
  const [resources, setResources] = useState<Resource[]>(task.resources)
  const [deliverableTitle, setDeliverableTitle] = useState(task.deliverable.title)
  const [deliverableDesc, setDeliverableDesc] = useState(task.deliverable.description)
  const [deliverableType, setDeliverableType] = useState(task.deliverable.type)

  const handleSave = () => {
    onSave({
      ...task,
      title,
      description,
      difficulty,
      estimatedMinutes,
      resources,
      deliverable: {
        ...task.deliverable,
        title: deliverableTitle,
        description: deliverableDesc,
        type: deliverableType
      }
    })
  }

  const addResource = () => {
    setResources([...resources, {
      id: `resource-${Date.now()}`,
      title: '',
      type: 'article',
      description: '',
      url: ''
    }])
  }

  const updateResource = (index: number, field: keyof Resource, value: string) => {
    const updated = [...resources]
    updated[index] = { ...updated[index], [field]: value }
    setResources(updated)
  }

  const removeResource = (index: number) => {
    setResources(resources.filter((_, i) => i !== index))
  }

  return (
    <Modal
      isOpen={true}
      onClose={onClose}
      title="编辑任务"
      maxWidth="2xl"
      footer={
        <ModalFooter
          onCancel={onClose}
          onConfirm={handleSave}
          confirmText="保存"
          confirmIcon={<Save className="w-4 h-4" />}
        />
      }
    >
      <div className="space-y-4">
        {/* 任务标题 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">任务标题</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        </div>

        {/* 任务描述 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">任务描述</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
          />
        </div>

        {/* 难度和时间 */}
        <div className="flex gap-4">
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-1">难度</label>
            <select
              value={difficulty}
              onChange={(e) => setDifficulty(e.target.value as TaskItem['difficulty'])}
              className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white"
            >
              <option value="basic">基础</option>
              <option value="intermediate">进阶</option>
              <option value="advanced">挑战</option>
            </select>
          </div>
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-1">预计时间（分钟）</label>
            <input
              type="number"
              min="1"
              value={estimatedMinutes}
              onChange={(e) => setEstimatedMinutes(parseInt(e.target.value) || 20)}
              className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
        </div>

        {/* 参考资料 */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm font-medium text-gray-700">参考资料</label>
            <button
              onClick={addResource}
              className="text-xs text-primary-600 hover:text-primary-700 flex items-center gap-1"
            >
              <Plus className="w-3 h-3" />
              添加资料
            </button>
          </div>
          <div className="space-y-2">
            {resources.map((resource, index) => (
              <div key={resource.id} className="p-3 bg-gray-50 rounded-lg space-y-2">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={resource.title}
                    onChange={(e) => updateResource(index, 'title', e.target.value)}
                    placeholder="资料标题"
                    className="flex-1 px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                  <select
                    value={resource.type}
                    onChange={(e) => updateResource(index, 'type', e.target.value)}
                    className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white"
                  >
                    <option value="article">文章</option>
                    <option value="video">视频</option>
                    <option value="book">书籍</option>
                    <option value="documentation">文档</option>
                    <option value="practice">练习</option>
                  </select>
                  <button
                    onClick={() => removeResource(index)}
                    className="p-1.5 text-red-400 hover:text-red-500 hover:bg-red-50 rounded-lg"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
                <input
                  type="text"
                  value={resource.url || ''}
                  onChange={(e) => updateResource(index, 'url', e.target.value)}
                  placeholder="链接（可选）"
                  className="w-full px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
            ))}
            {resources.length === 0 && (
              <p className="text-xs text-gray-400 text-center py-2">暂无参考资料</p>
            )}
          </div>
        </div>

        {/* 验收成果 */}
        <div className="p-4 bg-blue-50 rounded-xl space-y-3">
          <h4 className="text-sm font-medium text-blue-800">验收成果</h4>
          <div>
            <label className="block text-xs text-blue-600 mb-1">成果标题</label>
            <input
              type="text"
              value={deliverableTitle}
              onChange={(e) => setDeliverableTitle(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-blue-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            />
          </div>
          <div>
            <label className="block text-xs text-blue-600 mb-1">成果描述</label>
            <textarea
              value={deliverableDesc}
              onChange={(e) => setDeliverableDesc(e.target.value)}
              rows={2}
              className="w-full px-3 py-2 text-sm border border-blue-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white resize-none"
            />
          </div>
          <div>
            <label className="block text-xs text-blue-600 mb-1">成果类型</label>
            <select
              value={deliverableType}
              onChange={(e) => setDeliverableType(e.target.value as Deliverable['type'])}
              className="w-full px-3 py-2 text-sm border border-blue-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            >
              <option value="note">笔记</option>
              <option value="code">代码</option>
              <option value="project">项目</option>
              <option value="quiz">测验</option>
              <option value="summary">总结</option>
            </select>
          </div>
        </div>
      </div>
    </Modal>
  )
}
