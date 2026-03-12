'use client';

import { useEffect, useState, useRef, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import Link from 'next/link';

interface TeamInfo {
  id: string;
  name: string;
  admin_user_id: string;
}

interface InvitationData {
  id: string;
  team_id: string;
  email: string;
  expires_at: string;
  accepted_at: string | null;
  teams: TeamInfo | TeamInfo[] | null;
}

interface UserProfile {
  id: string;
  email: string;
  full_name: string | null;
  username: string | null;
  avatar_url: string | null;
}

export default function AcceptInvitationPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
          <p className="text-slate-600">Loading...</p>
        </div>
      </div>
    }>
      <AcceptInvitationContent />
    </Suspense>
  );
}

function AcceptInvitationContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  const hasLoadedRef = useRef(false); // Prevent double-execution in dev mode

  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [teamName, setTeamName] = useState<string>('');
  const [inviterName, setInviterName] = useState<string>('');
  const [invitation, setInvitation] = useState<InvitationData | null>(null);

  useEffect(() => {
    if (!token) {
      setError('Invalid invitation link');
      setLoading(false);
      return;
    }

    // Prevent double-execution in React 18 StrictMode (dev only)
    if (hasLoadedRef.current) return;
    hasLoadedRef.current = true;

    loadInvitationDetails();
  }, [token]);

  // Load invitation details and validate (doesn't accept yet)
  async function loadInvitationDetails() {
    if (!token) return;

    try {
      const supabase = createClient();

      // Check if user is authenticated
      const { data: { user }, error: authError } = await supabase.auth.getUser();

      if (authError || !user) {
        // Redirect to login with return URL
        router.push(`/login?redirect=/teams/accept?token=${token}`);
        return;
      }

      // Get invitation details via API
      const invRes = await fetch(`/api/teams/invitations?token=${token}`);
      if (!invRes.ok) {
        setError('Invitation not found');
        setLoading(false);
        return;
      }

      const invitationData = await invRes.json();
      setInvitation(invitationData);

      // Check if already accepted
      if (invitationData.accepted_at) {
        setError('This invitation has already been accepted');
        setLoading(false);
        return;
      }

      // Check if expired
      const expiresAt = new Date(invitationData.expires_at);
      if (expiresAt < new Date()) {
        setError('This invitation has expired');
        setLoading(false);
        return;
      }

      // Check if email matches (case insensitive)
      const userEmail = user.email?.toLowerCase();
      const invitedEmail = invitationData.email.toLowerCase();

      if (userEmail !== invitedEmail) {
        setError(`This invitation was sent to ${invitationData.email}. Please log in with that account.`);
        setLoading(false);
        return;
      }

      // Get team name (normalize teams to single object)
      const teamData = Array.isArray(invitationData.teams)
        ? invitationData.teams[0]
        : invitationData.teams;
      const teamNameValue = teamData?.name || 'Unknown Team';
      setTeamName(teamNameValue);

      // Get inviter name
      const adminUserId = teamData?.admin_user_id;
      if (adminUserId) {
        const profileRes = await fetch(`/api/user/profile?user_id=${adminUserId}`);
        if (profileRes.ok) {
          const profile = await profileRes.json();
          if (profile) {
            setInviterName(profile.full_name || 'Team admin');
          }
        }
      }

      // Check if already a member by fetching team members
      const membersRes = await fetch(`/api/teams/${invitationData.team_id}/members`);
      if (membersRes.ok) {
        const membersData = await membersRes.json();
        const existingMember = Array.isArray(membersData) ?
          membersData.find((m: any) => m.user_id === user.id && m.status === 'active') : null;

        if (existingMember) {
          setError('You are already a member of this team');
          setLoading(false);
          return;
        }
      }

      // All validation passed - show confirmation UI
      setShowConfirmation(true);
      setLoading(false);

    } catch (err) {
      console.error('Load invitation error:', err);
      setError('An unexpected error occurred');
      setLoading(false);
    }
  }

  // Actually accept the invitation (called when user clicks Accept button)
  async function acceptInvitation() {
    if (!token || !invitation) return;

    setAccepting(true);

    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        setError('You must be logged in to accept this invitation');
        setAccepting(false);
        return;
      }

      const teamId = invitation.team_id;

      // Accept invitation - add to team_members via API
      const joinRes = await fetch(`/api/teams/${teamId}/members`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: user.id }),
      });

      if (!joinRes.ok) {
        console.error('Failed to add team member');
        setError('Failed to accept invitation. Please try again.');
        setAccepting(false);
        return;
      }

      // Mark invitation as accepted via API
      try {
        await fetch(`/api/teams/invitations/${token}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: 'accepted' }),
        });
      } catch (updateErr) {
        console.error('Failed to update invitation:', updateErr);
        // Don't fail - user is already added to team
      }

      // Mark notification as read if exists (best-effort)
      try {
        await fetch('/api/notifications/read', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ notification_id: invitation.id }),
        });
      } catch (notifErr) {
        // Best effort - don't fail
      }

      setSuccess(true);
      setAccepting(false);

      // Redirect to team page after 2 seconds
      setTimeout(() => {
        router.push(`/teams/${teamId}`);
      }, 2000);

    } catch (err) {
      console.error('Accept invitation error:', err);
      setError('An unexpected error occurred');
      setAccepting(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full">
        {loading && (
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
            <h2 className="text-xl font-semibold text-slate-900 mb-2">
              Loading Invitation...
            </h2>
            <p className="text-slate-600">
              Please wait while we verify your invitation.
            </p>
          </div>
        )}

        {showConfirmation && !accepting && !success && (
          <div className="text-center">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-slate-900 mb-2">
              Team Invitation
            </h2>
            <p className="text-slate-600 mb-4">
              {inviterName ? (
                <><strong>{inviterName}</strong> has invited you to join</>
              ) : (
                <>You've been invited to join</>
              )}
            </p>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
              <p className="text-2xl font-bold text-blue-900">{teamName}</p>
            </div>
            <div className="flex flex-col gap-3">
              <button
                onClick={acceptInvitation}
                className="w-full bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition font-semibold"
              >
                Accept Invitation
              </button>
              <Link
                href="/dashboard"
                className="w-full text-center text-slate-600 hover:text-slate-800 transition"
              >
                Decline
              </Link>
            </div>
          </div>
        )}

        {accepting && (
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
            <h2 className="text-xl font-semibold text-slate-900 mb-2">
              Accepting Invitation...
            </h2>
            <p className="text-slate-600">
              Adding you to {teamName}...
            </p>
          </div>
        )}

        {success && (
          <div className="text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-slate-900 mb-2">
              Welcome to {teamName}!
            </h2>
            {inviterName && (
              <p className="text-slate-600 mb-4">
                You've successfully joined {inviterName}'s team.
              </p>
            )}
            <p className="text-sm text-slate-500 mb-6">
              Redirecting to team page...
            </p>
            <div className="flex flex-col gap-3">
              <Link
                href="/dashboard"
                className="inline-block bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition"
              >
                Go to Dashboard
              </Link>
              <Link
                href={`/teams`}
                className="inline-block text-blue-600 hover:text-blue-700 transition"
              >
                View Teams
              </Link>
            </div>
          </div>
        )}

        {error && (
          <div className="text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-slate-900 mb-2">
              Unable to Accept Invitation
            </h2>
            <p className="text-slate-600 mb-6">
              {error}
            </p>
            <div className="flex flex-col gap-3">
              <Link
                href="/dashboard"
                className="inline-block bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition"
              >
                Go to Dashboard
              </Link>
              <Link
                href="/login"
                className="inline-block text-blue-600 hover:text-blue-700 transition"
              >
                Sign In
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
