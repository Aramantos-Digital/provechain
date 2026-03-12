'use client'

import { motion } from 'framer-motion'
import { X, AlertTriangle, Trash2, Info } from 'lucide-react'

interface ConfirmModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  title: string
  message: string
  confirmText?: string
  cancelText?: string
  variant?: 'danger' | 'warning' | 'info'
  isLoading?: boolean
}

/**
 * Reusable confirmation modal component
 * Replaces browser confirm() dialogs with styled modals
 */
export default function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  variant = 'info',
  isLoading = false,
}: ConfirmModalProps) {
  if (!isOpen) return null

  const variants = {
    danger: {
      gradient: 'from-red-500 to-orange-500',
      border: 'border-red-500/30',
      icon: Trash2,
      iconColor: 'text-red-500',
      buttonBg: 'bg-red-500 hover:bg-red-600',
    },
    warning: {
      gradient: 'from-yellow-500 to-orange-500',
      border: 'border-yellow-500/30',
      icon: AlertTriangle,
      iconColor: 'text-yellow-500',
      buttonBg: 'bg-yellow-500 hover:bg-yellow-600',
    },
    info: {
      gradient: 'from-blue-500 to-purple-500',
      border: 'border-blue-500/30',
      icon: Info,
      iconColor: 'text-blue-500',
      buttonBg: 'bg-purple-600 hover:bg-purple-700',
    },
  }

  const config = variants[variant]
  const Icon = config.icon

  return (
    <div
      className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[100] p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ duration: 0.2 }}
        className={`bg-card border-2 ${config.border} rounded-xl p-6 max-w-md w-full shadow-2xl`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg bg-${variant === 'danger' ? 'red' : variant === 'warning' ? 'yellow' : 'blue'}-500/10`}>
              <Icon className={`w-6 h-6 ${config.iconColor}`} />
            </div>
            <h2 className={`text-xl font-bold bg-gradient-to-r ${config.gradient} bg-clip-text text-transparent`}>
              {title}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground transition-colors"
            disabled={isLoading}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Message */}
        <p className="text-sm text-muted-foreground mb-6">
          {message}
        </p>

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={onClose}
            disabled={isLoading}
            className="flex-1 px-4 py-2 rounded-lg frost-light border border-white/10 hover:frost-warm transition-all font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {cancelText}
          </button>
          <button
            onClick={() => {
              onConfirm()
              // Don't auto-close - let the parent handle it after async operations
            }}
            disabled={isLoading}
            className={`flex-1 px-4 py-2 rounded-lg ${config.buttonBg} text-white transition-all font-semibold disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            {isLoading ? 'Processing...' : confirmText}
          </button>
        </div>
      </motion.div>
    </div>
  )
}
