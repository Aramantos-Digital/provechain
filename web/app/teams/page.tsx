'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import Link from 'next/link';
import { Users, Plus, Crown, UserCheck, ChevronRight, X, Loader2, LayoutDashboard, Settings } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { motion } from 'framer-motion';

interface Team {
  id: string;
  name: string;
  tier: string;
  max_members: number;
  admin_user_id: string;
  created_at: string;
  member_count?: number;
  user_role?: string;
}

export default function TeamsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [teams, setTeams] = useState<Team[]>([]);
  const [userTier, setUserTier] = useState<string>('free');
  const [canCreateTeam, setCanCreateTeam] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newTeamName, setNewTeamName] = useState('');
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    loadTeams();

    // Check if we should auto-open the create modal
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('create') === 'true') {
      setShowCreateModal(true);
      // Clean up the URL
      window.history.replaceState({}, '', '/teams');
    }
  }, []);

  async function loadTeams() {
    try {
      const supabase = createClient();

      // Check authentication
      const { data: { user }, error: authError } = await supabase.auth.getUser();

      if (authError || !user) {
        router.push('/login?redirect=/teams');
        return;
      }

      // Get user's subscription tier
      const subRes = await fetch('/api/subscription');
      if (subRes.ok) {
        const subData = await subRes.json();
        const tier = subData.subscription?.tier || 'free';
        setUserTier(tier);

        // Check if user can create a team
        const eligibleTiers = ['team', 'business', 'custom'];
        setCanCreateTeam(eligibleTiers.includes(tier));
      }

      // Get teams (owned and member)
      const teamsRes = await fetch('/api/teams');
      if (!teamsRes.ok) {
        console.error('Error loading teams');
        setLoading(false);
        return;
      }

      const teamsData = await teamsRes.json();
      const ownedTeams = (teamsData.owned || []).map((t: any) => ({ ...t, user_role: 'admin' }));
      const memberTeams = (teamsData.member || []).map((t: any) => ({ ...t, user_role: 'member' }));
      const allTeams: Team[] = [];

      for (const team of [...ownedTeams, ...memberTeams]) {
        // Get member count via members endpoint
        const membersRes = await fetch(`/api/teams/${team.id}/members`);
        let memberCount = 0;
        if (membersRes.ok) {
          const membersData = await membersRes.json();
          memberCount = Array.isArray(membersData) ? membersData.filter((m: any) => m.status === 'active').length : 0;
        }

        allTeams.push({
          ...team,
          member_count: memberCount,
        });
      }

      setTeams(allTeams);
      setLoading(false);
    } catch (error) {
      console.error('Failed to load teams:', error);
      setLoading(false);
    }
  }

  async function handleCreateTeam(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);

    try {
      const res = await fetch('/api/teams', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newTeamName }),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Failed to create team');
      }

      const data = await res.json();

      toast.success(`Team "${newTeamName}" created successfully!`);
      setShowCreateModal(false);
      setNewTeamName('');
      loadTeams(); // Reload teams

      // Redirect to new team
      if (data?.id) {
        router.push(`/teams/${data.id}`);
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to create team');
    } finally {
      setCreating(false);
    }
  }

  function getTierBadgeColor(tier: string) {
    switch (tier) {
      case 'team':
        return 'bg-blue-500/10 text-blue-400 border border-blue-500/20';
      case 'business':
        return 'bg-purple-500/10 text-purple-400 border border-purple-500/20';
      case 'custom':
        return 'bg-amber-500/10 text-amber-400 border border-amber-500/20';
      default:
        return 'bg-muted text-muted-foreground border border-border';
    }
  }

  if (loading) {
    return (
      <div className="w-full min-h-[60vh] flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-12 w-12 mx-auto mb-4 text-primary animate-spin" />
          <p className="text-muted-foreground">Loading teams...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full py-8 md:py-12">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-8"
        >
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-purple-500 to-blue-600 bg-clip-text text-transparent">
                Teams
              </h1>
              <p className="text-muted-foreground">
                Collaborate with your team on ProveChain
              </p>
            </div>

            {canCreateTeam && (
              <button
                onClick={() => setShowCreateModal(true)}
                className="inline-flex items-center gap-2 bg-purple-600 text-white px-6 py-3 rounded-lg hover:bg-purple-700 transition-all shadow-lg hover:shadow-xl font-semibold"
              >
                <Plus className="w-5 h-5" />
                Create Team
              </button>
            )}
          </div>
        </motion.div>

        {/* Teams Grid */}
        {teams.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="glass-card rounded-lg p-12 text-center"
          >
            <Users className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-50" />
            <h2 className="text-2xl font-bold mb-2">
              No teams yet
            </h2>
            <p className="text-muted-foreground mb-6 max-w-md mx-auto">
              {canCreateTeam
                ? 'Create a team to start collaborating with others.'
                : 'Upgrade to Professional tier or higher to create and join teams.'}
            </p>
            {canCreateTeam ? (
              <button
                onClick={() => setShowCreateModal(true)}
                className="inline-flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white px-6 py-3 rounded-lg transition-all shadow-lg hover:shadow-xl font-semibold"
              >
                <Plus className="w-5 h-5" />
                Create Your First Team
              </button>
            ) : (
              <Link
                href="/pricing"
                className="inline-flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white px-6 py-3 rounded-lg transition-all shadow-lg hover:shadow-xl font-semibold"
              >
                View Pricing
              </Link>
            )}
          </motion.div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {teams.map((team, index) => (
              <motion.div
                key={team.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.1 * index }}
              >
                <Link
                  href={`/teams/${team.id}`}
                  className="block glass-card rounded-lg hover:shadow-xl transition-all p-6 border border-border hover:border-primary/50 group"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <h3 className="text-lg font-bold mb-2 group-hover:text-primary transition-colors">
                        {team.name}
                      </h3>
                      <span
                        className={`inline-block text-xs font-semibold px-3 py-1 rounded-full ${getTierBadgeColor(
                          team.tier
                        )}`}
                      >
                        {team.tier.charAt(0).toUpperCase() + team.tier.slice(1)}
                      </span>
                    </div>
                    <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors flex-shrink-0" />
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Users className="w-4 h-4" />
                      <span>
                        {team.member_count} / {team.max_members >= 100 ? 'Unlimited' : team.max_members} members
                      </span>
                    </div>

                    <div className="flex items-center gap-2 text-sm">
                      {team.user_role === 'admin' ? (
                        <>
                          <Crown className="w-4 h-4 text-amber-500" />
                          <span className="text-amber-400 font-semibold">Admin</span>
                        </>
                      ) : (
                        <>
                          <UserCheck className="w-4 h-4 text-blue-500" />
                          <span className="text-blue-400 font-semibold">Member</span>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="mt-4 pt-4 border-t border-border">
                    <p className="text-xs text-muted-foreground">
                      Created {new Date(team.created_at).toLocaleDateString('en-IE')}
                    </p>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        )}

        {/* Upgrade Banner - Only show if user has no teams at all */}
        {!canCreateTeam && teams.length === 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="mt-8 bg-gradient-to-r from-purple-500 via-pink-500 to-blue-500 rounded-lg shadow-xl p-8 text-white"
          >
            <h2 className="text-3xl font-bold mb-3">
              Unlock Team Collaboration
            </h2>
            <p className="mb-6 text-lg opacity-95">
              Upgrade to Professional tier or higher to create teams and collaborate with your colleagues.
            </p>
            <Link
              href="/pricing"
              className="inline-flex items-center gap-2 bg-white text-purple-600 px-8 py-4 rounded-lg hover:bg-purple-50 transition-all font-bold shadow-lg hover:shadow-xl"
            >
              View Pricing Plans
            </Link>
          </motion.div>
        )}

        {/* Navigation Buttons */}
        <div className="mt-12 flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            href="/dashboard"
            className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-purple-600 text-white rounded-lg font-semibold hover:bg-purple-700 transition-all shadow-lg hover:shadow-xl"
          >
            <LayoutDashboard className="h-5 w-5" />
            Back to Dashboard
          </Link>
          <Link
            href="/settings"
            className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-secondary text-secondary-foreground rounded-lg font-semibold hover:bg-secondary/80 transition-all shadow-lg hover:shadow-xl"
          >
            <Settings className="h-5 w-5" />
            Account Settings
          </Link>
        </div>
      </div>

      {/* Create Team Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.2 }}
            className="bg-card border-2 border-primary/30 rounded-lg p-6 max-w-md w-full shadow-2xl"
          >
            <div className="mb-6">
              <h2 className="text-2xl font-bold bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent mb-2">
                Create New Team
              </h2>
              <p className="text-sm text-muted-foreground">
                Start collaborating with your team on ProveChain
              </p>
            </div>

            <form onSubmit={handleCreateTeam}>
              <div className="mb-6">
                <label className="block text-sm font-semibold text-foreground mb-2">
                  Team Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={newTeamName}
                  onChange={(e) => setNewTeamName(e.target.value)}
                  placeholder="My Awesome Team"
                  className="w-full px-4 py-3 rounded-lg bg-background border-2 border-border focus:border-primary text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                  required
                  autoFocus
                />
                <div className="mt-2 p-3 bg-primary/10 border border-primary/20 rounded-lg">
                  <p className="text-xs text-muted-foreground">
                    {userTier === 'team' && '👥 Team: Up to 5 members per team'}
                    {userTier === 'business' && '🏢 Business: Up to 25 members per team'}
                    {userTier === 'custom' && '🚀 Custom: Unlimited teams & unlimited members'}
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateModal(false);
                    setNewTeamName('');
                  }}
                  disabled={creating}
                  className="flex-1 px-4 py-3 rounded-lg frost-light border border-white/10 hover:frost-warm text-foreground font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating || !newTeamName.trim()}
                  className="flex-1 px-4 py-3 rounded-lg bg-purple-600 hover:bg-purple-700 text-white font-semibold transition-all shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {creating ? (
                    <>
                      <Loader2 className="inline-block w-4 h-4 mr-2 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    'Create Team'
                  )}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
}
