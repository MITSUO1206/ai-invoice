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

  if (!body.name?.trim()) {
    return NextResponse.json({ error: 'テンプレート名は必須です' }, { status: 400 })
  }

  // company_id を条件に加えて他社テンプレートの変更を防ぐ
  const { data, error } = await supabase
    .from('invoice_templates')
    .update({
      name: body.name.trim(),
      items: body.items ?? [],
      tax_rate: Number(body.tax_rate ?? 0.1),
      notes: body.notes || null,
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

  // company_id を条件に加えて他社テンプレートの削除を防ぐ
  const { error, count } = await supabase
    .from('invoice_templates')
    .delete({ count: 'exact' })
    .eq('id', id)
    .eq('company_id', companyId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (count === 0) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  return NextResponse.json({ success: true })
}
