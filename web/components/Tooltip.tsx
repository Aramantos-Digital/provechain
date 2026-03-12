'use client'

import { useState, useRef, useEffect } from 'react'

interface TooltipProps {
  content: React.ReactNode
  children: React.ReactNode
  position?: 'top' | 'bottom'
  maxWidth?: number
  className?: string
}

export default function Tooltip({ content, children, position = 'top', maxWidth = 400, className }: TooltipProps) {
  const [show, setShow] = useState(false)
  const [coords, setCoords] = useState<{ x: number; flip: boolean }>({ x: 0, flip: false })
  const triggerRef = useRef<HTMLDivElement>(null)
  const tooltipRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!show || !triggerRef.current || !tooltipRef.current) return
    const trigger = triggerRef.current.getBoundingClientRect()
    const tooltip = tooltipRef.current.getBoundingClientRect()
    const viewportW = window.innerWidth

    // Center horizontally, but clamp to viewport
    let x = trigger.left + trigger.width / 2 - tooltip.width / 2
    if (x < 8) x = 8
    if (x + tooltip.width > viewportW - 8) x = viewportW - 8 - tooltip.width

    // Flip if not enough room in preferred direction
    const flip = position === 'top'
      ? trigger.top < tooltip.height + 12
      : trigger.bottom + tooltip.height + 12 > window.innerHeight

    setCoords({ x: x - trigger.left - trigger.width / 2 + tooltip.width / 2, flip })
  }, [show, position])

  return (
    <div
      ref={triggerRef}
      className={`relative inline-flex ${className || ''}`}
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => setShow(false)}
    >
      {children}
      {show && (
        <div
          ref={tooltipRef}
          className={`absolute z-[1000] pointer-events-none ${
            (position === 'top' && !coords.flip) || (position === 'bottom' && coords.flip)
              ? 'bottom-full mb-2'
              : 'top-full mt-2'
          }`}
          style={{
            left: '50%',
            transform: `translateX(calc(-50% + ${coords.x}px))`,
            width: 'max-content',
            maxWidth,
          }}
        >
          <div className="px-3 py-2 rounded-lg text-sm font-medium leading-relaxed shadow-xl bg-slate-800 text-slate-200 border border-slate-600/50">
            {content}
          </div>
        </div>
      )}
    </div>
  )
}
