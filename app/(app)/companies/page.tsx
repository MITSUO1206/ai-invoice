import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import CompaniesClient from './CompaniesClient'

export default async function CompaniesPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles').select('role, company_id').eq('id', user.id).single()
  if (!profile || profile.role !== 'admin') redirect('/dashboard')

  const { data: companies } = await supabase
    .from('companies')
    .select('id, name, created_at, created_by')
    .order('created_at', { ascending: false })

  return (
    <div className="p-8">
      <CompaniesClient companies={companies ?? []} currentUserId={user.id} />
    </div>
  )
}
