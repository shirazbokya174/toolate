import { createClient } from '@/utils/supabase/server'
import { NextResponse } from 'next/server'

export async function GET() {
  const supabase = await createClient()

  const { data: { user }, error: userError } = await supabase.auth.getUser()

  if (userError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Get memberships
  const { data: memberships } = await supabase
    .from('organization_members')
    .select('organization_id')
    .eq('user_id', user.id)

  if (!memberships || memberships.length === 0) {
    return NextResponse.json({
      user: { id: user.id, email: user.email },
      organizations: [],
    })
  }

  const orgIds = memberships.map(m => m.organization_id)

  // Get organizations
  const { data: organizations } = await supabase
    .from('organizations')
    .select('id, name, slug, type, plan')
    .in('id', orgIds)

  return NextResponse.json({
    user: { id: user.id, email: user.email },
    organizations: organizations || [],
  })
}
