import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import TemplatesClient from './TemplatesClient'
import type { InvoiceTemplate } from '@/lib/types'

export default async function TemplatesPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: templates } = await supabase
    .from('invoice_templates')
    .select('*')
    .order('created_at', { ascending: false })

  return (
    <div className="p-8">
      <TemplatesClient templates={(templates as InvoiceTemplate[]) ?? []} />
    </div>
  )
}
