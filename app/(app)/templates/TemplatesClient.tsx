'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import type { InvoiceItem, InvoiceTemplate, ExcelTemplate } from '@/lib/types'
import ExcelTemplateSection from '@/components/ExcelTemplateSection'

const emptyItem = (): InvoiceItem => ({ name: '', quantity: 1, unit_price: 0, amount: 0 })

type FormState = {
  name: string
  items: InvoiceItem[]
  tax_rate: string
  notes: string
}

const defaultForm = (): FormState => ({
  name: '',
  items: [emptyItem()],
  tax_rate: '0.1',
  notes: '',
})

function calcAmount(qty: number, price: number) {
  return Math.round(qty * price)
}

type Props = { templates: InvoiceTemplate[]; excelTemplates: ExcelTemplate[] }

export default function TemplatesClient({ templates: initial, excelTemplates }: Props) {
  const router = useRouter()
  const [templates, setTemplates] = useState(initial)
  const [showForm, setShowForm] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [form, setForm] = useState<FormState>(defaultForm())
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  function openCreate() {
    setEditId(null)
    setForm(defaultForm())
    setShowForm(true)
    setError('')
  }

  function openEdit(tmpl: InvoiceTemplate) {
    setEditId(tmpl.id)
    setForm({
      name: tmpl.name,
      items: tmpl.items.length ? tmpl.items : [emptyItem()],
      tax_rate: String(tmpl.tax_rate),
      notes: tmpl.notes ?? '',
    })
    setShowForm(true)
    setError('')
  }

  function updateItem(index: number, field: keyof InvoiceItem, value: string | number) {
    setForm((prev) => {
      const items = [...prev.items]
      const item = { ...items[index], [field]: value }
      if (field === 'quantity' || field === 'unit_price') {
        item.amount = calcAmount(
          field === 'quantity' ? Number(value) : Number(item.quantity),
          field === 'unit_price' ? Number(value) : Number(item.unit_price)
        )
      }
      items[index] = item
      return { ...prev, items }
    })
  }

  async function handleSave() {
    setSaving(true)
    setError('')
    const url = editId ? `/api/templates/${editId}` : '/api/templates'
    const method = editId ? 'PUT' : 'POST'

    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, tax_rate: Number(form.tax_rate) }),
    })
    const data = await res.json()

    if (!res.ok) {
      setError(data.error || '保存に失敗しました')
      setSaving(false)
      return
    }

    if (editId) {
      setTemplates((prev) => prev.map((t) => (t.id === editId ? data : t)))
    } else {
      setTemplates((prev) => [data, ...prev])
    }

    setShowForm(false)
    setEditId(null)
    setForm(defaultForm())
    setSaving(false)
    router.refresh()
  }

  async function handleDelete(id: string) {
    if (!confirm('このテンプレートを削除しますか？')) return
    const res = await fetch(`/api/templates/${id}`, { method: 'DELETE' })
    if (res.ok) {
      setTemplates((prev) => prev.filter((t) => t.id !== id))
      router.refresh()
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">テンプレート管理</h1>
          <p className="text-sm text-gray-500 mt-0.5">よく使う請求書のひな型を管理します</p>
        </div>
        <button
          onClick={openCreate}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
        >
          ＋ テンプレート作成
        </button>
      </div>

      {/* フォームモーダル */}
      {showForm && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-100">
              <h2 className="font-semibold text-gray-900">
                {editId ? 'テンプレート編集' : '新規テンプレート作成'}
              </h2>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  テンプレート名 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                  placeholder="Webサイト制作"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-medium text-gray-700">明細</label>
                  <button
                    type="button"
                    onClick={() => setForm((p) => ({ ...p, items: [...p.items, emptyItem()] }))}
                    className="text-sm text-blue-600 hover:underline"
                  >
                    ＋ 行追加
                  </button>
                </div>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-xs text-gray-500 border-b border-gray-100">
                      <th className="text-left py-2 pr-2 font-medium">品目</th>
                      <th className="text-right py-2 pr-2 font-medium w-16">数量</th>
                      <th className="text-right py-2 pr-2 font-medium w-28">単価</th>
                      <th className="py-2 w-6"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {form.items.map((item, i) => (
                      <tr key={i} className="border-b border-gray-50">
                        <td className="py-1.5 pr-2">
                          <input
                            type="text"
                            value={item.name}
                            onChange={(e) => updateItem(i, 'name', e.target.value)}
                            placeholder="品目名"
                            className="w-full px-2 py-1 border border-gray-200 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                          />
                        </td>
                        <td className="py-1.5 pr-2">
                          <input
                            type="number"
                            value={item.quantity}
                            min={1}
                            onChange={(e) => updateItem(i, 'quantity', Number(e.target.value))}
                            className="w-full px-2 py-1 border border-gray-200 rounded text-sm text-right focus:outline-none focus:ring-1 focus:ring-blue-500"
                          />
                        </td>
                        <td className="py-1.5 pr-2">
                          <input
                            type="number"
                            value={item.unit_price}
                            min={0}
                            onChange={(e) => updateItem(i, 'unit_price', Number(e.target.value))}
                            className="w-full px-2 py-1 border border-gray-200 rounded text-sm text-right focus:outline-none focus:ring-1 focus:ring-blue-500"
                          />
                        </td>
                        <td className="py-1.5">
                          {form.items.length > 1 && (
                            <button
                              type="button"
                              onClick={() =>
                                setForm((p) => ({
                                  ...p,
                                  items: p.items.filter((_, idx) => idx !== i),
                                }))
                              }
                              className="text-gray-300 hover:text-red-400"
                            >
                              ✕
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">消費税率</label>
                  <select
                    value={form.tax_rate}
                    onChange={(e) => setForm((p) => ({ ...p, tax_rate: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="0">0%</option>
                    <option value="0.08">8%</option>
                    <option value="0.1">10%</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">備考</label>
                <textarea
                  value={form.notes}
                  onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                />
              </div>

              {error && <p className="text-red-600 text-sm">{error}</p>}
            </div>

            <div className="p-6 border-t border-gray-100 flex justify-end gap-3">
              <button
                onClick={() => setShowForm(false)}
                className="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                キャンセル
              </button>
              <button
                onClick={handleSave}
                disabled={saving || !form.name.trim()}
                className="px-5 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {saving ? '保存中...' : '保存'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* テンプレート一覧 */}
      {templates.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <p className="text-gray-400 text-sm mb-4">テンプレートがありません</p>
          <button
            onClick={openCreate}
            className="text-blue-600 hover:underline text-sm"
          >
            最初のテンプレートを作成する →
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {templates.map((tmpl) => (
            <div
              key={tmpl.id}
              className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-sm transition-shadow"
            >
              <div className="flex items-start justify-between mb-3">
                <h3 className="font-semibold text-gray-900">{tmpl.name}</h3>
                <div className="flex gap-2 text-sm">
                  <button
                    onClick={() => openEdit(tmpl)}
                    className="text-gray-400 hover:text-blue-600 transition-colors"
                  >
                    編集
                  </button>
                  <button
                    onClick={() => handleDelete(tmpl.id)}
                    className="text-gray-400 hover:text-red-500 transition-colors"
                  >
                    削除
                  </button>
                </div>
              </div>
              <p className="text-xs text-gray-500 mb-2">
                {tmpl.items.length}品目 / 消費税{Math.round(tmpl.tax_rate * 100)}%
              </p>
              <ul className="space-y-0.5">
                {tmpl.items.slice(0, 3).map((item, i) => (
                  <li key={i} className="text-xs text-gray-600 truncate">
                    {item.name}
                    {item.unit_price > 0 && (
                      <span className="text-gray-400 ml-1">
                        ¥{item.unit_price.toLocaleString('ja-JP')}
                      </span>
                    )}
                  </li>
                ))}
                {tmpl.items.length > 3 && (
                  <li className="text-xs text-gray-400">他{tmpl.items.length - 3}品目...</li>
                )}
              </ul>
              <div className="mt-4 pt-3 border-t border-gray-100">
                <Link
                  href={`/invoices/new?template=${tmpl.id}`}
                  className="block w-full text-center px-3 py-2 text-sm font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
                >
                  📄 このテンプレートで請求書作成
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Excel テンプレートセクション */}
      <div className="mt-10 border-t border-gray-200 pt-8">
        <ExcelTemplateSection templates={excelTemplates} />
      </div>
    </div>
  )
}
