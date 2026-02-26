-- ============================================================================
-- CLEAN MIGRATION: Invitations + RLS Policies
-- ============================================================================
-- Date: 2026-02-27
-- Purpose: Add invitations table and simple RLS policies for all tables
-- ============================================================================

-- ============================================================================
-- INVITATIONS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role org_role NOT NULL DEFAULT 'member',
  status TEXT NOT NULL DEFAULT 'pending',
  invited_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '7 days'),
  UNIQUE(organization_id, email)
);

CREATE INDEX IF NOT EXISTS idx_invitations_org_id ON public.invitations(organization_id);
CREATE INDEX IF NOT EXISTS idx_invitations_email ON public.invitations(email);

-- ============================================================================
-- ENABLE RLS ON ALL TABLES
-- ============================================================================

ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.branches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.branch_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invitations ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- SIMPLE RLS POLICIES (USING true - can tighten later)
-- ============================================================================

-- Organizations: authenticated users can read
DROP POLICY IF EXISTS "orgs_select" ON public.organizations;
CREATE POLICY "orgs_select" ON public.organizations
  FOR SELECT TO authenticated USING (true);

-- Branches: authenticated users full access
DROP POLICY IF EXISTS "branches_select" ON public.branches;
CREATE POLICY "branches_select" ON public.branches
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "branches_insert" ON public.branches;
CREATE POLICY "branches_insert" ON public.branches
  FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "branches_update" ON public.branches;
CREATE POLICY "branches_update" ON public.branches
  FOR UPDATE TO authenticated USING (true);

DROP POLICY IF EXISTS "branches_delete" ON public.branches;
CREATE POLICY "branches_delete" ON public.branches
  FOR DELETE TO authenticated USING (true);

-- Organization Members: authenticated users full access
DROP POLICY IF EXISTS "org_members_select" ON public.organization_members;
CREATE POLICY "org_members_select" ON public.organization_members
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "org_members_insert" ON public.organization_members;
CREATE POLICY "org_members_insert" ON public.organization_members
  FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "org_members_update" ON public.organization_members;
CREATE POLICY "org_members_update" ON public.organization_members
  FOR UPDATE TO authenticated USING (true);

DROP POLICY IF EXISTS "org_members_delete" ON public.organization_members;
CREATE POLICY "org_members_delete" ON public.organization_members
  FOR DELETE TO authenticated USING (true);

-- Branch Members: authenticated users full access
DROP POLICY IF EXISTS "branch_members_select" ON public.branch_members;
CREATE POLICY "branch_members_select" ON public.branch_members
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "branch_members_insert" ON public.branch_members;
CREATE POLICY "branch_members_insert" ON public.branch_members
  FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "branch_members_update" ON public.branch_members;
CREATE POLICY "branch_members_update" ON public.branch_members
  FOR UPDATE TO authenticated USING (true);

DROP POLICY IF EXISTS "branch_members_delete" ON public.branch_members;
CREATE POLICY "branch_members_delete" ON public.branch_members
  FOR DELETE TO authenticated USING (true);

-- User Profiles: authenticated users can read
DROP POLICY IF EXISTS "user_profiles_select" ON public.user_profiles;
CREATE POLICY "user_profiles_select" ON public.user_profiles
  FOR SELECT TO authenticated USING (true);

-- Inventory Items: authenticated users full access
DROP POLICY IF EXISTS "inventory_select" ON public.inventory_items;
CREATE POLICY "inventory_select" ON public.inventory_items
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "inventory_insert" ON public.inventory_items;
CREATE POLICY "inventory_insert" ON public.inventory_items
  FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "inventory_update" ON public.inventory_items;
CREATE POLICY "inventory_update" ON public.inventory_items
  FOR UPDATE TO authenticated USING (true);

DROP POLICY IF EXISTS "inventory_delete" ON public.inventory_items;
CREATE POLICY "inventory_delete" ON public.inventory_items
  FOR DELETE TO authenticated USING (true);

-- Invitations: authenticated users full access
DROP POLICY IF EXISTS "invitations_select" ON public.invitations;
CREATE POLICY "invitations_select" ON public.invitations
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "invitations_insert" ON public.invitations;
CREATE POLICY "invitations_insert" ON public.invitations
  FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "invitations_update" ON public.invitations;
CREATE POLICY "invitations_update" ON public.invitations
  FOR UPDATE TO authenticated USING (true);

DROP POLICY IF EXISTS "invitations_delete" ON public.invitations;
CREATE POLICY "invitations_delete" ON public.invitations
  FOR DELETE TO authenticated USING (true);
