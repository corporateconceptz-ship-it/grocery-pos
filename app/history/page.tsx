'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import Navbar from '@/components/Navbar'

type SaleItem = {
  id: string
  product_name: string
  quantity: number
  unit_price: number
  line_total: number
}

type Sale = {
  id: string
  cashier_email: string
  subtotal: number
  discount: number
  total: number
  payment_method: string
  amount_tendered: number | null
  change_due: number | null
  created_at: string
  sale_items: SaleItem[]
}

export default function HistoryPage() {
  const supabase = createClient()
  const [sales, setSales] = useState<Sale[]>([])
  const [userEmail, setUserEmail] = useState('')
  const [selected, setSelected] = useState<Sale | null>(null)
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUserEmail(data.user?.email ?? ''))
    fetchSales()
  }, [])

  async function fetchSales() {
    setLoading(true)
    let q = supabase
      .from('sales')
      .select('*, sale_items(*)')
      .order('created_at', { ascending: false })
      .limit(200)

    if (dateFrom) q = q.gte('created_at', dateFrom)
    if (dateTo) q = q.lte('created_at', dateTo + 'T23:59:59')

    const { data } = await q
    setSales(data ?? [])
    setLoading(false)
  }

  const todaySales = sales.filter(s => s.created_at.startsWith(new Date().toISOString().slice(0, 10)))
  const todayTotal = todaySales.reduce((sum, s) => sum + s.total, 0)

  function printReceipt() {
    window.print()
  }

  return (
    <>
      <Navbar email={userEmail} />
      <div className="max-w-6xl mx-auto p-6 print:hidden">
        <h1 className="text-2xl font-bold text-gray-800 mb-6">📋 Sales History</h1>

        {/* Summary cards */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="bg-white rounded-xl shadow p-4 text-center">
            <div className="text-3xl font-bold text-green-700">${todayTotal.toFixed(2)}</div>
            <div className="text-sm text-gray-500 mt-1">Today's Revenue</div>
          </div>
          <div className="bg-white rounded-xl shadow p-4 text-center">
            <div className="text-3xl font-bold text-blue-600">{todaySales.length}</div>
            <div className="text-sm text-gray-500 mt-1">Today's Transactions</div>
          </div>
          <div className="bg-white rounded-xl shadow p-4 text-center">
            <div className="text-3xl font-bold text-purple-600">
              {todaySales.length > 0 ? '$' + (todayTotal / todaySales.length).toFixed(2) : '$0.00'}
            </div>
            <div className="text-sm text-gray-500 mt-1">Avg. Transaction</div>
          </div>
        </div>

        {/* Filters */}
        <div className="flex gap-4 mb-4 items-end">
          <div>
            <label className="block text-sm text-gray-600 mb-1">From</label>
            <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
              className="border rounded-lg px-3 py-2 text-sm focus:outline-none" />
          </div>
          <div>
            <label className="block text-sm text-gray-600 mb-1">To</label>
            <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
              className="border rounded-lg px-3 py-2 text-sm focus:outline-none" />
          </div>
          <button onClick={fetchSales} className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-green-700">
            Filter
          </button>
          <button onClick={() => { setDateFrom(''); setDateTo(''); }} className="border px-4 py-2 rounded-lg text-sm hover:bg-gray-50">
            Clear
          </button>
        </div>

        <div className="flex gap-4">
          {/* Sales list */}
          <div className="flex-1 bg-white rounded-2xl shadow-md overflow-hidden">
            {loading ? (
              <div className="text-center text-gray-400 py-10">Loading...</div>
            ) : (
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    {['Date & Time', 'Cashier', 'Items', 'Total', 'Payment', ''].map(h => (
                      <th key={h} className="text-left px-4 py-3 font-semibold text-gray-600">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {sales.map(s => (
                    <tr
                      key={s.id}
                      className={`hover:bg-green-50 cursor-pointer ${selected?.id === s.id ? 'bg-green-50' : ''}`}
                      onClick={() => setSelected(s)}
                    >
                      <td className="px-4 py-3 text-gray-600">
                        {new Date(s.created_at).toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-gray-500 text-xs">{s.cashier_email}</td>
                      <td className="px-4 py-3">{s.sale_items?.length ?? 0} items</td>
                      <td className="px-4 py-3 font-bold text-green-700">${s.total.toFixed(2)}</td>
                      <td className="px-4 py-3">
                        <span className={`text-xs px-2 py-1 rounded-full ${
                          s.payment_method === 'cash' ? 'bg-green-100 text-green-700' :
                          s.payment_method === 'card' ? 'bg-blue-100 text-blue-700' :
                          'bg-purple-100 text-purple-700'
                        }`}>{s.payment_method}</span>
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={e => { e.stopPropagation(); setSelected(s) }}
                          className="text-blue-500 hover:text-blue-700 text-xs"
                        >View</button>
                      </td>
                    </tr>
                  ))}
                  {sales.length === 0 && (
                    <tr><td colSpan={6} className="text-center text-gray-400 py-10">No sales found</td></tr>
                  )}
                </tbody>
              </table>
            )}
          </div>

          {/* Receipt panel */}
          {selected && (
            <div className="w-72 bg-white rounded-2xl shadow-md p-5 flex-shrink-0">
              <div className="flex justify-between items-center mb-3">
                <h3 className="font-semibold">Receipt</h3>
                <button onClick={() => setSelected(null)} className="text-gray-400 hover:text-gray-600">✕</button>
              </div>
              <div className="text-xs text-gray-400 mb-1">#{selected.id.slice(0, 8).toUpperCase()}</div>
              <div className="text-xs text-gray-500 mb-3">{new Date(selected.created_at).toLocaleString()}</div>
              <div className="text-xs text-gray-500 mb-4">Cashier: {selected.cashier_email}</div>

              <div className="border-t border-b py-3 space-y-2 mb-3">
                {(selected.sale_items ?? []).map(item => (
                  <div key={item.id} className="flex justify-between text-xs">
                    <span>{item.product_name} × {item.quantity}</span>
                    <span>${item.line_total.toFixed(2)}</span>
                  </div>
                ))}
              </div>

              <div className="space-y-1 text-sm mb-4">
                <div className="flex justify-between text-gray-600"><span>Subtotal</span><span>${selected.subtotal.toFixed(2)}</span></div>
                {selected.discount > 0 && (
                  <div className="flex justify-between text-red-600"><span>Discount</span><span>-${selected.discount.toFixed(2)}</span></div>
                )}
                <div className="flex justify-between font-bold border-t pt-2"><span>Total</span><span>${selected.total.toFixed(2)}</span></div>
                {selected.change_due != null && (
                  <div className="flex justify-between text-green-600 text-xs"><span>Change</span><span>${selected.change_due.toFixed(2)}</span></div>
                )}
              </div>

              <button onClick={printReceipt}
                className="w-full border border-gray-300 py-2 rounded-lg text-sm hover:bg-gray-50">
                🖨️ Print
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Print-only receipt */}
      {selected && (
        <div className="hidden print:block p-8 max-w-xs mx-auto font-mono text-sm">
          <div className="text-center mb-4">
            <div className="text-xl font-bold">🛒 Grocery POS</div>
            <div className="text-xs text-gray-500">{new Date(selected.created_at).toLocaleString()}</div>
            <div className="text-xs text-gray-500">Receipt #{selected.id.slice(0, 8).toUpperCase()}</div>
          </div>
          <div className="border-t border-b border-dashed py-3 mb-3 space-y-1">
            {(selected.sale_items ?? []).map(item => (
              <div key={item.id} className="flex justify-between">
                <span>{item.product_name}</span>
                <span>${item.line_total.toFixed(2)}</span>
              </div>
            ))}
          </div>
          <div className="space-y-1">
            <div className="flex justify-between"><span>Subtotal</span><span>${selected.subtotal.toFixed(2)}</span></div>
            {selected.discount > 0 && <div className="flex justify-between"><span>Discount</span><span>-${selected.discount.toFixed(2)}</span></div>}
            <div className="flex justify-between font-bold border-t pt-1"><span>TOTAL</span><span>${selected.total.toFixed(2)}</span></div>
            <div className="flex justify-between"><span>Payment</span><span>{selected.payment_method}</span></div>
            {selected.change_due != null && <div className="flex justify-between"><span>Change</span><span>${selected.change_due.toFixed(2)}</span></div>}
          </div>
          <div className="text-center mt-6 text-xs text-gray-400">Thank you for shopping with us!</div>
        </div>
      )}
    </>
  )
}
