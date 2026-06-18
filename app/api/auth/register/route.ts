import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  const { email, password, name, company_name } = await request.json()

  if (!email || !password || !name || !company_name) {
    return NextResponse.json(
      { error: '全ての項目を入力してください' },
      { status: 400 }
    )
  }

  if (password.length < 8) {
    return NextResponse.json(
      { error: 'パスワードは8文字以上で入力してください' },
      { status: 400 }
    )
  }

  const supabase = await createClient()

  const { data: authData, error: authError } = await supabase.auth.signUp({
    email,
    password,
  })

  if (authError || !authData.user) {
    if (authError?.message.includes('already registered')) {
      return NextResponse.json(
        { error: 'このメールアドレスは既に登録されています' },
        { status: 400 }
      )
    }
    return NextResponse.json(
      { error: '登録に失敗しました。もう一度お試しください' },
      { status: 500 }
    )
  }

  const { error: registerError } = await supabase.rpc('register_user', {
    p_user_id: authData.user.id,
    p_user_name: name,
    p_company_name: company_name,
  })

  if (registerError) {
    return NextResponse.json(
      { error: '会社情報の作成に失敗しました' },
      { status: 500 }
    )
  }

  return NextResponse.json({ success: true }, { status: 201 })
}
