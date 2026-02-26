'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

export interface Branch {
  id: string
  organization_id: string
  name: string
  code: string
  address: string | null
  latitude: number | null
  longitude: number | null
  geohash: string | null
  settings: Record<string, unknown>
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface CreateBranchInput {
  organizationId: string
  name: string
  code: string
  address?: string
  latitude?: number
  longitude?: number
}

export interface UpdateBranchInput {
  id: string
  name?: string
  code?: string
  address?: string
  latitude?: number
  longitude?: number
  is_active?: boolean
}

export async function getOrganizationBySlug(slug: string) {
  const supabase = await createClient()
  
  const { data, error } = await supabase
    .from('organizations')
    .select('id, name, slug, type, plan, is_active, created_at')
    .eq('slug', slug)
    .single()

  if (error || !data) {
    return null
  }

  return data
}

export async function getBranchesByOrganization(organizationId: string) {
  const supabase = await createClient()
  
  const { data, error } = await supabase
    .from('branches')
    .select('*')
    .eq('organization_id', organizationId)
    .order('name')

  if (error) {
    console.error('Error fetching branches:', error)
    return []
  }

  return data as Branch[]
}

export async function createBranch(formData: FormData) {
  const supabase = await createClient()

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return { error: 'You must be logged in to create a branch' }
  }

  const organizationId = formData.get('organizationId') as string
  const name = (formData.get('name') as string)?.trim()
  const code = (formData.get('code') as string)?.trim().toUpperCase()
  const address = (formData.get('address') as string)?.trim()
  const latitude = parseFloat(formData.get('latitude') as string) || null
  const longitude = parseFloat(formData.get('longitude') as string) || null
  const geohash = (formData.get('geohash') as string) || null

  if (!organizationId) {
    return { error: 'Organization is required' }
  }

  if (!name || name.length < 2) {
    return { error: 'Branch name must be at least 2 characters' }
  }

  if (!code || code.length < 1) {
    return { error: 'Branch code is required' }
  }

  if (!/^[A-Z0-9]+$/.test(code)) {
    return { error: 'Branch code can only contain uppercase letters and numbers' }
  }

  const { data: membership } = await supabase
    .from('organization_members')
    .select('role')
    .eq('organization_id', organizationId)
    .eq('user_id', user.id)
    .single()

  if (!membership || !['owner', 'admin', 'manager'].includes(membership.role)) {
    return { error: 'You do not have permission to create branches for this organization' }
  }

  const { error: branchError } = await supabase
    .from('branches')
    .insert({
      organization_id: organizationId,
      name,
      code,
      address: address || null,
      latitude,
      longitude,
      geohash,
    })

  if (branchError) {
    if (branchError.code === '23505') {
      return { error: 'A branch with this code already exists in this organization' }
    }
    return { error: branchError.message }
  }

  revalidatePath(`/dashboard`)
  return { success: true }
}

export async function updateBranch(formData: FormData) {
  const supabase = await createClient()

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return { error: 'You must be logged in to update a branch' }
  }

  const branchId = formData.get('branchId') as string
  const name = (formData.get('name') as string)?.trim()
  const code = (formData.get('code') as string)?.trim().toUpperCase()
  const address = (formData.get('address') as string)?.trim()
  const isActive = formData.get('isActive') === 'true'
  const latitude = parseFloat(formData.get('latitude') as string) || null
  const longitude = parseFloat(formData.get('longitude') as string) || null
  const geohash = (formData.get('geohash') as string) || null

  if (!branchId) {
    return { error: 'Branch ID is required' }
  }

  if (!name || name.length < 2) {
    return { error: 'Branch name must be at least 2 characters' }
  }

  if (!code || code.length < 1) {
    return { error: 'Branch code is required' }
  }

  const { data: branch } = await supabase
    .from('branches')
    .select('organization_id')
    .eq('id', branchId)
    .single()

  if (!branch) {
    return { error: 'Branch not found' }
  }

  const { data: membership } = await supabase
    .from('organization_members')
    .select('role')
    .eq('organization_id', branch.organization_id)
    .eq('user_id', user.id)
    .single()

  if (!membership || !['owner', 'admin', 'manager'].includes(membership.role)) {
    return { error: 'You do not have permission to update this branch' }
  }

  const { error: updateError } = await supabase
    .from('branches')
    .update({
      name,
      code,
      address: address || null,
      latitude,
      longitude,
      geohash,
      updated_at: new Date().toISOString(),
    })
    .eq('id', branchId)

  if (updateError) {
    if (updateError.code === '23505') {
      return { error: 'A branch with this code already exists in this organization' }
    }
    return { error: updateError.message }
  }

  revalidatePath(`/dashboard`)
  return { success: true }
}

export async function deleteBranch(branchId: string, organizationSlug: string) {
  const supabase = await createClient()

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return { error: 'You must be logged in to delete a branch' }
  }

  const { data: branch } = await supabase
    .from('branches')
    .select('organization_id')
    .eq('id', branchId)
    .single()

  if (!branch) {
    return { error: 'Branch not found' }
  }

  const { data: membership } = await supabase
    .from('organization_members')
    .select('role')
    .eq('organization_id', branch.organization_id)
    .eq('user_id', user.id)
    .single()

  if (!membership || !['owner', 'admin', 'manager'].includes(membership.role)) {
    return { error: 'You do not have permission to delete this branch' }
  }

  const { error: deleteError } = await supabase
    .from('branches')
    .delete()
    .eq('id', branchId)

  if (deleteError) {
    return { error: deleteError.message }
  }

  revalidatePath(`/dashboard/${organizationSlug}`)
  return { success: true }
}
