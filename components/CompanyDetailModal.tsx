'use client'

import { useState } from 'react'
import type { Company } from '@/lib/types'

type Props = {
  company: Partial<Company> | null
  onClose: () => void
  onSave: (company: Company) => void
}

export default function CompanyDetailModal({ company, onClose, onSave }: Props) {
  const isNew = !company?.id
  const [form, setForm] = useState<Partial<Company>>(company ?? {})
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  function handleChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) {
    const { name, value } = e.target
    setForm((prev) => ({ ...prev, [name]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError('')

    const url = isNew ? '/api/companies' : `/api/companies/${company!.id}`
    const method = isNew ? 'POST' : 'PUT'

    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    const data = await res.json()

    if (!res.ok) {
      setError(data.error || '保存に失敗しました')
      setSaving(false)
      return
    }

    onSave(isNew ? ({ ...form, id: data.id, created_at: new Date().toISOString() } as Company) : data)
  }

  const textField = (label: string, name: keyof Company, opts?: { type?: string; required?: boolean; col2?: boolean }) => (
    <div className={opts?.col2 ? 'col-span-2' : ''}>
      <label className="block text-xs text-gray-500 mb-1">
        {label}{opts?.required && ' *'}
      </label>
      <input
        name={name}
        type={opts?.type ?? 'text'}
        value={(form[name] as string) ?? ''}
        onChange={handleChange}
        required={opts?.required}
        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
    </div>
  )

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-xl">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between sticky top-0 bg-white z-10">
          <h2 className="font-semibold text-gray-900">
            {isNew ? '新規会社を追加' : '会社詳細を編集'}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">✕</button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-red-700 text-sm">
              {error}
            </div>
          )}

          <section>
            <h3 className="text-sm font-semibold text-gray-700 mb-3 pb-1 border-b border-gray-100">基本情報</h3>
            <div className="grid grid-cols-2 gap-4">
              {textField('会社名', 'name', { required: true, col2: true })}
              {textField('代表者名', 'rep_name')}
              {textField('電話番号', 'phone')}
              {textField('住所', 'address', { col2: true })}
              {textField('メールアドレス', 'email', { type: 'email' })}
              {textField('Webサイト', 'website')}
              {textField('法人番号', 'tax_id')}
            </div>
          </section>

          <section>
            <h3 className="text-sm font-semibold text-gray-700 mb-3 pb-1 border-b border-gray-100">銀行情報</h3>
            <div className="grid grid-cols-2 gap-4">
              {textField('銀行名', 'bank_name')}
              {textField('支店名', 'bank_branch')}
              <div>
                <label className="block text-xs text-gray-500 mb-1">口座種別</label>
                <select
                  name="bank_type"
                  value={form.bank_type ?? '普通'}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="普通">普通</option>
                  <option value="当座">当座</option>
                </select>
              </div>
              {textField('口座番号', 'bank_number')}
              {textField('口座名義', 'bank_holder', { col2: true })}
            </div>
          </section>

          <section>
            <h3 className="text-sm font-semibold text-gray-700 mb-3 pb-1 border-b border-gray-100">デフォルト設定</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-gray-500 mb-1">デフォルト税率</label>
                <select
                  name="default_tax_rate"
                  value={String(form.default_tax_rate ?? 0.1)}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="0.1">10%</option>
                  <option value="0.08">8%</option>
                  <option value="0">非課税 (0%)</option>
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">支払期限（日数）</label>
                <input
                  name="default_due_days"
                  type="number"
                  value={form.default_due_days ?? 30}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="col-span-2">
                <label className="block text-xs text-gray-500 mb-1">デフォルトメモ</label>
                <textarea
                  name="default_notes"
                  value={form.default_notes ?? ''}
                  onChange={handleChange}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </section>

          <div className="flex justify-end gap-3 pt-2 border-t border-gray-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900 transition-colors"
            >
              キャンセル
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {saving ? '保存中...' : (isNew ? '会社を追加' : '変更を保存')}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
