import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import { CreateOrganizationDialog } from '@/components/dashboard/CreateOrganizationDialog'
import { Button } from '@/components/ui/button'
import { Building2, Plus, ArrowRight } from 'lucide-react'

export default async function DashboardPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Fetch user's organizations via organization_members
  const { data: memberships } = await supabase
    .from('organization_members')
    .select('organization_id')
    .eq('user_id', user.id)

  const orgIds = memberships?.map(m => m.organization_id) || []

  const { data: orgs } = await supabase
    .from('organizations')
    .select('id, name, slug, type, plan')
    .in('id', orgIds)
    .order('created_at', { ascending: false })

  // If no organizations, show empty state
  if (!orgs || orgs.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-64px)] p-8">
        <div className="text-center max-w-md">
          <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-gray-100 dark:bg-zinc-800 flex items-center justify-center">
            <Building2 className="w-8 h-8 text-gray-400" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            Welcome to TooLate
          </h2>
          <p className="text-gray-500 dark:text-gray-400 mb-8">
            Create your first organization to start saving surplus inventory and reducing food waste.
          </p>
          <CreateOrganizationDialog>
            <Button size="lg" className="gap-2">
              <Plus className="w-4 h-4" />
              Create Organization
            </Button>
          </CreateOrganizationDialog>
        </div>
      </div>
    )
  }

  // Redirect to first organization
  redirect(`/dashboard/${orgs[0].slug}`)
}
