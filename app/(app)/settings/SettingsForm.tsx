'use client'

import { useState } from 'react'
import type { Company } from '@/lib/types'

type Props = {
  company: Company
}

export default function SettingsForm({ company }: Props) {
  const [form, setForm] = useState<Partial<Company>>(company ?? {})
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')

  function handleChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) {
    const { name, value } = e.target
    setForm((prev) => ({ ...prev, [name]: value }))
    setSaved(false)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError('')

    const res = await fetch('/api/company', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })

    const data = await res.json()

    if (!res.ok) {
      setError(data.error || '保存に失敗しました')
      setSaving(false)
      return
    }

    setSaved(true)
    setSaving(false)
  }

  const bankInfo = form.bank_name
    ? `振込先：${form.bank_name}${form.bank_branch ? ` ${form.bank_branch}` : ''} ${form.bank_type ?? '普通'} ${form.bank_number ?? ''} ${form.bank_holder ?? ''}`
    : ''

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* 上部保存ボタン */}
      <div className="flex items-center justify-end gap-3">
        {saved && <span className="text-green-600 text-sm font-medium">✓ 保存済み</span>}
        {error && <span className="text-red-600 text-sm">{error}</span>}
        <button
          type="submit"
          disabled={saving}
          className="bg-blue-600 text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors disabled:opacity-50"
        >
          {saving ? '保存中...' : '💾 保存する'}
        </button>
      </div>

      {/* 会社基本情報 */}
      <section className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="font-semibold text-gray-900 mb-1">会社基本情報</h2>
        <p className="text-xs text-gray-400 mb-4">請求書のヘッダーに表示される情報です</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              会社名 <span className="text-red-500">*</span>
            </label>
            <input
              type="text" name="name" value={form.name ?? ''} onChange={handleChange}
              required placeholder="株式会社サンプル"
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">代表者名</label>
            <input
              type="text" name="rep_name" value={form.rep_name ?? ''} onChange={handleChange}
              placeholder="山田 太郎"
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">電話番号</label>
            <input
              type="tel" name="phone" value={form.phone ?? ''} onChange={handleChange}
              placeholder="03-1234-5678"
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">住所</label>
            <input
              type="text" name="address" value={form.address ?? ''} onChange={handleChange}
              placeholder="〒150-0002 東京都渋谷区渋谷1-1-1"
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">メールアドレス</label>
            <input
              type="email" name="email" value={form.email ?? ''} onChange={handleChange}
              placeholder="info@example.co.jp"
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Webサイト</label>
            <input
              type="text" name="website" value={form.website ?? ''} onChange={handleChange}
              placeholder="https://example.co.jp"
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              インボイス登録番号（適格請求書）
            </label>
            <input
              type="text" name="tax_id" value={form.tax_id ?? ''} onChange={handleChange}
              placeholder="T1234567890123"
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
      </section>

      {/* 振込先・支払情報 */}
      <section className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="font-semibold text-gray-900 mb-1">振込先・支払情報</h2>
        <p className="text-xs text-gray-400 mb-4">請求書の備考欄に自動で追加されます</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">銀行名</label>
            <input
              type="text" name="bank_name" value={form.bank_name ?? ''} onChange={handleChange}
              placeholder="○○銀行"
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">支店名</label>
            <input
              type="text" name="bank_branch" value={form.bank_branch ?? ''} onChange={handleChange}
              placeholder="渋谷支店"
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">口座種別</label>
            <select
              name="bank_type" value={form.bank_type ?? '普通'} onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="普通">普通預金</option>
              <option value="当座">当座預金</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">口座番号</label>
            <input
              type="text" name="bank_number" value={form.bank_number ?? ''} onChange={handleChange}
              placeholder="1234567"
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">口座名義</label>
            <input
              type="text" name="bank_holder" value={form.bank_holder ?? ''} onChange={handleChange}
              placeholder="カ）サンプル"
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
      </section>

      {/* デフォルト設定 */}
      <section className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="font-semibold text-gray-900 mb-1">請求書デフォルト設定</h2>
        <p className="text-xs text-gray-400 mb-4">新規作成時の初期値として反映されます</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              デフォルト消費税率 <span className="text-red-500">*</span>
            </label>
            <select
              name="default_tax_rate"
              value={String(form.default_tax_rate ?? 0.1)}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="0">0%（非課税）</option>
              <option value="0.08">8%（軽減税率）</option>
              <option value="0.1">10%</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">支払期限（初期値）</label>
            <select
              name="default_due_days"
              value={String(form.default_due_days ?? 30)}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="14">発行日から14日後</option>
              <option value="30">発行日から30日後</option>
              <option value="60">発行日から60日後</option>
              <option value="-1">月末</option>
            </select>
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">デフォルト備考文</label>
            <textarea
              name="default_notes" value={form.default_notes ?? ''} onChange={handleChange}
              rows={3} placeholder="振込手数料はご負担ください。"
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
          </div>
        </div>
      </section>

      {/* プレビュー */}
      <section className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="font-semibold text-gray-900 mb-4">プレビュー（請求書への反映イメージ）</h2>
        <div className="border border-gray-200 rounded-lg p-5 bg-gray-50 text-sm">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs text-gray-400 mb-1">請求先</p>
              <p className="font-medium text-gray-700">○○株式会社 御中</p>
            </div>
            <div className="text-right text-xs text-gray-600 space-y-0.5">
              <p className="font-semibold text-gray-900">{form.name || '（会社名未設定）'}</p>
              {form.address && <p>{form.address}</p>}
              {form.phone && <p>TEL {form.phone}</p>}
              {form.email && <p>{form.email}</p>}
            </div>
          </div>
          <hr className="my-4 border-gray-200" />
          <div className="text-xs text-gray-600 space-y-0.5">
            <p className="font-semibold text-gray-700">請求元</p>
            <p>{form.name || '（会社名未設定）'}</p>
            {form.tax_id && <p>登録番号：{form.tax_id}</p>}
          </div>
          {bankInfo && (
            <>
              <hr className="my-4 border-gray-200" />
              <div className="text-xs text-gray-600">
                <p>{bankInfo}</p>
                {form.default_notes && <p className="mt-1">{form.default_notes}</p>}
              </div>
            </>
          )}
        </div>
      </section>

      {/* 下部保存ボタン */}
      <div className="flex items-center justify-end gap-3 pb-4">
        {saved && <span className="text-green-600 text-sm font-medium">✓ 保存済み</span>}
        {error && <span className="text-red-600 text-sm">{error}</span>}
        <button
          type="submit"
          disabled={saving}
          className="bg-blue-600 text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors disabled:opacity-50"
        >
          {saving ? '保存中...' : '💾 保存する'}
        </button>
      </div>
    </form>
  )
}
