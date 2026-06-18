import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles').select('company_id, role').eq('id', user.id).single()
  if (!profile || !['admin', 'manager'].includes(profile.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { data, error } = await supabase
    .from('invitations')
    .select('*')
    .eq('company_id', profile.company_id)
    .is('used_at', null)
    .gt('expires_at', new Date().toISOString())
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles').select('company_id, role').eq('id', user.id).single()
  if (!profile || !['admin', 'manager'].includes(profile.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await request.json()
  const requestedRole = body.role

  const allowedRoles = profile.role === 'admin'
    ? ['admin', 'manager', 'employee']
    : ['employee']

  if (!allowedRoles.includes(requestedRole)) {
    return NextResponse.json({ error: 'そのロールの招待を発行する権限がありません' }, { status: 403 })
  }

  // adminは管理下の別会社へも招待可能
  let targetCompanyId: string = profile.company_id
  if (body.company_id && body.company_id !== profile.company_id) {
    if (profile.role !== 'admin') {
      return NextResponse.json({ error: '他社への招待はadminのみ可能です' }, { status: 403 })
    }
    // 管理下の会社かどうか確認
    const { data: company } = await supabase
      .from('companies')
      .select('id')
      .eq('id', body.company_id)
      .single()
    if (!company) {
      return NextResponse.json({ error: '指定された会社が見つかりません' }, { status: 404 })
    }
    targetCompanyId = body.company_id
  }

  const { data, error } = await supabase
    .from('invitations')
    .insert({
      company_id: targetCompanyId,
      role: requestedRole,
      created_by: user.id,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}
