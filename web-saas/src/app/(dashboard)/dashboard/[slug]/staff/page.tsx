'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { Users, Plus, Loader2, MoreHorizontal, Trash2, Crown, Mail, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import {
  getOrganizationBySlug,
  getBranchesByOrganization,
} from '@/actions/branches'
import {
  getOrganizationMembers,
  getBranchMembers,
  inviteOrganizationMember,
  updateOrganizationMemberRole,
  removeOrganizationMember,
  addBranchMember,
  removeBranchMember,
  resendInvitation,
  type OrgMember,
  type BranchMember,
} from '@/actions/staff'

interface Branch {
  id: string
  name: string
  code: string
}

interface Organization {
  id: string
  name: string
  slug: string
}

export default function StaffPage() {
  const params = useParams()
  const slug = params.slug as string
  const [organization, setOrganization] = useState<Organization | null>(null)
  const [branches, setBranches] = useState<Branch[]>([])
  const [orgMembers, setOrgMembers] = useState<OrgMember[]>([])
  const [branchMembers, setBranchMembers] = useState<BranchMember[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'org' | 'branch'>('org')

  // Dialogs
  const [isInviteOrgOpen, setIsInviteOrgOpen] = useState(false)
  const [isInviteBranchOpen, setIsInviteBranchOpen] = useState(false)
  const [isInviteUrlOpen, setIsInviteUrlOpen] = useState(false)

  // Form state
  const [orgForm, setOrgForm] = useState({ email: '', role: 'member' })
  const [branchForm, setBranchForm] = useState({ branchId: '', email: '', role: 'staff' })

  // Magic link state
  const [generatedInviteUrl, setGeneratedInviteUrl] = useState<string | null>(null)

  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    async function fetchData() {
      if (!slug) return

      try {
        const org = await getOrganizationBySlug(slug)
        if (org) {
          setOrganization(org)

          const [members, branchesData] = await Promise.all([
            getOrganizationMembers(org.id),
            getBranchesByOrganization(org.id),
          ])

          setOrgMembers(members)
          setBranches(branchesData)

          // Also fetch branch members
          const bMembers = await getBranchMembers(org.id)
          setBranchMembers(bMembers)
        }
      } catch (error) {
        console.error('Error fetching staff data:', error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchData()
  }, [slug])

  const handleInviteOrg = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!organization) return

    setIsSubmitting(true)
    const formData = new FormData()
    formData.append('organizationId', organization.id)
    formData.append('email', orgForm.email)
    formData.append('role', orgForm.role)

    const result = await inviteOrganizationMember(formData)
    setIsSubmitting(false)

    if (result.error) {
      alert(result.error)
      return
    }

    setIsInviteOrgOpen(false)
    setOrgForm({ email: '', role: 'member' })

    // Refresh
    const members = await getOrganizationMembers(organization.id)
    setOrgMembers(members)
  }

  const handleInviteBranch = async (e: React.FormEvent) => {
    e.preventDefault()

    setIsSubmitting(true)
    const formData = new FormData()
    formData.append('branchId', branchForm.branchId)
    formData.append('email', branchForm.email)
    formData.append('role', branchForm.role)

    const result = await addBranchMember(formData)
    setIsSubmitting(false)

    if (result.error) {
      alert(result.error)
      return
    }

    setIsInviteBranchOpen(false)
    setBranchForm({ branchId: '', email: '', role: 'staff' })

    // Refresh
    if (organization) {
      const members = await getBranchMembers(organization.id)
      setBranchMembers(members)
    }
  }

  const handleUpdateOrgRole = async (memberId: string, newRole: string) => {
    if (!organization) return

    const result = await updateOrganizationMemberRole(memberId, newRole as any, organization.id)

    if (result.error) {
      alert(result.error)
      return
    }

    // Refresh
    const members = await getOrganizationMembers(organization.id)
    setOrgMembers(members)
  }

  const handleRemoveOrgMember = async (memberId: string) => {
    if (!organization) return
    if (!confirm('Are you sure you want to remove this member?')) return

    const result = await removeOrganizationMember(memberId, organization.id)

    if (result.error) {
      alert(result.error)
      return
    }

    // Refresh
    const members = await getOrganizationMembers(organization.id)
    setOrgMembers(members)
  }

  const handleResendInvite = async (invitationId: string) => {
    if (!organization) return
    setIsSubmitting(true)

    const result = await resendInvitation(invitationId, organization.id)
    setIsSubmitting(false)

    if (result.error) {
      alert(result.error)
      return
    }

    if (result.inviteUrl) {
      setGeneratedInviteUrl(result.inviteUrl)
      setIsInviteUrlOpen(true)
    } else {
      alert('Invitation resent successfully!')
    }

    // Refresh
    const members = await getOrganizationMembers(organization.id)
    setOrgMembers(members)
  }

  const handleRemoveBranchMember = async (memberId: string, branchId: string) => {
    if (!confirm('Are you sure you want to remove this member?')) return

    const result = await removeBranchMember(memberId, branchId)

    if (result.error) {
      alert(result.error)
      return
    }

    // Refresh
    if (organization) {
      const members = await getBranchMembers(organization.id)
      setBranchMembers(members)
    }
  }

  const getRoleBadge = (role: string) => {
    const colors: Record<string, string> = {
      owner: 'bg-yellow-100 text-yellow-800',
      admin: 'bg-purple-100 text-purple-800',
      manager: 'bg-blue-100 text-blue-800',
      member: 'bg-gray-100 text-gray-800',
      staff: 'bg-green-100 text-green-800',
      viewer: 'bg-gray-100 text-gray-800',
    }
    return colors[role] || 'bg-gray-100 text-gray-800'
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    )
  }

  return (
    <div className="p-8">
      {/* Page Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-gray-100 dark:bg-zinc-800 rounded-lg">
            <Users className="h-6 w-6 text-gray-600 dark:text-gray-300" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              Staff & Members
            </h1>
            <p className="text-sm text-gray-500">
              Manage team members for {organization?.name}
            </p>
          </div>
        </div>
      </div>

      {/* Magic Link Copy Dialog */}
      <Dialog open={isInviteUrlOpen} onOpenChange={setIsInviteUrlOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Invitation Link Generated</DialogTitle>
            <DialogDescription>
              Because custom email domains are restricted on free tiers, we have generated a secure magic link manually.
              Copy this link and send it directly to your team member!
            </DialogDescription>
          </DialogHeader>
          <div className="flex space-x-2 mt-4">
            <Input
              readOnly
              value={generatedInviteUrl || ''}
              className="flex-1 bg-gray-50 text-gray-500 text-sm"
            />
            <Button
              onClick={() => {
                if (generatedInviteUrl) {
                  navigator.clipboard.writeText(generatedInviteUrl)
                  alert('Copied to clipboard!')
                }
              }}
              className="shrink-0"
            >
              Copy Link
            </Button>
          </div>
          <div className="flex justify-end pt-4">
            <Button variant="outline" onClick={() => setIsInviteUrlOpen(false)}>
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Tabs */}
      <div className="flex gap-4 mb-6 border-b border-gray-200 dark:border-zinc-800">
        <button
          onClick={() => setActiveTab('org')}
          className={`pb-3 px-1 text-sm font-medium transition-colors border-b-2 ${activeTab === 'org'
            ? 'border-gray-900 text-gray-900 dark:text-white'
            : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
        >
          Organization Members ({orgMembers.length})
        </button>
        <button
          onClick={() => setActiveTab('branch')}
          className={`pb-3 px-1 text-sm font-medium transition-colors border-b-2 ${activeTab === 'branch'
            ? 'border-gray-900 text-gray-900 dark:text-white'
            : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
        >
          Branch Members ({branchMembers.length})
        </button>
      </div>

      {/* Organization Members Tab */}
      {activeTab === 'org' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <Dialog open={isInviteOrgOpen} onOpenChange={setIsInviteOrgOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Invite Member
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Invite Organization Member</DialogTitle>
                  <DialogDescription>
                    Invite a user to join this organization.
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleInviteOrg} className="space-y-4">
                  <div>
                    <Label htmlFor="orgEmail">Email</Label>
                    <Input
                      id="orgEmail"
                      type="email"
                      value={orgForm.email}
                      onChange={(e) => setOrgForm({ ...orgForm, email: e.target.value })}
                      placeholder="user@example.com"
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="orgRole">Role</Label>
                    <Select
                      value={orgForm.role}
                      onValueChange={(v) => setOrgForm({ ...orgForm, role: v })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="admin">Admin</SelectItem>
                        <SelectItem value="manager">Manager</SelectItem>
                        <SelectItem value="member">Member</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex justify-end gap-2 pt-4">
                    <Button type="button" variant="outline" onClick={() => setIsInviteOrgOpen(false)}>
                      Cancel
                    </Button>
                    <Button type="submit" disabled={isSubmitting}>
                      {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                      Send Invite
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>

          {orgMembers.length === 0 ? (
            <div className="p-12 text-center bg-white dark:bg-zinc-900 rounded-xl shadow-sm border border-dashed border-gray-300 dark:border-zinc-800">
              <Users className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <h3 className="text-xl font-medium mb-2">No organization members</h3>
              <p className="text-gray-500">Invite your first team member.</p>
            </div>
          ) : (
            <div className="bg-white dark:bg-zinc-900 rounded-xl shadow-sm border border-gray-200 dark:border-zinc-800 overflow-hidden">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-zinc-800">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      User
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Role
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Joined
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-zinc-800">
                  {orgMembers.map((member, index) => (
                    <tr key={member.id || `member-${index}`} className="hover:bg-gray-50 dark:hover:bg-zinc-800/50">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-zinc-700 flex items-center justify-center">
                            <span className="text-sm font-medium text-gray-600 dark:text-gray-300">
                              {member.user_email?.charAt(0).toUpperCase() || '?'}
                            </span>
                          </div>
                          <span className="text-gray-900 dark:text-white">{member.user_email}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getRoleBadge(member.role || 'member')}`}>
                          {member.role === 'owner' && <Crown className="w-3 h-3 mr-1" />}
                          {member.user_email?.includes('(pending)') ? 'pending' : member.role}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {new Date(member.joined_at).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 text-right">
                        {/* Show dropdown for non-owners or pending invites */}
                        {(member.role !== 'owner' || (member.id && member.id.startsWith('inv-'))) && (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              {/* Show Resend Invite for pending invitations */}
                              {member.id && member.id.startsWith('inv-') && (
                                <>
                                  <DropdownMenuItem onClick={() => handleResendInvite(member.id.replace('inv-', ''))}>
                                    <Mail className="mr-2 h-4 w-4" />
                                    Resend Invite
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                </>
                              )}
                              {/* Show role options for actual members */}
                              {member.id && !member.id.startsWith('inv-') && (
                                <>
                                  <DropdownMenuItem onClick={() => handleUpdateOrgRole(member.id, 'admin')}>
                                    Set as Admin
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => handleUpdateOrgRole(member.id, 'manager')}>
                                    Set as Manager
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => handleUpdateOrgRole(member.id, 'member')}>
                                    Set as Member
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                </>
                              )}
                              <DropdownMenuItem
                                onClick={() => handleRemoveOrgMember(member.id)}
                                className="text-red-600 focus:text-red-600"
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                Remove
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Branch Members Tab */}
      {activeTab === 'branch' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <Dialog open={isInviteBranchOpen} onOpenChange={setIsInviteBranchOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Branch Member
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add Branch Member</DialogTitle>
                  <DialogDescription>
                    Add a user to a specific branch.
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleInviteBranch} className="space-y-4">
                  <div>
                    <Label htmlFor="branchSelect">Branch</Label>
                    <Select
                      value={branchForm.branchId}
                      onValueChange={(v) => setBranchForm({ ...branchForm, branchId: v })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select a branch" />
                      </SelectTrigger>
                      <SelectContent>
                        {branches.map((branch) => (
                          <SelectItem key={branch.id} value={branch.id}>
                            {branch.name} ({branch.code})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="branchEmail">Email</Label>
                    <Input
                      id="branchEmail"
                      type="email"
                      value={branchForm.email}
                      onChange={(e) => setBranchForm({ ...branchForm, email: e.target.value })}
                      placeholder="user@example.com"
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="branchRole">Role</Label>
                    <Select
                      value={branchForm.role}
                      onValueChange={(v) => setBranchForm({ ...branchForm, role: v })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="manager">Manager</SelectItem>
                        <SelectItem value="staff">Staff</SelectItem>
                        <SelectItem value="viewer">Viewer</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex justify-end gap-2 pt-4">
                    <Button type="button" variant="outline" onClick={() => setIsInviteBranchOpen(false)}>
                      Cancel
                    </Button>
                    <Button type="submit" disabled={isSubmitting}>
                      {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                      Add Member
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>

          {branchMembers.length === 0 ? (
            <div className="p-12 text-center bg-white dark:bg-zinc-900 rounded-xl shadow-sm border border-dashed border-gray-300 dark:border-zinc-800">
              <Users className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <h3 className="text-xl font-medium mb-2">No branch members</h3>
              <p className="text-gray-500">Add members to specific branches.</p>
            </div>
          ) : (
            <div className="bg-white dark:bg-zinc-900 rounded-xl shadow-sm border border-gray-200 dark:border-zinc-800 overflow-hidden">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-zinc-800">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      User
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Branch
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Role
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-zinc-800">
                  {branchMembers.map((member, index) => (
                    <tr key={member.id || `branch-member-${index}`} className="hover:bg-gray-50 dark:hover:bg-zinc-800/50">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-zinc-700 flex items-center justify-center">
                            <span className="text-sm font-medium text-gray-600 dark:text-gray-300">
                              {member.user_email?.charAt(0).toUpperCase() || '?'}
                            </span>
                          </div>
                          <span className="text-gray-900 dark:text-white">{member.user_email}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-300">
                        {member.branch_name}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getRoleBadge(member.role)}`}>
                          {member.role}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={() => handleRemoveBranchMember(member.id, member.branch_id)}
                              className="text-red-600 focus:text-red-600"
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Remove
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
