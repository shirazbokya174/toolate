'use client'

import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import * as ngeohash from 'ngeohash'

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
import { createBranch } from '@/actions/branches'
import dynamic from 'next/dynamic'

// Dynamic import for MapPicker (Leaflet doesn't work with SSR)
const MapPicker = dynamic(() => import('./MapPicker'), { 
  ssr: false,
  loading: () => (
    <div className="h-[300px] bg-muted animate-pulse rounded-md flex items-center justify-center">
      <span className="text-muted-foreground">Loading map...</span>
    </div>
  )
})

const branchFormSchema = z.object({
  name: z.string().min(2, {
    message: 'Branch name must be at least 2 characters.',
  }),
  code: z.string().min(1, {
    message: 'Branch code is required.',
  }).regex(/^[A-Z0-9]+$/, {
    message: 'Branch code can only contain uppercase letters and numbers.',
  }),
  address: z.string().optional(),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
})

type BranchFormValues = z.infer<typeof branchFormSchema>

interface CreateBranchDialogProps {
  organizationId: string
  organizationSlug: string
  children?: React.ReactNode
}

export function CreateBranchDialog({
  organizationId,
  organizationSlug,
  children,
}: CreateBranchDialogProps) {
  const [open, setOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [mapLat, setMapLat] = useState<number | undefined>(undefined)
  const [mapLng, setMapLng] = useState<number | undefined>(undefined)

  const form = useForm<BranchFormValues>({
    resolver: zodResolver(branchFormSchema),
    defaultValues: {
      name: '',
      code: '',
      address: '',
      latitude: undefined,
      longitude: undefined,
    },
  })

  // Auto-generate code from name
  const name = form.watch('name')

  useEffect(() => {
    if (name && !form.getValues('code')) {
      const generatedCode = name
        .toUpperCase()
        .replace(/[^A-Z0-9]/g, '')
        .slice(0, 5)
      form.setValue('code', generatedCode)
    }
  }, [name, form])

  const handleLocationChange = (lat: number, lng: number) => {
    setMapLat(lat)
    setMapLng(lng)
    form.setValue('latitude', lat)
    form.setValue('longitude', lng)
  }

  async function onSubmit(data: BranchFormValues) {
    setIsSubmitting(true)
    setError(null)

    // Generate geohash if coordinates are provided
    let geohash: string | undefined
    if (data.latitude && data.longitude) {
      geohash = ngeohash.encode(data.latitude, data.longitude, 9) // 9 chars = ~150m precision
    }

    const formData = new FormData()
    formData.append('organizationId', organizationId)
    formData.append('name', data.name)
    formData.append('code', data.code)
    if (data.address) {
      formData.append('address', data.address)
    }
    if (data.latitude) {
      formData.append('latitude', data.latitude.toString())
    }
    if (data.longitude) {
      formData.append('longitude', data.longitude.toString())
    }
    if (geohash) {
      formData.append('geohash', geohash)
    }

    const result = await createBranch(formData)

    setIsSubmitting(false)

    if (result.error) {
      setError(result.error)
      return
    }

    // Success - close dialog and reset form
    setOpen(false)
    form.reset()
    setMapLat(undefined)
    setMapLng(undefined)
    // Force a full page reload to trigger revalidation
    window.location.reload()
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children || <Button>Add Branch</Button>}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add New Branch</DialogTitle>
          <DialogDescription>
            Create a new branch location for your organization.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Branch Name</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Downtown Location"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    The display name for this branch.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="code"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Branch Code</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="DTWN"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    Internal code for quick identification (e.g., DTWN, STORE1).
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="address"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Address</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="123 Main St, City"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="space-y-2">
              <FormLabel>Branch Location</FormLabel>
              <MapPicker
                initialLat={mapLat}
                initialLng={mapLng}
                onLocationChange={handleLocationChange}
                height="250px"
              />
              <FormDescription>
                Click on the map to set the branch location. This is used for showing nearby branches to customers.
              </FormDescription>
            </div>

            {/* Hidden fields for lat/lng */}
            <input type="hidden" {...form.register('latitude', { valueAsNumber: true })} />
            <input type="hidden" {...form.register('longitude', { valueAsNumber: true })} />

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
                {isSubmitting ? 'Creating...' : 'Create Branch'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
