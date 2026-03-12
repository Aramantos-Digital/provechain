'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import Link from 'next/link'

function generateHash() {
  const chars = '0123456789abcdef'
  let hash = ''
  for (let i = 0; i < 64; i++) {
    hash += chars[Math.floor(Math.random() * chars.length)]
  }
  return hash
}

export default function Error({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const [hash, setHash] = useState('')

  useEffect(() => {
    setHash(generateHash())
  }, [])

  const truncated = hash ? `${hash.slice(0, 8)}...${hash.slice(-4)}` : 'generating...'

  return (
    <div className="min-h-[60vh] flex items-center justify-center px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="text-center max-w-lg"
      >
        <h1 className="text-3xl md:text-5xl font-bold mb-4">
          <span className="text-muted-foreground">Error </span>
          <span className="bg-gradient-to-r from-purple-400 via-pink-400 to-blue-400 bg-clip-text text-transparent font-mono">{truncated}</span>
        </h1>
        <h2 className="text-2xl md:text-3xl font-bold mb-4">
          Something Went Wrong
        </h2>
        <p className="text-lg text-muted-foreground mb-2">
          Our error handling is blockchain-verified, so we never actually see what went wrong.
        </p>
        <p className="text-muted-foreground mb-6">
          But our best guess is a <span className="text-purple-400 font-semibold">500</span>.
        </p>
        <div className="flex flex-wrap gap-4 justify-center mb-6">
          <button
            onClick={reset}
            className="px-8 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-semibold transition-all shadow-lg hover:shadow-xl"
          >
            Try Again
          </button>
          <Link
            href="/"
            className="px-8 py-3 bg-card border border-purple-500/30 hover:border-purple-500 text-purple-400 rounded-lg font-semibold transition-all"
          >
            Go Home
          </Link>
        </div>
        <p className="text-xs font-mono text-muted-foreground/50 break-all">
          Proof ID: {hash || 'generating...'}
        </p>
      </motion.div>
    </div>
  )
}
