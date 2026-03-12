import { getAuthContext } from '@/lib/auth-context'
import { getUserTier } from '@/lib/core'
import { NextResponse } from 'next/server'

const TIER_LIMITS: Record<string, {
  max_proofs_per_month: number
  max_storage_bytes: number
  proof_expiry_hours: number | null
  has_version_control: boolean
  has_tags: boolean
  can_create_teams: boolean
}> = {
  free: {
    max_proofs_per_month: 10,
    max_storage_bytes: 100 * 1024 * 1024, // 100MB
    proof_expiry_hours: 24,
    has_version_control: false,
    has_tags: false,
    can_create_teams: false,
  },
  founder: {
    max_proofs_per_month: -1, // unlimited
    max_storage_bytes: 5 * 1024 * 1024 * 1024, // 5GB
    proof_expiry_hours: null, // no expiry
    has_version_control: true,
    has_tags: true,
    can_create_teams: false,
  },
  professional: {
    max_proofs_per_month: -1,
    max_storage_bytes: 50 * 1024 * 1024 * 1024, // 50GB
    proof_expiry_hours: null,
    has_version_control: true,
    has_tags: true,
    can_create_teams: true,
  },
  business: {
    max_proofs_per_month: -1,
    max_storage_bytes: 500 * 1024 * 1024 * 1024, // 500GB
    proof_expiry_hours: null,
    has_version_control: true,
    has_tags: true,
    can_create_teams: true,
  },
  enterprise: {
    max_proofs_per_month: -1,
    max_storage_bytes: -1, // unlimited
    proof_expiry_hours: null,
    has_version_control: true,
    has_tags: true,
    can_create_teams: true,
  },
  custom: {
    max_proofs_per_month: -1,
    max_storage_bytes: -1,
    proof_expiry_hours: null,
    has_version_control: true,
    has_tags: true,
    can_create_teams: true,
  },
}

export async function GET() {
  try {
    const auth = await getAuthContext()
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const tier = await getUserTier(auth.user.id)
    const limits = TIER_LIMITS[tier] || TIER_LIMITS.free

    return NextResponse.json({ user_type: tier, limits })
  } catch (error: any) {
    console.error('Error fetching user type:', error)
    return NextResponse.json({ user_type: 'free', limits: TIER_LIMITS.free })
  }
}
