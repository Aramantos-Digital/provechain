/**
 * Tier definitions and feature access control
 *
 * Individual: free, founding_member, professional
 * Enterprise: team, business, custom
 */

export type Tier = 'free' | 'founding_member' | 'professional' | 'team' | 'business' | 'custom'

export const TIER_HIERARCHY: Tier[] = [
  'free',
  'founding_member',
  'professional',
  'team',
  'business',
  'custom'
]

/**
 * Check if a tier has access to cloud CLI features
 */
export function hasCloudAccess(tier: string | null | undefined): boolean {
  if (!tier) return false
  return tier !== 'free'
}

/**
 * Check if a tier has access to the Changelog feature
 */
export function hasChangelog(tier: string | null | undefined): boolean {
  if (!tier) return false
  return ['founding_member', 'professional', 'team', 'business', 'custom'].includes(tier)
}

/**
 * Check if a tier has access to Advanced API features
 */
export function hasAdvancedAPI(tier: string | null | undefined): boolean {
  if (!tier) return false
  return ['business', 'custom'].includes(tier)
}

/**
 * Check if a tier has access to team management features
 */
export function hasTeamManagement(tier: string | null | undefined): boolean {
  if (!tier) return false
  return ['team', 'business', 'custom'].includes(tier)
}

/**
 * Check if proofs expire for this tier
 */
export function hasExpiry(tier: string | null | undefined): boolean {
  if (!tier) return true
  return tier === 'free'
}

/**
 * Get the display name for a tier
 */
export function getTierDisplayName(tier: string | null | undefined): string {
  if (!tier) return 'Free'

  const tierMap: {[key: string]: string} = {
    'free': 'Free',
    'founding_member': 'Founding Member',
    'professional': 'Professional',
    'team': 'Team',
    'business': 'Business',
    'custom': 'Custom'
  }

  return tierMap[tier.toLowerCase()] || tier
}

/**
 * Get the tier badge color
 * Returns gradient classes that work in both light and dark mode
 */
export function getTierColor(tier: string | null | undefined): string {
  if (!tier) return 'from-gray-700 via-gray-600 to-gray-700 from-gray-300 via-gray-200 to-gray-300'

  const colorMap: {[key: string]: string} = {
    'free': 'from-gray-800 via-gray-700 to-gray-800 from-white via-white to-white',
    'founding_member': 'from-orange-600 via-amber-500 to-yellow-500 from-orange-400 via-amber-300 to-yellow-300',
    'professional': 'from-blue-700 via-sky-600 to-cyan-600 from-blue-300 via-sky-200 to-cyan-300',
    'team': 'from-purple-700 via-fuchsia-600 to-pink-600 from-purple-300 via-fuchsia-200 to-pink-300',
    'business': 'from-green-700 via-emerald-600 to-teal-600 from-green-300 via-emerald-200 to-teal-300',
    'custom': 'from-indigo-700 via-violet-600 to-purple-600 from-indigo-300 via-violet-200 to-purple-300'
  }

  return colorMap[tier.toLowerCase()] || 'from-gray-700 via-gray-600 to-gray-700 from-gray-300 via-gray-200 to-gray-300'
}

/**
 * Usage limits per tier (null = unlimited)
 */
export interface TierLimits {
  maxProofs: number | null
  maxStorageBytes: number | null
}

export function getTierLimits(tier: string | null | undefined): TierLimits {
  // Proof count is the real limiter. Storage limits are safety nets only
  // (hashes are tiny — even 100K proofs uses ~1 GB).
  const limitsMap: Record<string, TierLimits> = {
    'free':             { maxProofs: 100,     maxStorageBytes: null },  // 100 proofs, 48h expiry
    'founding_member':  { maxProofs: 10000,   maxStorageBytes: null },  // 10,000 proofs (same as professional)
    'professional':     { maxProofs: 10000,   maxStorageBytes: null },  // 10,000 proofs
    'team':             { maxProofs: 50000,   maxStorageBytes: null },  // 50,000 proofs
    'business':         { maxProofs: 100000,  maxStorageBytes: null },  // 100,000 proofs
    'custom':           { maxProofs: null,    maxStorageBytes: null },  // unlimited
  }

  return limitsMap[tier || 'free'] || limitsMap['free']
}

/**
 * Grace buffer: 33% above maxProofs before hard block.
 *
 * Policy: When a user approaches their limit (~80%), send a notification email.
 * Allow them to exceed maxProofs by up to 33% as a goodwill buffer.
 * At the hard limit (maxProofs * 1.33), block creation and suggest upgrade.
 *
 * Example: Professional (10,000 max) → notify at 8,000 → soft limit at 10,000
 *          → hard block at 13,300
 */
export const GRACE_BUFFER_PERCENT = 0.33
export const NOTIFY_THRESHOLD_PERCENT = 0.80

export function getHardLimit(tier: string | null | undefined): number | null {
  const limits = getTierLimits(tier)
  if (limits.maxProofs === null) return null
  return Math.floor(limits.maxProofs * (1 + GRACE_BUFFER_PERCENT))
}

/**
 * Get expiry days for a tier (0 = no expiry)
 */
export function getExpiryDays(tier: string | null | undefined): number {
  if (!tier || tier === 'free') return 2  // 48 hours for free tier (email warning at 24h)
  return 0 // No expiry for paid tiers
}
