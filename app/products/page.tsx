'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import Navbar from '@/components/Navbar'

type Product = {
  id: string
  name: string
  barcode: string
  category: string
  price: number
  cost_price: number
  stock: number
  unit: string
}

const CATEGORIES = ['Bakery', 'Dairy', 'Meat', 'Produce', 'Grains', 'Beverages', 'Canned', 'Oils', 'Household', 'Snacks', 'Frozen', 'General']
const UNITS = ['pcs', 'kg', 'g', 'L', 'mL', 'pack', 'box', 'bottle', 'can']

const empty = { id: '', name: '', barcode: '', category: 'General', price: 0, stock: 0, unit: 'pcs' }

export default function ProductsPage() {
  const supabase = createClient()
  const [products, setProducts] = useState<Product[]>([])
  const [userEmail, setUserEmail] = useState('')
  const [form, setForm] = useState({ ...empty })
  const [editing, setEditing] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUserEmail(data.user?.email ?? ''))
    fetchProducts()
  }, [])

  async function fetchProducts() {
    const { data } = await supabase.from('products').select('*').order('name')
    setProducts(data ?? [])
  }

  function startEdit(p: Product) {
    setForm({ ...p })
    setEditing(p.id)
    setShowForm(true)
    setError('')
  }

  function startNew() {
    setForm({ ...empty })
    setEditing(null)
    setShowForm(true)
    setError('')
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const payload = {
        name: form.name,
        barcode: form.barcode || null,
        category: form.category,
        price: form.price,
        stock: form.stock,
        unit: form.unit,
      }
      if (editing) {
        const { error } = await supabase.from('products').update(payload).eq('id', editing)
        if (error) throw error
      } else {
        const { error } = await supabase.from('products').insert(payload)
        if (error) throw error
      }
      await fetchProducts()
      setShowForm(false)
      setEditing(null)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this product?')) return
    await supabase.from('products').delete().eq('id', id)
    await fetchProducts()
  }

  const filtered = products.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.category.toLowerCase().includes(search.toLowerCase()) ||
    (p.barcode && p.barcode.includes(search))
  )

  return (
    <>
      <Navbar email={userEmail} />
      <div className="max-w-6xl mx-auto p-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-gray-800">📦 Product Management</h1>
          <button
            onClick={startNew}
            className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-medium"
          >
            + Add Product
          </button>
        </div>

        {showForm && (
          <div className="bg-white rounded-2xl shadow-md p-6 mb-6">
            <h2 className="text-lg font-semibold mb-4">{editing ? 'Edit Product' : 'New Product'}</h2>
            <form onSubmit={handleSave} className="grid grid-cols-2 gap-4">
              <div className="col-span-2 sm:col-span-1">
                <label className="block text-sm font-medium text-gray-700 mb-1">Product Name *</label>
                <input required value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500" />
              </div>
              <div className="col-span-2 sm:col-span-1">
                <label className="block text-sm font-medium text-gray-700 mb-1">Barcode</label>
                <input value={form.barcode} onChange={e => setForm(f => ({ ...f, barcode: e.target.value }))}
                  placeholder="Optional"
                  className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Category *</label>
                <select required value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                  className="w-full border rounded-lg px-3 py-2">
                  {CATEGORIES.map(c => <option key={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Unit *</label>
                <select required value={form.unit} onChange={e => setForm(f => ({ ...f, unit: e.target.value }))}
                  className="w-full border rounded-lg px-3 py-2">
                  {UNITS.map(u => <option key={u}>{u}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Price (Price (₹)) *</label>
                <input required type="number" min="0" step="0.01" value={form.price}
                  onChange={e => setForm(f => ({ ...f, price: parseFloat(e.target.value) || 0 }))}
                  className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Stock *</label>
                <input required type="number" min="0" step="1" value={form.stock}
                  onChange={e => setForm(f => ({ ...f, stock: parseInt(e.target.value) || 0 }))}
                  className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500" />
              </div>
              {error && <div className="col-span-2 bg-red-50 text-red-700 border border-red-200 rounded-lg px-3 py-2 text-sm">{error}</div>}
              <div className="col-span-2 flex gap-3">
                <button type="submit" disabled={loading}
                  className="bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white px-6 py-2 rounded-lg font-medium">
                  {loading ? 'Saving...' : editing ? 'Update' : 'Create'}
                </button>
                <button type="button" onClick={() => setShowForm(false)}
                  className="border border-gray-300 px-6 py-2 rounded-lg hover:bg-gray-50">
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        <div className="mb-4">
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search products..."
            className="w-full border border-gray-300 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-green-500" />
        </div>

        <div className="bg-white rounded-2xl shadow-md overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                {['Name', 'Category', 'Barcode', 'Price', 'Stock', 'Unit', 'Actions'].map(h => (
                  <th key={h} className="text-left px-4 py-3 font-semibold text-gray-600">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y">
              {filtered.map(p => (
                <tr key={p.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-800">{p.name}</td>
                  <td className="px-4 py-3 text-gray-500">{p.category}</td>
                  <td className="px-4 py-3 text-gray-400 font-mono text-xs">{p.barcode || '—'}</td>
                  <td className="px-4 py-3 font-semibold text-green-700">Price (₹){p.price.toFixed(2)}</td>
                  <td className={`px-4 py-3 font-medium Price (₹){p.stock < 5 ? 'text-red-600' : 'text-gray-700'}`}>{p.stock}</td>
                  <td className="px-4 py-3 text-gray-500">{p.unit}</td>
                  <td className="px-4 py-3 flex gap-2">
                    <button onClick={() => startEdit(p)} className="text-blue-600 hover:text-blue-800 text-xs font-medium">Edit</button>
                    <button onClick={() => handleDelete(p.id)} className="text-red-500 hover:text-red-700 text-xs font-medium">Delete</button>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={7} className="text-center text-gray-400 py-10">No products found</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  )
}
