'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import * as ngeohash from 'ngeohash'
import dynamic from 'next/dynamic'

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
import { Switch } from '@/components/ui/switch'
import { updateBranch } from '@/actions/branches'

// Dynamic import for MapPicker (Leaflet doesn't work with SSR)
const MapPicker = dynamic(() => import('./MapPicker'), { 
  ssr: false,
  loading: () => (
    <div className="h-[250px] bg-muted animate-pulse rounded-md flex items-center justify-center">
      <span className="text-muted-foreground">Loading map...</span>
    </div>
  )
})

const editBranchFormSchema = z.object({
  name: z.string().min(2, {
    message: 'Branch name must be at least 2 characters.',
  }),
  code: z.string().min(1, {
    message: 'Branch code is required.',
  }).regex(/^[A-Z0-9]+$/, {
    message: 'Branch code can only contain uppercase letters and numbers.',
  }),
  address: z.string().optional(),
  is_active: z.boolean(),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
})

type EditBranchFormValues = z.infer<typeof editBranchFormSchema>

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
}

interface EditBranchDialogProps {
  branch: Branch
  children?: React.ReactNode
}

export function EditBranchDialog({ branch, children }: EditBranchDialogProps) {
  const [open, setOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  // Initialize map coordinates from existing branch data
  const [mapLat, setMapLat] = useState<number | undefined>(branch.latitude || undefined)
  const [mapLng, setMapLng] = useState<number | undefined>(branch.longitude || undefined)

  const form = useForm<EditBranchFormValues>({
    resolver: zodResolver(editBranchFormSchema),
    defaultValues: {
      name: branch.name,
      code: branch.code,
      address: branch.address || '',
      is_active: branch.is_active,
      latitude: branch.latitude || undefined,
      longitude: branch.longitude || undefined,
    },
  })

  const handleLocationChange = (lat: number, lng: number) => {
    setMapLat(lat)
    setMapLng(lng)
    form.setValue('latitude', lat)
    form.setValue('longitude', lng)
  }

  async function onSubmit(data: EditBranchFormValues) {
    setIsSubmitting(true)
    setError(null)

    // Generate geohash if coordinates are provided
    let geohash: string | undefined
    if (data.latitude && data.longitude) {
      geohash = ngeohash.encode(data.latitude, data.longitude, 9)
    }

    const formData = new FormData()
    formData.append('branchId', branch.id)
    formData.append('name', data.name)
    formData.append('code', data.code)
    formData.append('address', data.address || '')
    formData.append('isActive', data.is_active.toString())
    if (data.latitude) {
      formData.append('latitude', data.latitude.toString())
    }
    if (data.longitude) {
      formData.append('longitude', data.longitude.toString())
    }
    if (geohash) {
      formData.append('geohash', geohash)
    }

    const result = await updateBranch(formData)

    setIsSubmitting(false)

    if (result.error) {
      setError(result.error)
      return
    }

    // Success - close dialog
    setOpen(false)
    // Force a full page reload to trigger revalidation
    window.location.reload()
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children || <Button variant="outline" size="sm">Edit</Button>}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Branch</DialogTitle>
          <DialogDescription>
            Update branch details for {branch.name}.
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

            {/* Location Map */}
            <div className="space-y-2">
              <FormLabel>Branch Location</FormLabel>
              <MapPicker
                initialLat={mapLat}
                initialLng={mapLng}
                onLocationChange={handleLocationChange}
                height="250px"
              />
              <FormDescription>
                Click on the map to update the branch location.
              </FormDescription>
            </div>

            {/* Hidden fields for lat/lng */}
            <input type="hidden" {...form.register('latitude', { valueAsNumber: true })} />
            <input type="hidden" {...form.register('longitude', { valueAsNumber: true })} />

            <FormField
              control={form.control}
              name="is_active"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <FormLabel className="text-base">
                      Active
                    </FormLabel>
                    <FormDescription>
                      Inactive branches won&apos;t be visible in the user app.
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
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
                {isSubmitting ? 'Saving...' : 'Save Changes'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
