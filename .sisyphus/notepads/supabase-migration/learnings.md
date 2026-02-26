# Supabase Migration Learnings

## Date: 2026-02-26

### What Worked
1. **Account linking**: Needed to log out and log back in with correct Supabase account that owns project `xprzpqaagftotokzyjpm`
2. **Schema push**: All 7 migrations appliedigrations Applied ( successfully

### Min order)
1. `20260225200359_01_multi_tenant_rbac.sql` - Core schema (7 tables, 3 enums, functions, RLS)
2. `20260227000001_rls_and_invitations.sql` - RLS policies, invitations table
3. `20260227000002_add_location_columns.sql` - Location columns (lat, long, geohash)
4. `20260227000003_user_profiles_trigger.sql` - Auto-create user profiles
5. `20260227000004_auto_join_trigger.sql` - Auto-join from invitations
6. `20260227000005_update_auto_join.sql` - Updated auto-join function
7. `20260227000006_create_auth_trigger.sql` - Auth trigger

### Tables Created
- organizations
- branches
- organization_members
- branch_members
- user_profiles
- inventory_items
- invitations

### Enums Created
- org_role (owner, admin, manager, member)
- branch_role (manager, staff, viewer)
- inventory_status (in_stock, low_stock, expiring_soon, expired, discarded)

### Functions Created
- current_user_id()
- is_org_admin()
- get_accessible_org_ids()
- get_accessible_branch_ids()
- handle_new_user()

### Trigger Created
- on_auth_user_created (on auth.users table)

### Verification
- Supabase API responding at https://xprzpqaagftotokzyjpm.supabase.co
- Schema push completed with "Finished supabase db push" message
