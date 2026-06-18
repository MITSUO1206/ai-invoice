import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: invoices, error } = await supabase
    .from('invoices')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const total_invoices = invoices.length
  const paid_total = invoices
    .filter((inv) => inv.status === 'paid')
    .reduce((sum, inv) => sum + Number(inv.total), 0)
  const unpaid_total = invoices
    .filter((inv) => inv.status === 'sent')
    .reduce((sum, inv) => sum + Number(inv.total), 0)
  const overdue_count = invoices.filter((inv) => inv.status === 'overdue').length
  const recent_invoices = invoices.slice(0, 8)

  return NextResponse.json({
    total_invoices,
    paid_total,
    unpaid_total,
    overdue_count,
    recent_invoices,
  })
}
