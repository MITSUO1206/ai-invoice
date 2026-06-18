'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import type { Invoice, InvoiceItem, InvoiceStatus, InvoiceTemplate } from '@/lib/types'

type Props = {
  invoice?: Invoice
  templates: InvoiceTemplate[]
  defaultTaxRate?: number
  defaultDueDays?: number
  defaultNotes?: string
}

const STATUS_OPTIONS: { value: InvoiceStatus; label: string }[] = [
  { value: 'draft', label: '下書き' },
  { value: 'sent', label: '送付済' },
  { value: 'paid', label: '支払済' },
  { value: 'overdue', label: '期限超過' },
  { value: 'cancelled', label: 'キャンセル' },
]

function calcAmount(qty: number, price: number) {
  return Math.round(qty * price)
}

function addDays(days: number) {
  const d = new Date()
  d.setDate(d.getDate() + days)
  return d.toISOString().split('T')[0]
}

const emptyItem = (): InvoiceItem => ({
  name: '',
  quantity: 1,
  unit_price: 0,
  amount: 0,
})

export default function InvoiceForm({
  invoice,
  templates,
  defaultTaxRate = 0.1,
  defaultDueDays = 30,
  defaultNotes = '',
}: Props) {
  const router = useRouter()
  const isEdit = !!invoice

  const [clientName, setClientName] = useState(invoice?.client_name ?? '')
  const [clientEmail, setClientEmail] = useState(invoice?.client_email ?? '')
  const [clientAddress, setClientAddress] = useState(invoice?.client_address ?? '')
  const [issueDate, setIssueDate] = useState(
    invoice?.issue_date ?? new Date().toISOString().split('T')[0]
  )
  const [dueDate, setDueDate] = useState(
    invoice?.due_date ?? addDays(defaultDueDays)
  )
  const [taxRate, setTaxRate] = useState(String(invoice?.tax_rate ?? defaultTaxRate))
  const [status, setStatus] = useState<InvoiceStatus>(invoice?.status ?? 'draft')
  const [items, setItems] = useState<InvoiceItem[]>(
    invoice?.items?.length ? invoice.items : [emptyItem()]
  )
  const [notes, setNotes] = useState(invoice?.notes ?? defaultNotes ?? '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [aiLoading, setAiLoading] = useState(false)
  const [aiPrompt, setAiPrompt] = useState('')
  const [showAiPanel, setShowAiPanel] = useState(false)

  const subtotal = items.reduce((sum, item) => sum + Number(item.amount), 0)
  const taxAmount = Math.floor(subtotal * Number(taxRate))
  const total = subtotal + taxAmount

  const updateItem = useCallback(
    (index: number, field: keyof InvoiceItem, value: string | number) => {
      setItems((prev) => {
        const next = [...prev]
        const item = { ...next[index], [field]: value }
        if (field === 'quantity' || field === 'unit_price') {
          item.amount = calcAmount(
            field === 'quantity' ? Number(value) : Number(item.quantity),
            field === 'unit_price' ? Number(value) : Number(item.unit_price)
          )
        }
        next[index] = item
        return next
      })
    },
    []
  )

  const addItem = () => setItems((prev) => [...prev, emptyItem()])
  const removeItem = (index: number) =>
    setItems((prev) => prev.filter((_, i) => i !== index))

  const applyTemplate = (templateId: string) => {
    const tmpl = templates.find((t) => t.id === templateId)
    if (!tmpl) return
    setItems(tmpl.items.length ? tmpl.items : [emptyItem()])
    setTaxRate(String(tmpl.tax_rate))
    if (tmpl.notes) setNotes(tmpl.notes)
  }

  const handleAiGenerate = async () => {
    if (!aiPrompt.trim()) return
    setAiLoading(true)
    setError('')
    try {
      const res = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: aiPrompt }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'AI生成に失敗しました')
        return
      }
      if (data.client_name) setClientName(data.client_name)
      if (data.items?.length) setItems(data.items)
      if (data.notes) setNotes(data.notes)
      setShowAiPanel(false)
      setAiPrompt('')
    } catch {
      setError('AI生成に失敗しました')
    } finally {
      setAiLoading(false)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError('')

    const payload = {
      client_name: clientName,
      client_email: clientEmail,
      client_address: clientAddress,
      issue_date: issueDate,
      due_date: dueDate || null,
      tax_rate: Number(taxRate),
      status,
      items,
      notes,
    }

    const url = isEdit ? `/api/invoices/${invoice.id}` : '/api/invoices'
    const method = isEdit ? 'PUT' : 'POST'

    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })

    const data = await res.json()

    if (!res.ok) {
      setError(data.error || '保存に失敗しました')
      setSaving(false)
      return
    }

    router.push(`/invoices/${data.id}`)
    router.refresh()
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* ヘッダー */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {isEdit ? '請求書編集' : '請求書新規作成'}
          </h1>
          {isEdit && (
            <p className="text-sm text-gray-500 mt-0.5">{invoice.invoice_number}</p>
          )}
        </div>
        <div className="flex items-center gap-3">
          {error && <span className="text-red-600 text-sm">{error}</span>}
          <button
            type="button"
            onClick={() => router.back()}
            className="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            キャンセル
          </button>
          <button
            type="submit"
            disabled={saving}
            className="bg-blue-600 text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors disabled:opacity-50"
          >
            {saving ? '保存中...' : isEdit ? '更新する' : '作成する'}
          </button>
        </div>
      </div>

      {/* AI生成パネル */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-lg">✨</span>
            <span className="text-sm font-medium text-blue-800">AIで請求書を自動生成</span>
          </div>
          <button
            type="button"
            onClick={() => setShowAiPanel(!showAiPanel)}
            className="text-sm text-blue-600 hover:underline"
          >
            {showAiPanel ? '閉じる' : '使ってみる'}
          </button>
        </div>
        {showAiPanel && (
          <div className="mt-3">
            <textarea
              value={aiPrompt}
              onChange={(e) => setAiPrompt(e.target.value)}
              rows={3}
              placeholder="例：株式会社○○に対してWebサイト制作費用（基本料金50万円）とSEO対策月額費用（3万円×3ヶ月）の請求書を作って"
              className="w-full px-3 py-2 border border-blue-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            />
            <button
              type="button"
              onClick={handleAiGenerate}
              disabled={aiLoading || !aiPrompt.trim()}
              className="mt-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {aiLoading ? '生成中...' : '✨ AIで生成'}
            </button>
          </div>
        )}
      </div>

      {/* テンプレート選択 */}
      {templates.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            テンプレートから読み込む
          </label>
          <select
            onChange={(e) => applyTemplate(e.target.value)}
            defaultValue=""
            className="w-full max-w-sm px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">テンプレートを選択...</option>
            {templates.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* 取引先情報 */}
      <section className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="font-semibold text-gray-900 mb-4">取引先情報</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              取引先名 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={clientName}
              onChange={(e) => setClientName(e.target.value)}
              required
              placeholder="株式会社○○"
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              メールアドレス
            </label>
            <input
              type="email"
              value={clientEmail}
              onChange={(e) => setClientEmail(e.target.value)}
              placeholder="billing@example.co.jp"
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">住所</label>
            <input
              type="text"
              value={clientAddress}
              onChange={(e) => setClientAddress(e.target.value)}
              placeholder="東京都渋谷区..."
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
      </section>

      {/* 請求書情報 */}
      <section className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="font-semibold text-gray-900 mb-4">請求書情報</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              発行日 <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              value={issueDate}
              onChange={(e) => setIssueDate(e.target.value)}
              required
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              支払期限
            </label>
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              ステータス
            </label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as InvoiceStatus)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {STATUS_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              消費税率
            </label>
            <select
              value={taxRate}
              onChange={(e) => setTaxRate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="0">0%（非課税）</option>
              <option value="0.08">8%（軽減税率）</option>
              <option value="0.1">10%</option>
            </select>
          </div>
        </div>
      </section>

      {/* 明細 */}
      <section className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-gray-900">明細</h2>
          <button
            type="button"
            onClick={addItem}
            className="text-sm text-blue-600 hover:underline"
          >
            ＋ 行を追加
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-gray-500 border-b border-gray-100">
                <th className="text-left py-2 pr-3 font-medium w-1/2">品目・説明</th>
                <th className="text-right py-2 pr-3 font-medium w-20">数量</th>
                <th className="text-right py-2 pr-3 font-medium w-32">単価</th>
                <th className="text-right py-2 pr-3 font-medium w-32">金額</th>
                <th className="py-2 w-8"></th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, i) => (
                <tr key={i} className="border-b border-gray-50">
                  <td className="py-2 pr-3">
                    <input
                      type="text"
                      value={item.name}
                      onChange={(e) => updateItem(i, 'name', e.target.value)}
                      placeholder="品目名"
                      className="w-full px-2 py-1 border border-gray-200 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </td>
                  <td className="py-2 pr-3">
                    <input
                      type="number"
                      value={item.quantity}
                      min={1}
                      onChange={(e) => updateItem(i, 'quantity', Number(e.target.value))}
                      className="w-full px-2 py-1 border border-gray-200 rounded text-sm text-right focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </td>
                  <td className="py-2 pr-3">
                    <input
                      type="number"
                      value={item.unit_price}
                      min={0}
                      onChange={(e) => updateItem(i, 'unit_price', Number(e.target.value))}
                      className="w-full px-2 py-1 border border-gray-200 rounded text-sm text-right focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </td>
                  <td className="py-2 pr-3 text-right font-medium text-gray-900">
                    ¥{Number(item.amount).toLocaleString('ja-JP')}
                  </td>
                  <td className="py-2">
                    {items.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeItem(i)}
                        className="text-gray-300 hover:text-red-400 transition-colors"
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

        {/* 合計 */}
        <div className="mt-4 flex justify-end">
          <div className="w-64 space-y-2 text-sm">
            <div className="flex justify-between text-gray-600">
              <span>小計</span>
              <span>¥{subtotal.toLocaleString('ja-JP')}</span>
            </div>
            <div className="flex justify-between text-gray-600">
              <span>消費税（{Math.round(Number(taxRate) * 100)}%）</span>
              <span>¥{taxAmount.toLocaleString('ja-JP')}</span>
            </div>
            <div className="flex justify-between font-bold text-gray-900 text-base border-t border-gray-200 pt-2">
              <span>合計</span>
              <span>¥{total.toLocaleString('ja-JP')}</span>
            </div>
          </div>
        </div>
      </section>

      {/* 備考 */}
      <section className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="font-semibold text-gray-900 mb-3">備考</h2>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={4}
          placeholder="振込手数料はご負担ください。"
          className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
        />
      </section>

      {/* 下部ボタン */}
      <div className="flex justify-end gap-3 pb-4">
        {error && <span className="text-red-600 text-sm self-center">{error}</span>}
        <button
          type="button"
          onClick={() => router.back()}
          className="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
        >
          キャンセル
        </button>
        <button
          type="submit"
          disabled={saving}
          className="bg-blue-600 text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors disabled:opacity-50"
        >
          {saving ? '保存中...' : isEdit ? '更新する' : '作成する'}
        </button>
      </div>
    </form>
  )
}
