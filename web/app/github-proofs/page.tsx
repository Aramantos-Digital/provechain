'use client'

import { useRouter } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import AutomatedRepos from '@/components/AutomatedRepos'

export default function GitHubProofsPage() {
  const router = useRouter()

  return (
    <div className="container mx-auto px-4 pt-8 pb-8 sm:pb-16 max-w-4xl">
      <div className="mb-8">
        <div className="flex items-start justify-between gap-4 mb-2">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-400 via-pink-400 to-blue-400 bg-clip-text text-transparent">
            GitHub Proofs
          </h1>
          <button
            onClick={() => router.push('/connected-services')}
            className="flex items-center gap-2 px-4 py-3 rounded-lg bg-purple-600 hover:bg-purple-700 text-white font-medium text-sm transition-all shadow-lg hover:shadow-xl"
          >
            <ArrowLeft className="h-4 w-4" />
            <span className="hidden sm:inline">Connected Services</span>
          </button>
        </div>
        <p className="text-muted-foreground">
          Automatically generate cryptographic proofs from your GitHub repositories on a schedule.
        </p>
      </div>

      <AutomatedRepos />
    </div>
  )
}
