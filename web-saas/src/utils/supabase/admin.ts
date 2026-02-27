import { createServerClient } from '@supabase/ssr'

/**
 * Admin client for server-side operations that need service role access.
 * This bypasses RLS and can be used for invitation emails, user management, etc.
 * 
 * Usage:
 *   import { createAdminClient } from '@/utils/supabase/admin'
 *   const supabaseAdmin = createAdminClient()
 *   await supabaseAdmin.auth.admin.inviteUserByEmail(email, options)
 */
export function createAdminClient() {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      cookies: {
        getAll() {
          return []
        },
        setAll() {
          // Admin client doesn't need cookie operations
        },
      },
    }
  )
}
