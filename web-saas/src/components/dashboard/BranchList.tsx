'use client'

import { useState } from 'react'
import Link from 'next/link'
import { MapPin, Pencil, Trash2, MoreHorizontal, Loader2, Package } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { CreateBranchDialog } from './CreateBranchDialog'
import { EditBranchDialog } from './EditBranchDialog'
import { deleteBranch } from '@/actions/branches'

interface Branch {
  id: string
  organization_id: string
  name: string
  code: string
  address: string | null
  is_active: boolean
  created_at: string
  interface Branch {
  id: string
  organization_id: string
  name: string
  code: string
  address: string | null
  latitude: number | null
  longitude: number | null
  geohash: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}
interface Branch {
  id: string
  organization_id: string
  name: string
  code: string
  address: string | null
  latitude: number | null
  longitude: number | null
  geohash: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

interface BranchListProps {
  branches: Branch[]
  organizationId: string
  organizationSlug: string
}

export function BranchList({ branches, organizationId, organizationSlug }: BranchListProps) {
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const handleDelete = async (branchId: string) => {
    if (!confirm('Are you sure you want to delete this branch? This will also delete all branch members and inventory items.')) {
      return
    }

    setDeletingId(branchId)
    const result = await deleteBranch(branchId, organizationSlug)
    setDeletingId(null)

    if (result.error) {
      alert(result.error)
    }
  }

  if (branches.length === 0) {
    return (
      <div className="mt-8 p-12 text-center bg-white dark:bg-zinc-900 rounded-xl shadow-sm border border-dashed border-gray-300 dark:border-zinc-800">
        <MapPin className="mx-auto h-12 w-12 text-gray-400 mb-4" />
        <h3 className="text-xl font-medium mb-2">No branches yet</h3>
        <p className="text-gray-500 mb-6">Add your first branch location to start managing inventory.</p>
        <CreateBranchDialog organizationId={organizationId} organizationSlug={organizationSlug}>
          <Button>Add First Branch</Button>
        </CreateBranchDialog>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Branches ({branches.length})</h3>
        <CreateBranchDialog organizationId={organizationId} organizationSlug={organizationSlug}>
          <Button>Add Branch</Button>
        </CreateBranchDialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {branches.map((branch) => (
          <Card key={branch.id} className={!branch.is_active ? 'opacity-60' : ''}>
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <CardTitle className="text-base flex items-center gap-2">
                    {branch.name}
                    {!branch.is_active && (
                      <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                        Inactive
                      </span>
                    )}
                  </CardTitle>
                  <p className="text-sm text-gray-500 font-mono">{branch.code}</p>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      {deletingId === branch.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <MoreHorizontal className="h-4 w-4" />
                      )}
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <EditBranchDialog branch={branch}>
                      <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                        <Pencil className="mr-2 h-4 w-4" />
                        Edit
                      </DropdownMenuItem>
                    </EditBranchDialog>
                    <DropdownMenuItem asChild>
                      <Link href={`/dashboard/${organizationSlug}/branches/${branch.id}/inventory`}>
                        <Package className="mr-2 h-4 w-4" />
                        View Inventory
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onSelect={(e) => {
                        e.preventDefault()
                        handleDelete(branch.id)
                      }}
                      className="text-red-600 focus:text-red-600"
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </CardHeader>
            <CardContent>
              {branch.address ? (
                <p className="text-sm text-gray-600 dark:text-gray-400 flex items-start gap-2">
                  <MapPin className="h-4 w-4 mt-0.5 flex-shrink-0" />
                  {branch.address}
                </p>
              ) : (
                <p className="text-sm text-gray-400 italic">No address set</p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
