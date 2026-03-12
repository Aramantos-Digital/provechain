'use client'

import { useState, useEffect } from 'react'
import { X, FileText, Calendar } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

interface ProofDetailsModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (data: ProofDetailsData) => void
  initialData?: ProofDetailsData
  defaultProofName?: string
}

export interface ProofDetailsData {
  proof_name: string
  description_title?: string
  description_body?: string
  official_document_date?: string
}

export default function ProofDetailsModal({
  isOpen,
  onClose,
  onSave,
  initialData,
  defaultProofName = '',
}: ProofDetailsModalProps) {
  const [formData, setFormData] = useState<ProofDetailsData>({
    proof_name: initialData?.proof_name || defaultProofName,
    description_title: initialData?.description_title || '',
    description_body: initialData?.description_body || '',
    official_document_date: initialData?.official_document_date || '',
  })

  // Update form data when modal opens with new default values
  useEffect(() => {
    if (isOpen) {
      setFormData({
        proof_name: initialData?.proof_name || defaultProofName,
        description_title: initialData?.description_title || '',
        description_body: initialData?.description_body || '',
        official_document_date: initialData?.official_document_date || '',
      })
    }
  }, [isOpen, defaultProofName, initialData])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    // Ensure proof_name is not empty
    if (!formData.proof_name.trim()) {
      alert('Proof name is required')
      return
    }

    onSave(formData)
  }

  const handleSkip = () => {
    // If skipping, use default name or keep existing
    onSave({
      proof_name: formData.proof_name || defaultProofName,
    })
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="bg-card border-2 border-primary/30 rounded-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl"
          >
            {/* Header */}
            <div className="flex items-start justify-between mb-6">
              <div>
                <h3 className="text-2xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                  {initialData ? 'Edit Proof Details' : 'Add Proof Details'}
                </h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Add context to help you identify this proof later
                </p>
              </div>
              <button
                onClick={onClose}
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Proof Name */}
              <div>
                <label className="block text-sm font-medium mb-2 flex items-center gap-2">
                  <FileText className="h-4 w-4 text-primary" />
                  Proof Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.proof_name}
                  onChange={(e) => setFormData({ ...formData, proof_name: e.target.value })}
                  placeholder="e.g., Johns Mortgage Contract"
                  className="w-full px-4 py-3 rounded-lg border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  required
                />
                <p className="text-xs text-muted-foreground mt-1">
                  What is this proof for? (Required)
                </p>
              </div>

              {/* Description Title */}
              <div>
                <label className="block text-sm font-medium mb-2 flex items-center gap-2">
                  <FileText className="h-4 w-4 text-blue-400" />
                  Description Title <span className="text-muted-foreground">(Optional)</span>
                </label>
                <input
                  type="text"
                  value={formData.description_title}
                  onChange={(e) => setFormData({ ...formData, description_title: e.target.value })}
                  placeholder="e.g., Property purchase agreement"
                  className="w-full px-4 py-3 rounded-lg border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  maxLength={200}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Short description shown on proof cards (max 200 characters)
                </p>
              </div>

              {/* Description Body */}
              <div>
                <label className="block text-sm font-medium mb-2 flex items-center gap-2">
                  <FileText className="h-4 w-4 text-purple-400" />
                  Full Description <span className="text-muted-foreground">(Optional)</span>
                </label>
                <textarea
                  value={formData.description_body}
                  onChange={(e) => setFormData({ ...formData, description_body: e.target.value })}
                  placeholder="Add detailed notes about this proof..."
                  rows={4}
                  className="w-full px-4 py-3 rounded-lg border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                  maxLength={2000}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Full description visible in the info modal (max 2000 characters)
                </p>
              </div>

              {/* Official Document Date */}
              <div>
                <label className="block text-sm font-medium mb-2 flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-green-400" />
                  Official Document Date <span className="text-muted-foreground">(Optional)</span>
                </label>
                <input
                  type="datetime-local"
                  value={formData.official_document_date}
                  onChange={(e) => setFormData({ ...formData, official_document_date: e.target.value })}
                  className="w-full px-4 py-3 rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  When was this document originally created or signed? (e.g., contract signing date)
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-4 border-t border-border">
                {!initialData && (
                  <button
                    type="button"
                    onClick={handleSkip}
                    className="flex-1 px-4 py-3 rounded-lg border border-border hover:bg-accent transition-colors font-medium"
                  >
                    <span className="hidden sm:inline">Skip for Now</span>
                    <span className="sm:hidden">Skip</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 px-4 py-3 rounded-lg border border-border hover:bg-accent transition-colors font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-3 rounded-lg bg-purple-600 hover:bg-purple-700 text-white font-medium transition-all shadow-lg"
                >
                  <span className="hidden sm:inline">{initialData ? 'Update Details' : 'Save Details'}</span>
                  <span className="sm:hidden">Save</span>
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}
