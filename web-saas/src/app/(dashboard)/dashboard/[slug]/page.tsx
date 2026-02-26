import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import { 
  Building2, 
  Package, 
  Users, 
  TrendingUp,
  ArrowUpRight,
  ArrowDownRight,
  Clock,
  CheckCircle2,
  AlertCircle
} from 'lucide-react'
import { getOrganizationBySlug } from '@/actions/branches'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import Link from 'next/link'
import { Button } from '@/components/ui/button'

interface PageProps {
  params: Promise<{
    slug: string
  }>
}

export default async function OrganizationOverviewPage({ params }: PageProps) {
  const { slug } = await params
  const supabase = await createClient()

  // Check auth
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Get organization by slug
  const organization = await getOrganizationBySlug(slug)

  if (!organization) {
    redirect('/dashboard')
  }

  // Check user membership in this organization
  const { data: membership } = await supabase
    .from('organization_members')
    .select('role')
    .eq('organization_id', organization.id)
    .eq('user_id', user.id)
    .single()

  if (!membership) {
    redirect('/dashboard')
  }

  // Get branches count
  const { count: totalBranches } = await supabase
    .from('branches')
    .select('*', { count: 'exact', head: true })
    .eq('organization_id', organization.id)

  const { count: activeBranches } = await supabase
    .from('branches')
    .select('*', { count: 'exact', head: true })
    .eq('organization_id', organization.id)
    .eq('is_active', true)

  // Get staff count
  const { count: staffCount } = await supabase
    .from('organization_members')
    .select('*', { count: 'exact', head: true })
    .eq('organization_id', organization.id)

  // Get recent items saved (placeholder - would need items table)
  const { count: itemsSaved } = await supabase
    .from('branches')
    .select('*', { count: 'exact', head: true })
    .eq('organization_id', organization.id)

  const metrics = [
    {
      title: 'Active Branches',
      value: activeBranches || 0,
      total: totalBranches || 0,
      description: `${totalBranches || 0} total branches`,
      icon: Building2,
      trend: '+2',
      trendUp: true,
      color: 'blue',
    },
    {
      title: 'Items Saved',
      value: itemsSaved || 0,
      description: 'This month',
      icon: Package,
      trend: '+12%',
      trendUp: true,
      color: 'green',
    },
    {
      title: 'Team Members',
      value: staffCount || 0,
      description: 'Active users',
      icon: Users,
      trend: '+1',
      trendUp: true,
      color: 'purple',
    },
    {
      title: 'Items Pending',
      value: 0,
      description: 'Awaiting pickup',
      icon: Clock,
      trend: '-5',
      trendUp: false,
      color: 'orange',
    },
  ]

  const recentActivity = [
    { type: 'success', message: 'Branch "Downtown" updated hours', time: '2 hours ago' },
    { type: 'success', message: 'New staff member added to "Uptown"', time: '5 hours ago' },
    { type: 'info', message: 'Organization plan upgraded to Pro', time: '1 day ago' },
    { type: 'warning', message: 'Branch "Airport" needs attention', time: '2 days ago' },
  ]

  return (
    <div className="p-6 lg:p-8 space-y-8">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Overview
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            Welcome back! Here's what's happening with {organization.name}.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button asChild>
            <Link href={`/dashboard/${slug}/branches`}>
              Manage Branches
            </Link>
          </Button>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {metrics.map((metric) => (
          <Card key={metric.title} className="relative overflow-hidden">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-500 dark:text-gray-400">
                {metric.title}
              </CardTitle>
              <div className={`p-2 rounded-lg ${
                metric.color === 'blue' ? 'bg-blue-50 dark:bg-blue-950' :
                metric.color === 'green' ? 'bg-green-50 dark:bg-green-950' :
                metric.color === 'purple' ? 'bg-purple-50 dark:bg-purple-950' :
                'bg-orange-50 dark:bg-orange-950'
              }`}>
                <metric.icon className={`h-4 w-4 ${
                  metric.color === 'blue' ? 'text-blue-600' :
                  metric.color === 'green' ? 'text-green-600' :
                  metric.color === 'purple' ? 'text-purple-600' :
                  'text-orange-600'
                }`} />
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-end justify-between">
                <div>
                  <div className="text-2xl font-bold text-gray-900 dark:text-white">
                    {metric.value}
                    {metric.total !== undefined && (
                      <span className="text-sm font-normal text-gray-400">
                        /{metric.total}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    {metric.description}
                  </p>
                </div>
                {metric.trend && (
                  <div className={`flex items-center text-xs font-medium ${
                    metric.trendUp ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {metric.trendUp ? (
                      <ArrowUpRight className="h-3 w-3 mr-1" />
                    ) : (
                      <ArrowDownRight className="h-3 w-3 mr-1" />
                    )}
                    {metric.trend}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Quick Actions & Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Quick Actions */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-lg">Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button variant="outline" className="w-full justify-start" asChild>
              <Link href={`/dashboard/${slug}/branches`}>
                <Building2 className="mr-2 h-4 w-4" />
                Add New Branch
              </Link>
            </Button>
            <Button variant="outline" className="w-full justify-start" asChild>
              <Link href={`/dashboard/${slug}/staff`}>
                <Users className="mr-2 h-4 w-4" />
                Invite Team Member
              </Link>
            </Button>
            <Button variant="outline" className="w-full justify-start" asChild>
              <Link href={`/dashboard/${slug}/settings`}>
                <TrendingUp className="mr-2 h-4 w-4" />
                View Reports
              </Link>
            </Button>
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-lg">Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentActivity.map((activity, index) => (
                <div key={index} className="flex items-start gap-3">
                  {activity.type === 'success' && (
                    <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5" />
                  )}
                  {activity.type === 'info' && (
                    <TrendingUp className="h-4 w-4 text-blue-500 mt-0.5" />
                  )}
                  {activity.type === 'warning' && (
                    <AlertCircle className="h-4 w-4 text-orange-500 mt-0.5" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-900 dark:text-white">
                      {activity.message}
                    </p>
                    <p className="text-xs text-gray-400">
                      {activity.time}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Getting Started Tips */}
      {(!totalBranches || totalBranches === 0) && (
        <Card className="border-dashed">
          <CardContent className="pt-6">
            <div className="text-center">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                Get Started
              </h3>
              <p className="text-gray-500 dark:text-gray-400 mb-4 max-w-md mx-auto">
                Add your first branch to start managing surplus inventory and saving items from going to waste.
              </p>
              <Button asChild>
                <Link href={`/dashboard/${slug}/branches`}>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Your First Branch
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

function Plus(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M5 12h14" />
      <path d="M12 5v14" />
    </svg>
  )
}
