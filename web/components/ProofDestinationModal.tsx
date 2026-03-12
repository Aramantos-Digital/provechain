'use client';

import { useEffect, useState } from 'react';
import { User, Users, X } from 'lucide-react';

export interface ProofDestination {
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

interface ProofDestinationModalProps {
  isOpen: boolean;
  defaultSelection?: ProofDestination;
  onConfirm: (destination: ProofDestination) => void;
  onCancel: () => void;
}

export function ProofDestinationModal({
  isOpen,
  defaultSelection,
  onConfirm,
  onCancel,
}: ProofDestinationModalProps) {
  const [teams, setTeams] = useState<TeamOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<ProofDestination>(
    defaultSelection || { type: 'personal' }
  );
  useEffect(() => {
    if (isOpen) {
      loadTeams();
    }
  }, [isOpen]);

  useEffect(() => {
    if (defaultSelection) {
      setSelected(defaultSelection);
    }
  }, [defaultSelection]);

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

  const handleConfirm = () => {
    onConfirm(selected);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-card border-2 border-primary/30 rounded-lg shadow-2xl w-full max-w-md">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border">
          <h2 className="text-2xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
            Where would you like to save this proof?
          </h2>
          <button
            onClick={onCancel}
            className="p-1 hover:bg-accent rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-muted-foreground" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-3">
          {loading ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              Loading options...
            </p>
          ) : (
            <>
              {/* Personal Option */}
              <button
                onClick={() => setSelected({ type: 'personal' })}
                className={`w-full flex items-center gap-3 p-4 rounded-lg border-2 transition-all ${
                  selected.type === 'personal'
                    ? 'border-blue-500 bg-blue-500/10'
                    : 'border-border hover:border-primary/50'
                }`}
              >
                <div
                  className={`flex-shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                    selected.type === 'personal'
                      ? 'border-blue-500 bg-blue-500'
                      : 'border-muted-foreground/30'
                  }`}
                >
                  {selected.type === 'personal' && (
                    <div className="w-2 h-2 bg-white rounded-full" />
                  )}
                </div>
                <User className="w-5 h-5 text-blue-500" />
                <div className="flex-1 text-left">
                  <p className="font-semibold text-foreground">
                    Personal Storage
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Only you can access this proof
                  </p>
                </div>
              </button>

              {/* Team Options */}
              {teams.length > 0 && (
                <>
                  <div className="flex items-center gap-2 py-2">
                    <div className="flex-1 h-px bg-border" />
                    <span className="text-xs text-muted-foreground font-medium">
                      OR SAVE TO A TEAM
                    </span>
                    <div className="flex-1 h-px bg-border" />
                  </div>

                  {teams.map((team) => (
                    <button
                      key={team.team_id}
                      onClick={() =>
                        setSelected({
                          type: 'team',
                          teamId: team.team_id,
                          teamName: team.team_name,
                        })
                      }
                      className={`w-full flex items-center gap-3 p-4 rounded-lg border-2 transition-all ${
                        selected.type === 'team' && selected.teamId === team.team_id
                          ? 'border-purple-500 bg-purple-500/10'
                          : 'border-border hover:border-primary/50'
                      }`}
                    >
                      <div
                        className={`flex-shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                          selected.type === 'team' && selected.teamId === team.team_id
                            ? 'border-purple-500 bg-purple-500'
                            : 'border-muted-foreground/30'
                        }`}
                      >
                        {selected.type === 'team' && selected.teamId === team.team_id && (
                          <div className="w-2 h-2 bg-white rounded-full" />
                        )}
                      </div>
                      <Users className="w-5 h-5 text-purple-500" />
                      <div className="flex-1 text-left">
                        <p className="font-semibold text-foreground">
                          {team.team_name}
                        </p>
                        <p className="text-xs text-muted-foreground capitalize">
                          {team.team_tier} • {team.user_role}
                        </p>
                      </div>
                    </button>
                  ))}
                </>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t border-border">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-sm font-medium text-muted-foreground hover:bg-accent rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={loading}
            className="px-6 py-2 text-sm font-semibold text-white bg-purple-600 hover:bg-purple-700 rounded-lg transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Continue
          </button>
        </div>
      </div>
    </div>
  );
}
