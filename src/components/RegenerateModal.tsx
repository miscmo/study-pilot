import { useState } from 'react'
import Modal, { ModalFooter } from './Modal'
import { MessageSquare } from 'lucide-react'

interface RegenerateModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: (note: string) => void
  taskTitle?: string
}

export default function RegenerateModal({ 
  isOpen, 
  onClose, 
  onConfirm, 
  taskTitle 
}: RegenerateModalProps) {
  const [note, setNote] = useState('')

  const handleConfirm = () => {
    onConfirm(note)
    setNote('')
  }

  const handleClose = () => {
    setNote('')
    onClose()
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={`重新生成${taskTitle ? `「${taskTitle}」` : '全部任务'}`}
      footer={
        <ModalFooter
          onCancel={handleClose}
          onConfirm={handleConfirm}
          confirmText="确认重新生成"
        />
      }
    >
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          <MessageSquare className="w-4 h-4 inline mr-1" />
          备注说明（可选）
        </label>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="告诉 AI 你希望怎样调整..."
          rows={4}
          className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all resize-none"
        />
      </div>
    </Modal>
  )
}
