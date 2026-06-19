import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import type { Invoice } from '@/lib/types'
import InvoicesClient from './InvoicesClient'

type Props = {
  searchParams: Promise<{ status?: string; excelTemplate?: string }>
}

export default async function InvoicesPage({ searchParams }: Props) {
  const { status = 'all', excelTemplate } = await searchParams
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  let query = supabase
    .from('invoices')
    .select('*')
    .order('created_at', { ascending: false })

  if (status !== 'all') {
    query = query.eq('status', status)
  }

  const { data: invoices } = await query

  let excelTemplateName: string | undefined
  if (excelTemplate) {
    const { data: tmpl } = await supabase
      .from('excel_templates')
      .select('name')
      .eq('id', excelTemplate)
      .single()
    excelTemplateName = tmpl?.name
  }

  return (
    <InvoicesClient
      invoices={(invoices as Invoice[]) ?? []}
      status={status}
      excelTemplateId={excelTemplate}
      excelTemplateName={excelTemplateName}
    />
  )
}
