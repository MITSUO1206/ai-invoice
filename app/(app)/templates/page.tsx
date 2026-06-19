import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import TemplatesClient from './TemplatesClient'
import type { InvoiceTemplate, ExcelTemplate } from '@/lib/types'

export default async function TemplatesPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [{ data: templates }, { data: excelTemplates }] = await Promise.all([
    supabase.from('invoice_templates').select('*').order('created_at', { ascending: false }),
    supabase.from('excel_templates').select('*').order('created_at', { ascending: false }),
  ])

  return (
    <div className="p-8">
      <TemplatesClient
        templates={(templates as InvoiceTemplate[]) ?? []}
        excelTemplates={(excelTemplates as ExcelTemplate[]) ?? []}
      />
    </div>
  )
}
