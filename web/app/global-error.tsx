'use client'

import { useState, useEffect } from 'react'

function generateHash() {
  const chars = '0123456789abcdef'
  let hash = ''
  for (let i = 0; i < 64; i++) {
    hash += chars[Math.floor(Math.random() * chars.length)]
  }
  return hash
}

export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const [hash, setHash] = useState('')

  useEffect(() => {
    setHash(generateHash())
  }, [])

  const truncated = hash ? `${hash.slice(0, 8)}...${hash.slice(-4)}` : 'generating...'

  return (
    <html>
      <body style={{ margin: 0, fontFamily: 'system-ui, -apple-system, sans-serif', background: '#0a0a0a', color: '#e5e5e5' }}>
        <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <div style={{ textAlign: 'center', maxWidth: '32rem' }}>
            <h1 style={{ fontSize: '2rem', fontWeight: 'bold', marginBottom: '1rem' }}>
              <span style={{ color: '#a3a3a3' }}>Error </span>
              <span style={{ color: '#c084fc', fontFamily: 'monospace' }}>{truncated}</span>
            </h1>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '1rem' }}>
              Something Went Wrong
            </h2>
            <p style={{ color: '#a3a3a3', marginBottom: '0.5rem', fontSize: '1.1rem' }}>
              Our error handling is blockchain-verified, so we never actually see what went wrong.
            </p>
            <p style={{ color: '#a3a3a3', marginBottom: '1.5rem' }}>
              But our best guess is a <span style={{ color: '#c084fc', fontWeight: 600 }}>500</span>.
            </p>
            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap', marginBottom: '1.5rem' }}>
              <button
                onClick={reset}
                style={{ padding: '0.75rem 2rem', background: '#9333ea', color: 'white', border: 'none', borderRadius: '0.5rem', fontWeight: 600, cursor: 'pointer', fontSize: '1rem' }}
              >
                Try Again
              </button>
              <a
                href="/"
                style={{ padding: '0.75rem 2rem', background: '#1a1a2e', color: '#c084fc', border: '1px solid rgba(147, 51, 234, 0.3)', borderRadius: '0.5rem', fontWeight: 600, textDecoration: 'none', fontSize: '1rem' }}
              >
                Go Home
              </a>
            </div>
            <p style={{ fontSize: '0.75rem', fontFamily: 'monospace', color: '#525252', wordBreak: 'break-all' }}>
              Proof ID: {hash || 'generating...'}
            </p>
          </div>
        </div>
      </body>
    </html>
  )
}
