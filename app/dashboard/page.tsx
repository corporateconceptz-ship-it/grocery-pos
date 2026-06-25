import { createServerSupabaseClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import Navbar from '@/components/Navbar'
import POSTerminal from './POSTerminal'

export default async function DashboardPage() {
  const supabase = createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: products } = await supabase
    .from('products')
    .select('*')
    .order('name')

  return (
    <>
      <Navbar email={user.email ?? ''} />
      <POSTerminal products={products ?? []} userId={user.id} userEmail={user.email ?? ''} />
    </>
  )
}
