# Push Local Supabase to Remote

## TL;DR

> **Quick Summary**: Push local Supabase schema (7 tables, 3 enums, functions, triggers, RLS policies) to remote Supabase project using Supabase CLI.
> 
> **Deliverables**:
> - Remote Supabase project linked to local
> - All schema migrated (tables, enums, functions, triggers, RLS)
> - Verified connection from Vercel app
> 
> **Estimated Effort**: Quick (5-10 minutes)
> **Parallel Execution**: NO (sequential)
> **Critical Path**: Link project → Push schema → Verify

---

## Context

### Original Request
User has:
1. Web SaaS deployed to Vercel
2. Local Supabase running via Docker with schema
3. Remote Supabase project (empty) at `xprzpqaagftotokzyjpm.supabase.co`

Goal: Push local Supabase schema to remote using best practices.

### Schema Overview (from migrations)
- **Tables**: organizations, branches, organization_members, branch_members, user_profiles, inventory_items, invitations
- **Enums**: org_role, branch_role, inventory_status
- **Functions**: current_user_id(), is_org_admin(), get_accessible_org_ids(), get_accessible_branch_ids(), handle_new_user()
- **Triggers**: on_auth_user_created (auto-creates user profile on signup)
- **RLS**: Row Level Security enabled on all tables

---

## Work Objectives

### Core Objective
Push local Supabase database schema to remote Supabase project.

### Must Have
- [ ] Link local Supabase to remote project using project ID
- [ ] Push all migrations to remote (tables, enums, functions, triggers, RLS policies)
- [ ] Verify connection works from Vercel app

### Must NOT Have
- [ ] DO NOT reset remote database (it would disconnect existing Vercel deployment)
- [ ] DO NOT modify Vercel environment variables (they're already correct)

---

## Verification Strategy

### Test Decision
- **Infrastructure exists**: YES (Supabase CLI 2.75.0)
- **Automated tests**: NONE (schema migration)
- **Framework**: N/A

### QA Policy
Every task MUST include agent-executed QA scenarios.

---

## Execution Strategy

### Steps

1. **Link local to remote** — Use `supabase link` with project ID
2. **Push schema** — Use `supabase db push` to apply migrations
3. **Verify** — Test that remote responds correctly

---

## TODOs

- [ ] 1. Link Local Supabase to Remote Project

  **What to do**:
  - Run `supabase link --project-id xprzpqaagftotokzyjpm`
  - When prompted, enter the database password (user needs to provide)
  - This links local CLI to the remote Supabase project

  **References**:
  - Supabase CLI docs: `supabase link`
  - Project ID from URL: `xprzpqaagftotokzyjpm`

  **Acceptance Criteria**:
  - [ ] Command completes without error
  - [ ] Output shows "Linked to project xprzpqaagftotokzyjpm"

  **QA Scenarios**:

  ```
  Scenario: Link local to remote Supabase
    Tool: Bash
    Preconditions: Supabase CLI installed, project ID known
    Steps:
      1. Run: supabase link --project-id xprzpqaagftotokzyjpm
      2. Enter database password when prompted
    Expected Result: Successfully linked message
    Evidence: Terminal output showing linked project

  Scenario: Verify linked project
    Tool: Bash
    Preconditions: Previous link succeeded
    Steps:
      1. Run: supabase projects list
    Expected Result: Shows xprzpqaagftotokzyjpm in the list
    Evidence: Project appears in list
  ```

  **Commit**: NO

- [ ] 2. Push Schema to Remote

  **What to do**:
  - Run `supabase db push` to apply all migrations
  - This creates tables, enums, functions, triggers, and RLS policies on remote

  **References**:
  - Supabase CLI docs: `supabase db push`
  - Local migrations: `supabase/migrations/`

  **Acceptance Criteria**:
  - [ ] All 7 tables created (organizations, branches, organization_members, branch_members, user_profiles, inventory_items, invitations)
  - [ ] All 3 enums created
  - [ ] All functions created
  - [ ] Trigger created
  - [ ] RLS enabled on all tables

  **QA Scenarios**:

  ```
  Scenario: Push migrations to remote
    Tool: Bash
    Preconditions: Project linked
    Steps:
      1. Run: supabase db push
      2. Confirm when prompted
    Expected Result: All migrations applied successfully
    Evidence: Terminal output showing created tables/functions

  Scenario: Verify tables exist on remote
    Tool: Bash
    Preconditions: Push succeeded
    Steps:
      1. Run: supabase db execute --db-url "postgresql://postgres:[password]@db.xprzpqaagftotokzyjpm.supabase.co:5432/postgres" -c "\dt"
      (password from user)
    Expected Result: Shows all 7 tables
    Evidence: List of tables in output

  Scenario: Verify RLS enabled
    Tool: Bash
    Preconditions: Push succeeded
    Steps:
      1. Run: supabase db execute -c "SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname = 'public';"
    Expected Result: All tables show rowsecurity = true
    Evidence: Query results
  ```

  **Commit**: NO

- [ ] 3. Verify Vercel Connection

  **What to do**:
  - Verify the Vercel app can connect to the new remote database
  - Test by making a simple API call from the deployed app

  **References**:
  - Vercel project settings
  - Supabase dashboard: xprzpqaagftotokzyjpm

  **Acceptance Criteria**:
  - [ ] Remote Supabase is accessible
  - [ ] Vercel app environment variables point to correct Supabase URL

  **QA Scenarios**:

  ```
  Scenario: Test remote database connectivity
    Tool: Bash
    Preconditions: Migrations pushed
    Steps:
      1. Run: supabase db execute -c "SELECT 1 as test;"
    Expected Result: Returns 1
    Evidence: Query result

  Scenario: Verify Supabase dashboard shows tables
    Tool: Browser (playwright skill)
    Preconditions: Push succeeded
    Steps:
      1. Navigate to https://supabase.com/dashboard/project/xprzpqaagftotokzyjpm
      2. Open Table Editor
    Expected Result: Shows all 7 tables
    Evidence: Screenshot of table list
  ```

  **Commit**: NO

---

## Final Verification Wave

- [ ] F1. **Schema Completeness Check** — Verify all expected tables, enums, functions exist on remote
- [ ] F2. **RLS Verification** — Confirm RLS is enabled on all tables
- [ ] F3. **Connection Test** — Verify Vercel can reach the database

---

## Success Criteria

### Verification Commands
```bash
supabase link --project-id xprzpqaagftotokzyjpm  # Links local to remote
supabase db push                                   # Pushes schema
supabase db execute -c "\dt"                      # Lists all tables
```

### Final Checklist
- [ ] Local linked to remote project
- [ ] All 7 tables created on remote
- [ ] All 3 enums created
- [ ] All functions/triggers created
- [ ] RLS enabled on all tables
- [ ] Remote accessible
