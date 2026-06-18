import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import EmployeesClient from './EmployeesClient'
import type { Profile } from '@/lib/types'

export default async function EmployeesPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: myProfile } = await supabase
    .from('profiles').select('company_id, role').eq('id', user.id).single()
  if (!myProfile || myProfile.role !== 'admin') redirect('/dashboard')

  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://ai-invoice-ashen.vercel.app'

  const [{ data: profiles }, { data: invitations }] = await Promise.all([
    supabase.from('profiles').select('*')
      .eq('company_id', myProfile.company_id).order('created_at', { ascending: true }),
    supabase.from('invitations').select('*')
      .eq('company_id', myProfile.company_id)
      .is('used_at', null)
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false }),
  ])

  return (
    <div className="p-8">
      <EmployeesClient
        profiles={(profiles as Profile[]) ?? []}
        currentUserId={user.id}
        invitations={invitations ?? []}
        baseUrl={baseUrl}
      />
    </div>
  )
}
