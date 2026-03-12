'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { User, Mail, CreditCard, HardDrive, FileText, Calendar, Users, UserPlus, Crown, Link2, Trash2, RefreshCw, Check, X, Package, Shield, ChevronLeft, ChevronRight } from 'lucide-react'
import { getTierDisplayName, getTierColor } from '@/lib/tiers'
import { toast } from 'sonner'
import { useUserType } from '@/lib/hooks/useUserType'
import ConfirmModal from '@/components/ConfirmModal'
import InputModal from '@/components/InputModal'

type Subscription = {
  tier: string
  status: string
  created_at: string
  cancel_at_period_end: boolean
}

type UsageStats = {
  proof_count: number
  proof_version_count: number
  total_storage_bytes: number
  max_proofs: number | null
  max_storage_bytes: number | null
  last_calculated_at: string
}

type Team = {
  id: string
  name: string
  tier: string
  max_members: number
  admin_user_id: string
  created_at: string
}

type TeamMember = {
  id: string
  user_id: string
  role: 'admin' | 'member'
  status: 'pending' | 'active' | 'removed'
  invited_at: string
  joined_at: string | null
}

type UserProfile = {
  id: string
  email: string
  full_name: string | null
  username: string | null
  avatar_url: string | null
}

export default function AdminPage() {
  const router = useRouter()
  const supabase = createClient()

  const [user, setUser] = useState<any>(null)
  const [subscription, setSubscription] = useState<Subscription | null>(null)
  const [usage, setUsage] = useState<UsageStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Team state
  const [teams, setTeams] = useState<Team[]>([])
  const [teamMembers, setTeamMembers] = useState<Record<string, TeamMember[]>>({})
  const [loadingTeams, setLoadingTeams] = useState(false)
  const [inviteEmail, setInviteEmail] = useState('')
  const [invitingTeamId, setInvitingTeamId] = useState<string | null>(null)
  const [teamCarouselIndex, setTeamCarouselIndex] = useState(0)

  // Form state
  const [email, setEmail] = useState('')
  const [username, setUsername] = useState('')
  const [updating, setUpdating] = useState(false)

  // Modal state
  const [removeModalOpen, setRemoveModalOpen] = useState(false)
  const [memberToRemove, setMemberToRemove] = useState<{ teamId: string; memberId: string; memberEmail: string } | null>(null)
  const [teamNameModalOpen, setTeamNameModalOpen] = useState(false)
  const [removingMember, setRemovingMember] = useState(false)

  // User type hook
  const { isTeamMember, limits } = useUserType()

  useEffect(() => {
    let cancelled = false

    async function loadUserData() {
      try {
        // Get user with error handling
        const { data: { user: currentUser }, error: authError } = await supabase.auth.getUser()

        if (cancelled) return

        if (authError) {
          console.error('Auth error:', authError)
          setError('Authentication failed. Please try logging in again.')
          router.push('/login')
          return
        }

        if (!currentUser) {
          router.push('/login')
          return
        }

        setUser(currentUser)
        setEmail(currentUser.email || '')
        setUsername(currentUser.user_metadata?.username || '')

        // Get subscription with error handling
        const subRes = await fetch('/api/subscription')
        if (cancelled) return
        if (subRes.ok) {
          const subData = await subRes.json()
          setSubscription(subData.subscription || null)
        } else {
          console.error('Subscription error')
        }

        // Calculate usage stats (returns data directly, no separate fetch needed)
        const usageData = await calculateUsage(currentUser.id)
        if (cancelled) return
        if (usageData) {
          setUsage(usageData)
        }

        // Load teams for all users (can be member of teams even without enterprise tier)
        await loadTeams(currentUser.id)

      } catch (error: any) {
        if (cancelled) return
        console.error('Error loading user data:', error)
        setError(error.message || 'An unexpected error occurred')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    loadUserData()
    return () => { cancelled = true }
  }, [])

  async function calculateUsage(userId: string) {
    try {
      const res = await fetch('/api/admin/recalculate-usage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: userId })
      })
      if (res.ok) {
        const data = await res.json()
        return data.usage || null
      }
      console.error('Error calculating usage')
      return null
    } catch (error) {
      console.error('Error calling calculate_user_usage:', error)
      return null
    }
  }

  async function loadTeams(userId: string) {
    setLoadingTeams(true)
    try {
      const teamsRes = await fetch('/api/teams')
      if (!teamsRes.ok) {
        console.error('Error loading teams')
        return
      }

      const teamsData = await teamsRes.json()
      const allTeams: Team[] = [...(teamsData.owned || []), ...(teamsData.member || [])]
      // Sort by name
      allTeams.sort((a, b) => a.name.localeCompare(b.name))

      setTeams(allTeams)

      // Load members for each team
      for (const team of allTeams) {
        await loadTeamMembers(team.id)
      }
    } catch (error) {
      console.error('Error loading teams:', error)
    } finally {
      setLoadingTeams(false)
    }
  }

  async function loadTeamMembers(teamId: string) {
    try {
      const membersRes = await fetch(`/api/teams/${teamId}/members`)
      if (!membersRes.ok) {
        console.error('Error loading team members')
        return
      }

      const membersData = await membersRes.json()
      if (Array.isArray(membersData)) {
        setTeamMembers(prev => ({
          ...prev,
          [teamId]: membersData
        }))
      }
    } catch (error) {
      console.error('Error loading team members:', error)
    }
  }

  async function createTeam(name: string) {
    if (!user || !subscription) return

    try {
      const res = await fetch('/api/teams', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name })
      })

      if (!res.ok) {
        const errData = await res.json()
        throw new Error(errData.error || 'Failed to create team')
      }

      toast.success('Team Created!', {
        description: `"${name}" has been created successfully`,
        duration: 4000
      })
      await loadTeams(user.id)
    } catch (error: any) {
      toast.error('Failed to Create Team', {
        description: error.message || 'An error occurred while creating the team',
        duration: 4000
      })
    }
  }

  async function inviteTeamMember(teamId: string, email: string) {
    if (!user) return

    // Validate email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!email || !emailRegex.test(email)) {
      toast.error('Invalid Email', {
        description: 'Please enter a valid email address',
        duration: 3000
      })
      return
    }

    try {
      // Use the API endpoint instead of direct database insert
      // This ensures email is sent and notification is created
      const response = await fetch('/api/team/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          teamId: teamId,
          email: email,
          role: 'member'
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to send invitation')
      }

      toast.success('Invitation Sent!', {
        description: `Team invitation sent to ${email}`,
        duration: 4000
      })
      setInviteEmail('')
      setInvitingTeamId(null)
    } catch (error: any) {
      toast.error('Failed to Send Invitation', {
        description: error.message || 'An error occurred while sending the invitation',
        duration: 4000
      })
    }
  }

  function openRemoveMemberModal(teamId: string, memberId: string, memberEmail: string) {
    setMemberToRemove({ teamId, memberId, memberEmail })
    setRemoveModalOpen(true)
  }

  async function confirmRemoveTeamMember() {
    if (!memberToRemove) return

    setRemovingMember(true)
    try {
      // Find the member's user_id from teamMembers state
      const members = teamMembers[memberToRemove.teamId] || []
      const member = members.find((m: any) => m.id === memberToRemove.memberId)
      if (!member) throw new Error('Member not found')

      const res = await fetch(`/api/teams/${memberToRemove.teamId}/members/${member.user_id}`, {
        method: 'DELETE',
      })

      if (!res.ok) {
        const errData = await res.json()
        throw new Error(errData.error || 'Failed to remove member')
      }

      toast.success('Member Removed', {
        description: 'Team member has been removed successfully',
        duration: 3000
      })
      await loadTeamMembers(memberToRemove.teamId)
      setRemoveModalOpen(false)
      setMemberToRemove(null)
    } catch (error: any) {
      toast.error('Failed to Remove Member', {
        description: error.message || 'An error occurred while removing the team member',
        duration: 4000
      })
    } finally {
      setRemovingMember(false)
    }
  }

  async function updateMemberRole(teamId: string, memberId: string, newRole: 'admin' | 'member') {
    try {
      // Find the member's user_id from teamMembers state
      const members = teamMembers[teamId] || []
      const member = members.find((m: any) => m.id === memberId)
      if (!member) throw new Error('Member not found')

      const res = await fetch(`/api/teams/${teamId}/members/${member.user_id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: newRole }),
      })

      if (!res.ok) {
        const errData = await res.json()
        throw new Error(errData.error || 'Failed to update role')
      }

      toast.success('Role Updated', {
        description: `Member role has been updated to ${newRole}`,
        duration: 3000
      })
      await loadTeamMembers(teamId)
    } catch (error: any) {
      toast.error('Failed to Update Role', {
        description: error.message || 'An error occurred while updating the role',
        duration: 4000
      })
    }
  }

  async function updateEmail() {
    setUpdating(true)

    try {
      const { error } = await supabase.auth.updateUser({
        email: email
      })

      if (error) throw error

      toast.success('Email Update Initiated', {
        description: 'Please check both your old and new email for confirmation links',
        duration: 5000
      })
    } catch (error: any) {
      toast.error('Failed to Update Email', {
        description: error.message || 'An error occurred while updating your email',
        duration: 4000
      })
    } finally {
      setUpdating(false)
    }
  }

  async function updateUsername() {
    setUpdating(true)

    try {
      const { error } = await supabase.auth.updateUser({
        data: { username: username }
      })

      if (error) throw error

      toast.success('Username Updated', {
        description: 'Your username has been updated successfully',
        duration: 3000
      })
    } catch (error: any) {
      toast.error('Failed to Update Username', {
        description: error.message || 'An error occurred while updating your username',
        duration: 4000
      })
    } finally {
      setUpdating(false)
    }
  }

  async function refreshUsage() {
    if (!user) return

    toast.info('Recalculating...', {
      description: 'Updating usage statistics',
      duration: 2000
    })

    const usageData = await calculateUsage(user.id)
    if (usageData) {
      setUsage(usageData)
    }

    toast.success('Usage Updated', {
      description: 'Usage statistics have been recalculated',
      duration: 3000
    })
  }

  function formatBytes(bytes: number): string {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i]
  }

  function getUsagePercentage(current: number, max: number | null): number {
    if (!max) return 0 // Unlimited
    return Math.min((current / max) * 100, 100)
  }


  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500 mb-4"></div>
          <p className="text-muted-foreground">Loading account settings...</p>
        </div>
      </div>
    )
  }

  // Show error state if critical error occurred
  if (error && !loading && !user) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="max-w-md mx-auto text-center p-8">
          <div className="bg-red-50 bg-red-900/20 border border-red-200 border-red-800 rounded-xl p-6">
            <div className="text-red-400 text-5xl mb-4">⚠️</div>
            <h2 className="text-xl font-semibold text-red-900 text-red-100 mb-2">Error Loading Settings</h2>
            <p className="text-red-700 text-red-300 mb-4">{error}</p>
            <div className="flex gap-3 justify-center">
              <button
                onClick={() => router.push('/dashboard')}
                className="px-4 py-2 text-sm font-medium bg-gray-800 border border-gray-300 border-gray-700 rounded-lg hover:bg-gray-50 hover:bg-gray-700 transition-colors"
              >
                ← Back to Dashboard
              </button>
              <button
                onClick={() => window.location.reload()}
                className="px-4 py-2 text-sm font-medium text-white bg-purple-600 hover:bg-purple-700 rounded-lg transition-all"
              >
                Try Again
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  const hasEnterpriseFeatures = subscription && ['team', 'business', 'custom'].includes(subscription.tier)

  return (
    <div className="container mx-auto px-4 pt-8 pb-8 sm:pb-16 max-w-7xl">
      <div className="mb-4">
        {/* Row 1: Title + Back to Dashboard Button */}
        <div className="flex items-start justify-between gap-4 mb-2">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-400 via-pink-400 to-blue-400 bg-clip-text text-transparent text-center md:text-left flex-1">
            Account Settings
          </h1>

          {/* Back to Dashboard Button - Desktop */}
          <button
            onClick={() => router.push('/dashboard')}
            className="hidden md:flex items-center justify-center gap-2 px-4 sm:px-6 py-3 rounded-lg bg-purple-600 hover:bg-purple-700 text-white font-medium text-sm transition-all shadow-lg hover:shadow-xl flex-shrink-0 min-w-[200px]"
          >
            ← Back to Dashboard
          </button>
        </div>

        {/* Row 2: Description + Changelog Button - Desktop */}
        <div className="flex items-center justify-between gap-4">
          <p className="text-muted-foreground flex-1 hidden md:block">
            Manage your account and view usage statistics
          </p>

          {/* View Changelog Button - Desktop */}
          <button
            onClick={() => router.push('/changelog')}
            className="hidden md:flex items-center justify-center gap-2 px-4 sm:px-6 py-3 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium text-sm transition-all shadow-lg hover:shadow-xl flex-shrink-0 min-w-[200px]"
          >
            <FileText className="h-4 w-4" />
            <span>View Changelog</span>
          </button>
        </div>

        {/* Quick Links - Desktop */}
        {subscription && subscription.tier !== 'free' && (
          <div className="mt-3 hidden md:flex flex-wrap gap-2">
            <button
              onClick={() => router.push('/products')}
              className="inline-flex items-center gap-2.5 px-4 py-2.5 text-sm font-medium rounded-lg bg-gradient-to-r from-purple-500/10 to-pink-500/10 border border-purple-500/20 text-foreground hover:from-purple-500/20 hover:to-pink-500/20 transition-all"
            >
              <Package className="h-4 w-4 text-purple-400" />
              Aramantos Products
            </button>
            <button
              onClick={() => router.push('/connected-services')}
              className="inline-flex items-center gap-2.5 px-4 py-2.5 text-sm font-medium rounded-lg bg-gradient-to-r from-blue-500/10 to-cyan-500/10 border border-blue-500/20 text-foreground hover:from-blue-500/20 hover:to-cyan-500/20 transition-all"
            >
              <Link2 className="h-4 w-4 text-blue-400" />
              Connected Services
            </button>
          </div>
        )}

        {/* Buttons Grid - Mobile */}
        <div className="md:hidden mt-3 grid grid-cols-2 gap-2">
          {subscription && subscription.tier !== 'free' && (
            <button
              onClick={() => router.push('/products')}
              className="flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium rounded-lg bg-gradient-to-r from-purple-500/10 to-pink-500/10 border border-purple-500/20 text-foreground transition-all"
            >
              <Package className="h-4 w-4 text-purple-400" />
              Products
            </button>
          )}
          <button
            onClick={() => router.push('/dashboard')}
            className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-purple-600 hover:bg-purple-700 text-white font-medium text-sm transition-all shadow-lg"
          >
            ← Dashboard
          </button>
          {subscription && subscription.tier !== 'free' && (
            <button
              onClick={() => router.push('/connected-services')}
              className="flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium rounded-lg bg-gradient-to-r from-blue-500/10 to-cyan-500/10 border border-blue-500/20 text-foreground transition-all"
            >
              <Link2 className="h-4 w-4 text-blue-400" />
              Services
            </button>
          )}
          {subscription && subscription.tier !== 'free' && (
            <button
              onClick={() => router.push('/changelog')}
              className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium text-sm transition-all shadow-lg"
            >
              <FileText className="h-4 w-4" />
              Changelog
            </button>
          )}
          <p className="col-span-2 text-muted-foreground text-sm text-center">
            Manage your account and view usage statistics
          </p>
        </div>
      </div>

      <div className="">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column */}
          <div className="lg:col-span-1 space-y-6">
            {/* Subscription Card */}
            <div className="bg-card/50 backdrop-blur-sm border border-border rounded-lg p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <CreditCard className="h-5 w-5 text-purple-400" />
                </div>
                <h2 className="text-lg font-semibold">Subscription</h2>
              </div>

              {subscription ? (
                <div className="space-y-3">
                  <div>
                    <p className="text-sm text-muted-foreground">Current Plan</p>
                    <p className="text-2xl font-bold text-foreground">
                      {getTierDisplayName(subscription.tier)}
                    </p>
                    {isTeamMember && (
                      <div className="mt-2">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-blue-100 bg-blue-900/30 border border-blue-200 border-blue-800 text-blue-700 text-blue-300 text-xs font-medium rounded-full">
                          <Users className="w-3 h-3" />
                          Team Member
                        </span>
                        <p className="text-xs text-muted-foreground mt-1">
                          Pro-tier proof access via team membership
                        </p>
                      </div>
                    )}
                  </div>

                  {user?.created_at && (
                    <div>
                      <p className="text-sm text-muted-foreground">Member Since</p>
                      <p className="text-sm font-medium">
                        {new Date(user.created_at).toLocaleDateString('en-IE', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric'
                        })}
                      </p>
                    </div>
                  )}

                  {subscription.tier !== 'free' && (
                    <button
                      onClick={() => router.push('/subscription')}
                      className="w-full mt-4 px-4 py-2 text-sm font-medium text-white bg-purple-600 hover:bg-purple-700 rounded-lg transition-all shadow-md"
                    >
                      Manage Subscription
                    </button>
                  )}

                  {subscription.tier === 'free' && (
                    <button
                      onClick={() => router.push('/upgrade')}
                      className="w-full mt-4 px-4 py-2 text-sm font-medium text-white bg-purple-600 hover:bg-purple-700 rounded-lg transition-all shadow-md"
                    >
                      Upgrade Plan
                    </button>
                  )}
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-muted-foreground mb-4">No active plan</p>
                  <button
                    onClick={() => router.push('/upgrade')}
                    className="px-4 py-2 text-sm font-medium text-white bg-purple-600 hover:bg-purple-700 rounded-lg transition-all shadow-md"
                  >
                    View Plans
                  </button>
                </div>
              )}
            </div>


            {/* Team Roster Card - Carousel */}
            {teams.length > 0 && (
              <div className="bg-card/50 backdrop-blur-sm border border-border rounded-lg p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-500/10 rounded-lg">
                      <Users className="h-5 w-5 text-blue-400" />
                    </div>
                    <h2 className="text-lg font-semibold">Team Roster ({teams.length})</h2>
                  </div>
                  {teams.length > 1 && (
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => setTeamCarouselIndex(i => i > 0 ? i - 1 : teams.length - 1)}
                        className="p-1 rounded-md hover:bg-accent transition-colors text-muted-foreground hover:text-foreground"
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </button>
                      <span className="text-xs text-muted-foreground min-w-[3ch] text-center">
                        {teamCarouselIndex + 1}/{teams.length}
                      </span>
                      <button
                        onClick={() => setTeamCarouselIndex(i => i < teams.length - 1 ? i + 1 : 0)}
                        className="p-1 rounded-md hover:bg-accent transition-colors text-muted-foreground hover:text-foreground"
                      >
                        <ChevronRight className="h-4 w-4" />
                      </button>
                    </div>
                  )}
                </div>

                {loadingTeams ? (
                  <p className="text-sm text-muted-foreground">Loading teams...</p>
                ) : (
                  <div className="space-y-4">
                    {(() => {
                      const team = teams[teamCarouselIndex]
                      if (!team) return null
                      const members = teamMembers[team.id] || []
                      const activeMembers = members.filter(m => m.status === 'active')
                      const isUserAdmin = team.admin_user_id === user?.id || activeMembers.some(m => m.user_id === user?.id && m.role === 'admin')
                      const adminMembers = activeMembers.filter(m => m.role === 'admin')
                      const regularMembers = activeMembers.filter(m => m.role === 'member')

                      return (
                        <div className="border border-gray-700 rounded-lg p-4">
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2">
                              <h3 className="font-semibold">{team.name}</h3>
                              {isUserAdmin && (
                                <Crown className="h-4 w-4 text-yellow-500" />
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground font-medium">
                              {activeMembers.length} {activeMembers.length === 1 ? 'member' : 'members'}
                            </p>
                          </div>

                          <div className="space-y-2 mb-3">
                            {adminMembers.map(member => {
                              const isCreator = member.user_id === team.admin_user_id
                              return (
                                <div key={member.id} className="flex items-center gap-2 text-sm">
                                  {isCreator ? (
                                    <Crown className="h-4 w-4 text-yellow-500" />
                                  ) : (
                                    <Shield className="h-4 w-4 text-green-500" />
                                  )}
                                  <span
                                    className="text-xs text-foreground font-medium truncate max-w-[150px]"
                                    title={(member as any).user_email || 'No email'}
                                  >
                                    {(member as any).username || (member as any).user_name || (member as any).user_email || member.user_id.substring(0, 8)}
                                    {member.user_id === user?.id && ' (You)'}
                                  </span>
                                </div>
                              )
                            })}

                            {adminMembers.length > 0 && regularMembers.length > 0 && (
                              <div className="border-t border-gray-700 my-2"></div>
                            )}

                            {regularMembers.map(member => (
                              <div key={member.id} className="flex items-center gap-2 text-sm">
                                <User className="h-4 w-4 text-blue-500" />
                                <span
                                  className="text-xs text-foreground font-medium truncate max-w-[150px]"
                                  title={(member as any).user_email || 'No email'}
                                >
                                  {(member as any).username || (member as any).user_name || (member as any).user_email || member.user_id.substring(0, 8)}
                                  {member.user_id === user?.id && ' (You)'}
                                </span>
                              </div>
                            ))}
                          </div>

                          {team.admin_user_id === user?.id && activeMembers.length < team.max_members && (
                            <div>
                              {invitingTeamId === team.id ? (
                                <div className="flex gap-2">
                                  <input
                                    type="email"
                                    value={inviteEmail}
                                    onChange={(e) => setInviteEmail(e.target.value)}
                                    placeholder="member@email.com"
                                    className="flex-1 px-3 py-2 text-sm border border-border rounded-lg bg-card/30 backdrop-blur-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                                  />
                                  <button
                                    onClick={() => inviteTeamMember(team.id, inviteEmail)}
                                    className="p-2 text-green-600 hover:text-green-400 hover:text-green-300 hover:bg-green-50 hover:bg-green-900/20 rounded-lg transition-colors"
                                  >
                                    <Check className="h-4 w-4" />
                                  </button>
                                  <button
                                    onClick={() => {
                                      setInvitingTeamId(null)
                                      setInviteEmail('')
                                    }}
                                    className="p-2 text-red-600 hover:text-red-400 hover:text-red-300 hover:bg-red-50 hover:bg-red-900/20 rounded-lg transition-colors"
                                  >
                                    <X className="h-4 w-4" />
                                  </button>
                                </div>
                              ) : (
                                <button
                                  onClick={() => setInvitingTeamId(team.id)}
                                  className="w-full px-4 py-2 text-sm font-medium text-blue-400 border border-blue-300 border-blue-700 rounded-lg hover:bg-blue-50 hover:bg-blue-900/20 transition-colors"
                                >
                                  <UserPlus className="h-4 w-4 inline mr-2" />
                                  Invite Member
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      )
                    })()}

                    <button
                      onClick={() => router.push('/teams')}
                      className="w-full px-4 py-2 text-sm font-medium text-blue-400 border border-blue-300 border-blue-700 rounded-lg hover:bg-blue-50 hover:bg-blue-900/20 transition-colors"
                    >
                      <Users className="h-4 w-4 inline mr-2" />
                      View All Teams
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* No teams message for enterprise users */}
            {hasEnterpriseFeatures && teams.length === 0 && !loadingTeams && (
              <div className="bg-card/50 backdrop-blur-sm border border-border rounded-lg p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 bg-blue-500/10 rounded-lg">
                    <Users className="h-5 w-5 text-blue-400" />
                  </div>
                  <h2 className="text-lg font-semibold">Team Roster</h2>
                </div>
                <div className="text-center py-4">
                  <p className="text-sm text-muted-foreground mb-4">No teams yet</p>
                  <button
                    onClick={() => setTeamNameModalOpen(true)}
                    className="px-4 py-2 text-sm font-medium text-white bg-purple-600 hover:bg-purple-700 rounded-lg transition-all shadow-md"
                  >
                    <UserPlus className="h-4 w-4 inline mr-2" />
                    Create Team
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Right Column - Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Account Information */}
            <div className="bg-card/50 backdrop-blur-sm border border-border rounded-lg p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-blue-500/10 rounded-lg">
                  <User className="h-5 w-5 text-blue-400" />
                </div>
                <h2 className="text-lg font-semibold">Account Information</h2>
              </div>

              <div className="space-y-4">
                {/* User ID */}
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">
                    User ID
                  </label>
                  <div className="px-3 py-2 bg-card/30 backdrop-blur-sm border border-border rounded-lg">
                    <code className="text-xs text-muted-foreground font-mono">
                      {user?.id}
                    </code>
                  </div>
                </div>

                {/* Username */}
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">
                    Username (Display Name)
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder="Choose a username"
                      className="flex-1 px-3 py-2 border border-border rounded-lg bg-card/30 backdrop-blur-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-transparent transition-all"
                    />
                    <button
                      onClick={updateUsername}
                      disabled={updating || username === (user?.user_metadata?.username || '')}
                      className="px-4 py-2 text-sm font-medium text-white bg-purple-600 hover:bg-purple-700 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md"
                    >
                      {updating ? 'Updating...' : 'Update'}
                    </button>
                  </div>
                </div>

                {/* Email */}
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">
                    Email Address
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="flex-1 px-3 py-2 border border-border rounded-lg bg-card/30 backdrop-blur-sm text-foreground focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-transparent transition-all"
                    />
                    <button
                      onClick={updateEmail}
                      disabled={updating || email === user?.email}
                      className="px-4 py-2 text-sm font-medium text-white bg-purple-600 hover:bg-purple-700 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md"
                    >
                      {updating ? 'Updating...' : 'Update'}
                    </button>
                  </div>
                </div>

                {/* Created At */}
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">
                    Account Created
                  </label>
                  <div className="px-3 py-2 bg-card/30 backdrop-blur-sm border border-border rounded-lg">
                    <p className="text-sm text-foreground">
                      {user?.created_at && new Date(user.created_at).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Usage Statistics */}
            <div className="bg-card/50 backdrop-blur-sm border border-border rounded-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-green-500/10 rounded-lg">
                    <HardDrive className="h-5 w-5 text-green-400" />
                  </div>
                  <h2 className="text-lg font-semibold">Usage Statistics</h2>
                </div>
                <button
                  onClick={refreshUsage}
                  className="p-2 text-sm text-gray-400 hover:text-gray-900 hover:text-gray-100 transition-colors"
                  title="Refresh usage statistics"
                >
                  <RefreshCw className="h-4 w-4" />
                </button>
              </div>

              {usage ? (
                <div className="space-y-6">
                  {/* Fair Usage Policy — only for unlimited tiers */}
                  {usage.max_proofs === null && (
                    <div className="flex items-center gap-2 p-3 bg-gradient-to-r from-green-50 to-blue-50 from-green-900/20 to-blue-900/20 border border-green-200 border-green-800 rounded-lg">
                      <Shield className="h-4 w-4 text-green-400 flex-shrink-0" />
                      <p className="text-xs text-green-800 text-green-200">
                        <strong>Fair Usage Policy:</strong> Unlimited proofs for genuine use cases
                      </p>
                    </div>
                  )}

                  {/* Proof Count */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-purple-500 text-purple-400" />
                        <span className="text-sm font-medium text-foreground">Proofs</span>
                      </div>
                      <span className="text-sm text-foreground">
                        <span className="font-semibold">{(usage.proof_count ?? 0).toLocaleString()}</span>
                        {usage.max_proofs !== null && (
                          <>
                            <span className="text-muted-foreground"> / </span>
                            <span className="font-semibold">{usage.max_proofs.toLocaleString()}</span>
                          </>
                        )}
                      </span>
                    </div>
                    {usage.max_proofs !== null ? (
                      <div className="w-full bg-neutral-200 bg-neutral-700 rounded-full h-2.5 overflow-hidden">
                        <div
                          className={`h-2.5 rounded-full transition-all duration-300 ${
                            getUsagePercentage(usage.proof_count, usage.max_proofs) > 80
                              ? 'bg-gradient-to-r from-red-500 to-red-600 from-red-400 to-red-500'
                              : getUsagePercentage(usage.proof_count, usage.max_proofs) > 60
                              ? 'bg-gradient-to-r from-yellow-500 to-orange-500 from-yellow-400 to-orange-400'
                              : 'bg-gradient-to-r from-green-500 to-emerald-500 from-green-400 to-emerald-400'
                          }`}
                          style={{ width: `${Math.min(getUsagePercentage(usage.proof_count, usage.max_proofs), 100)}%` }}
                        />
                      </div>
                    ) : (
                      <div className="w-full bg-neutral-200 bg-neutral-700 rounded-full h-2.5 overflow-hidden relative">
                        <div className="absolute inset-0 bg-gradient-to-r from-green-500 via-blue-500 to-purple-500 from-green-400 via-blue-400 to-purple-400 animate-pulse" />
                      </div>
                    )}
                    {usage.proof_version_count > 0 && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Including {usage.proof_version_count.toLocaleString()} version{usage.proof_version_count !== 1 ? 's' : ''}
                      </p>
                    )}
                  </div>

                  {/* Last Updated */}
                  <div className="pt-4 border-t border-neutral-200 border-neutral-700">
                    <p className="text-xs text-muted-foreground font-medium">
                      Last updated: {new Date(usage.last_calculated_at).toLocaleDateString('en-IE')}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-muted-foreground mb-4">No usage data available</p>
                  <button
                    onClick={refreshUsage}
                    className="px-4 py-2 text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded-lg transition-all shadow-md"
                  >
                    <RefreshCw className="h-4 w-4 inline mr-2" />
                    Calculate Usage
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Modals */}
      <ConfirmModal
        isOpen={removeModalOpen}
        onClose={() => {
          setRemoveModalOpen(false)
          setMemberToRemove(null)
        }}
        onConfirm={confirmRemoveTeamMember}
        title="Remove Team Member"
        message={`Are you sure you want to remove ${memberToRemove?.memberEmail || 'this member'} from the team? This action cannot be undone.`}
        confirmText="Remove"
        cancelText="Cancel"
        variant="danger"
        isLoading={removingMember}
      />

      <InputModal
        isOpen={teamNameModalOpen}
        onClose={() => setTeamNameModalOpen(false)}
        onConfirm={(name) => {
          createTeam(name)
          setTeamNameModalOpen(false)
        }}
        title="Create Team"
        message="Enter a name for your new team:"
        placeholder="e.g., Marketing Team"
        confirmText="Create"
        cancelText="Cancel"
        maxLength={50}
      />
    </div>
  )
}
