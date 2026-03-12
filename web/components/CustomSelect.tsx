'use client'

import { useState, useRef, useEffect } from 'react'
import { ChevronDown } from 'lucide-react'

export interface SelectOption {
  value: string
  label: string
  sublabel?: string
  icon?: React.ReactNode
}

interface CustomSelectProps {
  options: SelectOption[]
  value: string
  onChange: (value: string) => void
  placeholder?: string
  placeholderIcon?: React.ReactNode
  color?: 'teal' | 'orange' | 'blue' | 'purple' | 'cyan' | 'slate'
  size?: 'sm' | 'md'
  className?: string
}

const colorMap = {
  teal: {
    border: 'border-teal-500/30',
    borderHover: 'hover:border-teal-500/50',
    borderActive: 'border-teal-500/50',
    bg: 'bg-teal-500/10',
    bgHover: 'hover:bg-teal-500/20',
    bgSelected: 'bg-teal-500/15',
    text: 'text-teal-400',
    ring: 'focus-visible:ring-teal-500/50',
    panel: 'border-teal-500/20',
  },
  orange: {
    border: 'border-orange-500/30',
    borderHover: 'hover:border-orange-500/50',
    borderActive: 'border-orange-500/50',
    bg: 'bg-orange-500/10',
    bgHover: 'hover:bg-orange-500/20',
    bgSelected: 'bg-orange-500/15',
    text: 'text-orange-400',
    ring: 'focus-visible:ring-orange-500/50',
    panel: 'border-orange-500/20',
  },
  blue: {
    border: 'border-blue-500/30',
    borderHover: 'hover:border-blue-500/50',
    borderActive: 'border-blue-500/50',
    bg: 'bg-blue-500/10',
    bgHover: 'hover:bg-blue-500/20',
    bgSelected: 'bg-blue-500/15',
    text: 'text-blue-400',
    ring: 'focus-visible:ring-blue-500/50',
    panel: 'border-blue-500/20',
  },
  purple: {
    border: 'border-purple-500/30',
    borderHover: 'hover:border-purple-500/50',
    borderActive: 'border-purple-500/50',
    bg: 'bg-purple-500/10',
    bgHover: 'hover:bg-purple-500/20',
    bgSelected: 'bg-purple-500/15',
    text: 'text-purple-400',
    ring: 'focus-visible:ring-purple-500/50',
    panel: 'border-purple-500/20',
  },
  cyan: {
    border: 'border-cyan-500/30',
    borderHover: 'hover:border-cyan-500/50',
    borderActive: 'border-cyan-500/50',
    bg: 'bg-cyan-500/10',
    bgHover: 'hover:bg-cyan-500/20',
    bgSelected: 'bg-cyan-500/15',
    text: 'text-cyan-400',
    ring: 'focus-visible:ring-cyan-500/50',
    panel: 'border-cyan-500/20',
  },
  slate: {
    border: 'border-slate-600/50',
    borderHover: 'hover:border-slate-500/50',
    borderActive: 'border-slate-500/50',
    bg: 'bg-slate-800',
    bgHover: 'hover:bg-slate-700',
    bgSelected: 'bg-slate-700',
    text: 'text-slate-300',
    ring: 'focus-visible:ring-slate-500/50',
    panel: 'border-slate-600/50',
  },
}

export default function CustomSelect({
  options,
  value,
  onChange,
  placeholder = 'Select...',
  placeholderIcon,
  color = 'slate',
  size = 'sm',
  className = '',
}: CustomSelectProps) {
  const [isOpen, setIsOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const c = colorMap[color]

  const selected = options.find(o => o.value === value)
  const displayLabel = selected?.label || placeholder
  const displayIcon = selected?.icon || placeholderIcon

  // Close on click outside
  useEffect(() => {
    if (!isOpen) return
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [isOpen])

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setIsOpen(false)
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [isOpen])

  const padding = size === 'sm' ? 'px-2 py-1.5 text-sm' : 'px-3 py-2 text-sm'
  const optionPadding = size === 'sm' ? 'px-2.5 py-1.5 text-sm' : 'px-3 py-2 text-sm'

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`inline-flex items-center gap-1.5 ${padding} font-medium rounded-lg border-2 ${c.border} ${c.bg} ${c.text} ${c.bgHover} ${c.borderHover} transition-all cursor-pointer focus:outline-none focus-visible:ring-2 ${c.ring} ${isOpen ? c.borderActive : ''}`}
      >
        {displayIcon}
        <span className="flex-1 text-left">{displayLabel}</span>
        <ChevronDown className={`w-3.5 h-3.5 flex-shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <>
          {/* Backdrop */}
          <div className="fixed inset-0 z-10" onClick={() => setIsOpen(false)} />

          {/* Panel */}
          <div className={`absolute right-0 mt-1 min-w-full w-max max-w-[280px] bg-card border-2 ${c.panel} rounded-lg shadow-xl z-20 overflow-hidden`}>
            <div className="py-1 max-h-[240px] overflow-y-auto">
              {options.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => {
                    onChange(option.value)
                    setIsOpen(false)
                  }}
                  className={`w-full flex items-center gap-2 ${optionPadding} font-medium transition-colors ${c.text} ${
                    option.value === value ? c.bgSelected : `hover:${c.bgSelected}`
                  }`}
                >
                  {option.icon}
                  <div className="flex-1 text-left min-w-0">
                    <span className="block truncate">{option.label}</span>
                    {option.sublabel && (
                      <span className="block text-[10px] text-muted-foreground truncate">{option.sublabel}</span>
                    )}
                  </div>
                </button>
              ))}
              {options.length === 0 && (
                <p className="px-3 py-2 text-sm text-muted-foreground text-center">No options</p>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
