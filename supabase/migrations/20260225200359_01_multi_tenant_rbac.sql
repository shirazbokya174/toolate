-- ============================================================================
-- ENUMS: Define roles and statuses upfront
-- ============================================================================

-- Organization-level roles (hierarchical)
CREATE TYPE org_role AS ENUM (
  'owner',      -- Full control, can delete org
  'admin',      -- Manage members, org settings
  'manager',    -- Manage branches, reports
  'member'      -- Basic access
);

-- Branch-level roles (hierarchical)  
CREATE TYPE branch_role AS ENUM (
  'manager',    -- Full branch control
  'staff',      -- Daily operations
  'viewer'      -- Read-only access
);

-- Inventory item status
CREATE TYPE inventory_status AS ENUM (
  'in_stock',
  'low_stock',
  'expiring_soon',
  'expired',
  'discarded'
);

-- ============================================================================
-- ORGANIZATIONS (Tenants)
-- ============================================================================

CREATE TABLE public.organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,           -- For friendly URLs
  type TEXT NOT NULL,                  -- 'restaurant', 'grocery_store', etc.
  settings JSONB DEFAULT '{}',         -- Org-specific configuration
  plan TEXT DEFAULT 'free',            -- Subscription plan
  is_active BOOLEAN DEFAULT true,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_orgs_slug ON public.organizations(slug);

-- ============================================================================
-- BRANCHES (Location/Store within Organization)
-- ============================================================================

CREATE TABLE public.branches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  
  name TEXT NOT NULL,
  code TEXT NOT NULL,                  -- Internal branch code
  address TEXT,
  
  settings JSONB DEFAULT '{}',         -- Branch-specific config
  is_active BOOLEAN DEFAULT true,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(organization_id, code)
);

CREATE INDEX idx_branches_org_id ON public.branches(organization_id);

-- ============================================================================
-- ORGANIZATION MEMBERS (User ↔ Organization relationship with org-level role)
-- ============================================================================

CREATE TABLE public.organization_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  role org_role NOT NULL DEFAULT 'member',
  
  invited_by UUID REFERENCES auth.users(id),
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(organization_id, user_id)
);

CREATE INDEX idx_org_members_org_id ON public.organization_members(organization_id);
CREATE INDEX idx_org_members_user_id ON public.organization_members(user_id);

-- ============================================================================
-- BRANCH MEMBERS (User ↔ Branch relationship with branch-level role)
-- ============================================================================

CREATE TABLE public.branch_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id UUID NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  role branch_role NOT NULL DEFAULT 'staff',
  organization_id UUID REFERENCES public.organizations(id),
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(branch_id, user_id)
);

CREATE INDEX idx_branch_members_branch_id ON public.branch_members(branch_id);
CREATE INDEX idx_branch_members_user_id ON public.branch_members(user_id);
CREATE INDEX idx_branch_members_org_id ON public.branch_members(organization_id);

-- ============================================================================
-- USER PROFILES (Extended user data)
-- ============================================================================

CREATE TABLE public.user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  avatar_url TEXT,
  phone TEXT,
  default_organization_id UUID REFERENCES public.organizations(id),
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- INVENTORY ITEMS (The core data - branch-scoped)
-- ============================================================================

CREATE TABLE public.inventory_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id UUID NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
  
  name TEXT NOT NULL,
  sku TEXT,
  category TEXT,                         
  
  quantity DECIMAL(10,2) NOT NULL DEFAULT 0,
  unit TEXT NOT NULL,                   
  
  status inventory_status DEFAULT 'in_stock',
  
  expiry_date DATE,
  received_at TIMESTAMPTZ DEFAULT NOW(),
  
  quantity_wasted DECIMAL(10,2) DEFAULT 0,
  waste_reason TEXT,
  
  unit_cost DECIMAL(10,2),
  supplier TEXT,
  
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_inventory_branch_id ON public.inventory_items(branch_id);
CREATE INDEX idx_inventory_status ON public.inventory_items(status);
CREATE INDEX idx_inventory_expiry ON public.inventory_items(expiry_date) WHERE expiry_date IS NOT NULL;
CREATE INDEX idx_inventory_category ON public.inventory_items(category);

-- ============================================================================
-- HELPER FUNCTIONS: Reusable authorization logic
-- ============================================================================

CREATE OR REPLACE FUNCTION public.current_user_id()
RETURNS UUID
LANGUAGE SQL
STABLE
AS $$
  SELECT auth.uid();
$$;

CREATE OR REPLACE FUNCTION public.is_org_admin(p_org_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.organization_members
    WHERE organization_id = p_org_id
      AND user_id = auth.uid()
      AND role IN ('owner', 'admin')
  );
$$;

CREATE OR REPLACE FUNCTION public.get_accessible_org_ids()
RETURNS SETOF UUID
LANGUAGE SQL
STABLE
AS $$
  SELECT organization_id 
  FROM public.organization_members
  WHERE user_id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION public.get_accessible_branch_ids()
RETURNS SETOF UUID
LANGUAGE SQL
STABLE
AS $$
  SELECT bm.branch_id 
  FROM public.branch_members bm
  WHERE bm.user_id = auth.uid()
  UNION
  SELECT b.id
  FROM public.branches b
  JOIN public.organization_members om ON b.organization_id = om.organization_id
  WHERE om.user_id = auth.uid();
$$;

-- ============================================================================
-- ENABLE RLS ON ALL TABLES
-- ============================================================================

ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.branches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.branch_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_items ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- ORGANIZATIONS POLICIES
-- ============================================================================

CREATE POLICY "org_members_can_view" ON public.organizations
  FOR SELECT TO authenticated
  USING (id IN (SELECT public.get_accessible_org_ids()));

CREATE POLICY "users_can_create_organizations" ON public.organizations
  FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE POLICY "org_admins_can_update" ON public.organizations
  FOR UPDATE TO authenticated
  USING (public.is_org_admin(id));

-- ============================================================================
-- ORGANIZATION MEMBERS POLICIES
-- ============================================================================

CREATE POLICY "org_members_can_view_members" ON public.organization_members
  FOR SELECT TO authenticated
  USING (organization_id IN (SELECT public.get_accessible_org_ids()));

CREATE POLICY "org_admins_can_manage_members" ON public.organization_members
  FOR ALL TO authenticated
  USING (public.is_org_admin(organization_id));

CREATE POLICY "users_can_create_own_membership" ON public.organization_members
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() AND role = 'owner');

-- ============================================================================
-- BRANCHES & INVENTORY POLICIES (Simplified for length)
-- ============================================================================

CREATE POLICY "members_can_view_branches" ON public.branches
  FOR SELECT TO authenticated
  USING (organization_id IN (SELECT public.get_accessible_org_ids()));

CREATE POLICY "inventory_view_access" ON public.inventory_items
  FOR SELECT TO authenticated
  USING (branch_id IN (SELECT public.get_accessible_branch_ids()));

ALTER PUBLICATION supabase_realtime ADD TABLE public.inventory_items;
