import { useEffect, useState } from 'react';

export interface UserLimits {
  user_type: 'free' | 'team_member' | 'founding_member' | 'professional' | 'team' | 'business' | 'custom';
  max_proofs_per_month: number;
  max_storage_bytes: number;
  proof_expiry_hours: number | null;
  has_version_control: boolean;
  has_tags: boolean;
  can_create_teams: boolean;
}

export function useUserType() {
  const [userType, setUserType] = useState<string | null>(null);
  const [limits, setLimits] = useState<UserLimits | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadUserType();
  }, []);

  async function loadUserType() {
    try {
      const res = await fetch('/api/user/type');
      if (!res.ok) {
        setLoading(false);
        return;
      }
      const data = await res.json();

      setUserType(data.user_type);
      setLimits(data.limits as UserLimits | null);
      setLoading(false);
    } catch (error) {
      console.error('Failed to load user type:', error);
      setLoading(false);
    }
  }

  return {
    userType,
    limits,
    loading,
    isTeamMember: userType === 'team_member',
    isPaid: userType && !['free', 'team_member'].includes(userType),
    canCreateTeams: limits?.can_create_teams ?? false,
    hasProFeatures: userType !== 'free',
  };
}
