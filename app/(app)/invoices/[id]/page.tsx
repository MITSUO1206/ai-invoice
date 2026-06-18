import { redirect, notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import InvoiceDetailClient from './InvoiceDetailClient'
import type { Invoice, Company } from '@/lib/types'

type Props = { params: Promise<{ id: string }> }

export default async function InvoiceDetailPage({ params }: Props) {
  const { id } = await params
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

  const [{ data: invoice }, { data: company }] = await Promise.all([
    supabase.from('invoices').select('*').eq('id', id).single(),
    profile
      ? supabase.from('companies').select('*').eq('id', profile.company_id).single()
      : { data: null },
  ])

  if (!invoice) notFound()

  const comp = company as Company | null
  const bankInfo =
    comp?.bank_name
      ? `振込先：${comp.bank_name}${comp.bank_branch ? ` ${comp.bank_branch}` : ''} ${comp.bank_type ?? '普通'} ${comp.bank_number ?? ''} ${comp.bank_holder ?? ''}`
      : null

  return (
    <div className="p-8">
      <InvoiceDetailClient
        invoice={invoice as Invoice}
        companyName={comp?.name ?? ''}
        companyAddress={comp?.address}
        companyPhone={comp?.phone}
        companyEmail={comp?.email}
        companyTaxId={comp?.tax_id}
        bankInfo={bankInfo}
      />
    </div>
  )
}
