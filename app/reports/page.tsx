'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import Navbar from '@/components/Navbar'
import { useRole } from '@/lib/useRole'
import { useRouter } from 'next/navigation'

type Sale = {
  id: string; cashier_email: string; subtotal: number; discount: number
  total: number; payment_method: string; created_at: string
  sale_items: { product_name: string; quantity: number; unit_price: number; line_total: number }[]
}

export default function ReportsPage() {
  const supabase = createClient()
  const router = useRouter()
  const { role, email, loading: roleLoading } = useRole()
  const [sales, setSales] = useState<Sale[]>([])
  const [dateFrom, setDateFrom] = useState(() => {
    const d = new Date(); d.setDate(1); return d.toISOString().slice(0, 10)
  })
  const [dateTo, setDateTo] = useState(() => new Date().toISOString().slice(0, 10))
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!roleLoading && role === 'cashier') router.push('/dashboard')
  }, [role, roleLoading])

  useEffect(() => { fetchSales() }, [])

  async function fetchSales() {
    setLoading(true)
    let q = supabase.from('sales').select('*, sale_items(*)').order('created_at', { ascending: false })
    if (dateFrom) q = q.gte('created_at', dateFrom)
    if (dateTo) q = q.lte('created_at', dateTo + 'T23:59:59')
    const { data } = await q
    setSales(data ?? [])
    setLoading(false)
  }

  const totalRevenue = sales.reduce((s, x) => s + x.total, 0)
  const totalDiscount = sales.reduce((s, x) => s + x.discount, 0)
  const avgTransaction = sales.length > 0 ? totalRevenue / sales.length : 0

  const paymentBreakdown = sales.reduce((acc, s) => {
    acc[s.payment_method] = (acc[s.payment_method] || 0) + s.total
    return acc
  }, {} as Record<string, number>)

  const productMap: Record<string, { qty: number; revenue: number }> = {}
  sales.forEach(s => s.sale_items?.forEach(item => {
    if (!productMap[item.product_name]) productMap[item.product_name] = { qty: 0, revenue: 0 }
    productMap[item.product_name].qty += item.quantity
    productMap[item.product_name].revenue += item.line_total
  }))
  const topProducts = Object.entries(productMap).sort((a, b) => b[1].revenue - a[1].revenue).slice(0, 10)

  const cashierMap: Record<string, { count: number; revenue: number }> = {}
  sales.forEach(s => {
    if (!cashierMap[s.cashier_email]) cashierMap[s.cashier_email] = { count: 0, revenue: 0 }
    cashierMap[s.cashier_email].count++
    cashierMap[s.cashier_email].revenue += s.total
  })

  function exportCSV() {
    const rows = [
      ['Date', 'Sale ID', 'Cashier', 'Items', 'Subtotal', 'Discount', 'Total', 'Payment'],
      ...sales.map(s => [
        new Date(s.created_at).toLocaleString(), s.id.slice(0, 8).toUpperCase(),
        s.cashier_email, s.sale_items?.length ?? 0,
        s.subtotal.toFixed(2), s.discount.toFixed(2), s.total.toFixed(2), s.payment_method,
      ])
    ]
    const csv = rows.map(r => r.join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = `sales-${dateFrom}-to-${dateTo}.csv`; a.click()
    URL.revokeObjectURL(url)
  }

  if (roleLoading) return null

  return (
    <>
      <Navbar email={email} />
      <div className="max-w-6xl mx-auto p-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-gray-800">📊 Sales Reports</h1>
          <button onClick={exportCSV} className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-medium">
            ⬇️ Export CSV
          </button>
        </div>

        {/* Date Filter */}
        <div className="flex gap-3 mb-6 items-end bg-white p-4 rounded-xl shadow-sm flex-wrap">
          <div>
            <label className="block text-sm text-gray-600 mb-1">From</label>
            <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="border rounded-lg px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="block text-sm text-gray-600 mb-1">To</label>
            <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="border rounded-lg px-3 py-2 text-sm" />
          </div>
          <button onClick={fetchSales} className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-green-700">Apply</button>
          <button onClick={() => { const n = new Date(); setDateFrom(new Date(n.getFullYear(), n.getMonth(), 1).toISOString().slice(0,10)); setDateTo(n.toISOString().slice(0,10)) }}
            className="border px-4 py-2 rounded-lg text-sm hover:bg-gray-50">This Month</button>
          <button onClick={() => { const t = new Date().toISOString().slice(0,10); setDateFrom(t); setDateTo(t) }}
            className="border px-4 py-2 rounded-lg text-sm hover:bg-gray-50">Today</button>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
          {[
            { label: 'Total Revenue', value: `₹${totalRevenue.toFixed(2)}`, color: 'text-green-700' },
            { label: 'Total Sales', value: sales.length, color: 'text-blue-600' },
            { label: 'Avg Transaction', value: `₹${avgTransaction.toFixed(2)}`, color: 'text-purple-600' },
            { label: 'Total Discounts', value: `₹${totalDiscount.toFixed(2)}`, color: 'text-red-500' },
          ].map(c => (
            <div key={c.label} className="bg-white rounded-xl shadow p-4 text-center">
              <div className={`text-2xl font-bold ${c.color}`}>{c.value}</div>
              <div className="text-sm text-gray-500 mt-1">{c.label}</div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {/* Top Products */}
          <div className="bg-white rounded-2xl shadow-md overflow-hidden">
            <div className="px-5 py-3 border-b font-semibold text-gray-700">🏆 Top Products by Revenue</div>
            {loading ? <div className="text-center text-gray-400 py-10">Loading...</div> : (
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="text-left px-4 py-2 text-gray-600">Product</th>
                    <th className="text-right px-4 py-2 text-gray-600">Qty</th>
                    <th className="text-right px-4 py-2 text-gray-600">Revenue</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {topProducts.map(([name, stats], i) => (
                    <tr key={name} className="hover:bg-gray-50">
                      <td className="px-4 py-2 text-gray-800"><span className="text-xs text-gray-400 mr-1">#{i+1}</span>{name}</td>
                      <td className="px-4 py-2 text-right text-gray-600">{stats.qty}</td>
                      <td className="px-4 py-2 text-right font-semibold text-green-700">₹{stats.revenue.toFixed(2)}</td>
                    </tr>
                  ))}
                  {topProducts.length === 0 && <tr><td colSpan={3} className="text-center text-gray-400 py-8">No data</td></tr>}
                </tbody>
              </table>
            )}
          </div>

          <div className="space-y-6">
            {/* Payment Breakdown */}
            <div className="bg-white rounded-2xl shadow-md p-5">
              <div className="font-semibold text-gray-700 mb-4">💳 Revenue by Payment Method</div>
              {Object.entries(paymentBreakdown).length === 0 ? (
                <div className="text-gray-400 text-center py-4">No data</div>
              ) : Object.entries(paymentBreakdown).sort((a, b) => b[1] - a[1]).map(([method, amount]) => (
                <div key={method} className="mb-3">
                  <div className="flex justify-between text-sm mb-1">
                    <span className="capitalize font-medium text-gray-700">{method}</span>
                    <span className="font-bold text-green-700">₹{amount.toFixed(2)}</span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-2">
                    <div className="bg-green-500 h-2 rounded-full" style={{ width: `${totalRevenue > 0 ? (amount / totalRevenue) * 100 : 0}%` }} />
                  </div>
                  <div className="text-xs text-gray-400 mt-0.5">{totalRevenue > 0 ? ((amount / totalRevenue) * 100).toFixed(1) : 0}% of total</div>
                </div>
              ))}
            </div>

            {/* Cashier Performance */}
            <div className="bg-white rounded-2xl shadow-md p-5">
              <div className="font-semibold text-gray-700 mb-3">👤 Cashier Performance</div>
              {Object.entries(cashierMap).sort((a, b) => b[1].revenue - a[1].revenue).map(([e, stats]) => (
                <div key={e} className="flex justify-between text-sm py-2 border-b last:border-0">
                  <span className="text-gray-600 truncate max-w-[150px]">{e}</span>
                  <div className="flex gap-3">
                    <span className="text-gray-400">{stats.count} sales</span>
                    <span className="font-semibold text-green-700">₹{stats.revenue.toFixed(2)}</span>
                  </div>
                </div>
              ))}
              {Object.keys(cashierMap).length === 0 && <div className="text-gray-400 text-center py-4">No data</div>}
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
