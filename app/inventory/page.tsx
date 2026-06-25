'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import Navbar from '@/components/Navbar'

type Product = { id: string; name: string; category: string; stock: number; unit: string; price: number }
type Movement = { id: string; product_name: string; type: string; quantity_change: number; stock_before: number; stock_after: number; notes: string; created_by: string; created_at: string }

const LOW_STOCK_THRESHOLD = 5

export default function InventoryPage() {
  const supabase = createClient()
  const [tab, setTab] = useState<'alerts' | 'restock' | 'adjust' | 'log'>('alerts')
  const [products, setProducts] = useState<Product[]>([])
  const [movements, setMovements] = useState<Movement[]>([])
  const [userEmail, setUserEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState('')

  const [restockProduct, setRestockProduct] = useState('')
  const [restockQty, setRestockQty] = useState('')
  const [restockNotes, setRestockNotes] = useState('')

  const [adjustProduct, setAdjustProduct] = useState('')
  const [adjustQty, setAdjustQty] = useState('')
  const [adjustType, setAdjustType] = useState('+')
  const [adjustNotes, setAdjustNotes] = useState('')

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUserEmail(data.user?.email ?? ''))
    fetchAll()
  }, [])

  async function fetchAll() {
    const [{ data: prods }, { data: movs }] = await Promise.all([
      supabase.from('products').select('*').order('name'),
      supabase.from('stock_movements').select('*').order('created_at', { ascending: false }).limit(200),
    ])
    setProducts(prods ?? [])
    setMovements(movs ?? [])
  }

  const lowStock = products.filter(p => p.stock <= LOW_STOCK_THRESHOLD)

  async function handleRestock(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setSuccess('')
    const product = products.find(p => p.id === restockProduct)
    if (!product) return
    const qty = parseFloat(restockQty)
    const newStock = product.stock + qty
    try {
      await supabase.from('products').update({ stock: newStock }).eq('id', product.id)
      await supabase.from('stock_movements').insert({
        product_id: product.id,
        product_name: product.name,
        type: 'restock',
        quantity_change: qty,
        stock_before: product.stock,
        stock_after: newStock,
        notes: restockNotes || null,
        created_by: userEmail,
      })
      setSuccess(`✓ Added ${qty} ${product.unit} to ${product.name}. New stock: ${newStock}`)
      setRestockProduct('')
      setRestockQty('')
      setRestockNotes('')
      fetchAll()
    } catch (err: any) { setSuccess('Error: ' + err.message) }
    finally { setLoading(false) }
  }

  async function handleAdjust(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setSuccess('')
    const product = products.find(p => p.id === adjustProduct)
    if (!product) return
    const qty = parseFloat(adjustQty)
    const change = adjustType === '+' ? qty : -qty
    const newStock = Math.max(0, product.stock + change)
    try {
      await supabase.from('products').update({ stock: newStock }).eq('id', product.id)
      await supabase.from('stock_movements').insert({
        product_id: product.id,
        product_name: product.name,
        type: 'adjustment',
        quantity_change: change,
        stock_before: product.stock,
        stock_after: newStock,
        notes: adjustNotes || null,
        created_by: userEmail,
      })
      setSuccess(`✓ Adjusted ${product.name}. New stock: ${newStock}`)
      setAdjustProduct('')
      setAdjustQty('')
      setAdjustNotes('')
      fetchAll()
    } catch (err: any) { setSuccess('Error: ' + err.message) }
    finally { setLoading(false) }
  }

  const tabs = [
    { key: 'alerts', label: `🚨 Low Stock (${lowStock.length})` },
    { key: 'restock', label: '📦 Restock' },
    { key: 'adjust', label: '✏️ Adjust Stock' },
    { key: 'log', label: '📋 Movement Log' },
  ]

  return (
    <>
      <Navbar email={userEmail} />
      <div className="max-w-5xl mx-auto p-6">
        <h1 className="text-2xl font-bold text-gray-800 mb-6">🏪 Inventory Management</h1>

        <div className="flex gap-2 mb-6 border-b">
          {tabs.map(t => (
            <button key={t.key} onClick={() => { setTab(t.key as any); setSuccess('') }}
              className={`px-4 py-2 text-sm font-medium rounded-t-lg transition ${
                tab === t.key ? 'bg-green-600 text-white' : 'text-gray-600 hover:bg-gray-100'
              }`}>
              {t.label}
            </button>
          ))}
        </div>

        {success && (
          <div className={`mb-4 px-4 py-3 rounded-lg text-sm font-medium ${success.startsWith('Error') ? 'bg-red-50 text-red-700 border border-red-200' : 'bg-green-50 text-green-700 border border-green-200'}`}>
            {success}
          </div>
        )}

        {tab === 'alerts' && (
          <div className="bg-white rounded-2xl shadow-md overflow-hidden">
            {lowStock.length === 0 ? (
              <div className="text-center text-gray-400 py-16">
                <div className="text-4xl mb-3">✅</div>
                <div className="font-medium">All products are well stocked</div>
              </div>
            ) : (
              <>
                <div className="bg-red-50 border-b border-red-100 px-6 py-3">
                  <p className="text-red-700 text-sm font-medium">{lowStock.length} product(s) are low on stock (≤ {LOW_STOCK_THRESHOLD} units)</p>
                </div>
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      {['Product', 'Category', 'Current Stock', 'Unit', 'Action'].map(h => (
                        <th key={h} className="text-left px-4 py-3 font-semibold text-gray-600">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {lowStock.map(p => (
                      <tr key={p.id} className="hover:bg-red-50">
                        <td className="px-4 py-3 font-medium text-gray-800">{p.name}</td>
                        <td className="px-4 py-3 text-gray-500">{p.category}</td>
                        <td className="px-4 py-3">
                          <span className={`font-bold px-2 py-1 rounded-full text-xs ${p.stock === 0 ? 'bg-red-200 text-red-800' : 'bg-orange-100 text-orange-700'}`}>
                            {p.stock} {p.stock === 0 ? '(Out of Stock)' : ''}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-gray-500">{p.unit}</td>
                        <td className="px-4 py-3">
                          <button onClick={() => { setRestockProduct(p.id); setTab('restock') }}
                            className="text-xs bg-green-600 text-white px-3 py-1 rounded-lg hover:bg-green-700">
                            Restock
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </>
            )}
          </div>
        )}

        {tab === 'restock' && (
          <div className="bg-white rounded-2xl shadow-md p-6 max-w-lg">
            <h2 className="text-lg font-semibold mb-4 text-gray-800">Add Stock (Restock)</h2>
            <form onSubmit={handleRestock} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Product *</label>
                <select required value={restockProduct} onChange={e => setRestockProduct(e.target.value)}
                  className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500">
                  <option value="">Select a product...</option>
                  {products.map(p => (
                    <option key={p.id} value={p.id}>{p.name} (current: {p.stock} {p.unit})</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Quantity to Add *</label>
                <input required type="number" min="0.01" step="0.01" value={restockQty}
                  onChange={e => setRestockQty(e.target.value)}
                  placeholder="e.g. 50"
                  className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes (optional)</label>
                <input type="text" value={restockNotes} onChange={e => setRestockNotes(e.target.value)}
                  placeholder="e.g. Supplier delivery, Invoice #1234"
                  className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500" />
              </div>
              {restockProduct && restockQty && (
                <div className="bg-green-50 border border-green-200 rounded-lg px-4 py-3 text-sm text-green-700">
                  New stock will be: <strong>{(products.find(p => p.id === restockProduct)?.stock ?? 0) + parseFloat(restockQty || '0')}</strong> {products.find(p => p.id === restockProduct)?.unit}
                </div>
              )}
              <button type="submit" disabled={loading}
                className="w-full bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white font-semibold py-3 rounded-xl">
                {loading ? 'Saving...' : '+ Add Stock'}
              </button>
            </form>
          </div>
        )}

        {tab === 'adjust' && (
          <div className="bg-white rounded-2xl shadow-md p-6 max-w-lg">
            <h2 className="text-lg font-semibold mb-1 text-gray-800">Manual Stock Adjustment</h2>
            <p className="text-sm text-gray-500 mb-4">Use this for damaged, expired, or miscounted stock.</p>
            <form onSubmit={handleAdjust} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Product *</label>
                <select required value={adjustProduct} onChange={e => setAdjustProduct(e.target.value)}
                  className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500">
                  <option value="">Select a product...</option>
                  {products.map(p => (
                    <option key={p.id} value={p.id}>{p.name} (current: {p.stock} {p.unit})</option>
                  ))}
                </select>
              </div>
              <div className="flex gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Type *</label>
                  <select value={adjustType} onChange={e => setAdjustType(e.target.value)}
                    className="border rounded-lg px-3 py-2 focus:outline-none">
                    <option value="+">+ Add</option>
                    <option value="-">− Remove</option>
                  </select>
                </div>
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Quantity *</label>
                  <input required type="number" min="0.01" step="0.01" value={adjustQty}
                    onChange={e => setAdjustQty(e.target.value)}
                    placeholder="e.g. 5"
                    className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Reason *</label>
                <input required type="text" value={adjustNotes} onChange={e => setAdjustNotes(e.target.value)}
                  placeholder="e.g. Damaged, Expired, Stock count correction"
                  className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500" />
              </div>
              {adjustProduct && adjustQty && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-3 text-sm text-blue-700">
                  New stock will be: <strong>{Math.max(0, (products.find(p => p.id === adjustProduct)?.stock ?? 0) + (adjustType === '+' ? 1 : -1) * parseFloat(adjustQty || '0'))}</strong> {products.find(p => p.id === adjustProduct)?.unit}
                </div>
              )}
              <button type="submit" disabled={loading}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-semibold py-3 rounded-xl">
                {loading ? 'Saving...' : 'Apply Adjustment'}
              </button>
            </form>
          </div>
        )}

        {tab === 'log' && (
          <div className="bg-white rounded-2xl shadow-md overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  {['Date & Time', 'Product', 'Type', 'Change', 'Before', 'After', 'Notes', 'By'].map(h => (
                    <th key={h} className="text-left px-4 py-3 font-semibold text-gray-600">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y">
                {movements.map(m => (
                  <tr key={m.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-gray-500 text-xs">{new Date(m.created_at).toLocaleString()}</td>
                    <td className="px-4 py-3 font-medium text-gray-800">{m.product_name}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                        m.type === 'sale' ? 'bg-blue-100 text-blue-700' :
                        m.type === 'restock' ? 'bg-green-100 text-green-700' :
                        'bg-orange-100 text-orange-700'
                      }`}>{m.type}</span>
                    </td>
                    <td className={`px-4 py-3 font-semibold ${m.quantity_change > 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {m.quantity_change > 0 ? '+' : ''}{m.quantity_change}
                    </td>
                    <td className="px-4 py-3 text-gray-500">{m.stock_before ?? '—'}</td>
                    <td className="px-4 py-3 text-gray-700 font-medium">{m.stock_after ?? '—'}</td>
                    <td className="px-4 py-3 text-gray-400 text-xs">{m.notes || '—'}</td>
                    <td className="px-4 py-3 text-gray-400 text-xs">{m.created_by || '—'}</td>
                  </tr>
                ))}
                {movements.length === 0 && (
                  <tr><td colSpan={8} className="text-center text-gray-400 py-10">No stock movements recorded yet</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  )
}
