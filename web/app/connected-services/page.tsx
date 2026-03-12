'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { ArrowLeft, CheckCircle, Circle, Link2, Unlink, Loader2, Bot } from 'lucide-react'
import { toast } from 'sonner'
import ConfirmModal from '@/components/ConfirmModal'

interface ConnectedService {
  id: string
  provider: string
  provider_account_id: string
  provider_email: string | null
  scopes: string[]
  status: string
  connected_at: string
  last_used_at: string | null
}

interface ProviderConfig {
  name: string
  slug: string
  description: string
  icon: React.ReactNode
  gradient: string
  customBg?: string
}

const PROVIDERS: ProviderConfig[] = [
  {
    name: 'GitHub',
    slug: 'github',
    description: 'Access repositories for automated proof generation',
    icon: <svg className="w-6 h-6" viewBox="0 0 24 24"><circle cx="12" cy="12" r="12" fill="white" /><path fill="#1a1a2e" fillRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clipRule="evenodd" /></svg>,
    gradient: 'from-gray-800 to-gray-950 from-gray-700 to-gray-900',
  },
  {
    name: 'Dropbox',
    slug: 'dropbox',
    description: 'Store and sync proofs with Dropbox',
    icon: <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M6 2l6 3.75L6 9.5 0 5.75zM18 2l6 3.75-6 3.75-6-3.75zM0 13.25L6 9.5l6 3.75L6 17zM18 9.5l6 3.75L18 17l-6-3.75zM6 18.25l6-3.75 6 3.75-6 3.75z" /></svg>,
    gradient: 'from-blue-500 to-blue-700',
  },
  {
    name: 'Google Drive',
    slug: 'google_drive',
    description: 'Access and store proofs in Google Drive',
    icon: <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor"><path d="M12.01 1.485c-2.082 0-3.754.02-3.743.047.01.02 1.708 3.001 3.774 6.62l3.76 6.574h3.76c2.081 0 3.753-.02 3.742-.047-.005-.02-1.708-3.001-3.775-6.62l-3.76-6.574zm-4.76 1.73a789.828 789.861 0 0 0-3.63 6.319L0 15.868l1.89 3.298 1.885 3.297 3.62-6.335 3.618-6.33-1.88-3.287c-1.033-1.807-1.878-3.291-1.883-3.297zm2.259 12.653-.203.348c-.114.198-.96 1.672-1.88 3.287a423.93 423.948 0 0 1-1.698 2.97c-.01.026 3.24.042 7.222.042h7.244l1.796-3.157c.992-1.734 1.85-3.23 1.906-3.323l.104-.167h-7.249z" /></svg>,
    gradient: '',
    customBg: 'linear-gradient(135deg, #4285F4 0%, #EA4335 33%, #FBBC04 66%, #34A853 100%)',
  },
  {
    name: 'OneDrive',
    slug: 'onedrive',
    description: 'Integrate with Microsoft OneDrive and SharePoint',
    icon: <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M19.453 9.95q.961.058 1.787.468.826.41 1.442 1.066.615.657.966 1.512.352.856.352 1.816 0 1.008-.387 1.893-.386.885-1.049 1.547-.662.662-1.546 1.049-.885.387-1.893.387H6q-1.242 0-2.332-.475-1.09-.475-1.904-1.29-.815-.814-1.29-1.903Q0 14.93 0 13.688q0-.985.31-1.887.311-.903.862-1.658.55-.756 1.324-1.325.774-.568 1.711-.861.434-.129.85-.187.416-.06.861-.082h.012q.515-.786 1.207-1.413.691-.627 1.5-1.066.808-.44 1.705-.668.896-.229 1.845-.229 1.278 0 2.456.417 1.177.416 2.144 1.16.967.744 1.658 1.78.692 1.038 1.008 2.28zm-7.265-4.137q-1.325 0-2.52.544-1.195.545-2.04 1.565.446.117.85.299.405.181.792.416l4.78 2.86 2.731-1.15q.27-.117.545-.204.276-.088.58-.147-.293-.937-.855-1.705-.563-.768-1.319-1.318-.755-.551-1.658-.856-.902-.304-1.886-.304zM2.414 16.395l9.914-4.184-3.832-2.297q-.586-.351-1.23-.539-.645-.188-1.325-.188-.914 0-1.722.364-.809.363-1.412.978-.604.616-.955 1.436-.352.82-.352 1.723 0 .703.234 1.423.235.721.68 1.284zm16.711 1.793q.563 0 1.078-.176.516-.176.961-.516l-7.23-4.324-10.301 4.336q.527.328 1.13.504.604.175 1.237.175zm3.012-1.852q.363-.727.363-1.523 0-.774-.293-1.407t-.791-1.072q-.498-.44-1.166-.68-.668-.24-1.406-.24-.422 0-.838.1t-.815.252q-.398.152-.785.334-.386.181-.761.345Z" /></svg>,
    gradient: 'from-blue-400 to-blue-600',
  },
]

export default function ConnectedServicesPage() {
  const router = useRouter()
  const supabase = createClient()
  const [services, setServices] = useState<ConnectedService[]>([])
  const [loading, setLoading] = useState(true)
  const [connectingProvider, setConnectingProvider] = useState<string | null>(null)
  const [disconnectingProvider, setDisconnectingProvider] = useState<string | null>(null)
  const [confirmDisconnect, setConfirmDisconnect] = useState<string | null>(null)

  const fetchServices = useCallback(async () => {
    try {
      const res = await fetch('/api/connected-services')
      if (res.ok) {
        const data = await res.json()
        setServices(data.services || [])
      }
    } catch (error) {
      console.error('Error fetching services:', error)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    // Check auth and tier
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) {
        router.push('/login')
        return
      }

      // Check tier — free users cannot access connected services
      try {
        const tierRes = await fetch('/api/user/tier')
        if (tierRes.ok) {
          const tierData = await tierRes.json()
          if (!tierData.tier || tierData.tier === 'free') {
            router.push('/upgrade?reason=tier')
            return
          }
        }
      } catch {
        router.push('/upgrade?reason=tier')
        return
      }

      fetchServices()

      // Clean up any expired grace period automations (both GitHub repos + cloud sources)
      fetch('/api/automated-repos/grace', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'cleanup' }),
      }).catch(() => {})
      fetch('/api/automated-sources/grace', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'cleanup' }),
      }).catch(() => {})
    })

    // Listen for OAuth popup success via localStorage event
    const handleReconnect = async (providerSlug: string) => {
      // Reactivate paused automations (GitHub repos + cloud sources) within grace period
      const [repoRes, sourceRes] = await Promise.all([
        fetch('/api/automated-repos/grace', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'reactivate' }),
        }),
        fetch('/api/automated-sources/grace', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'reactivate', provider: providerSlug }),
        }),
      ])
      const repoData = await repoRes.json()
      const sourceData = await sourceRes.json()
      const totalReactivated = (repoData.reactivated || 0) + (sourceData.reactivated || 0)

      if (totalReactivated > 0) {
        toast.success(`Connected to ${providerSlug}`, {
          description: `${totalReactivated} automation${totalReactivated > 1 ? 's' : ''} restored.`,
        })
      } else {
        toast.success(`Connected to ${providerSlug}`)
      }

      fetchServices()
      setConnectingProvider(null)
    }

    const handleStorage = (event: StorageEvent) => {
      if (event.key === 'oauth-success' && event.newValue) {
        handleReconnect(event.newValue)
        localStorage.removeItem('oauth-success')
      }
    }
    window.addEventListener('storage', handleStorage)

    // Also listen for postMessage as fallback
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'oauth-success') {
        handleReconnect(event.data.provider)
      }
    }
    window.addEventListener('message', handleMessage)

    return () => {
      window.removeEventListener('storage', handleStorage)
      window.removeEventListener('message', handleMessage)
    }
  }, [])

  const connectProvider = async (provider: string) => {
    setConnectingProvider(provider)
    try {
      const res = await fetch(`/api/oauth/${provider}`)
      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || 'Failed to get connect URL')
      }

      const data = await res.json()
      if (data.auth_url) {
        window.open(data.auth_url, '_blank', 'width=600,height=700,scrollbars=yes')
      }
    } catch (error: any) {
      toast.error(`Failed to connect: ${error.message}`)
      setConnectingProvider(null)
    }
  }

  const disconnectProvider = async (provider: string) => {
    const providerName = PROVIDERS.find(p => p.slug === provider)?.name || provider
    setDisconnectingProvider(provider)
    try {
      // 1. Pause automations with 5-minute grace period (GitHub repos + cloud sources)
      await Promise.all([
        fetch('/api/automated-repos/grace', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'pause' }),
        }),
        fetch('/api/automated-sources/grace', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'pause', provider }),
        }),
      ])

      // 2. Disconnect from provider via Core
      const res = await fetch(`/api/oauth/${provider}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'disconnect' }),
      })

      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || 'Failed to disconnect')
      }

      toast.success(`Disconnected from ${providerName}`, {
        description: 'Your automations have been paused. Reconnect within 5 minutes to keep them, or they will be removed. To connect a different account, wait 5 minutes.',
        duration: 10000,
      })
      await fetchServices()
    } catch (error: any) {
      toast.error(`Failed to disconnect: ${error.message}`)
    } finally {
      setDisconnectingProvider(null)
    }
  }

  const getServiceForProvider = (slug: string) =>
    services.find(s => s.provider === slug)

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <div className="mx-auto px-4 pt-8 pb-8 sm:pb-16 max-w-4xl">
      <div className="mb-8">
        <div className="flex items-start justify-between gap-4 mb-2">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-400 via-pink-400 to-blue-400 bg-clip-text text-transparent">
            Connected Services
          </h1>
          <button
            onClick={() => router.push('/settings')}
            className="flex items-center gap-2 px-4 py-3 rounded-lg bg-purple-600 hover:bg-purple-700 text-white font-medium text-sm transition-all shadow-lg hover:shadow-xl"
          >
            <ArrowLeft className="h-4 w-4" />
            <span className="hidden sm:inline">Settings</span>
          </button>
        </div>
        <p className="text-muted-foreground">
          Connect cloud storage and developer tools. Credentials are encrypted and managed by Aramantos Core.
        </p>
      </div>

      <div className="grid gap-4">
        {PROVIDERS.map((provider) => {
          const service = getServiceForProvider(provider.slug)
          const isConnected = !!service
          const isConnecting = connectingProvider === provider.slug
          const isDisconnecting = disconnectingProvider === provider.slug

          return (
            <div
              key={provider.slug}
              className="bg-card/50 backdrop-blur-sm border border-border rounded-xl p-5 transition-all hover:border-primary/20 overflow-hidden"
            >
              <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                <div className="flex items-center gap-4 flex-1 min-w-0">
                  <div
                    className={`p-2.5 rounded-lg ${provider.gradient ? `bg-gradient-to-br ${provider.gradient}` : ''} text-white flex-shrink-0`}
                    style={provider.customBg ? { background: provider.customBg } : undefined}
                  >
                    {provider.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold">{provider.name}</h3>
                      {isConnected ? (
                        <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" />
                      ) : (
                        <Circle className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground truncate">
                      {isConnected
                        ? service.provider_email || `Connected as ${service.provider_account_id}`
                        : provider.description}
                    </p>
                    {isConnected && service.connected_at && (
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Connected {new Date(service.connected_at).toLocaleDateString('en-IE')}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 flex-shrink-0">
                  {isConnected ? (
                    <>
                      <button
                        onClick={() => {
                          const routes: Record<string, string> = {
                            github: '/github-proofs',
                            onedrive: '/onedrive',
                            dropbox: '/dropbox',
                            google_drive: '/google-drive',
                          }
                          router.push(routes[provider.slug] || '/dashboard')
                        }}
                        className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-purple-600 hover:bg-purple-700 rounded-lg transition-all justify-center"
                      >
                        <Bot className="h-5 w-5" />
                        <span className="sm:hidden">Automations</span>
                        <span className="hidden sm:inline">Manage Automations</span>
                      </button>
                      <button
                        onClick={() => setConfirmDisconnect(provider.slug)}
                        disabled={isDisconnecting}
                        className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-red-400 border border-red-300 border-red-700 rounded-lg hover:bg-red-50 hover:bg-red-900/20 transition-colors disabled:opacity-50 justify-center"
                      >
                        {isDisconnecting ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Unlink className="h-4 w-4" />
                        )}
                        Disconnect
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={() => connectProvider(provider.slug)}
                      disabled={isConnecting}
                      className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-primary border border-primary/30 rounded-lg hover:bg-primary/5 transition-colors disabled:opacity-50"
                    >
                      {isConnecting ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Link2 className="h-4 w-4" />
                      )}
                      Connect
                    </button>
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>

      <ConfirmModal
        isOpen={!!confirmDisconnect}
        onClose={() => setConfirmDisconnect(null)}
        onConfirm={() => {
          if (confirmDisconnect) {
            disconnectProvider(confirmDisconnect)
            setConfirmDisconnect(null)
          }
        }}
        title="Disconnect Service"
        message={`Are you sure you want to disconnect ${PROVIDERS.find(p => p.slug === confirmDisconnect)?.name || confirmDisconnect}? Any automated proofs using this service will stop working.`}
        confirmText="Disconnect"
        variant="danger"
      />
    </div>
  )
}
