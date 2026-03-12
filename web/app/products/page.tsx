'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { ExternalLink, CheckCircle, Circle, ArrowLeft } from 'lucide-react'

interface ProductInfo {
  name: string
  slug: string
  description: string
  url: string
  logo: string
  logoClass?: string
  type: 'service' | 'tool'
}

const SERVICES: ProductInfo[] = [
  {
    name: 'ProveChain',
    slug: 'provechain',
    description: 'Cryptographic proof of existence for your files. SHA-256 hashing, version control, and blockchain anchoring.',
    url: 'https://provechain.aramantos.dev',
    logo: '/provechain_logo.png',
    type: 'service',
  },
]

const TOOLS: ProductInfo[] = [
  {
    name: 'TimeAnchor',
    slug: 'timeanchor',
    description: 'Free, open-source blockchain timestamp verification. Confirm documents existed at a specific point in time using Bitcoin and OpenTimestamps.',
    url: 'https://timeanchor.aramantos.dev',
    logo: '/timeanchor-logo.png',
    logoClass: 'scale-150',
    type: 'tool',
  },
]

export default function ProductsPage() {
  const router = useRouter()
  const supabase = createClient()
  const [activatedProducts, setActivatedProducts] = useState<string[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadProducts() {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
          router.push('/login')
          return
        }

        // Check tier — free users cannot access products page
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

        // Fetch product activations from the API
        const res = await fetch('/api/user/products')
        if (res.ok) {
          const data = await res.json()
          setActivatedProducts(data.activations?.map((a: any) => a.product) || [])
        }
      } catch (error) {
        console.error('Error loading products:', error)
      } finally {
        setLoading(false)
      }
    }

    loadProducts()
  }, [])

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
            Aramantos Products
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
          Your Aramantos Digital product suite. One account, all products.
        </p>
      </div>

      {/* Services */}
      <div className="grid gap-6">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Services</h2>
        {SERVICES.map((product) => {
          const isActive = activatedProducts.includes(product.slug)
          const isCurrent = product.slug === 'provechain'

          return (
            <div
              key={product.slug}
              className={`bg-card/50 backdrop-blur-sm border rounded-xl p-6 transition-all overflow-hidden ${
                isCurrent
                  ? 'border-primary/50 shadow-lg shadow-primary/5'
                  : 'border-border hover:border-primary/30'
              }`}
            >
              <div className="flex flex-col sm:flex-row sm:items-start gap-4">
                <div className="h-24 w-24 rounded-xl flex-shrink-0 overflow-hidden flex items-center justify-center mx-auto sm:mx-0">
                  <img src={product.logo} alt={product.name} className={`object-contain ${product.logoClass || ''}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h2 className="text-xl font-semibold">{product.name}</h2>
                    {isCurrent && (
                      <span className="px-2 py-0.5 text-xs font-medium bg-primary/10 text-primary rounded-full">
                        Current
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground mb-3">
                    {product.description}
                  </p>
                  <div className="flex items-center gap-2">
                    {isActive || isCurrent ? (
                      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-green-400">
                        <CheckCircle className="h-3.5 w-3.5" />
                        Active
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                        <Circle className="h-3.5 w-3.5" />
                        Not activated
                      </span>
                    )}
                  </div>
                  {!isCurrent && (
                    <a
                      href={product.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 px-4 py-2 mt-3 text-sm font-medium rounded-lg border border-border hover:bg-card/80 transition-colors"
                    >
                      Go to app
                      <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                  )}
                </div>
              </div>
            </div>
          )
        })}

        {/* Coming Soon placeholder */}
        <div className="bg-card/30 backdrop-blur-sm border border-dashed border-border rounded-xl p-6 text-center">
          <p className="text-muted-foreground text-sm">
            More services coming soon. Your Aramantos Digital account will work with all of them.
          </p>
        </div>
      </div>

      {/* Divider */}
      <div className="my-8 border-t border-border" />

      {/* Tools */}
      <div className="grid gap-6">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Free Tools</h2>
        {TOOLS.map((product) => (
          <div
            key={product.slug}
            className="bg-card/50 backdrop-blur-sm border border-border rounded-xl p-6 transition-all hover:border-primary/30 overflow-hidden"
          >
            <div className="flex flex-col sm:flex-row sm:items-start gap-4">
              <div className="h-24 w-24 rounded-xl flex-shrink-0 overflow-hidden flex items-center justify-center mx-auto sm:mx-0">
                <img src={product.logo} alt={product.name} className={`object-contain ${product.logoClass || ''}`} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h2 className="text-xl font-semibold">{product.name}</h2>
                  <span className="px-2 py-0.5 text-xs font-medium bg-green-500/10 text-green-400 rounded-full">
                    Free & Open Source
                  </span>
                </div>
                <p className="text-sm text-muted-foreground mb-3">
                  {product.description}
                </p>
                <a
                  href={product.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg border border-border hover:bg-card/80 transition-colors"
                >
                  Go to app
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
