-- ============================================================================
-- AUTO-JOIN: When user signs up, check invitations and add to org
-- ============================================================================
-- Date: 2026-02-27
-- Purpose: Auto-add invited users to organization when they sign up
-- ============================================================================

-- Function to handle auto-join from invitations
CREATE OR REPLACE FUNCTION public.handle_user_signup()
RETURNS TRIGGER AS $$
DECLARE
  pending_invitation RECORD;
  org_role text;
BEGIN
  -- Check for pending invitations for this email
  SELECT id, organization_id, role INTO pending_invitation
  FROM public.invitations
  WHERE email = NEW.email
    AND status = 'pending'
  LIMIT 1;

  -- If invitation found, add user to organization
  IF pending_invitation IS NOT NULL THEN
    -- Insert into organization_members
    INSERT INTO public.organization_members (organization_id, user_id, role, invited_by)
    VALUES (pending_invitation.organization_id, NEW.id, pending_invitation.role, NEW.id)
    ON CONFLICT (organization_id, user_id) DO NOTHING;

    -- Update invitation status
    UPDATE public.invitations
    SET status = 'accepted'
    WHERE id = pending_invitation.id;

    RAISE NOTICE 'User % added to organization from invitation', NEW.email;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for user signup (runs after user_profiles insert)
DROP TRIGGER IF EXISTS on_user_signup_auto_join ON public.user_profiles;

CREATE TRIGGER on_user_signup_auto_join
  AFTER INSERT ON public.user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_user_signup();
