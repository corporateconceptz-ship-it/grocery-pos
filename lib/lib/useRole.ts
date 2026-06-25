'use client'
import { useState, useEffect } from 'react'
import { createClient } from './supabase'

export type Role = 'manager' | 'cashier'

export function useRole() {
  const [role, setRole] = useState<Role>('manager')
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const supabase = createClient()
    async function fetchRole() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user?.email) { setLoading(false); return }
      setEmail(user.email)
      const { data } = await supabase.from('user_roles').select('role').eq('email', user.email).maybeSingle()
      setRole((data?.role as Role) ?? 'manager')
      setLoading(false)
    }
    fetchRole()
  }, [])

  return { role, email, loading }
}
