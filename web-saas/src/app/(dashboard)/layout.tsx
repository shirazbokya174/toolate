'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { 
  LayoutDashboard, 
  Building2, 
  Users, 
  Settings, 
  ChevronDown, 
  LogOut,
  Plus,
  Check
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { logout } from '@/actions/auth'
import { CreateOrganizationDialog } from '@/components/dashboard/CreateOrganizationDialog'

interface Organization {
  id: string
  name: string
  slug: string
  type: string | null
  plan: string | null
}

interface User {
  id: string
  email: string
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [organizations, setOrganizations] = useState<Organization[]>([])
  const [currentOrg, setCurrentOrg] = useState<Organization | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  // Determine current org from pathname when organizations change
  useEffect(() => {
    const pathParts = pathname.split('/')
    const slugIndex = pathParts.indexOf('dashboard')
    if (slugIndex !== -1 && pathParts[slugIndex + 1]) {
      const slug = pathParts[slugIndex + 1]
      if (slug !== undefined && slug !== '') {
        const org = organizations.find(o => o.slug === slug)
        if (org) setCurrentOrg(org)
      }
    }
  }, [pathname, organizations])

  // Fetch organizations on mount
  useEffect(() => {
    async function fetchData() {
      try {
        const response = await fetch('/api/dashboard/init', {
          credentials: 'same-origin',
        })
        if (response.ok) {
          const data = await response.json()
          console.log('Dashboard init data:', data)
          setUser(data.user)
          setOrganizations(data.organizations || [])
          
          // Set current org from URL
          const pathParts = window.location.pathname.split('/')
          const slugIndex = pathParts.indexOf('dashboard')
          if (slugIndex !== -1 && pathParts[slugIndex + 1]) {
            const slug = pathParts[slugIndex + 1]
            const org = (data.organizations || []).find((o: Organization) => o.slug === slug)
            if (org) setCurrentOrg(org)
          }
        } else {
          console.error('Failed to fetch dashboard init:', response.status)
        }
      } catch (error) {
        console.error('Failed to fetch dashboard data:', error)
      } finally {
        setIsLoading(false)
      }
    }
    fetchData()
  }, [pathname])

  const handleOrgChange = (org: Organization) => {
    setCurrentOrg(org)
    router.push(`/dashboard/${org.slug}`)
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-zinc-950">
        <div className="animate-pulse flex flex-col items-center gap-4">
          <div className="w-8 h-8 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin" />
          <p className="text-sm text-gray-500">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-zinc-950 flex">
      {/* Left Sidebar */}
      <aside className="w-64 bg-white dark:bg-zinc-900 border-r border-gray-200 dark:border-zinc-800 flex flex-col shrink-0">
        {/* Logo & Org Switcher */}
        <div className="p-4 border-b border-gray-200 dark:border-zinc-800">
          <div className="flex items-center justify-between mb-4">
            <Link href="/dashboard" className="text-lg font-bold text-gray-900 dark:text-white">
              TooLate
            </Link>
          </div>
          
          {/* Organization Switcher */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button 
                variant="outline" 
                className="w-full justify-between font-normal"
              >
                <span className="truncate">
                  {currentOrg?.name || organizations[0]?.name || 'No Organization'}
                </span>
                <ChevronDown className="ml-2 h-4 w-4 opacity-50" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-56">
              <DropdownMenuLabel>Organizations</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {organizations.length === 0 ? (
                <DropdownMenuItem disabled className="text-gray-500">
                  No organizations
                </DropdownMenuItem>
              ) : (
                <>
                  {organizations.map((org) => (
                    <DropdownMenuItem 
                      key={org.id}
                      onClick={() => handleOrgChange(org)}
                      className="cursor-pointer"
                    >
                      <div className="flex items-center justify-between w-full">
                        <span className="truncate">{org.name}</span>
                        {currentOrg?.id === org.id && (
                          <Check className="h-4 w-4 text-green-500 ml-2" />
                        )}
                      </div>
                    </DropdownMenuItem>
                  ))}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <CreateOrganizationDialog>
                      <button className="flex items-center gap-2 w-full text-sm text-left">
                        <Plus className="h-4 w-4" />
                        Create Organization
                      </button>
                    </CreateOrganizationDialog>
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-1">
          {currentOrg ? (
            <>
              <NavLink 
                href={`/dashboard/${currentOrg.slug}`}
                icon={LayoutDashboard}
                label="Overview"
                isActive={pathname === `/dashboard/${currentOrg.slug}`}
              />
              <NavLink 
                href={`/dashboard/${currentOrg.slug}/branches`}
                icon={Building2}
                label="Branches"
                isActive={pathname.includes('/branches')}
              />
              <NavLink 
                href={`/dashboard/${currentOrg.slug}/staff`}
                icon={Users}
                label="Staff"
                isActive={pathname.includes('/staff')}
              />
              <NavLink 
                href={`/dashboard/${currentOrg.slug}/settings`}
                icon={Settings}
                label="Settings"
                isActive={pathname.includes('/settings')}
              />
            </>
          ) : (
            <>
              <NavLink 
                href="/dashboard"
                icon={LayoutDashboard}
                label="Overview"
                isActive={pathname === '/dashboard'}
              />
              <div className="px-3 py-2 text-sm text-gray-500">
                Create an organization to access all features
              </div>
            </>
          )}
        </nav>

        {/* User Section */}
        <div className="p-4 border-t border-gray-200 dark:border-zinc-800">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-zinc-700 flex items-center justify-center">
              <span className="text-sm font-medium text-gray-600 dark:text-gray-300">
                {user?.email?.charAt(0).toUpperCase() || '?'}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                {user?.email?.split('@')[0] || 'User'}
              </p>
              <p className="text-xs text-gray-500 truncate">{user?.email}</p>
            </div>
          </div>
          <form action={logout}>
            <Button 
              variant="ghost" 
              size="sm" 
              className="w-full justify-start text-gray-600 dark:text-gray-400"
            >
              <LogOut className="mr-2 h-4 w-4" />
              Sign out
            </Button>
          </form>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 min-w-0">
        {children}
      </main>
    </div>
  )
}

function NavLink({ 
  href, 
  icon: Icon, 
  label, 
  isActive 
}: { 
  href: string
  icon: React.ComponentType<{ className?: string }>
  label: string
  isActive: boolean
}) {
  const pathname = usePathname()
  // Handle dynamic hrefs - need to match pattern
  const isActiveRoute = href.includes('[slug]') 
    ? pathname.startsWith(href.replace('[slug]', '').replace(/\/$/, ''))
    : pathname === href

  return (
    <Link
      href={href}
      className={`
        flex items-center gap-3 px-3-lg py-2 rounded text-sm font-medium transition-colors
        ${isActiveRoute 
          ? 'bg-gray-100 dark:bg-zinc-800 text-gray-900 dark:text-white' 
          : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-zinc-800/50 hover:text-gray-900 dark:hover:text-white'
        }
      `}
    >
      <Icon className="h-4 w-4" />
      {label}
    </Link>
  )
}
