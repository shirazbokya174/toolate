'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'

export interface InventoryItem {
  id: string
  branch_id: string
  name: string
  sku: string | null
  category: string | null
  quantity: number
  unit: string
  status: 'in_stock' | 'low_stock' | 'out_of_stock' | 'reserved' | 'sold'
  expiry_date: string | null
  received_at: string
  quantity_wasted: number
  waste_reason: string | null
  unit_cost: number | null
  supplier: string | null
  created_by: string | null
  created_at: string
  updated_at: string
}

export async function getInventoryByBranch(branchId: string): Promise<InventoryItem[]> {
  const supabase = await createClient()
  
  const { data, error } = await supabase
    .from('inventory_items')
    .select('*')
    .eq('branch_id', branchId)
    .order('name')

  if (error) {
    console.error('Error fetching inventory:', error)
    return []
  }

  return data as InventoryItem[]
}

export async function getInventoryItem(id: string): Promise<InventoryItem | null> {
  const supabase = await createClient()
  
  const { data, error } = await supabase
    .from('inventory_items')
    .select('*')
    .eq('id', id)
    .single()

  if (error || !data) {
    return null
  }

  return data as InventoryItem
}

export async function createInventoryItem(formData: FormData) {
  const supabase = await createClient()

  // Get authenticated user
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return { error: 'You must be logged in to create inventory items' }
  }

  const branchId = formData.get('branchId') as string
  const name = (formData.get('name') as string)?.trim()
  const sku = (formData.get('sku') as string)?.trim()
  const category = (formData.get('category') as string)?.trim()
  const quantity = parseFloat(formData.get('quantity') as string)
  const unit = (formData.get('unit') as string)?.trim()
  const expiryDate = formData.get('expiryDate') as string
  const unitCost = parseFloat(formData.get('unitCost') as string) || null
  const supplier = (formData.get('supplier') as string)?.trim()

  // Basic validation
  if (!branchId) {
    return { error: 'Branch is required' }
  }

  if (!name || name.length < 2) {
    return { error: 'Item name must be at least 2 characters' }
  }

  if (isNaN(quantity) || quantity < 0) {
    return { error: 'Valid quantity is required' }
  }

  if (!unit || unit.length < 1) {
    return { error: 'Unit is required' }
  }

  // RLS handles permission at database level - we just insert
  // If user doesn't have permission, RLS will block the insert

  // Determine status based on quantity
  let status: 'in_stock' | 'low_stock' | 'out_of_stock' = 'in_stock'
  if (quantity === 0) {
    status = 'out_of_stock'
  } else if (quantity <= 10) {
    status = 'low_stock'
  }

  // Insert inventory item (RLS will block if no permission)
  const { error: insertError } = await supabase
    .from('inventory_items')
    .insert({
      branch_id: branchId,
      name,
      sku: sku || null,
      category: category || null,
      quantity,
      unit,
      status,
      expiry_date: expiryDate || null,
      unit_cost: unitCost,
      supplier: supplier || null,
      created_by: user.id,
    })

  if (insertError) {
    // Check if it's an RLS error
    if (insertError.message.includes('row-level security') || insertError.code === '42501') {
      return { error: 'You do not have permission to add inventory to this branch' }
    }
    return { error: insertError.message }
  }

  revalidatePath(`/dashboard`)
  return { success: true }
}

export async function updateInventoryItem(formData: FormData) {
  const supabase = await createClient()

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return { error: 'You must be logged in to update inventory items' }
  }

  const itemId = formData.get('itemId') as string
  const name = (formData.get('name') as string)?.trim()
  const sku = (formData.get('sku') as string)?.trim()
  const category = (formData.get('category') as string)?.trim()
  const quantity = parseFloat(formData.get('quantity') as string)
  const unit = (formData.get('unit') as string)?.trim()
  const status = formData.get('status') as 'in_stock' | 'low_stock' | 'out_of_stock' | 'reserved' | 'sold'
  const expiryDate = formData.get('expiryDate') as string
  const quantityWasted = parseFloat(formData.get('quantityWasted') as string) || 0
  const wasteReason = (formData.get('wasteReason') as string)?.trim()
  const unitCost = parseFloat(formData.get('unitCost') as string) || null
  const supplier = (formData.get('supplier') as string)?.trim()

  if (!itemId) {
    return { error: 'Item ID is required' }
  }

  // RLS handles permission - we just update

  // Auto-determine status if quantity changed
  let finalStatus = status
  if (quantity !== undefined && !isNaN(quantity)) {
    if (quantity === 0) {
      finalStatus = 'out_of_stock'
    } else if (quantity <= 10) {
      finalStatus = 'low_stock'
    } else {
      finalStatus = 'in_stock'
    }
  }

  const { error: updateError } = await supabase
    .from('inventory_items')
    .update({
      name: name || undefined,
      sku: sku || null,
      category: category || null,
      quantity: !isNaN(quantity) ? quantity : undefined,
      unit: unit || undefined,
      status: finalStatus,
      expiry_date: expiryDate || null,
      quantity_wasted: quantityWasted || 0,
      waste_reason: wasteReason || null,
      unit_cost: unitCost,
      supplier: supplier || null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', itemId)

  if (updateError) {
    if (updateError.message.includes('row-level security') || updateError.code === '42501') {
      return { error: 'You do not have permission to update this item' }
    }
    return { error: updateError.message }
  }

  revalidatePath(`/dashboard`)
  return { success: true }
}

export async function deleteInventoryItem(itemId: string) {
  const supabase = await createClient()

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return { error: 'You must be logged in to delete inventory items' }
  }

  if (!itemId) {
    return { error: 'Item ID is required' }
  }

  // RLS handles permission
  const { error: deleteError } = await supabase
    .from('inventory_items')
    .delete()
    .eq('id', itemId)

  if (deleteError) {
    if (deleteError.message.includes('row-level security') || deleteError.code === '42501') {
      return { error: 'You do not have permission to delete this item' }
    }
    return { error: deleteError.message }
  }

  revalidatePath(`/dashboard`)
  return { success: true }
}
