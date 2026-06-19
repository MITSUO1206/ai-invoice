import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

type Params = { params: Promise<{ id: string }> }

export async function PUT(request: NextRequest, { params }: Params) {
  const { id } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles').select('role').eq('id', user.id).single()
  if (!profile || profile.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await request.json()
  if (!body.name?.trim()) return NextResponse.json({ error: '会社名は必須です' }, { status: 400 })

  const { data: company, error } = await supabase
    .from('companies')
    .update({
      name: body.name.trim(),
      rep_name: body.rep_name || null,
      address: body.address || null,
      phone: body.phone || null,
      email: body.email || null,
      website: body.website || null,
      tax_id: body.tax_id || null,
      bank_name: body.bank_name || null,
      bank_branch: body.bank_branch || null,
      bank_type: body.bank_type || '普通',
      bank_number: body.bank_number || null,
      bank_holder: body.bank_holder || null,
      default_tax_rate: Number(body.default_tax_rate ?? 0.1),
      default_due_days: Number(body.default_due_days ?? 30),
      default_notes: body.default_notes || null,
    })
    .eq('id', id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(company)
}
