'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { Building2, Plus, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { BranchList } from '@/components/dashboard/BranchList'
import { getBranchesByOrganization, getOrganizationBySlug } from '@/actions/branches'

interface Branch {
  id: string
  organization_id: string
  name: string
  code: string
  address: string | null
  is_active: boolean
  created_at: string
  updated_at: string
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

interface Organization {
  id: string
  name: string
  slug: string
}

export default function BranchesPage() {
  const params = useParams()
  const slug = params.slug as string
  const [branches, setBranches] = useState<Branch[]>([])
  const [organization, setOrganization] = useState<Organization | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    async function fetchData() {
      if (!slug) return
      
      try {
        // Get organization by slug
        const org = await getOrganizationBySlug(slug)
        if (org) {
          setOrganization(org)
          
          // Get branches for this organization
          const branchesData = await getBranchesByOrganization(org.id)
          setBranches(branchesData)
        }
      } catch (error) {
        console.error('Error fetching branches:', error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchData()
  }, [slug])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    )
  }

  if (!organization) {
    return (
      <div className="p-8 text-center">
        <p className="text-gray-500">Organization not found</p>
      </div>
    )
  }

  return (
    <div className="p-8">
      {/* Page Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-gray-100 dark:bg-zinc-800 rounded-lg">
            <Building2 className="h-6 w-6 text-gray-600 dark:text-gray-300" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              Branches
            </h1>
            <p className="text-sm text-gray-500">
              Manage locations for {organization.name}
            </p>
          </div>
        </div>
      </div>

      {/* Branch List */}
      <BranchList 
        branches={branches}
        organizationId={organization.id}
        organizationSlug={slug}
      />
    </div>
  )
}
