'use client'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { useRole } from '@/lib/useRole'

export default function Navbar({ email }: { email: string }) {
  const pathname = usePathname()
  const router = useRouter()
  const { role } = useRole()

  const allLinks = [
    { href: '/dashboard', label: '🏪 POS', managerOnly: false },
    { href: '/products', label: '📦 Products', managerOnly: true },
    { href: '/inventory', label: '🏷️ Inventory', managerOnly: true },
    { href: '/history', label: '📋 Sales History', managerOnly: true },
    { href: '/reports', label: '📊 Reports', managerOnly: true },
  ]
  const links = allLinks.filter(l => !l.managerOnly || role === 'manager')

  async function signOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <nav className="bg-green-700 text-white px-4 py-2 flex items-center gap-1 flex-wrap">
      <span className="font-bold text-lg mr-4">🛒 Grocery POS</span>
      {links.map(l => (
        <Link key={l.href} href={l.href}
          className={`px-3 py-1.5 rounded text-sm font-medium transition ${pathname === l.href ? 'bg-green-900' : 'hover:bg-green-600'}`}>
          {l.label}
        </Link>
      ))}
      <div className="ml-auto flex items-center gap-3">
        <span className="text-green-200 text-xs hidden sm:block">{email}</span>
        {role === 'manager' && <span className="text-xs bg-yellow-400 text-yellow-900 px-2 py-0.5 rounded-full font-bold">Manager</span>}
        {role === 'cashier' && <span className="text-xs bg-blue-300 text-blue-900 px-2 py-0.5 rounded-full font-bold">Cashier</span>}
        <button onClick={signOut} className="text-xs bg-green-900 hover:bg-green-800 px-3 py-1.5 rounded">Sign Out</button>
      </div>
    </nav>
  )
}
