'use client';

import { useEffect, useState } from 'react';
import { ChevronDown, User, Users } from 'lucide-react';

export interface ProofFilterValue {
  type: 'personal' | 'team';
  teamId?: string;
  teamName?: string;
}

interface TeamOption {
  team_id: string;
  team_name: string;
  team_tier: string;
  user_role: string;
}

interface ProofFilterProps {
  value: ProofFilterValue;
  onChange: (filter: ProofFilterValue) => void;
}

export function ProofFilter({ value, onChange }: ProofFilterProps) {
  const [teams, setTeams] = useState<TeamOption[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTeams();
  }, []);

  async function loadTeams() {
    try {
      const res = await fetch('/api/teams/options');
      if (!res.ok) {
        console.error('Failed to fetch team options');
        setLoading(false);
        return;
      }
      const data = await res.json();

      // Sort teams alphabetically by name
      const sortedTeams = (data || []).sort((a: TeamOption, b: TeamOption) =>
        a.team_name.localeCompare(b.team_name)
      );

      setTeams(sortedTeams);
      setLoading(false);
    } catch (error) {
      console.error('Failed to load teams:', error);
      setLoading(false);
    }
  }

  const displayText = value.type === 'personal'
    ? 'My Personal Proofs'
    : value.teamName || 'Team Proofs';

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="inline-flex items-center gap-2 px-2 py-2 bg-slate-800 border border-slate-700 rounded-lg hover:bg-slate-700 transition-colors"
      >
        {value.type === 'personal' ? (
          <User className="w-4 h-4 text-blue-400 flex-shrink-0" />
        ) : (
          <Users className="w-4 h-4 text-purple-400 flex-shrink-0" />
        )}
        <span className="text-sm font-medium flex-1 text-left">{displayText}</span>
        <ChevronDown className={`w-4 h-4 flex-shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
          />

          {/* Dropdown */}
          <div className="absolute left-0 mt-2 w-64 bg-slate-800 border border-slate-700 rounded-lg shadow-lg z-20">
            <div className="p-2">
              {/* Personal Proofs Option */}
              <button
                onClick={() => {
                  onChange({ type: 'personal' });
                  setIsOpen(false);
                }}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-md hover:bg-slate-700 transition-colors ${
                  value.type === 'personal' ? 'bg-slate-700' : ''
                }`}
              >
                <User className="w-4 h-4 text-blue-400" />
                <div className="flex-1 text-left">
                  <p className="text-sm font-medium">My Personal Proofs</p>
                  <p className="text-xs text-slate-400">Proofs created by you</p>
                </div>
              </button>

              {/* Divider if teams exist */}
              {teams.length > 0 && (
                <div className="my-2 border-t border-slate-700" />
              )}

              {/* Team Options */}
              {teams.map((team) => (
                <button
                  key={team.team_id}
                  onClick={() => {
                    onChange({
                      type: 'team',
                      teamId: team.team_id,
                      teamName: team.team_name,
                    });
                    setIsOpen(false);
                  }}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-md hover:bg-slate-700 transition-colors ${
                    value.type === 'team' && value.teamId === team.team_id
                      ? 'bg-slate-700'
                      : ''
                  }`}
                >
                  <Users className="w-4 h-4 text-purple-400" />
                  <div className="flex-1 text-left">
                    <p className="text-sm font-medium">{team.team_name}</p>
                    <p className="text-xs text-slate-400 capitalize">
                      {team.team_tier} • {team.user_role}
                    </p>
                  </div>
                </button>
              ))}

              {loading && (
                <p className="text-xs text-slate-400 text-center py-2">
                  Loading teams...
                </p>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
