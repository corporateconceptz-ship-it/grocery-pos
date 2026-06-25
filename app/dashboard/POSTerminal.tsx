'use client'
import { useState, useRef, useCallback } from 'react'
import { createClient } from '@/lib/supabase'

type Product = {
  id: string
  name: string
  barcode: string | null
  category: string
  price: number
  stock: number
  unit: string
}

type CartItem = {
  product: Product
  quantity: number
  line_total: number
}

export default function POSTerminal({
  products,
  userId,
  userEmail,
}: {
  products: Product[]
  userId: string
  userEmail: string
}) {
  const supabase = createClient()
  const [cart, setCart] = useState<CartItem[]>([])
  const [search, setSearch] = useState('')
  const [discount, setDiscount] = useState(0)
  const [paymentMethod, setPaymentMethod] = useState('cash')
  const [amountTendered, setAmountTendered] = useState('')
  const [loading, setSaving] = useState(false)
  const [receipt, setReceipt] = useState<{ saleId: string; items: CartItem[]; subtotal: number; discount: number; total: number; change: number; method: string } | null>(null)
  const searchRef = useRef<HTMLInputElement>(null)

  const filtered = products.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    (p.barcode && p.barcode.includes(search))
  )

  const subtotal = cart.reduce((s, i) => s + i.line_total, 0)
  const discountAmt = Math.min(discount, subtotal)
  const total = subtotal - discountAmt
  const change = paymentMethod === 'cash' && amountTendered ? parseFloat(amountTendered) - total : 0

  function addToCart(product: Product) {
    setCart(prev => {
      const existing = prev.find(i => i.product.id === product.id)
      if (existing) {
        return prev.map(i =>
          i.product.id === product.id
            ? { ...i, quantity: i.quantity + 1, line_total: (i.quantity + 1) * i.product.price }
            : i
        )
      }
      return [...prev, { product, quantity: 1, line_total: product.price }]
    })
    setSearch('')
    searchRef.current?.focus()
  }

  function updateQty(id: string, qty: number) {
    if (qty <= 0) {
      setCart(prev => prev.filter(i => i.product.id !== id))
    } else {
      setCart(prev =>
        prev.map(i =>
          i.product.id === id
            ? { ...i, quantity: qty, line_total: qty * i.product.price }
            : i
        )
      )
    }
  }

  function removeFromCart(id: string) {
    setCart(prev => prev.filter(i => i.product.id !== id))
  }

  async function completeSale() {
    if (cart.length === 0) return
    if (paymentMethod === 'cash' && parseFloat(amountTendered || '0') < total) {
      alert('Amount tendered is less than total.')
      return
    }
    setSaving(true)
    try {
      const { data: sale, error: saleErr } = await supabase
        .from('sales')
        .insert({
          cashier_id: userId,
          cashier_email: userEmail,
          subtotal,
          discount: discountAmt,
          total,
          payment_method: paymentMethod,
          amount_tendered: paymentMethod === 'cash' ? parseFloat(amountTendered) : null,
          change_due: paymentMethod === 'cash' ? Math.max(0, change) : null,
        })
        .select()
        .single()

      if (saleErr) throw saleErr

      const items = cart.map(i => ({
        sale_id: sale.id,
        product_id: i.product.id,
        product_name: i.product.name,
        unit_price: i.product.price,
        quantity: i.quantity,
        line_total: i.line_total,
      }))

      const { error: itemsErr } = await supabase.from('sale_items').insert(items)
      if (itemsErr) throw itemsErr

      // Deduct stock
      for (const item of cart) {
        await supabase
          .from('products')
          .update({ stock: Math.max(0, item.product.stock - item.quantity) })
          .eq('id', item.product.id)
      }

      setReceipt({
        saleId: sale.id.slice(0, 8).toUpperCase(),
        items: cart,
        subtotal,
        discount: discountAmt,
        total,
        change: Math.max(0, change),
        method: paymentMethod,
      })
      setCart([])
      setDiscount(0)
      setAmountTendered('')
    } catch (err: any) {
      alert('Error saving sale: ' + err.message)
    } finally {
      setSaving(false)
    }
  }

  function newSale() {
    setReceipt(null)
    searchRef.current?.focus()
  }

  if (receipt) {
    return (
      <div className="max-w-md mx-auto mt-10 p-6 bg-white rounded-2xl shadow-lg text-center">
        <div className="text-4xl mb-2">✅</div>
        <h2 className="text-2xl font-bold text-green-700 mb-1">Sale Complete!</h2>
        <p className="text-gray-500 text-sm mb-6">Receipt #{receipt.saleId}</p>

        <div className="text-left border-t border-b py-4 space-y-1 mb-4">
          {receipt.items.map(i => (
            <div key={i.product.id} className="flex justify-between text-sm">
              <span>{i.product.name} × {i.quantity}</span>
              <span>${i.line_total.toFixed(2)}</span>
            </div>
          ))}
        </div>

        <div className="space-y-1 text-sm mb-4">
          <div className="flex justify-between"><span>Subtotal</span><span>${receipt.subtotal.toFixed(2)}</span></div>
          {receipt.discount > 0 && (
            <div className="flex justify-between text-red-600"><span>Discount</span><span>-${receipt.discount.toFixed(2)}</span></div>
          )}
          <div className="flex justify-between font-bold text-lg border-t pt-2 mt-2">
            <span>Total</span><span>${receipt.total.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-gray-500">
            <span>Payment ({receipt.method})</span>
            <span>{receipt.method === 'cash' ? `$${(receipt.total + receipt.change).toFixed(2)}` : 'Paid'}</span>
          </div>
          {receipt.method === 'cash' && (
            <div className="flex justify-between text-green-700 font-semibold">
              <span>Change</span><span>${receipt.change.toFixed(2)}</span>
            </div>
          )}
        </div>

        <button
          onClick={() => window.print()}
          className="w-full mb-3 border border-gray-300 py-2 rounded-lg text-sm hover:bg-gray-50"
        >
          🖨️ Print Receipt
        </button>
        <button
          onClick={newSale}
          className="w-full bg-green-600 text-white py-3 rounded-lg font-semibold hover:bg-green-700"
        >
          New Sale
        </button>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto p-4 flex gap-4 h-[calc(100vh-56px)]">
      {/* Left: Product Search */}
      <div className="flex-1 flex flex-col gap-3 overflow-hidden">
        <div className="relative">
          <input
            ref={searchRef}
            autoFocus
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by name or scan barcode..."
            className="w-full border border-gray-300 rounded-xl px-4 py-3 text-lg focus:outline-none focus:ring-2 focus:ring-green-500"
          />
        </div>

        <div className="flex-1 overflow-y-auto grid grid-cols-2 sm:grid-cols-3 gap-3 content-start">
          {(search ? filtered : products).map(p => (
            <button
              key={p.id}
              onClick={() => addToCart(p)}
              disabled={p.stock === 0}
              className={`bg-white rounded-xl p-3 text-left shadow-sm border transition hover:border-green-400 hover:shadow-md ${
                p.stock === 0 ? 'opacity-40 cursor-not-allowed' : ''
              }`}
            >
              <div className="text-xs text-gray-400 mb-1">{p.category}</div>
              <div className="font-semibold text-gray-800 text-sm leading-tight">{p.name}</div>
              <div className="mt-2 flex justify-between items-center">
                <span className="text-green-700 font-bold">${p.price.toFixed(2)}</span>
                <span className={`text-xs px-2 py-0.5 rounded-full ${p.stock < 5 ? 'bg-red-100 text-red-600' : 'bg-gray-100 text-gray-500'}`}>
                  {p.stock} {p.unit}
                </span>
              </div>
            </button>
          ))}
          {search && filtered.length === 0 && (
            <div className="col-span-3 text-center text-gray-400 py-10">No products found</div>
          )}
        </div>
      </div>

      {/* Right: Cart */}
      <div className="w-80 flex flex-col bg-white rounded-2xl shadow-md overflow-hidden">
        <div className="bg-green-700 text-white px-4 py-3 font-semibold text-lg">
          🛒 Cart ({cart.length} items)
        </div>

        <div className="flex-1 overflow-y-auto divide-y">
          {cart.length === 0 ? (
            <div className="text-center text-gray-400 py-10">Cart is empty</div>
          ) : (
            cart.map(item => (
              <div key={item.product.id} className="px-4 py-3">
                <div className="flex justify-between items-start">
                  <div className="text-sm font-medium text-gray-800 leading-tight flex-1 pr-2">{item.product.name}</div>
                  <button
                    onClick={() => removeFromCart(item.product.id)}
                    className="text-red-400 hover:text-red-600 text-xs"
                  >✕</button>
                </div>
                <div className="flex items-center justify-between mt-2">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => updateQty(item.product.id, item.quantity - 1)}
                      className="w-6 h-6 rounded-full bg-gray-100 hover:bg-gray-200 text-sm font-bold flex items-center justify-center"
                    >−</button>
                    <span className="text-sm w-6 text-center">{item.quantity}</span>
                    <button
                      onClick={() => updateQty(item.product.id, item.quantity + 1)}
                      className="w-6 h-6 rounded-full bg-gray-100 hover:bg-gray-200 text-sm font-bold flex items-center justify-center"
                    >+</button>
                  </div>
                  <span className="font-semibold text-green-700">${item.line_total.toFixed(2)}</span>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Totals & Checkout */}
        <div className="border-t p-4 space-y-3">
          <div className="flex justify-between text-sm text-gray-600">
            <span>Subtotal</span><span>${subtotal.toFixed(2)}</span>
          </div>
          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-600 w-20">Discount</label>
            <div className="relative flex-1">
              <span className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400">$</span>
              <input
                type="number"
                min="0"
                step="0.01"
                value={discount}
                onChange={e => setDiscount(parseFloat(e.target.value) || 0)}
                className="w-full border rounded-lg pl-6 pr-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-green-500"
              />
            </div>
          </div>
          <div className="flex justify-between font-bold text-lg border-t pt-2">
            <span>Total</span><span className="text-green-700">${total.toFixed(2)}</span>
          </div>

          <select
            value={paymentMethod}
            onChange={e => setPaymentMethod(e.target.value)}
            className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none"
          >
            <option value="cash">💵 Cash</option>
            <option value="card">💳 Card</option>
            <option value="mobile">📱 Mobile Payment</option>
          </select>

          {paymentMethod === 'cash' && (
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">$</span>
              <input
                type="number"
                min={total}
                step="0.01"
                value={amountTendered}
                onChange={e => setAmountTendered(e.target.value)}
                placeholder={`Min ${total.toFixed(2)}`}
                className="w-full border rounded-lg pl-7 pr-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-green-500"
              />
            </div>
          )}

          {paymentMethod === 'cash' && amountTendered && change >= 0 && (
            <div className="flex justify-between text-sm bg-green-50 rounded-lg p-2">
              <span className="text-green-700 font-medium">Change Due</span>
              <span className="text-green-700 font-bold">${change.toFixed(2)}</span>
            </div>
          )}

          <button
            onClick={completeSale}
            disabled={cart.length === 0 || loading}
            className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-300 text-white font-bold py-3 rounded-xl transition text-lg"
          >
            {loading ? 'Processing...' : '✓ Complete Sale'}
          </button>

          {cart.length > 0 && (
            <button
              onClick={() => setCart([])}
              className="w-full text-red-500 hover:text-red-700 text-sm py-1"
            >
              Clear Cart
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
