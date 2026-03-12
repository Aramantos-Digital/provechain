import { getAuthContext } from '@/lib/auth-context';
import { getUserByEmail } from '@/lib/core';
import { NextRequest, NextResponse } from 'next/server';
import { sendTeamInvitationEmail } from '@/lib/email';
import crypto from 'crypto';

export async function POST(request: NextRequest) {
  try {
    const auth = await getAuthContext();
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const { user, supabase } = auth;
    // supabase is service role — used for data queries and admin operations

    // Parse request body
    const body = await request.json();
    const { teamId, email, role = 'member' } = body;

    if (!teamId || !email) {
      return NextResponse.json(
        { error: 'Team ID and email are required' },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Invalid email address' },
        { status: 400 }
      );
    }

    // Validate role
    if (!['admin', 'member'].includes(role)) {
      return NextResponse.json(
        { error: 'Invalid role. Must be "admin" or "member"' },
        { status: 400 }
      );
    }

    // Check if user is admin of the team
    const { data: team, error: teamError } = await supabase
      .from('teams')
      .select('id, name, admin_user_id, tier, max_members')
      .eq('id', teamId)
      .single();

    if (teamError || !team) {
      return NextResponse.json(
        { error: 'Team not found' },
        { status: 404 }
      );
    }

    // Check if user is admin
    const isAdmin = team.admin_user_id === user.id;

    // Also check if user is a team admin (not just owner)
    const { data: teamMember } = await supabase
      .from('team_members')
      .select('role')
      .eq('team_id', teamId)
      .eq('user_id', user.id)
      .eq('role', 'admin')
      .single();

    if (!isAdmin && !teamMember) {
      return NextResponse.json(
        { error: 'Only team admins can invite members' },
        { status: 403 }
      );
    }

    // Check if team has reached max members
    const { count: memberCount } = await supabase
      .from('team_members')
      .select('*', { count: 'exact', head: true })
      .eq('team_id', teamId)
      .eq('status', 'active');

    if (memberCount !== null && memberCount >= team.max_members) {
      return NextResponse.json(
        { error: `Team has reached maximum member limit (${team.max_members})` },
        { status: 400 }
      );
    }

    // Look up invitee by email via Core API
    const inviteeUser = await getUserByEmail(email.toLowerCase());

    if (inviteeUser) {
      // User exists in Core - check if they're already a member
      const { data: existingMember } = await supabase
        .from('team_members')
        .select('id, status')
        .eq('team_id', teamId)
        .eq('user_id', inviteeUser.id)
        .single();

      if (existingMember) {
        if (existingMember.status === 'active') {
          return NextResponse.json(
            { error: 'This user is already a member of the team' },
            { status: 400 }
          );
        } else if (existingMember.status === 'pending') {
          return NextResponse.json(
            { error: 'This user already has a pending invitation to the team' },
            { status: 400 }
          );
        }
      }
    }

    // Check if there's already a pending invitation
    const { data: existingInvitation } = await supabase
      .from('team_invitations')
      .select('id, expires_at')
      .eq('team_id', teamId)
      .eq('email', email.toLowerCase())
      .is('accepted_at', null)
      .gt('expires_at', new Date().toISOString())
      .single();

    if (existingInvitation) {
      return NextResponse.json(
        { error: 'An active invitation already exists for this email' },
        { status: 400 }
      );
    }

    // Generate invitation token
    const invitationToken = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days expiry

    // Create invitation
    const { data: invitation, error: invitationError } = await supabase
      .from('team_invitations')
      .insert({
        team_id: teamId,
        email: email.toLowerCase(),
        invited_by: user.id,
        token: invitationToken,
        expires_at: expiresAt.toISOString(),
      })
      .select()
      .single();

    if (invitationError || !invitation) {
      console.error('Failed to create invitation:', invitationError);
      return NextResponse.json(
        { error: 'Failed to create invitation' },
        { status: 500 }
      );
    }

    // Get inviter's name from auth user object (already available)
    const inviterName = user.user_metadata?.full_name ||
                       user.user_metadata?.name ||
                       user.email?.split('@')[0] ||
                       'A team member';

    // Send email invitation
    try {
      const emailResult = await sendTeamInvitationEmail({
        toEmail: email,
        teamName: team.name,
        inviterName,
        invitationToken,
        expiresAt,
      });
    } catch (emailError) {
      console.error('❌ Failed to send invitation email:', emailError);
      // Don't fail the request if email fails - invitation still exists
      // but we should log it
    }

    // Create in-app notification if user exists (inviteeUser already fetched above)
    try {
      if (inviteeUser) {
        // User exists in Core - create in-app notification
        const { error: notificationError } = await supabase
          .from('notifications')
          .insert({
            user_id: inviteeUser.id,
            type: 'team_invitation',
            title: `Team Invitation: ${team.name}`,
            message: `${inviterName} invited you to join ${team.name}`,
            action_url: `/team/accept?token=${invitationToken}`,
            metadata: {
              team_id: teamId,
              invitation_id: invitation.id,
              inviter_id: user.id,
              inviter_name: inviterName,
            },
          });

        if (notificationError) {
          console.error('❌ Failed to create notification:', notificationError);
          // Don't fail the request - notification is nice to have but not critical
        } else {
        }
      } else {
      }
      // If user doesn't exist yet, they'll get the invitation via email
      // and can sign up using that email
    } catch (notificationError) {
      console.error('❌ Error creating notification:', notificationError);
      // Don't fail the request - notification is nice to have but not critical
    }

    // Log to audit_logs
    await supabase.from('audit_logs').insert({
      user_id: user.id,
      action: 'team_member_invited',
      resource_type: 'team',
      resource_id: teamId,
      details: {
        team_name: team.name,
        invitee_email: email,
        invited_role: role,
      }
    })

    return NextResponse.json({
      success: true,
      invitation: {
        id: invitation.id,
        email: invitation.email,
        expires_at: invitation.expires_at,
      },
    });

  } catch (error) {
    console.error('Team invitation error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// GET: List pending invitations for a team
export async function GET(request: NextRequest) {
  try {
    const auth = await getAuthContext();
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const { user, supabase } = auth;

    // Get team ID from query params
    const searchParams = request.nextUrl.searchParams;
    const teamId = searchParams.get('teamId');

    if (!teamId) {
      return NextResponse.json(
        { error: 'Team ID is required' },
        { status: 400 }
      );
    }

    // Check if user is admin of the team
    const { data: team, error: teamError } = await supabase
      .from('teams')
      .select('id, admin_user_id')
      .eq('id', teamId)
      .single();

    if (teamError || !team) {
      return NextResponse.json(
        { error: 'Team not found' },
        { status: 404 }
      );
    }

    // Check if user is admin
    const isAdmin = team.admin_user_id === user.id;

    const { data: teamMember } = await supabase
      .from('team_members')
      .select('role')
      .eq('team_id', teamId)
      .eq('user_id', user.id)
      .eq('role', 'admin')
      .single();

    if (!isAdmin && !teamMember) {
      return NextResponse.json(
        { error: 'Only team admins can view invitations' },
        { status: 403 }
      );
    }

    // Get pending invitations
    const { data: invitations, error: invitationsError } = await supabase
      .from('team_invitations')
      .select('id, email, created_at, expires_at')
      .eq('team_id', teamId)
      .is('accepted_at', null)
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false });

    if (invitationsError) {
      console.error('Failed to fetch invitations:', invitationsError);
      return NextResponse.json(
        { error: 'Failed to fetch invitations' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      invitations: invitations || [],
    });

  } catch (error) {
    console.error('Get invitations error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE: Cancel a pending invitation
export async function DELETE(request: NextRequest) {
  try {
    const auth = await getAuthContext();
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const { user, supabase } = auth;

    // Get invitation ID from query params
    const searchParams = request.nextUrl.searchParams;
    const invitationId = searchParams.get('invitationId');

    if (!invitationId) {
      return NextResponse.json(
        { error: 'Invitation ID is required' },
        { status: 400 }
      );
    }

    // Fetch invitation to get team_id and email
    const { data: invitation, error: invitationError } = await supabase
      .from('team_invitations')
      .select('id, team_id, email')
      .eq('id', invitationId)
      .single();

    if (invitationError || !invitation) {
      return NextResponse.json(
        { error: 'Invitation not found' },
        { status: 404 }
      );
    }

    // Check if user is admin of the team
    const { data: team, error: teamError } = await supabase
      .from('teams')
      .select('id, name, admin_user_id')
      .eq('id', invitation.team_id)
      .single();

    if (teamError || !team) {
      return NextResponse.json(
        { error: 'Team not found' },
        { status: 404 }
      );
    }

    // Check if user is admin
    const isAdmin = team.admin_user_id === user.id;

    const { data: teamMember } = await supabase
      .from('team_members')
      .select('role')
      .eq('team_id', invitation.team_id)
      .eq('user_id', user.id)
      .eq('role', 'admin')
      .single();

    if (!isAdmin && !teamMember) {
      return NextResponse.json(
        { error: 'Only team admins can cancel invitations' },
        { status: 403 }
      );
    }

    // Delete the invitation
    const { error: deleteError } = await supabase
      .from('team_invitations')
      .delete()
      .eq('id', invitationId);

    if (deleteError) {
      console.error('Failed to delete invitation:', deleteError);
      return NextResponse.json(
        { error: 'Failed to cancel invitation' },
        { status: 500 }
      );
    }

    // Log to audit_logs
    await supabase.from('audit_logs').insert({
      user_id: user.id,
      action: 'team_invitation_cancelled',
      resource_type: 'team',
      resource_id: invitation.team_id,
      team_id: invitation.team_id,
      details: {
        team_name: team.name,
        invitee_email: invitation.email,
      }
    });

    return NextResponse.json({
      success: true,
      message: 'Invitation cancelled successfully',
    });

  } catch (error) {
    console.error('Delete invitation error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
