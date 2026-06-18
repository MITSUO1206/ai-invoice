import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

export async function POST(request: NextRequest) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { prompt } = await request.json()
  if (!prompt?.trim()) {
    return NextResponse.json({ error: 'プロンプトを入力してください' }, { status: 400 })
  }

  if (!process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_API_KEY === 'placeholder') {
    return NextResponse.json(
      { error: 'Anthropic APIキーが設定されていません' },
      { status: 503 }
    )
  }

  const systemPrompt = `あなたは請求書作成の専門家AIです。ユーザーの要求から請求書の内容を生成してください。

必ず以下のJSON形式のみで回答してください（他の説明は不要）:
{
  "client_name": "取引先会社名",
  "items": [
    {
      "name": "品目名",
      "quantity": 1,
      "unit_price": 10000,
      "amount": 10000
    }
  ],
  "notes": "備考（任意）"
}

ルール:
- amountはquantity × unit_priceの整数値
- 金額は整数（円）
- 品目名は具体的に
- 取引先名が不明な場合は「株式会社○○」
- notesは振込先などの補足があれば記載、なければ空文字`

  const message = await anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 1024,
    messages: [{ role: 'user', content: prompt }],
    system: systemPrompt,
  })

  const text = message.content[0].type === 'text' ? message.content[0].text : ''

  const jsonMatch = text.match(/\{[\s\S]*\}/)
  if (!jsonMatch) {
    return NextResponse.json({ error: 'AI応答の解析に失敗しました' }, { status: 500 })
  }

  const result = JSON.parse(jsonMatch[0])

  return NextResponse.json(result)
}
