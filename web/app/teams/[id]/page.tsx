'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import {
  Users,
  Crown,
  UserCheck,
  Mail,
  Plus,
  Trash2,
  X,
  Check,
  AlertCircle,
  Loader2,
  ArrowLeft,
  ArrowUp,
  ArrowDown,
} from 'lucide-react';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import ConfirmModal from '@/components/ConfirmModal';

interface TeamMember {
  id: string;
  user_id: string;
  role: string;
  joined_at: string;
  user_email?: string;
  user_name?: string;
  username?: string;
}

interface PendingInvitation {
  id: string;
  email: string;
  created_at: string;
  expires_at: string;
}

interface TeamData {
  id: string;
  name: string;
  tier: string;
  max_members: number;
  admin_user_id: string;
  created_at: string;
}

interface UserProfile {
  id: string;
  email: string;
  full_name: string | null;
  username: string | null;
  avatar_url: string | null;
}

export default function TeamDetailPage() {
  const router = useRouter();
  const params = useParams();
  const teamId = params.id as string;

  const [loading, setLoading] = useState(true);
  const [team, setTeam] = useState<TeamData | null>(null);
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [invitations, setInvitations] = useState<PendingInvitation[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string>('');

  // Invite modal state
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'member' | 'admin'>('member');
  const [inviteLoading, setInviteLoading] = useState(false);

  // Cancel invitation modal state
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [invitationToCancel, setInvitationToCancel] = useState<PendingInvitation | null>(null);
  const [cancelLoading, setCancelLoading] = useState(false);

  // Remove member modal state
  const [showRemoveModal, setShowRemoveModal] = useState(false);
  const [memberToRemove, setMemberToRemove] = useState<{ id: string; email: string } | null>(null);
  const [removeLoading, setRemoveLoading] = useState(false);

  useEffect(() => {
    loadTeamData();
  }, [teamId]);

  async function loadTeamData() {
    try {
      const supabase = createClient();

      // Check authentication
      const { data: { user }, error: authError } = await supabase.auth.getUser();

      if (authError || !user) {
        router.push('/login?redirect=/teams/' + teamId);
        return;
      }

      setCurrentUserId(user.id);

      // Get team data
      const teamRes = await fetch(`/api/teams/${teamId}`);
      if (!teamRes.ok) {
        toast.error('Team not found');
        router.push('/teams');
        return;
      }

      const teamData = await teamRes.json();
      setTeam(teamData);

      // Check if user is admin
      const userIsAdmin = teamData.admin_user_id === user.id;

      // Get team members (includes profile data)
      const membersRes = await fetch(`/api/teams/${teamId}/members`);
      let teamMember: any = null;

      if (membersRes.ok) {
        const membersData = await membersRes.json();
        const activeMembers = Array.isArray(membersData) ? membersData.filter((m: any) => m.status === 'active') : [];

        // Check if user is a team admin (not just owner)
        teamMember = activeMembers.find((m: any) => m.user_id === user.id && m.role === 'admin');

        // Sort members: owner first, then admins, then regular members
        const sortedMembers = activeMembers.sort((a: any, b: any) => {
          const aIsOwner = a.user_id === teamData.admin_user_id;
          const bIsOwner = b.user_id === teamData.admin_user_id;
          if (aIsOwner && !bIsOwner) return -1;
          if (!aIsOwner && bIsOwner) return 1;

          if (a.role === 'admin' && b.role !== 'admin') return -1;
          if (a.role !== 'admin' && b.role === 'admin') return 1;

          return 0;
        });

        setMembers(sortedMembers);
      }

      setIsAdmin(userIsAdmin || !!teamMember);

      // Get pending invitations (admin only)
      if (userIsAdmin || teamMember) {
        const response = await fetch(
          `/api/teams/invite?teamId=${teamId}`,
          {
            method: 'GET',
          }
        );

        if (response.ok) {
          const data = await response.json();
          setInvitations(data.invitations || []);
        }
      }

      setLoading(false);
    } catch (error) {
      console.error('Failed to load team:', error);
      toast.error('Failed to load team');
      setLoading(false);
    }
  }

  async function handleInviteMember(e: React.FormEvent) {
    e.preventDefault();
    setInviteLoading(true);

    try {
      const response = await fetch('/api/teams/invite', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          teamId,
          email: inviteEmail,
          role: inviteRole,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to send invitation');
      }

      toast.success(`Invitation sent to ${inviteEmail}`);
      setShowInviteModal(false);
      setInviteEmail('');
      setInviteRole('member');
      loadTeamData(); // Reload to show new invitation
    } catch (error: any) {
      toast.error(error.message || 'Failed to send invitation');
    } finally {
      setInviteLoading(false);
    }
  }

  async function handleCancelInvitation() {
    if (!invitationToCancel) return;

    setCancelLoading(true);

    try {
      const response = await fetch(`/api/teams/invite?invitationId=${invitationToCancel.id}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to cancel invitation');
      }

      toast.success(`Invitation to ${invitationToCancel.email} cancelled`);
      setShowCancelModal(false);
      setInvitationToCancel(null);
      loadTeamData(); // Reload to update invitations list
    } catch (error: any) {
      toast.error(error.message || 'Failed to cancel invitation');
    } finally {
      setCancelLoading(false);
    }
  }

  async function handleChangeRole(memberId: string, memberEmail: string, currentRole: string) {
    const newRole = currentRole === 'admin' ? 'member' : 'admin';
    const action = newRole === 'admin' ? 'promoted' : 'demoted';

    try {
      // Find the member's user_id from current members list
      const member = members.find(m => m.id === memberId);
      if (!member) throw new Error('Member not found');

      const res = await fetch(`/api/teams/${teamId}/members/${member.user_id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: newRole }),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Failed to change role');
      }

      await loadTeamData(); // Wait for reload
      toast.success(`${memberEmail} ${action} to ${newRole}`);
    } catch (error) {
      console.error('Failed to change role:', error);
      toast.error('Failed to change member role');
    }
  }

  function openRemoveMemberModal(memberId: string, memberEmail: string) {
    setMemberToRemove({ id: memberId, email: memberEmail });
    setShowRemoveModal(true);
  }

  async function confirmRemoveMember() {
    if (!memberToRemove) return;

    setRemoveLoading(true);
    try {
      // Find the member's user_id from current members list
      const member = members.find(m => m.id === memberToRemove.id);
      if (!member) throw new Error('Member not found');

      const res = await fetch(`/api/teams/${teamId}/members/${member.user_id}`, {
        method: 'DELETE',
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Failed to remove member');
      }

      toast.success('Member removed from team');
      await loadTeamData();
      setShowRemoveModal(false);
      setMemberToRemove(null);
    } catch (error) {
      console.error('Failed to remove member:', error);
      toast.error('Failed to remove member');
    } finally {
      setRemoveLoading(false);
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
          <p className="text-muted-foreground">Loading team...</p>
        </div>
      </div>
    );
  }

  if (!team) {
    return null;
  }

  const memberCount = members.length;
  const canInvite = isAdmin && memberCount < team.max_members;

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
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
            <div>
              <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-purple-500 to-blue-600 bg-clip-text text-transparent">
                {team.name}
              </h1>
              <div className="flex items-center gap-3">
                <span
                  className={`inline-block text-xs font-semibold px-3 py-1 rounded-full ${getTierBadgeColor(
                    team.tier
                  )}`}
                >
                  {team.tier.charAt(0).toUpperCase() + team.tier.slice(1)}
                </span>
                <span className="text-sm text-muted-foreground">
                  {memberCount} / {team.max_members >= 100 ? 'Unlimited' : team.max_members} members
                </span>
              </div>
            </div>

            {canInvite && (
              <button
                onClick={() => setShowInviteModal(true)}
                className="inline-flex items-center gap-2 bg-purple-600 text-white px-6 py-3 rounded-lg hover:bg-purple-700 transition-all shadow-lg hover:shadow-xl font-semibold"
              >
                <Plus className="w-5 h-5" />
                Invite Member
              </button>
            )}
          </div>
        </motion.div>

        {/* Warning if at capacity */}
        {!canInvite && isAdmin && memberCount >= team.max_members && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="mb-6 bg-amber-500/10 border border-amber-500/20 rounded-lg p-4 flex items-start gap-3"
          >
            <AlertCircle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h3 className="font-semibold text-amber-400 mb-1">
                Team at Maximum Capacity
              </h3>
              <p className="text-sm text-muted-foreground">
                Your team has reached the maximum member limit. Upgrade to a higher tier to add more members.
              </p>
            </div>
          </motion.div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Members List */}
          <div className="lg:col-span-2">
            <div className="glass-card rounded-lg p-6">
              <h2 className="text-2xl font-bold mb-6">
                Team Members
              </h2>

              {/* Admins Section */}
              {members.filter(m => m.role === 'admin').length > 0 && (
                <>
                  <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                    <Crown className="w-4 h-4 text-amber-500" />
                    Administrators
                  </h3>
                  <div className="space-y-3 mb-6">
                    {members.filter(m => m.role === 'admin').map((member) => (
                      <div
                        key={member.id}
                        className="flex items-center justify-between p-4 border border-border rounded-lg hover:bg-accent transition-all"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                            <span className="text-primary font-semibold text-sm">
                              {(member.username || member.user_email || 'U')[0].toUpperCase()}
                            </span>
                          </div>
                          <div className="flex-1">
                            <p className="font-semibold text-foreground">
                              {member.username || member.user_name || member.user_email || 'Unknown User'}
                              {member.user_id === currentUserId && (
                                <span className="ml-2 text-sm text-muted-foreground">(You)</span>
                              )}
                              {member.user_id === team.admin_user_id && (
                                <span className="ml-2 text-sm text-muted-foreground">(Owner)</span>
                              )}
                            </p>
                            <p className="text-xs text-muted-foreground">{member.user_email}</p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <span className="flex items-center gap-1 text-sm text-amber-400 font-semibold">
                            <Crown className="w-4 h-4" />
                            Admin
                          </span>

                          {isAdmin &&
                            member.user_id !== team.admin_user_id &&
                            member.user_id !== currentUserId && (
                              <>
                                <button
                                  onClick={() =>
                                    handleChangeRole(member.id, member.user_email || 'User', 'admin')
                                  }
                                  className="p-1.5 text-blue-400 hover:bg-blue-500/10 rounded transition"
                                  title="Demote to Member"
                                >
                                  <ArrowDown className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() =>
                                    openRemoveMemberModal(member.id, member.user_email || 'User')
                                  }
                                  className="p-1.5 text-red-400 hover:bg-red-500/10 rounded transition"
                                  title="Remove from team"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </>
                            )}
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}

              {/* Members Section */}
              {members.filter(m => m.role !== 'admin').length > 0 && (
                <>
                  <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                    <UserCheck className="w-4 h-4 text-blue-500" />
                    Members
                  </h3>
                  <div className="space-y-3">
                    {members.filter(m => m.role !== 'admin').map((member) => (
                      <div
                        key={member.id}
                        className="flex items-center justify-between p-4 border border-border rounded-lg hover:bg-accent transition-all"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                            <span className="text-primary font-semibold text-sm">
                              {(member.username || member.user_email || 'U')[0].toUpperCase()}
                            </span>
                          </div>
                          <div className="flex-1">
                            <p className="font-semibold text-foreground">
                              {member.username || member.user_name || member.user_email || 'Unknown User'}
                              {member.user_id === currentUserId && (
                                <span className="ml-2 text-sm text-muted-foreground">(You)</span>
                              )}
                              {member.user_id === team.admin_user_id && (
                                <span className="ml-2 text-sm text-muted-foreground">(Owner)</span>
                              )}
                            </p>
                            <p className="text-xs text-muted-foreground">{member.user_email}</p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <span className="flex items-center gap-1 text-sm text-blue-400 font-semibold">
                            <UserCheck className="w-4 h-4" />
                            Member
                          </span>

                          {isAdmin &&
                            member.user_id !== team.admin_user_id &&
                            member.user_id !== currentUserId && (
                              <>
                                <button
                                  onClick={() =>
                                    handleChangeRole(member.id, member.user_email || 'User', 'member')
                                  }
                                  className="p-1.5 text-amber-400 hover:bg-amber-500/10 rounded transition"
                                  title="Promote to Admin"
                                >
                                  <ArrowUp className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() =>
                                    openRemoveMemberModal(member.id, member.user_email || 'User')
                                  }
                                  className="p-1.5 text-red-400 hover:bg-red-500/10 rounded transition"
                                  title="Remove from team"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </>
                            )}
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Pending Invitations */}
          <div className="lg:col-span-1">
            {isAdmin && (
              <div className="glass-card rounded-lg p-6">
                <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                  <Mail className="w-5 h-5" />
                  Pending Invitations
                </h2>

                {invitations.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-6">
                    No pending invitations
                  </p>
                ) : (
                  <div className="space-y-3">
                    {invitations.map((invitation) => (
                      <div
                        key={invitation.id}
                        className="p-3 border border-border rounded-lg hover:bg-accent transition-all flex items-start justify-between gap-3"
                      >
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-foreground text-sm truncate">
                            {invitation.email}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            Sent {new Date(invitation.created_at).toLocaleDateString('en-IE')}
                          </p>
                        </div>
                        <button
                          onClick={() => {
                            setInvitationToCancel(invitation);
                            setShowCancelModal(true);
                          }}
                          className="p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded transition-all flex-shrink-0"
                          title="Cancel invitation"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Navigation Buttons */}
        <div className="mt-12 flex justify-center">
          <Link
            href="/teams"
            className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-purple-600 text-white rounded-lg font-semibold hover:bg-purple-700 transition-all shadow-lg hover:shadow-xl"
          >
            <ArrowLeft className="h-5 w-5" />
            Back to Teams
          </Link>
        </div>
      </div>

      {/* Invite Modal */}
      {showInviteModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.2 }}
            className="bg-card border-2 border-primary/30 rounded-lg p-6 max-w-md w-full shadow-2xl"
          >
            <div className="mb-6">
              <h2 className="text-2xl font-bold bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent mb-2">
                Invite Team Member
              </h2>
              <p className="text-sm text-muted-foreground">
                Send an invitation to join {team.name}
              </p>
            </div>

            <form onSubmit={handleInviteMember}>
              <div className="mb-4">
                <label className="block text-sm font-semibold text-foreground mb-2">
                  Email Address <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="colleague@example.com"
                  className="w-full px-4 py-3 rounded-lg bg-background border-2 border-border focus:border-primary text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                  required
                  autoFocus
                />
              </div>

              <div className="mb-6">
                <label className="block text-sm font-semibold text-foreground mb-2">
                  Role
                </label>
                <select
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value as 'member' | 'admin')}
                  className="w-full px-4 py-3 rounded-lg bg-background border-2 border-border focus:border-primary text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                >
                  <option value="member">Member</option>
                  <option value="admin">Admin</option>
                </select>
                <div className="mt-2 p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                  <p className="text-xs text-muted-foreground">
                    💡 Admins can invite and remove members
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowInviteModal(false);
                    setInviteEmail('');
                    setInviteRole('member');
                  }}
                  disabled={inviteLoading}
                  className="flex-1 px-4 py-3 rounded-lg frost-light border border-white/10 hover:frost-warm text-foreground font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={inviteLoading || !inviteEmail.trim()}
                  className="flex-1 px-4 py-3 rounded-lg bg-purple-600 hover:bg-purple-700 text-white font-semibold transition-all shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {inviteLoading ? (
                    <>
                      <Loader2 className="inline-block w-4 h-4 mr-2 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    'Send Invitation'
                  )}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {/* Cancel Invitation Confirmation Modal */}
      {showCancelModal && invitationToCancel && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.2 }}
            className="bg-card border-2 border-red-500/30 rounded-lg p-6 max-w-md w-full shadow-2xl"
          >
            <div className="mb-6">
              <h2 className="text-2xl font-bold bg-gradient-to-r from-red-400 to-orange-400 bg-clip-text text-transparent mb-2">
                Cancel Invitation?
              </h2>
              <p className="text-sm text-muted-foreground">
                This will revoke the invitation link
              </p>
            </div>

            <div className="mb-6 p-4 bg-red-500/10 border-2 border-red-500/20 rounded-lg">
              <p className="text-sm text-foreground mb-2">
                You're about to cancel the invitation for:
              </p>
              <p className="text-base font-semibold text-foreground">
                {invitationToCancel.email}
              </p>
              <p className="text-xs text-muted-foreground mt-3">
                ⚠️ They will no longer be able to join using this link
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowCancelModal(false);
                  setInvitationToCancel(null);
                }}
                disabled={cancelLoading}
                className="flex-1 px-4 py-3 rounded-lg frost-light border border-white/10 hover:frost-warm text-foreground font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Keep Invitation
              </button>
              <button
                onClick={handleCancelInvitation}
                disabled={cancelLoading}
                className="flex-1 px-4 py-3 rounded-lg bg-red-600 hover:bg-red-700 text-white font-semibold transition-all shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {cancelLoading ? (
                  <>
                    <Loader2 className="inline-block w-4 h-4 mr-2 animate-spin" />
                    Cancelling...
                  </>
                ) : (
                  'Yes, Cancel Invitation'
                )}
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Remove Member Confirmation Modal */}
      <ConfirmModal
        isOpen={showRemoveModal}
        onClose={() => {
          setShowRemoveModal(false);
          setMemberToRemove(null);
        }}
        onConfirm={confirmRemoveMember}
        title="Remove Team Member"
        message={`Are you sure you want to remove ${memberToRemove?.email || 'this member'} from the team? This action cannot be undone.`}
        confirmText="Remove"
        cancelText="Cancel"
        variant="danger"
        isLoading={removeLoading}
      />
    </div>
  );
}
