import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get('token')
  if (!token) return NextResponse.json({ error: 'トークンが必要です' }, { status: 400 })

  const supabase = await createClient()

  const { data, error } = await supabase
    .from('invitations')
    .select('id, role, expires_at, used_at, companies(name)')
    .eq('token', token)
    .single()

  if (error || !data) {
    return NextResponse.json({ error: '無効な招待リンクです' }, { status: 404 })
  }
  if (data.used_at) {
    return NextResponse.json({ error: 'この招待リンクは既に使用済みです' }, { status: 400 })
  }
  if (new Date(data.expires_at) < new Date()) {
    return NextResponse.json({ error: '招待リンクの有効期限が切れています' }, { status: 400 })
  }

  return NextResponse.json({
    valid: true,
    role: data.role,
    company_name: (data.companies as unknown as { name: string } | null)?.name ?? '',
  })
}
