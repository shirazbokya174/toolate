'use client'

import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { createOrganization } from '@/actions/organizations'

const organizationFormSchema = z.object({
  name: z.string().min(2, {
    message: 'Organization name must be at least 2 characters.',
  }),
  slug: z.string().min(2, {
    message: 'URL name must be at least 2 characters.',
  }).regex(/^[a-z0-9-]+$/, {
    message: 'URL name can only contain lowercase letters, numbers, and hyphens.',
  }),
  type: z.string({
    message: 'Please select an organization type.',
  }),
})

type OrganizationFormValues = z.infer<typeof organizationFormSchema>

const organizationTypes = [
  { value: 'restaurant', label: 'Restaurant' },
  { value: 'grocery_store', label: 'Grocery Store' },
  { value: 'cafe', label: 'Cafe' },
  { value: 'bakery', label: 'Bakery' },
  { value: 'food_truck', label: 'Food Truck' },
  { value: 'catering', label: 'Catering' },
  { value: 'hotel', label: 'Hotel' },
  { value: 'other', label: 'Other' },
]

interface CreateOrganizationDialogProps {
  children?: React.ReactNode
}

export function CreateOrganizationDialog({
  children,
}: CreateOrganizationDialogProps) {
  const [open, setOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const form = useForm<OrganizationFormValues>({
    resolver: zodResolver(organizationFormSchema),
    defaultValues: {
      name: '',
      slug: '',
      type: '',
    },
  })

  // Auto-generate slug from name - use useEffect to avoid setState during render
  const name = form.watch('name')

  useEffect(() => {
    if (name && !form.getValues('slug')) {
      const generatedSlug = name
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .slice(0, 50)
      form.setValue('slug', generatedSlug)
    }
  }, [name, form])

  async function onSubmit(data: OrganizationFormValues) {
    setIsSubmitting(true)
    setError(null)

    const formData = new FormData()
    formData.append('name', data.name)
    formData.append('slug', data.slug)
    formData.append('type', data.type)

    const result = await createOrganization(formData)

    setIsSubmitting(false)

    if (result.error) {
      setError(result.error)
      return
    }

    // Success - close dialog and reset form
    setOpen(false)
    form.reset()
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children || <Button>Create Organization</Button>}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Create Organization</DialogTitle>
          <DialogDescription>
            Create a new organization to start managing your surplus inventory.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Organization Name</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="My Restaurant"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    The display name for your organization.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="slug"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Organization URL</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="my-restaurant"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    https://toolate.app/
                    <span className="font-mono font-medium">
                      {field.value || 'your-org-url'}
                    </span>
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Organization Type</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {organizationTypes.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    The type of your organization.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {error && (
              <div className="text-sm text-red-500 bg-red-50 dark:bg-red-950/20 p-3 rounded-md">
                {error}
              </div>
            )}

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Creating...' : 'Create Organization'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
