-- Remove/add expiry from personal proofs when user joins/leaves a team
-- This handles the case where:
-- 1. Free-tier user creates proofs with 24-hour expiry, then joins team → expiry removed
-- 2. Team member on free tier leaves all teams → 24-hour expiry added back

-- Function to manage proof expiry based on team membership
CREATE OR REPLACE FUNCTION manage_proof_expiry_on_team_change()
RETURNS TRIGGER AS $$
DECLARE
  v_has_other_teams BOOLEAN;
  v_has_paid_tier BOOLEAN;
  v_expiry_date TIMESTAMP WITH TIME ZONE;
BEGIN
  -- CASE 1: User joins a team (INSERT) or is activated (UPDATE to active)
  IF (TG_OP = 'INSERT' AND NEW.status = 'active') OR
     (TG_OP = 'UPDATE' AND OLD.status != 'active' AND NEW.status = 'active') THEN

    -- Remove expiry from all personal proofs (not team proofs) for this user
    UPDATE proofs
    SET expires_at = NULL
    WHERE
      user_id = NEW.user_id
      AND team_id IS NULL  -- Only personal proofs
      AND expires_at IS NOT NULL;  -- Only proofs that have expiry set

    RAISE NOTICE 'Removed expiry from personal proofs for user: %', NEW.user_id;

  -- CASE 2: User leaves a team (DELETE) or is deactivated (UPDATE to inactive)
  ELSIF (TG_OP = 'DELETE' AND OLD.status = 'active') OR
        (TG_OP = 'UPDATE' AND OLD.status = 'active' AND NEW.status != 'active') THEN

    -- Determine which user_id to check (OLD for DELETE, NEW for UPDATE)
    DECLARE
      v_user_id UUID;
    BEGIN
      v_user_id := CASE WHEN TG_OP = 'DELETE' THEN OLD.user_id ELSE NEW.user_id END;

      -- Check if user still has other active team memberships
      SELECT EXISTS(
        SELECT 1 FROM team_members
        WHERE user_id = v_user_id
          AND status = 'active'
          AND id != COALESCE(OLD.id, NEW.id)  -- Exclude current record
      ) INTO v_has_other_teams;

      -- Check if user has paid tier
      SELECT EXISTS(
        SELECT 1 FROM subscriptions
        WHERE user_id = v_user_id
          AND status = 'active'
          AND tier != 'free'
      ) INTO v_has_paid_tier;

      -- If user has no other teams AND is on free tier, add expiry to personal proofs
      IF NOT v_has_other_teams AND NOT v_has_paid_tier THEN
        v_expiry_date := NOW() + INTERVAL '1 day';  -- 24 hours for free tier

        UPDATE proofs
        SET expires_at = v_expiry_date
        WHERE
          user_id = v_user_id
          AND team_id IS NULL  -- Only personal proofs
          AND expires_at IS NULL;  -- Only proofs without expiry

        RAISE NOTICE 'Added 24-hour expiry to personal proofs for user: % (no longer a team member)', v_user_id;
      END IF;
    END;
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger on team_members table
DROP TRIGGER IF EXISTS trigger_manage_expiry_on_team_change ON team_members;
CREATE TRIGGER trigger_manage_expiry_on_team_change
  AFTER INSERT OR UPDATE OR DELETE ON team_members
  FOR EACH ROW
  EXECUTE FUNCTION manage_proof_expiry_on_team_change();

-- Also fix any existing proofs for current team members
-- (in case they were added before this trigger was created)
UPDATE proofs
SET expires_at = NULL
WHERE
  team_id IS NULL  -- Personal proofs only
  AND expires_at IS NOT NULL  -- Only proofs with expiry
  AND user_id IN (
    SELECT DISTINCT user_id
    FROM team_members
    WHERE status = 'active'
  );

-- Migration complete: Removed expiry from existing personal proofs for all active team members
