import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import Anthropic from '@anthropic-ai/sdk'
import ExcelJS from 'exceljs'

const anthropic = new Anthropic()

export async function POST(request: NextRequest) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles').select('company_id, role').eq('id', user.id).single()
  if (!profile || !['admin', 'manager'].includes(profile.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { file_path } = await request.json()
  if (!file_path) return NextResponse.json({ error: 'file_path が必要です' }, { status: 400 })

  // パストラバーサル防止 + テナント分離: 自社フォルダのファイルのみ許可
  if (!file_path.startsWith(`${profile.company_id}/`) || file_path.includes('..')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { data: fileData, error: downloadError } = await supabase.storage
    .from('excel-templates')
    .download(file_path)
  if (downloadError || !fileData) {
    return NextResponse.json({ error: 'ファイルのダウンロードに失敗しました' }, { status: 500 })
  }

  const buffer = Buffer.from(await fileData.arrayBuffer()) as Buffer

  const workbook = new ExcelJS.Workbook()
  await workbook.xlsx.load(buffer)

  const cellData: string[] = []
  workbook.eachSheet((worksheet) => {
    const sheetName = worksheet.name
    worksheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
      if (rowNumber > 50) return
      row.eachCell({ includeEmpty: false }, (cell, colNumber) => {
        const colLetter = String.fromCharCode(64 + colNumber)
        const value = cell.value?.toString() ?? ''
        if (value.trim()) {
          cellData.push(`${sheetName}!${colLetter}${rowNumber}: "${value}"`)
        }
      })
    })
  })

  const cellSummary = cellData.slice(0, 200).join('\n')

  const message = await anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 1024,
    messages: [
      {
        role: 'user',
        content: `あなたは請求書Excelテンプレートの解析専門家です。
以下のExcelセルデータを分析し、請求書の各フィールドがどのセルに対応するか特定してください。

セルデータ:
${cellSummary}

以下のJSONフォーマットで回答してください。該当するフィールドが見つからない場合はそのキーを省略してください。
列はA,B,C...のアルファベット、行は数字で表記してください。

{
  "invoice_number": {"sheet": "シート名", "cell": "B3"},
  "issue_date": {"sheet": "シート名", "cell": "B4"},
  "due_date": {"sheet": "シート名", "cell": "B5"},
  "client_name": {"sheet": "シート名", "cell": "B7"},
  "client_address": {"sheet": "シート名", "cell": "B8"},
  "issuer_name": {"sheet": "シート名", "cell": "F3"},
  "issuer_address": {"sheet": "シート名", "cell": "F4"},
  "items_start_row": 14,
  "items_sheet": "シート名",
  "item_columns": {"name": "A", "quantity": "D", "unit_price": "E", "amount": "F"},
  "subtotal": {"sheet": "シート名", "cell": "F20"},
  "tax_amount": {"sheet": "シート名", "cell": "F21"},
  "total": {"sheet": "シート名", "cell": "F22"},
  "notes": {"sheet": "シート名", "cell": "A24"}
}

JSONのみ返してください。説明文は不要です。`,
      },
    ],
  })

  const responseText = message.content[0].type === 'text' ? message.content[0].text : ''

  let fieldMapping: object = {}
  try {
    const jsonMatch = responseText.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      fieldMapping = JSON.parse(jsonMatch[0])
    }
  } catch {
    // AI解析失敗時は空マッピングを返す（ユーザーが手動入力）
  }

  return NextResponse.json({ field_mapping: fieldMapping })
}
