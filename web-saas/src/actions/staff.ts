'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'
import { sendInvitationEmail } from '@/lib/email'

export interface OrgMember {
  id: string
  organization_id: string
  user_id: string | null
  role: 'owner' | 'admin' | 'manager' | 'member'
  joined_at: string
  created_at?: string
  user_email?: string
export interface OrgMember {
  id: string
  organization_id: string
  user_id: string | null
  role: 'owner' | 'admin' | 'manager' | 'member'
  joined_at: string
  created_at?: string
  user_email?: string
}

export interface BranchMember {
  id: string
  branch_id: string
  user_id: string | null
  role: 'manager' | 'staff' | 'viewer'
  joined_at: string
  created_at?: string
  user_email?: string
  branch_name?: string
}

export interface Invitation {
  id: string
  organization_id: string
  email: string
  role: string
  status: string
  created_at: string
}

// Get all org members including pending invitations
export async function getOrganizationMembers(organizationId: string): Promise<OrgMember[]> {
  console.log('[STAFF] getOrganizationMembers for org:', organizationId)

  const supabase = await createClient()

  // Get members
  const { data, error } = await supabase
    .from('organization_members')
    .select('*')
    .eq('organization_id', organizationId)
    .order('joined_at', { ascending: true })

  console.log('[STAFF] Members result:', { count: data?.length, error })
  console.log('[STAFF] Raw members data:', JSON.stringify(data, null, 2))
  if (error) {
    console.error('[STAFF] Error:', error)
    return []
  }
  const userIds = data?.map(m => m.user_id).filter(Boolean) || []
  const userEmailMap = new Map<string, string>()

  if (userIds.length > 0) {
    // First try user_profiles
    const { data: profiles } = await supabase
      .from('user_profiles')
      .select('id, email')
      .in('id', userIds)

    if (profiles) {
      profiles.forEach(p => userEmailMap.set(p.id, p.email))
    }
  }

  // Get pending invitations
  const { data: invitations } = await supabase
    .from('invitations')
    .select('*')
    .eq('organization_id', organizationId)
    .eq('status', 'pending')

  console.log('[STAFF] Invitations:', { count: invitations?.length })

  // Map members - try to get current user's email from session
  const { data: { user: currentUser } } = await supabase.auth.getUser()

  const members = data?.map(m => ({
    ...m,
    user_email: m.user_id ? userEmailMap.get(m.user_id) || (currentUser && currentUser.id === m.user_id ? currentUser.email : null) : null
  })) || []

  // Add pending invitations
  const pending = invitations?.map(inv => ({
    id: `inv-${inv.id}`,
    organization_id: inv.organization_id,
    user_id: null,
    role: inv.role as any,
    created_at: inv.created_at,
    user_email: `${inv.email} (pending)`
  })) || []
  console.log('[STAFF] Returning:', { members: members.length, pending: pending.length })
  console.log('[STAFF] Members data:', JSON.stringify([...members, ...pending], null, 2))

  return [...members, ...pending] as OrgMember[]
}

// Send invitation
export async function inviteOrganizationMember(formData: FormData) {
  console.log('[STAFF] inviteOrganizationMember called')

  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  console.log('[STAFF] User:', user?.id, authError)

  if (authError || !user) {
    return { error: 'You must be logged in' }
  }

  const organizationId = formData.get('organizationId') as string
  const email = formData.get('email')?.toString()?.trim().toLowerCase() || ''
  const role = formData.get('role') as string

  console.log('[STAFF] Invite:', email, 'to org:', organizationId, 'role:', role)

  if (!organizationId || !email || !role) {
    return { error: 'All fields are required' }
  }

  if (!email.includes('@')) {
    return { error: 'Invalid email' }
  }

  // Check existing invite
  const { data: existingInvite } = await supabase
    .from('invitations')
    .select('id')
    .eq('organization_id', organizationId)
    .eq('email', email)
    .eq('status', 'pending')

  console.log('[STAFF] Existing invite:', existingInvite)

  if (existingInvite && existingInvite.length > 0) {
    return { error: 'Invitation already sent' }
  }

  // Check if user exists
  const { data: existingUser } = await supabase
    .from('user_profiles')
    .select('id')
    .eq('email', email)
    .single()

  console.log('[STAFF] Existing user:', existingUser)

  if (existingUser) {
    // Add directly
    const { error: insertError } = await supabase
      .from('organization_members')
      .insert({
        organization_id: organizationId,
        user_id: existingUser.id,
        role,
        invited_by: user.id,
      })

    console.log('[STAFF] Direct add:', insertError)

    if (insertError) {
      return { error: insertError.message }
    }

    revalidatePath('/dashboard')
    return { success: true }
  }

  // Create pending invitation
  const { error: inviteError } = await supabase
    .from('invitations')
    .insert({
      organization_id: organizationId,
      email,
      role,
      invited_by: user.id,
    })

  if (inviteError) {
    return { error: inviteError.message }
  }

  // Get organization details for email
  const { data: organization } = await supabase
    .from('organizations')
    .select('name')
    .eq('id', organizationId)
    .single()

  // Get inviter name from user_profiles
  const { data: inviterProfile } = await supabase
    .from('user_profiles')
    .select('full_name, email')
    .eq('id', user.id)
    .single()

  const inviterName = inviterProfile?.full_name || inviterProfile?.email || 'A team member'
  const orgName = organization?.name || 'the organization'

  // Send invitation email
  const appUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace('127.0.0.1', 'localhost') || 'http://localhost:3000'
  const inviteUrl = `${appUrl}/login?invite=${encodeURIComponent(email)}`

  await sendInvitationEmail({
    to: email,
    inviterName,
    organizationName: orgName,
    role,
    inviteUrl,
  })

  console.log('[STAFF] SUCCESS - Invitation sent to:', email)

  revalidatePath('/dashboard')
  return { success: true, invitationSent: true }
}

export async function removeOrganizationMember(memberId: string, organizationId: string) {
  const supabase = await createClient()

  // Handle invitation
  if (memberId.startsWith('inv-')) {
    const invId = memberId.replace('inv-', '')
    const { error } = await supabase
      .from('invitations')
      .delete()
      .eq('id', invId)

    if (error) return { error: error.message }
  } else {
    const { error } = await supabase
      .from('organization_members')
      .delete()
      .eq('id', memberId)

    if (error) return { error: error.message }
  }

  revalidatePath('/dashboard')
  return { success: true }
}

export async function updateOrganizationMemberRole(
  memberId: string,
  newRole: string,
  organizationId: string
) {
  const supabase = await createClient()

  if (memberId.startsWith('inv-')) {
    const invId = memberId.replace('inv-', '')
    const { error } = await supabase
      .from('invitations')
      .update({ role: newRole })
      .eq('id', invId)

    if (error) return { error: error.message }
  } else {
    const { error } = await supabase
      .from('organization_members')
      .update({ role: newRole })
      .eq('id', memberId)

    if (error) return { error: error.message }
  }

  revalidatePath('/dashboard')
  return { success: true }
}

// Resend invitation email
export async function resendInvitation(invitationId: string, organizationId: string) {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return { error: 'You must be logged in' }
  }

  // Get invitation details
  const { data: invitation, error: inviteError } = await supabase
    .from('invitations')
    .select('*')
    .eq('id', invitationId)
    .single()

  if (inviteError || !invitation) {
    return { error: 'Invitation not found' }
  }

  // Get organization details
  const { data: organization } = await supabase
    .from('organizations')
    .select('name')
    .eq('id', organizationId)
    .single()

  // Get inviter details
  const { data: inviterProfile } = await supabase
    .from('user_profiles')
    .select('full_name, email')
    .eq('id', user.id)
    .single()

  const inviterName = inviterProfile?.full_name || inviterProfile?.email || 'A team member'
  const orgName = organization?.name || 'the organization'

  // Send invitation email
  const appUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace('127.0.0.1', 'localhost') || 'http://localhost:3000'
  const inviteUrl = `${appUrl}/login?invite=${encodeURIComponent(invitation.email)}`

  await sendInvitationEmail({
    to: invitation.email,
    inviterName,
    organizationName: orgName,
    role: invitation.role,
    inviteUrl,
  })

  console.log('[STAFF] Resent invitation to:', invitation.email)
  revalidatePath('/dashboard')
  return { success: true }
}

// Branch Members
export async function getBranchMembers(organizationId: string): Promise<BranchMember[]>
  const supabase = await createClient()

  const { data: branches } = await supabase
    .from('branches')
    .select('id, name')
    .eq('organization_id', organizationId)

  if (!branches || branches.length === 0) return []

  const branchMap = new Map(branches.map(b => [b.id, b.name]))

  const { data, error } = await supabase
    .from('branch_members')
    .select('*')
    .in('branch_id', branches.map(b => b.id))
    .order('joined_at', { ascending: true })

  if (error || !data) return []

  const userIds = data.map(m => m.user_id).filter(Boolean)
  const userEmailMap = new Map<string, string>()

  if (userIds.length > 0) {
    const { data: users } = await supabase
      .from('user_profiles')
      .select('id, email')
      .in('id', userIds)

    users?.forEach(u => userEmailMap.set(u.id, u.email))
  }

  return data.map(m => ({
    ...m,
    user_email: m.user_id ? userEmailMap.get(m.user_id) || 'Unknown' : 'Unknown',
    branch_name: branchMap.get(m.branch_id) || 'Unknown'
  return data.map((m): BranchMember => ({
    ...m,
    user_email: m.user_id ? userEmailMap.get(m.user_id) || 'Unknown' : 'Unknown',
    branch_name: branchMap.get(m.branch_id) || 'Unknown'
  }))
}

export async function addBranchMember(formData: FormData) {
  const supabase = await createClient()

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return { error: 'You must be logged in' }
  }

  const branchId = formData.get('branchId') as string
  const email = formData.get('email')?.toString()?.trim().toLowerCase() || ''
  const role = formData.get('role') as string

  if (!branchId || !email || !role) {
    return { error: 'All fields are required' }
  }

  const { data: existingUser } = await supabase
    .from('user_profiles')
    .select('id')
    .eq('email', email)
    .single()

  if (!existingUser) {
    return { error: 'User must sign up first' }
  }

  const { error: insertError } = await supabase
    .from('branch_members')
    .insert({
      branch_id: branchId,
      user_id: existingUser.id,
      role,
    })

  if (insertError) return { error: insertError.message }

  revalidatePath('/dashboard')
  return { success: true }
}

export async function removeBranchMember(memberId: string, branchId: string) {
  const supabase = await createClient()

  const { error } = await supabase
    .from('branch_members')
    .delete()
    .eq('id', memberId)

  if (error) return { error: error.message }

  revalidatePath('/dashboard')
  return { success: true }
}

export async function getOrganizationBySlug(slug: string) {
  const supabase = await createClient()
  const { data } = await supabase
    .from('organizations')
    .select('id, name, slug')
    .eq('slug', slug)
    .single()
  return data
}

export async function getBranchesByOrganization(organizationId: string) {
  const supabase = await createClient()
  const { data } = await supabase
    .from('branches')
    .select('*')
    .eq('organization_id', organizationId)
    .order('name')
  return data || []
}
