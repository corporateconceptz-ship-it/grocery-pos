'use client'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'

const links = [
  { href: '/dashboard', label: '🏪 POS', },
  { href: '/products', label: '📦 Products' },
  { href: '/history', label: '📋 Sales History' },
]

export default function Navbar({ email }: { email: string }) {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <nav className="bg-green-700 text-white shadow-md">
      <div className="max-w-7xl mx-auto px-4 flex items-center justify-between h-14">
        <div className="flex items-center gap-1">
          <span className="font-bold text-lg mr-4">🛒 Grocery POS</span>
          {links.map(l => (
            <Link
              key={l.href}
              href={l.href}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition ${
                pathname === l.href ? 'bg-green-900' : 'hover:bg-green-600'
              }`}
            >
              {l.label}
            </Link>
          ))}
        </div>
        <div className="flex items-center gap-3 text-sm">
          <span className="text-green-200">{email}</span>
          <button
            onClick={handleLogout}
            className="bg-green-800 hover:bg-green-900 px-3 py-1.5 rounded-md transition"
          >
            Sign Out
          </button>
        </div>
      </div>
    </nav>
  )
}
