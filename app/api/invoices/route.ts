import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const status = searchParams.get('status')

  let query = supabase
    .from('invoices')
    .select('*')
    .order('created_at', { ascending: false })

  if (status && status !== 'all') {
    query = query.eq('status', status)
  }

  const { data, error } = await query

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json(data)
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles')
    .select('company_id, role')
    .eq('id', user.id)
    .single()

  if (!profile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 })

  const body = await request.json()

  if (!body.client_name?.trim()) {
    return NextResponse.json({ error: '取引先名は必須です' }, { status: 400 })
  }

  const items = body.items ?? []
  const subtotal = items.reduce(
    (sum: number, item: { amount: number }) => sum + Number(item.amount),
    0
  )
  const taxRate = Number(body.tax_rate ?? 0.1)
  const taxAmount = Math.floor(subtotal * taxRate)
  const total = subtotal + taxAmount

  const { data: existing } = await supabase
    .from('invoices')
    .select('invoice_number')
    .eq('company_id', profile.company_id)
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  let nextSeq = 1
  if (existing?.invoice_number) {
    const match = existing.invoice_number.match(/(\d+)$/)
    if (match) nextSeq = parseInt(match[1], 10) + 1
  }

  const now = new Date()
  const yyyymm = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`
  const invoiceNumber = `INV-${yyyymm}-${String(nextSeq).padStart(4, '0')}`

  const { data, error } = await supabase
    .from('invoices')
    .insert({
      company_id: profile.company_id,
      invoice_number: body.invoice_number || invoiceNumber,
      client_name: body.client_name.trim(),
      client_email: body.client_email || null,
      client_address: body.client_address || null,
      issue_date: body.issue_date || new Date().toISOString().split('T')[0],
      due_date: body.due_date || null,
      tax_rate: taxRate,
      status: body.status || 'draft',
      items,
      notes: body.notes || null,
      subtotal,
      tax_amount: taxAmount,
      total,
      created_by: user.id,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json(data, { status: 201 })
}
