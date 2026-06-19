import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

type Params = { params: Promise<{ id: string }> }

export async function PUT(request: NextRequest, { params }: Params) {
  const { id } = await params
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: myProfile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!myProfile || myProfile.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // 対象プロフィールの会社が管理下にあるか確認
  const { data: targetProfile } = await supabase
    .from('profiles')
    .select('company_id')
    .eq('id', id)
    .single()

  if (!targetProfile) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const { data: targetCompany } = await supabase
    .from('companies')
    .select('id')
    .eq('id', targetProfile.company_id)
    .single()

  if (!targetCompany) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await request.json()

  const VALID_ROLES = ['admin', 'manager', 'employee']
  const updateData: Record<string, unknown> = {}
  if (body.role !== undefined) {
    if (!VALID_ROLES.includes(body.role)) {
      return NextResponse.json({ error: '無効なロールです' }, { status: 400 })
    }
    updateData.role = body.role
  }
  if (body.is_active !== undefined) updateData.is_active = Boolean(body.is_active)

  const { data, error } = await supabase
    .from('profiles')
    .update(updateData)
    .eq('id', id)
    .select()
    .single()

  if (error || !data) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  return NextResponse.json(data)
}
