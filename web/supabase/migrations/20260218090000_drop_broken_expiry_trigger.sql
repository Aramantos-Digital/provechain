-- Drop the set_proof_expiry trigger that references the removed subscriptions table.
--
-- Context: After consolidating auth to Aramantos Core, tier information comes from
-- the Core API (getUserTier()). The application code in /api/proofs/create already
-- calculates expires_at correctly based on tier. This trigger was redundant and broken
-- because it referenced public.subscriptions which no longer exists.
--
-- The trigger was a BEFORE INSERT trigger that would override any expires_at value
-- set by the application, so removing it also gives the app full control over expiry.

DROP TRIGGER IF EXISTS set_proof_expiry_on_insert ON public.proofs;

-- Also drop the function since nothing references it anymore
DROP FUNCTION IF EXISTS public.set_proof_expiry();
