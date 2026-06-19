import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import InvoiceForm from '../InvoiceForm'
import type { InvoiceTemplate, Company } from '@/lib/types'

type Props = { searchParams: Promise<{ template?: string }> }

export default async function NewInvoicePage({ searchParams }: Props) {
  const { template: initialTemplateId } = await searchParams
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('company_id')
    .eq('id', user.id)
    .single()

  const [{ data: templates }, { data: company }] = await Promise.all([
    supabase
      .from('invoice_templates')
      .select('*')
      .order('created_at', { ascending: false }),
    profile
      ? supabase.from('companies').select('*').eq('id', profile.company_id).single()
      : { data: null },
  ])

  const comp = company as Company | null

  return (
    <div className="p-8 max-w-4xl">
      <InvoiceForm
        templates={(templates as InvoiceTemplate[]) ?? []}
        defaultTaxRate={comp?.default_tax_rate ?? 0.1}
        defaultDueDays={comp?.default_due_days ?? 30}
        defaultNotes={comp?.default_notes ?? ''}
        initialTemplateId={initialTemplateId}
      />
    </div>
  )
}
