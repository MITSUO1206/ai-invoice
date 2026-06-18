import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  const { email, password, name, company_name, invite_token } = await request.json()

  if (!email || !password || !name) {
    return NextResponse.json({ error: '必須項目を入力してください' }, { status: 400 })
  }
  if (!invite_token && !company_name) {
    return NextResponse.json({ error: '会社名を入力してください' }, { status: 400 })
  }
  if (password.length < 8) {
    return NextResponse.json({ error: 'パスワードは8文字以上で入力してください' }, { status: 400 })
  }

  const supabase = await createClient()

  const { data: authData, error: authError } = await supabase.auth.signUp({ email, password })

  if (authError || !authData.user) {
    if (authError?.message.includes('already registered') || authError?.message.includes('already been registered')) {
      return NextResponse.json({ error: 'このメールアドレスは既に登録されています' }, { status: 400 })
    }
    return NextResponse.json({ error: authError?.message || '登録に失敗しました' }, { status: 500 })
  }

  const userId = authData.user.id

  if (invite_token) {
    const { error: inviteError } = await supabase.rpc('register_with_invite', {
      p_user_id: userId,
      p_user_name: name,
      p_invite_token: invite_token,
    })
    if (inviteError) {
      return NextResponse.json({ error: inviteError.message.includes('Invalid') ? '招待リンクが無効または期限切れです' : '参加処理に失敗しました' }, { status: 400 })
    }
  } else {
    const { error: registerError } = await supabase.rpc('register_user', {
      p_user_id: userId,
      p_user_name: name,
      p_company_name: company_name,
    })
    if (registerError) {
      return NextResponse.json({ error: '会社情報の作成に失敗しました' }, { status: 500 })
    }
  }

  return NextResponse.json({ success: true }, { status: 201 })
}
