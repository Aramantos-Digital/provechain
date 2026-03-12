interface ProveChainLogoProps {
  size?: number
  variant?: 'icon' | 'full'
  className?: string
}

export default function ProveChainLogo({ size = 32, variant = 'icon', className = '' }: ProveChainLogoProps) {
  if (variant === 'icon') {
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 100 100"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={className}
      >
        <defs>
          <linearGradient id="hexGradient1" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#8B5CF6" />
            <stop offset="100%" stopColor="#EC4899" />
          </linearGradient>
          <linearGradient id="hexGradient2" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#06B6D4" />
            <stop offset="100%" stopColor="#8B5CF6" />
          </linearGradient>
          <linearGradient id="glowGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#8B5CF6" stopOpacity="0.3" />
            <stop offset="50%" stopColor="#06B6D4" stopOpacity="0.2" />
            <stop offset="100%" stopColor="#EC4899" stopOpacity="0.3" />
          </linearGradient>
        </defs>

        {/* Outer cyber circles */}
        <circle cx="50" cy="50" r="45" stroke="url(#glowGradient)" strokeWidth="1" fill="none" opacity="0.3" />
        <circle cx="50" cy="50" r="48" stroke="url(#glowGradient)" strokeWidth="0.5" fill="none" opacity="0.2" />

        {/* Back hexagon (purple-pink) */}
        <path
          d="M 50 10 L 70 25 L 70 55 L 50 70 L 30 55 L 30 25 Z"
          fill="url(#hexGradient1)"
          opacity="0.8"
        />

        {/* Front hexagon (cyan-purple) - offset and overlapping */}
        <path
          d="M 50 30 L 70 45 L 70 75 L 50 90 L 30 75 L 30 45 Z"
          fill="url(#hexGradient2)"
          opacity="0.9"
        />

        {/* Connection lines (tech aesthetic) */}
        <line x1="50" y1="10" x2="50" y2="30" stroke="#8B5CF6" strokeWidth="2" opacity="0.6" />
        <line x1="30" y1="55" x2="30" y2="75" stroke="#06B6D4" strokeWidth="2" opacity="0.6" />
        <line x1="70" y1="55" x2="70" y2="75" stroke="#EC4899" strokeWidth="2" opacity="0.6" />

        {/* Center dot (focal point) */}
        <circle cx="50" cy="52" r="4" fill="#FFFFFF" opacity="0.9" />
        <circle cx="50" cy="52" r="6" fill="none" stroke="#FFFFFF" strokeWidth="1" opacity="0.5" />
      </svg>
    )
  }

  // Full logo with text
  return (
    <svg
      width={size * 5}
      height={size}
      viewBox="0 0 500 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <defs>
        <linearGradient id="hexGradient1Full" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#8B5CF6" />
          <stop offset="100%" stopColor="#EC4899" />
        </linearGradient>
        <linearGradient id="hexGradient2Full" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#06B6D4" />
          <stop offset="100%" stopColor="#8B5CF6" />
        </linearGradient>
        <linearGradient id="textGradient" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#8B5CF6" />
          <stop offset="50%" stopColor="#06B6D4" />
          <stop offset="100%" stopColor="#EC4899" />
        </linearGradient>
      </defs>

      {/* Icon part (same as icon variant but scaled) */}
      <g transform="translate(0, 0)">
        <circle cx="50" cy="50" r="45" stroke="url(#hexGradient1Full)" strokeWidth="1" fill="none" opacity="0.2" />

        <path
          d="M 50 10 L 70 25 L 70 55 L 50 70 L 30 55 L 30 25 Z"
          fill="url(#hexGradient1Full)"
          opacity="0.8"
        />

        <path
          d="M 50 30 L 70 45 L 70 75 L 50 90 L 30 75 L 30 45 Z"
          fill="url(#hexGradient2Full)"
          opacity="0.9"
        />

        <line x1="50" y1="10" x2="50" y2="30" stroke="#8B5CF6" strokeWidth="2" opacity="0.6" />
        <line x1="30" y1="55" x2="30" y2="75" stroke="#06B6D4" strokeWidth="2" opacity="0.6" />
        <line x1="70" y1="55" x2="70" y2="75" stroke="#EC4899" strokeWidth="2" opacity="0.6" />

        <circle cx="50" cy="52" r="4" fill="#FFFFFF" opacity="0.9" />
        <circle cx="50" cy="52" r="6" fill="none" stroke="#FFFFFF" strokeWidth="1" opacity="0.5" />
      </g>

      {/* Text "ProveChain" */}
      <text
        x="120"
        y="65"
        fontFamily="system-ui, -apple-system, sans-serif"
        fontSize="42"
        fontWeight="700"
        fill="url(#textGradient)"
      >
        ProveChain
      </text>
    </svg>
  )
}
