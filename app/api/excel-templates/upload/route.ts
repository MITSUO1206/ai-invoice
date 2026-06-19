import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles').select('company_id, role').eq('id', user.id).single()
  if (!profile || !['admin', 'manager'].includes(profile.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const formData = await request.formData()
  const file = formData.get('file') as File | null
  if (!file) return NextResponse.json({ error: 'ファイルが必要です' }, { status: 400 })

  if (!file.name.match(/\.(xlsx|xls)$/i)) {
    return NextResponse.json({ error: 'Excelファイル(.xlsx/.xls)のみアップロード可能です' }, { status: 400 })
  }

  const buffer = Buffer.from(await file.arrayBuffer())
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
  const filePath = `${profile.company_id}/${Date.now()}-${safeName}`

  const { error: uploadError } = await supabase.storage
    .from('excel-templates')
    .upload(filePath, buffer, {
      contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      upsert: false,
    })

  if (uploadError) return NextResponse.json({ error: uploadError.message }, { status: 500 })

  return NextResponse.json({ file_path: filePath, original_name: file.name }, { status: 201 })
}
