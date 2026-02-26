-- ============================================================================
-- AUTO-JOIN: Check invitations on auth.users signup
-- ============================================================================
-- Date: 2026-02-27
-- Purpose: Add user to org immediately when they sign up via auth
-- ============================================================================

-- Updated function to handle new user signup and auto-join
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  pending_invitation RECORD;
  org_role text;
BEGIN
  -- First, create the user profile
  INSERT INTO public.user_profiles (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'full_name'
  )
  ON CONFLICT (id) DO NOTHING;

  -- Check for pending invitations for this email
  SELECT id, organization_id, role INTO pending_invitation
  FROM public.invitations
  WHERE LOWER(email) = LOWER(NEW.email)
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

    RAISE NOTICE 'User % auto-joined organization % from invitation', NEW.email, pending_invitation.organization_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
