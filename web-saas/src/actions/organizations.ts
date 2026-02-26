'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

export interface CreateOrganizationInput {
  name: string
  slug: string
  type: string
}

export async function createOrganization(formData: FormData) {
  const supabase = await createClient()

  // Get authenticated user
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return { error: 'You must be logged in to create an organization' }
  }

  const name = (formData.get('name') as string)?.trim()
  const slug = (formData.get('slug') as string)?.trim().toLowerCase()
  const type = formData.get('type') as string

  // Validation
  if (!name || name.length < 2) {
    return { error: 'Organization name must be at least 2 characters' }
  }

  if (!slug || slug.length < 2) {
    return { error: 'Slug must be at least 2 characters' }
  }

  if (!type) {
    return { error: 'Please select an organization type' }
  }

  // Validate slug format (alphanumeric with hyphens)
  if (!/^[a-z0-9-]+$/.test(slug)) {
    return { error: 'Slug can only contain lowercase letters, numbers, and hyphens' }
  }

  // Generate UUID client-side to avoid .select() which triggers RLS SELECT policy
  // This solves the chicken-and-egg: user can't SELECT org because they aren't a member yet
  const orgId = crypto.randomUUID()

  // Insert organization with explicit ID
  const { error: orgError } = await supabase
    .from('organizations')
    .insert({
      id: orgId,
      name,
      slug,
      type,
    })

  if (orgError) {
    if (orgError.code === '23505') {
      // Unique constraint violation (slug)
      return { error: 'This organization URL is already taken. Please choose another.' }
    }
    return { error: orgError.message }
  }

  // Insert organization member as owner
  const { error: memberError } = await supabase
    .from('organization_members')
    .insert({
      organization_id: orgId,
      user_id: user.id,
      role: 'owner',
    })

  if (memberError) {
    // Rollback: delete the org we just created
    await supabase.from('organizations').delete().eq('id', orgId)
    return { error: 'Failed to create organization membership' }
  }

  revalidatePath('/dashboard')
  return { success: true, organizationId: orgId }
}
