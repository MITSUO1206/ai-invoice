import { redirect, notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import InvoiceForm from '../../InvoiceForm'
import type { Invoice, InvoiceTemplate } from '@/lib/types'

type Props = { params: Promise<{ id: string }> }

export default async function EditInvoicePage({ params }: Props) {
  const { id } = await params
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [{ data: invoice }, { data: templates }] = await Promise.all([
    supabase.from('invoices').select('*').eq('id', id).single(),
    supabase
      .from('invoice_templates')
      .select('*')
      .order('created_at', { ascending: false }),
  ])

  if (!invoice) notFound()

  return (
    <div className="p-8 max-w-4xl">
      <InvoiceForm
        invoice={invoice as Invoice}
        templates={(templates as InvoiceTemplate[]) ?? []}
      />
    </div>
  )
}
