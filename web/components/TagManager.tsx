'use client'

import { useState, useEffect } from 'react'
import { X, Plus, Edit2, Trash2, Tag as TagIcon } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { createProveChainBrowserClient } from '@/lib/supabase/provechain-browser'

interface Tag {
  id: string
  name: string
  color: string
  created_at: string
}

const TAG_COLORS = [
  { name: 'Purple', value: '#8B5CF6' },
  { name: 'Blue', value: '#3B82F6' },
  { name: 'Green', value: '#10B981' },
  { name: 'Yellow', value: '#F59E0B' },
  { name: 'Red', value: '#EF4444' },
  { name: 'Pink', value: '#EC4899' },
  { name: 'Indigo', value: '#6366F1' },
  { name: 'Teal', value: '#14B8A6' },
  { name: 'Orange', value: '#F97316' },
  { name: 'Gray', value: '#6B7280' },
]

interface TagManagerProps {
  isOpen: boolean
  onClose: () => void
  onTagsUpdated?: () => void
}

export default function TagManager({ isOpen, onClose, onTagsUpdated }: TagManagerProps) {
  const [tags, setTags] = useState<Tag[]>([])
  const [isCreating, setIsCreating] = useState(false)
  const [editingTag, setEditingTag] = useState<Tag | null>(null)
  const [newTagName, setNewTagName] = useState('')
  const [newTagColor, setNewTagColor] = useState(TAG_COLORS[0].value)
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const supabase = createClient()
  const dataClient = createProveChainBrowserClient()

  useEffect(() => {
    if (isOpen) {
      fetchTags()
    }
  }, [isOpen])

  const fetchTags = async () => {
    try {
      const { data, error } = await dataClient
        .from('tags')
        .select('*')
        .order('name')
      if (error) {
        setError(error.message)
      } else {
        setTags(data || [])
      }
    } catch (err: any) {
      setError(err.message)
    }
  }

  const handleCreateTag = async () => {
    if (!newTagName.trim()) {
      setError('Tag name is required')
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/tags', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newTagName.trim(),
          color: newTagColor,
        }),
      })

      const data = await response.json()

      if (data.success) {
        setTags([...tags, data.tag])
        setNewTagName('')
        setNewTagColor(TAG_COLORS[0].value)
        setIsCreating(false)
        onTagsUpdated?.()
      } else {
        setError(data.error || 'Failed to create tag')
      }
    } catch (err: any) {
      setError(err.message)
    } finally {
      setIsLoading(false)
    }
  }

  const handleUpdateTag = async () => {
    if (!editingTag) return

    if (!newTagName.trim()) {
      setError('Tag name is required')
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/tags/${editingTag.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newTagName.trim(),
          color: newTagColor,
        }),
      })

      const data = await response.json()

      if (data.success) {
        setTags(tags.map(t => t.id === editingTag.id ? data.tag : t))
        setEditingTag(null)
        setNewTagName('')
        setNewTagColor(TAG_COLORS[0].value)
        onTagsUpdated?.()
      } else {
        setError(data.error || 'Failed to update tag')
      }
    } catch (err: any) {
      setError(err.message)
    } finally {
      setIsLoading(false)
    }
  }

  const handleDeleteTag = async (tagId: string) => {
    if (!confirm('Are you sure you want to delete this tag? It will be removed from all proofs.')) {
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/tags/${tagId}`, {
        method: 'DELETE',
      })

      const data = await response.json()

      if (data.success) {
        setTags(tags.filter(t => t.id !== tagId))
        onTagsUpdated?.()
      } else {
        setError(data.error || 'Failed to delete tag')
      }
    } catch (err: any) {
      setError(err.message)
    } finally {
      setIsLoading(false)
    }
  }

  const startEditing = (tag: Tag) => {
    setEditingTag(tag)
    setNewTagName(tag.name)
    setNewTagColor(tag.color)
    setIsCreating(false)
  }

  const cancelEditing = () => {
    setEditingTag(null)
    setIsCreating(false)
    setNewTagName('')
    setNewTagColor(TAG_COLORS[0].value)
    setError(null)
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-background border-2 border-primary/30 rounded-lg shadow-xl max-w-2xl w-full max-h-[80vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border">
          <div className="flex items-center gap-2">
            <TagIcon className="w-5 h-5 text-primary" />
            <h2 className="text-xl font-semibold">Manage Tags</h2>
          </div>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {error && (
            <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">
              {error}
            </div>
          )}

          {/* Create/Edit Form */}
          {(isCreating || editingTag) && (
            <div className="mb-6 p-4 border border-border rounded-lg bg-muted/50">
              <h3 className="text-sm font-medium mb-3">
                {editingTag ? 'Edit Tag' : 'Create New Tag'}
              </h3>

              <div className="space-y-3">
                <div>
                  <label className="text-sm text-muted-foreground mb-1.5 block">
                    Tag Name
                  </label>
                  <input
                    type="text"
                    value={newTagName}
                    onChange={(e) => setNewTagName(e.target.value)}
                    placeholder="Enter tag name..."
                    maxLength={50}
                    className="w-full px-3 py-2 rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary/50"
                    disabled={isLoading}
                  />
                  <div className="text-xs text-muted-foreground mt-1">
                    {newTagName.length}/50 characters
                  </div>
                </div>

                <div>
                  <label className="text-sm text-muted-foreground mb-1.5 block">
                    Color
                  </label>
                  <div className="grid grid-cols-5 sm:grid-cols-10 gap-2">
                    {TAG_COLORS.map((color) => (
                      <button
                        key={color.value}
                        type="button"
                        onClick={() => setNewTagColor(color.value)}
                        className={`w-10 h-10 rounded-lg border-2 transition-all ${
                          newTagColor === color.value
                            ? 'border-foreground scale-110'
                            : 'border-transparent hover:scale-105'
                        }`}
                        style={{ backgroundColor: color.value }}
                        title={color.name}
                        disabled={isLoading}
                      />
                    ))}
                  </div>
                </div>

                <div className="flex justify-between gap-2 pt-2">
                  <button
                    onClick={cancelEditing}
                    disabled={isLoading}
                    className="px-4 py-2 border border-border rounded-lg hover:bg-muted transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={editingTag ? handleUpdateTag : handleCreateTag}
                    disabled={isLoading || !newTagName.trim()}
                    className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {isLoading ? 'Saving...' : editingTag ? 'Update Tag' : 'Create Tag'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Create Button */}
          {!isCreating && !editingTag && (
            <button
              onClick={() => setIsCreating(true)}
              className="mb-4 w-full px-4 py-3 border-2 border-dashed border-border rounded-lg hover:border-primary hover:bg-primary/5 transition-colors flex items-center justify-center gap-2 text-muted-foreground hover:text-primary"
            >
              <Plus className="w-5 h-5" />
              <span>Create New Tag</span>
            </button>
          )}

          {/* Tags List */}
          {tags.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <TagIcon className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>No tags yet. Create your first tag to get started!</p>
            </div>
          ) : (
            <div className="space-y-2">
              {tags.map((tag) => (
                <div
                  key={tag.id}
                  className="flex items-center justify-between p-3 border border-border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="w-4 h-4 rounded"
                      style={{ backgroundColor: tag.color }}
                    />
                    <span className="font-medium">{tag.name}</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => startEditing(tag)}
                      disabled={isLoading}
                      className="p-2 hover:bg-background rounded-lg transition-colors text-muted-foreground hover:text-foreground"
                      title="Edit tag"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteTag(tag.id)}
                      disabled={isLoading}
                      className="p-2 hover:bg-background rounded-lg transition-colors text-muted-foreground hover:text-red-600 hover:text-red-400"
                      title="Delete tag"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-border bg-muted/30">
          <button
            onClick={onClose}
            className="w-full px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  )
}
