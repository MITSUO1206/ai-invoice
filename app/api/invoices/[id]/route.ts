import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

type Params = { params: Promise<{ id: string }> }

async function getCallerCompanyId(supabase: Awaited<ReturnType<typeof createClient>>, userId: string) {
  const { data } = await supabase
    .from('profiles')
    .select('company_id')
    .eq('id', userId)
    .single()
  return data?.company_id ?? null
}

export async function GET(_request: NextRequest, { params }: Params) {
  const { id } = await params
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const companyId = await getCallerCompanyId(supabase, user.id)
  if (!companyId) return NextResponse.json({ error: 'Profile not found' }, { status: 404 })

  const { data, error } = await supabase
    .from('invoices')
    .select('*')
    .eq('id', id)
    .eq('company_id', companyId)
    .single()

  if (error || !data) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  return NextResponse.json(data)
}

export async function PUT(request: NextRequest, { params }: Params) {
  const { id } = await params
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const companyId = await getCallerCompanyId(supabase, user.id)
  if (!companyId) return NextResponse.json({ error: 'Profile not found' }, { status: 404 })

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

  // company_id を条件に加えて他社請求書の変更を防ぐ
  const { data, error } = await supabase
    .from('invoices')
    .update({
      client_name: body.client_name.trim(),
      client_email: body.client_email || null,
      client_address: body.client_address || null,
      issue_date: body.issue_date,
      due_date: body.due_date || null,
      tax_rate: taxRate,
      status: body.status,
      items,
      notes: body.notes || null,
      subtotal,
      tax_amount: taxAmount,
      total,
    })
    .eq('id', id)
    .eq('company_id', companyId)
    .select()
    .single()

  if (error || !data) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  return NextResponse.json(data)
}

export async function DELETE(_request: NextRequest, { params }: Params) {
  const { id } = await params
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const companyId = await getCallerCompanyId(supabase, user.id)
  if (!companyId) return NextResponse.json({ error: 'Profile not found' }, { status: 404 })

  // company_id を条件に加えて他社請求書の削除を防ぐ
  const { error, count } = await supabase
    .from('invoices')
    .delete({ count: 'exact' })
    .eq('id', id)
    .eq('company_id', companyId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (count === 0) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  return NextResponse.json({ success: true })
}
