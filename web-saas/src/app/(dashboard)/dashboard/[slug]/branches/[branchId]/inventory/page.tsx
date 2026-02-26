'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { Package, Plus, Loader2, Pencil, Trash2, MoreHorizontal } from 'lucide-react'
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
import { createInventoryItem, deleteInventoryItem, getInventoryByBranch, updateInventoryItem, type InventoryItem } from '@/actions/inventory'

interface Branch {
  id: string
  name: string
  code: string
}

export default function InventoryPage() {
  const params = useParams()
  const branchId = params.branchId as string
  const [items, setItems] = useState<InventoryItem[]>([])
  const [branch, setBranch] = useState<Branch | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    sku: '',
    category: '',
    quantity: '',
    unit: '',
    expiryDate: '',
    unitCost: '',
    supplier: '',
  })

  useEffect(() => {
    async function fetchData() {
      if (!branchId) return
      
      try {
        // Get branch info from URL or localStorage (simplified - in real app would fetch)
        const stored = localStorage.getItem('currentBranch')
        if (stored) {
          setBranch(JSON.parse(stored))
        }
        
        const data = await getInventoryByBranch(branchId)
        setItems(data)
      } catch (error) {
        console.error('Error fetching inventory:', error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchData()
  }, [branchId])

  const resetForm = () => {
    setFormData({
      name: '',
      sku: '',
      category: '',
      quantity: '',
      unit: '',
      expiryDate: '',
      unitCost: '',
      supplier: '',
    })
    setEditingItem(null)
  }

  const handleOpenDialog = (item?: InventoryItem) => {
    if (item) {
      setEditingItem(item)
      setFormData({
        name: item.name,
        sku: item.sku || '',
        category: item.category || '',
        quantity: item.quantity.toString(),
        unit: item.unit,
        expiryDate: item.expiry_date || '',
        unitCost: item.unit_cost?.toString() || '',
        supplier: item.supplier || '',
      })
    } else {
      resetForm()
    }
    setIsDialogOpen(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    const form = new FormData()
    form.append('branchId', branchId)
    form.append('name', formData.name)
    form.append('sku', formData.sku)
    form.append('category', formData.category)
    form.append('quantity', formData.quantity)
    form.append('unit', formData.unit)
    form.append('expiryDate', formData.expiryDate)
    form.append('unitCost', formData.unitCost)
    form.append('supplier', formData.supplier)

    let result
    if (editingItem) {
      form.append('itemId', editingItem.id)
      result = await updateInventoryItem(form)
    } else {
      result = await createInventoryItem(form)
    }

    if (result.error) {
      alert(result.error)
      return
    }

    setIsDialogOpen(false)
    resetForm()
    
    // Refresh list
    const data = await getInventoryByBranch(branchId)
    setItems(data)
  }

  const handleDelete = async (itemId: string) => {
    if (!confirm('Are you sure you want to delete this item?')) return

    setDeletingId(itemId)
    const result = await deleteInventoryItem(itemId)
    setDeletingId(null)

    if (result.error) {
      alert(result.error)
      return
    }

    // Refresh list
    const data = await getInventoryByBranch(branchId)
    setItems(data)
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'in_stock':
        return 'bg-green-100 text-green-800'
      case 'low_stock':
        return 'bg-yellow-100 text-yellow-800'
      case 'out_of_stock':
        return 'bg-red-100 text-red-800'
      case 'reserved':
        return 'bg-blue-100 text-blue-800'
      case 'sold':
        return 'bg-gray-100 text-gray-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
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
            <Package className="h-6 w-6 text-gray-600 dark:text-gray-300" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              Inventory
            </h1>
            <p className="text-sm text-gray-500">
              Manage items at {branch?.name || 'this branch'}
            </p>
          </div>
        </div>
        
        <Dialog open={isDialogOpen} onOpenChange={(open) => {
          setIsDialogOpen(open)
          if (!open) resetForm()
        }}>
          <DialogTrigger asChild>
            <Button onClick={() => handleOpenDialog()}>
              <Plus className="mr-2 h-4 w-4" />
              Add Item
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingItem ? 'Edit Item' : 'Add New Item'}
              </DialogTitle>
              <DialogDescription>
                {editingItem ? 'Update the inventory item details.' : 'Add a new item to your inventory.'}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="name">Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Fresh Bread"
                  required
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="sku">SKU</Label>
                  <Input
                    id="sku"
                    value={formData.sku}
                    onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                    placeholder="e.g., BREAD-001"
                  />
                </div>
                <div>
                  <Label htmlFor="category">Category</Label>
                  <Input
                    id="category"
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    placeholder="e.g., Bakery"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="quantity">Quantity *</Label>
                  <Input
                    id="quantity"
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.quantity}
                    onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="unit">Unit *</Label>
                  <Input
                    id="unit"
                    value={formData.unit}
                    onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                    placeholder="e.g., pcs, kg, loaves"
                    required
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="expiryDate">Expiry Date</Label>
                <Input
                  id="expiryDate"
                  type="date"
                  value={formData.expiryDate}
                  onChange={(e) => setFormData({ ...formData, expiryDate: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="unitCost">Unit Cost</Label>
                  <Input
                    id="unitCost"
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.unitCost}
                    onChange={(e) => setFormData({ ...formData, unitCost: e.target.value })}
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <Label htmlFor="supplier">Supplier</Label>
                  <Input
                    id="supplier"
                    value={formData.supplier}
                    onChange={(e) => setFormData({ ...formData, supplier: e.target.value })}
                    placeholder="Supplier name"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit">
                  {editingItem ? 'Update' : 'Add Item'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Inventory List */}
      {items.length === 0 ? (
        <div className="mt-8 p-12 text-center bg-white dark:bg-zinc-900 rounded-xl shadow-sm border border-dashed border-gray-300 dark:border-zinc-800">
          <Package className="mx-auto h-12 w-12 text-gray-400 mb-4" />
          <h3 className="text-xl font-medium mb-2">No inventory items yet</h3>
          <p className="text-gray-500 mb-6">Add your first item to start tracking inventory.</p>
          <Button onClick={() => handleOpenDialog()}>
            <Plus className="mr-2 h-4 w-4" />
            Add First Item
          </Button>
        </div>
      ) : (
        <div className="bg-white dark:bg-zinc-900 rounded-xl shadow-sm border border-gray-200 dark:border-zinc-800 overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-zinc-800">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Item
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Category
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Quantity
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Expiry
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-zinc-800">
              {items.map((item) => (
                <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-zinc-800/50">
                  <td className="px-6 py-4">
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">{item.name}</p>
                      {item.sku && (
                        <p className="text-sm text-gray-500">{item.sku}</p>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-300">
                    {item.category || '-'}
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-gray-900 dark:text-white">
                      {item.quantity} {item.unit}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(item.status)}`}>
                      {item.status.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-300">
                    {item.expiry_date ? new Date(item.expiry_date).toLocaleDateString() : '-'}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          {deletingId === item.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <MoreHorizontal className="h-4 w-4" />
                          )}
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleOpenDialog(item)}>
                          <Pencil className="mr-2 h-4 w-4" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() => handleDelete(item.id)}
                          className="text-red-600 focus:text-red-600"
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Delete
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
  )
}
